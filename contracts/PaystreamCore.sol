// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./libraries/StreamMath.sol";
import "./MilestoneEscrow.sol";

/**
 * @title PaystreamCore
 * @dev Core salary streaming contract with ERC20 token flexibility
 * Supports any ERC20 token (USDC, DAI, etc.) with per-second unlocking
 * Integrates with MilestoneEscrow for milestone-based fund release
 */
contract PaystreamCore is AccessControl, ReentrancyGuard, Pausable {
    using StreamMath for uint256;

    // Role definitions
    bytes32 public constant COMPANY_ROLE = keccak256("COMPANY_ROLE");
    bytes32 public constant EMPLOYEE_ROLE = keccak256("EMPLOYEE_ROLE");

    // Stream structure
    struct Stream {
        address company;
        address employee;
        address token; // ERC20 token address
        uint256 totalAmount;
        uint256 releaseRate; // tokens per second
        uint256 startTime;
        uint256 lastWithdrawalTime;
        uint256 withdrawn;
        bool isPaused;
        bool isCancelled;
    }

    // State variables
    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) public employeeStreams;
    mapping(address => uint256[]) public companyStreams;
    mapping(uint256 => uint256) public streamEscrowBalance; // From MilestoneEscrow

    uint256 public nextStreamId = 1;
    uint256 public totalEscrowedAmount = 0;

    MilestoneEscrow public milestoneEscrow;
    bool public milestoneEscrowSet = false;

    // Events
    event StreamCreated(
        uint256 indexed streamId,
        address indexed company,
        address indexed employee,
        address token,
        uint256 totalAmount,
        uint256 releaseRate,
        uint256 startTime
    );

    event StreamPaused(uint256 indexed streamId, address indexed company, uint256 timestamp);
    event StreamResumed(uint256 indexed streamId, address indexed company, uint256 timestamp);

    event StreamCancelled(
        uint256 indexed streamId,
        address indexed company,
        uint256 refundAmount,
        uint256 timestamp
    );

    event Withdrawal(
        uint256 indexed streamId,
        address indexed employee,
        uint256 amount,
        uint256 escrowLocked,
        uint256 timestamp
    );

    event MilestoneEscrowSet(address indexed escrowContract, uint256 timestamp);

    // Modifiers
    modifier streamExists(uint256 _streamId) {
        require(_streamId > 0 && _streamId < nextStreamId, "Stream does not exist");
        _;
    }

    modifier onlyCompany(uint256 _streamId) {
        require(
            streams[_streamId].company == msg.sender,
            "Only company can manage this stream"
        );
        _;
    }

    modifier onlyEmployee(uint256 _streamId) {
        require(
            streams[_streamId].employee == msg.sender,
            "Only employee can withdraw from this stream"
        );
        _;
    }

    modifier onlyCompanyRole() {
        require(
            hasRole(COMPANY_ROLE, msg.sender),
            "Only companies can perform this action"
        );
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Set the MilestoneEscrow contract address (admin only)
     * @param _escrowAddress Address of deployed MilestoneEscrow contract
     */
    function setMilestoneEscrow(address _escrowAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_escrowAddress != address(0), "Invalid address");
        require(!milestoneEscrowSet, "Escrow already set");

        milestoneEscrow = MilestoneEscrow(_escrowAddress);
        milestoneEscrowSet = true;

        emit MilestoneEscrowSet(_escrowAddress, block.timestamp);
    }

    /**
     * @dev Create a new salary stream
     * Works with any ERC20 token (USDC, DAI, USDT, etc.)
     * @param _employee Employee address
     * @param _token ERC20 token address
     * @param _totalAmount Total amount to stream
     * @param _duration Duration in seconds
     * @return streamId ID of created stream
     */
    function createStream(
        address _employee,
        address _token,
        uint256 _totalAmount,
        uint256 _duration
    ) external onlyCompanyRole returns (uint256) {
        require(_employee != address(0), "Invalid employee");
        require(_token != address(0), "Invalid token");

        // Validate parameters
        _totalAmount.validateStreamParams(_totalAmount, _duration);

        // Transfer tokens from company to this contract
        bool success = IERC20(_token).transferFrom(msg.sender, address(this), _totalAmount);
        require(success, "Token transfer failed");

        uint256 streamId = nextStreamId++;
        uint256 releaseRate = _totalAmount.calculateReleaseRate(_totalAmount, _duration);

        streams[streamId] = Stream({
            company: msg.sender,
            employee: _employee,
            token: _token,
            totalAmount: _totalAmount,
            releaseRate: releaseRate,
            startTime: block.timestamp,
            lastWithdrawalTime: block.timestamp,
            withdrawn: 0,
            isPaused: false,
            isCancelled: false
        });

        employeeStreams[_employee].push(streamId);
        companyStreams[msg.sender].push(streamId);
        totalEscrowedAmount += _totalAmount;

        emit StreamCreated(
            streamId,
            msg.sender,
            _employee,
            _token,
            _totalAmount,
            releaseRate,
            block.timestamp
        );

        return streamId;
    }

    /**
     * @dev Calculate available amount for withdrawal
     * @param _streamId Stream ID
     * @return available Tokens available to withdraw
     */
    function getAvailableAmount(uint256 _streamId)
        public
        view
        streamExists(_streamId)
        returns (uint256)
    {
        Stream storage stream = streams[_streamId];

        if (stream.isCancelled || stream.isPaused) {
            return 0;
        }

        uint256 unlocked = stream.releaseRate.calculateUnlocked(
            stream.lastWithdrawalTime,
            block.timestamp
        );

        uint256 remaining = stream.totalAmount - stream.withdrawn;
        return unlocked > remaining ? remaining : unlocked;
    }

    /**
     * @dev Get total unlocked amount (including already withdrawn)
     * @param _streamId Stream ID
     * @return unlocked Total tokens unlocked since stream start
     */
    function getTotalUnlockedAmount(uint256 _streamId)
        public
        view
        streamExists(_streamId)
        returns (uint256)
    {
        Stream storage stream = streams[_streamId];

        if (stream.isCancelled) {
            return stream.withdrawn;
        }

        return stream.releaseRate.calculateTotalUnlocked(
            stream.startTime,
            block.timestamp,
            stream.totalAmount
        );
    }

    /**
     * @dev Withdraw available funds
     * 30% automatically locked in escrow if MilestoneEscrow is set
     * @param _streamId Stream ID
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _streamId, uint256 _amount)
        external
        nonReentrant
        whenNotPaused
        streamExists(_streamId)
        onlyEmployee(_streamId)
    {
        Stream storage stream = streams[_streamId];

        require(!stream.isCancelled, "Stream cancelled");
        require(!stream.isPaused, "Stream paused");
        require(_amount > 0, "Amount must be > 0");

        uint256 available = getAvailableAmount(_streamId);
        require(_amount <= available, "Insufficient available");

        stream.withdrawn += _amount;
        stream.lastWithdrawalTime = block.timestamp;

        // Lock escrow if MilestoneEscrow is set
        uint256 escrowLocked = 0;
        if (milestoneEscrowSet) {
            escrowLocked = milestoneEscrow._lockEscrow(_streamId, _amount);
        }

        uint256 releaseAmount = _amount - escrowLocked;
        totalEscrowedAmount -= releaseAmount;

        // Transfer to employee (minus escrow)
        bool success = IERC20(stream.token).transfer(msg.sender, releaseAmount);
        require(success, "Transfer failed");

        emit Withdrawal(_streamId, msg.sender, _amount, escrowLocked, block.timestamp);
    }

    /**
     * @dev Pause a stream (company only)
     * @param _streamId Stream ID
     */
    function pauseStream(uint256 _streamId)
        external
        streamExists(_streamId)
        onlyCompany(_streamId)
    {
        Stream storage stream = streams[_streamId];
        require(!stream.isCancelled, "Cannot pause cancelled stream");
        require(!stream.isPaused, "Already paused");

        stream.isPaused = true;
        emit StreamPaused(_streamId, msg.sender, block.timestamp);
    }

    /**
     * @dev Resume a paused stream (company only)
     * @param _streamId Stream ID
     */
    function resumeStream(uint256 _streamId)
        external
        streamExists(_streamId)
        onlyCompany(_streamId)
    {
        Stream storage stream = streams[_streamId];
        require(!stream.isCancelled, "Cannot resume cancelled stream");
        require(stream.isPaused, "Not paused");

        stream.isPaused = false;
        stream.lastWithdrawalTime = block.timestamp; // Reset time to prevent backdating
        emit StreamResumed(_streamId, msg.sender, block.timestamp);
    }

    /**
     * @dev Cancel a stream and refund remaining tokens (company only)
     * @param _streamId Stream ID
     */
    function cancelStream(uint256 _streamId)
        external
        nonReentrant
        streamExists(_streamId)
        onlyCompany(_streamId)
    {
        Stream storage stream = streams[_streamId];
        require(!stream.isCancelled, "Already cancelled");

        stream.isCancelled = true;

        uint256 remaining = stream.totalAmount - stream.withdrawn;

        if (remaining > 0) {
            totalEscrowedAmount -= remaining;
            bool success = IERC20(stream.token).transfer(stream.company, remaining);
            require(success, "Refund failed");
        }

        emit StreamCancelled(_streamId, msg.sender, remaining, block.timestamp);
    }

    /**
     * @dev Emergency pause all streams (admin only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume all streams (admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // Query functions

    /**
     * @dev Get all streams for an employee
     */
    function getEmployeeStreams(address _employee)
        external
        view
        returns (uint256[] memory)
    {
        return employeeStreams[_employee];
    }

    /**
     * @dev Get all streams for a company
     */
    function getCompanyStreams(address _company)
        external
        view
        returns (uint256[] memory)
    {
        return companyStreams[_company];
    }

    /**
     * @dev Get complete stream details
     */
    function getStreamDetails(uint256 _streamId)
        external
        view
        streamExists(_streamId)
        returns (
            address company,
            address employee,
            address token,
            uint256 totalAmount,
            uint256 releaseRate,
            uint256 startTime,
            uint256 withdrawn,
            uint256 available,
            bool isPaused,
            bool isCancelled
        )
    {
        Stream storage stream = streams[_streamId];
        return (
            stream.company,
            stream.employee,
            stream.token,
            stream.totalAmount,
            stream.releaseRate,
            stream.startTime,
            stream.withdrawn,
            getAvailableAmount(_streamId),
            stream.isPaused,
            stream.isCancelled
        );
    }

    /**
     * @dev Get stream info for UI
     */
    function getStreamInfo(uint256 _streamId)
        external
        view
        streamExists(_streamId)
        returns (
            address,
            address,
            address,
            uint256,
            uint256,
            uint256
        )
    {
        Stream storage stream = streams[_streamId];
        return (
            stream.company,
            stream.employee,
            stream.token,
            stream.totalAmount,
            getAvailableAmount(_streamId),
            getTotalUnlockedAmount(_streamId)
        );
    }

    /**
     * @dev Check if stream is active
     */
    function isStreamActive(uint256 _streamId) external view streamExists(_streamId) returns (bool) {
        Stream storage stream = streams[_streamId];
        return !stream.isCancelled && !stream.isPaused;
    }
}
