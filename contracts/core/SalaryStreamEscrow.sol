// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../access/AccessControl.sol";

/**
 * @title SalaryStreamEscrow
 * @dev Salary streaming contract with company deposits
 * Money unlocks per second (mathematical calculation, not actual transfer)
 * Employees can withdraw available amounts at any time
 * Companies can pause, resume, or cancel streams
 */
contract SalaryStreamEscrow is ReentrancyGuard {
    IERC20 public paymentToken;
    AccessControl public accessControl;

    struct Stream {
        address company;
        address employee;
        uint256 totalAmount;
        uint256 releaseRate; // tokens per second
        uint256 startTime;
        uint256 lastWithdrawalTime;
        uint256 withdrawn;
        bool isPaused;
        bool isCancelled;
    }

    mapping(uint256 => Stream) public streams;
    mapping(address => uint256[]) public employeeStreams;
    mapping(address => uint256[]) public companyStreams;

    uint256 private nextStreamId = 1;
    uint256 public totalEscrowedAmount = 0;

    event StreamCreated(
        uint256 indexed streamId,
        address indexed company,
        address indexed employee,
        uint256 totalAmount,
        uint256 releaseRate,
        uint256 startTime
    );
    event StreamPaused(uint256 indexed streamId, address indexed company);
    event StreamResumed(uint256 indexed streamId, address indexed company);
    event StreamCancelled(uint256 indexed streamId, address indexed company, uint256 refundAmount);
    event Withdrawal(uint256 indexed streamId, address indexed employee, uint256 amount);
    event MilestoneEscrowLocked(uint256 indexed streamId, uint256 amount);

    modifier streamExists(uint256 _streamId) {
        require(_streamId > 0 && _streamId < nextStreamId, "Stream does not exist");
        _;
    }

    modifier onlyCompany(uint256 _streamId) {
        require(streams[_streamId].company == msg.sender, "Only company can manage this stream");
        _;
    }

    modifier onlyEmployee(uint256 _streamId) {
        require(streams[_streamId].employee == msg.sender, "Only employee can withdraw from this stream");
        _;
    }

    constructor(address _paymentToken, address _accessControl) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_accessControl != address(0), "Invalid access control");

        paymentToken = IERC20(_paymentToken);
        accessControl = AccessControl(_accessControl);
    }

    /**
     * @dev Create a new salary stream
     * @param _employee Employee address
     * @param _totalAmount Total amount to be streamed
     * @param _duration Duration in seconds (used to calculate release rate)
     */
    function createStream(
        address _employee,
        uint256 _totalAmount,
        uint256 _duration
    ) external returns (uint256) {
        require(
            accessControl.hasRole(accessControl.COMPANY_ROLE(), msg.sender),
            "Only companies can create streams"
        );
        require(_employee != address(0), "Invalid employee address");
        require(_totalAmount > 0, "Amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_totalAmount >= _duration, "Amount must be at least 1 per second");

        // Transfer tokens from company to this contract
        bool success = paymentToken.transferFrom(msg.sender, address(this), _totalAmount);
        require(success, "Token transfer failed");

        uint256 streamId = nextStreamId++;
        uint256 releaseRate = _totalAmount / _duration;

        streams[streamId] = Stream({
            company: msg.sender,
            employee: _employee,
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
            _totalAmount,
            releaseRate,
            block.timestamp
        );

        return streamId;
    }

    /**
     * @dev Calculate available amount for withdrawal
     */
    function getAvailableAmount(uint256 _streamId) public view streamExists(_streamId) returns (uint256) {
        Stream storage stream = streams[_streamId];

        if (stream.isCancelled || stream.isPaused) {
            return 0;
        }

        uint256 timeElapsed = block.timestamp - stream.lastWithdrawalTime;
        uint256 available = stream.releaseRate * timeElapsed;

        // Cap at remaining amount
        uint256 remaining = stream.totalAmount - stream.withdrawn;
        if (available > remaining) {
            available = remaining;
        }

        return available;
    }

    /**
     * @dev Get total unlocked amount (including withdrawn)
     */
    function getTotalUnlockedAmount(uint256 _streamId) public view streamExists(_streamId) returns (uint256) {
        Stream storage stream = streams[_streamId];

        if (stream.isCancelled) {
            return stream.withdrawn;
        }

        uint256 timeElapsed = block.timestamp - stream.startTime;
        uint256 unlocked = stream.releaseRate * timeElapsed;

        // Cap at total amount
        if (unlocked > stream.totalAmount) {
            unlocked = stream.totalAmount;
        }

        return unlocked;
    }

    /**
     * @dev Withdraw available funds
     */
    function withdraw(uint256 _streamId, uint256 _amount) external nonReentrant streamExists(_streamId) onlyEmployee(_streamId) {
        Stream storage stream = streams[_streamId];

        require(!stream.isCancelled, "Stream has been cancelled");
        require(!stream.isPaused, "Stream is paused");
        require(_amount > 0, "Amount must be greater than 0");

        uint256 available = getAvailableAmount(_streamId);
        require(_amount <= available, "Insufficient available balance");

        stream.withdrawn += _amount;
        stream.lastWithdrawalTime = block.timestamp;

        bool success = paymentToken.transfer(msg.sender, _amount);
        require(success, "Token transfer failed");

        totalEscrowedAmount -= _amount;

        emit Withdrawal(_streamId, msg.sender, _amount);
    }

    /**
     * @dev Pause a stream
     */
    function pauseStream(uint256 _streamId) external streamExists(_streamId) onlyCompany(_streamId) {
        Stream storage stream = streams[_streamId];

        require(!stream.isCancelled, "Cannot pause a cancelled stream");
        require(!stream.isPaused, "Stream is already paused");

        stream.isPaused = true;

        emit StreamPaused(_streamId, msg.sender);
    }

    /**
     * @dev Resume a paused stream
     */
    function resumeStream(uint256 _streamId) external streamExists(_streamId) onlyCompany(_streamId) {
        Stream storage stream = streams[_streamId];

        require(!stream.isCancelled, "Cannot resume a cancelled stream");
        require(stream.isPaused, "Stream is not paused");

        stream.isPaused = false;
        stream.lastWithdrawalTime = block.timestamp; // Reset clock so no backdated unlocks

        emit StreamResumed(_streamId, msg.sender);
    }

    /**
     * @dev Cancel a stream and refund remaining tokens to company
     */
    function cancelStream(uint256 _streamId) external nonReentrant streamExists(_streamId) onlyCompany(_streamId) {
        Stream storage stream = streams[_streamId];

        require(!stream.isCancelled, "Stream is already cancelled");

        stream.isCancelled = true;

        // Calculate refund amount
        uint256 refundAmount = stream.totalAmount - stream.withdrawn;

        if (refundAmount > 0) {
            totalEscrowedAmount -= refundAmount;
            bool success = paymentToken.transfer(stream.company, refundAmount);
            require(success, "Refund transfer failed");
        }

        emit StreamCancelled(_streamId, msg.sender, refundAmount);
    }

    /**
     * @dev Get all streams for an employee
     */
    function getEmployeeStreams(address _employee) external view returns (uint256[] memory) {
        return employeeStreams[_employee];
    }

    /**
     * @dev Get all streams for a company
     */
    function getCompanyStreams(address _company) external view returns (uint256[] memory) {
        return companyStreams[_company];
    }

    /**
     * @dev Get stream details
     */
    function getStreamDetails(uint256 _streamId)
        external
        view
        streamExists(_streamId)
        returns (
            address company,
            address employee,
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
            stream.totalAmount,
            stream.releaseRate,
            stream.startTime,
            stream.withdrawn,
            getAvailableAmount(_streamId),
            stream.isPaused,
            stream.isCancelled
        );
    }
}
