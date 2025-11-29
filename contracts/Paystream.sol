// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Paystream
 * @dev A unified contract for streaming payments with optional milestone-based escrow.
 * Users specify:
 * - streamAmount: Amount to stream continuously
 * - escrowAmount: Initial escrow amount locked for milestones
 *
 * When employee withdraws from stream, the escrowAmount stays locked.
 * Employee submits milestones to claim from escrowed funds.
 *
 * Administrative functions are controlled by the DEFAULT_ADMIN_ROLE.
 */
contract Paystream is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    // ============ Enums ============
    enum MilestoneStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CLAIMED
    }

    // ============ Structs ============
    struct Stream {
        address company;
        address employee;
        IERC20 token;
        uint256 streamAmount; // Amount for continuous streaming
        uint256 escrowAmount; // Initial escrow amount locked for milestones
        uint64 startTime;
        uint64 stopTime;
        uint64 lastWithdrawTime;
        uint256 withdrawn; // Total withdrawn from stream
        uint256 escrowed; // Current amount locked in escrow (starts at escrowAmount)
        bool paused; // Stream-specific pause by company
        bool cancelled;
        uint64 totalPausedDuration; // Cumulative duration of all completed pauses
        uint64 pausedAt; // Timestamp when the current pause started (0 if not paused)
    }

    struct Milestone {
        uint256 streamId; // Which salary stream this belongs to
        address submitter; // Employee who did the work
        uint256 amount; // How much escrow they're claiming
        MilestoneStatus status; // PENDING → APPROVED → CLAIMED
        uint256 createdAt; // When submitted
        uint256 approvedAt; // When auditor approved
    }

    // ============ State ============
    uint256 private _nextStreamId = 1;
    uint256 private _nextMilestoneId = 1;

    mapping(uint256 => Stream) public streams;
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => uint256[]) public streamMilestones;
    mapping(address => uint256[]) public employeeMilestones;
    mapping(address => uint256[]) public companyStreams;
    mapping(address => uint256[]) public employeeStreams;

    // --- Stream-Specific Roles ---
    mapping(uint256 => mapping(address => bool)) public isStreamAuditor;
    mapping(address => uint256[]) public auditorStreams;

    // --- Admin-Controlled State ---
    bool public newStreamsPaused;
    mapping(address => bool) public isTokenWhitelisted;

    // --- Validation Bounds ---
    uint256 public constant MIN_STREAM_DURATION = 1 days;
    uint256 public constant MAX_STREAM_DURATION = 365 days;
    uint256 public constant MIN_STREAM_AMOUNT = 1000; // 0.000000000001 tokens (wei)

    // ============ Events ============
    event NewStreamCreationPaused(bool status);
    event TokenWhitelistUpdated(address indexed token, bool isWhitelisted);

    event StreamAuditorAdded(uint256 indexed streamId, address indexed auditor);
    event StreamAuditorRemoved(
        uint256 indexed streamId,
        address indexed auditor
    );

    event StreamCreated(
        uint256 indexed streamId,
        address indexed company,
        address indexed employee,
        address token,
        uint256 streamAmount,
        uint256 escrowAmount,
        uint64 startTime,
        uint64 stopTime
    );

    event Withdrawn(
        uint256 indexed streamId,
        address indexed employee,
        uint256 amount
    );
    event StreamPaused(uint256 indexed streamId, address indexed by);
    event StreamResumed(uint256 indexed streamId, address indexed by);
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed by,
        uint256 refundedStream,
        uint256 refundedEscrow
    );

    event MilestoneSubmitted(
        uint256 indexed milestoneId,
        uint256 indexed streamId,
        address indexed submitter,
        uint256 amount
    );
    event MilestoneApproved(
        uint256 indexed milestoneId,
        uint256 indexed streamId,
        address indexed auditor
    );
    event MilestoneRejected(
        uint256 indexed milestoneId,
        uint256 indexed streamId,
        address indexed auditor
    );
    event MilestoneClaimed(
        uint256 indexed milestoneId,
        uint256 indexed streamId,
        address indexed employee,
        uint256 amount
    );

    // ============ Constructor ============
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // USDC Mainnet: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        isTokenWhitelisted[
            address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
        ] = true;
        // USDT Mainnet: 0xdAC17F958D2ee523a2206206994597C13D831ec7
        isTokenWhitelisted[
            address(0xdAC17F958D2ee523a2206206994597C13D831ec7)
        ] = true;
        // DAI Mainnet: 0x6B175474E89094C44Da98b954EedeAC495271d0F
        isTokenWhitelisted[
            address(0x6B175474E89094C44Da98b954EedeAC495271d0F)
        ] = true;

        // USDC Sepolia: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
        isTokenWhitelisted[
            address(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
        ] = true;
        // USDT Sepolia: 0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0
        isTokenWhitelisted[
            address(0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0)
        ] = true;
        // DAI Sepolia: 0xff34B3d4aEE5D82176C1E28c29d5cc3d426eb39D
        isTokenWhitelisted[
            address(0xff34B3d4aEE5D82176C1E28c29d5cc3d426eb39D)
        ] = true;
    }

    // ============ Admin Functions ============
    /**
     * @notice Toggles the pause state for new stream creation.
     * @param status The new pause status.
     */
    function setNewStreamPause(
        bool status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        newStreamsPaused = status;
        emit NewStreamCreationPaused(status);
    }

    /**
     * @notice Add or remove a token from the whitelist (admin only)
     * @param token The ERC20 token address
     * @param whitelisted The desired whitelist status
     */
    function updateTokenWhitelist(
        address token,
        bool whitelisted
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "invalid token address");
        isTokenWhitelisted[token] = whitelisted;
        emit TokenWhitelistUpdated(token, whitelisted);
    }

    // ============ Stream Creation ============
    /**
     * @notice Create a new salary stream. The caller must have approved tokens.
     * @param employee Address receiving the stream
     * @param token ERC20 token address
     * @param streamAmount Amount to stream continuously over duration
     * @param escrowAmount Amount to lock in escrow for milestones
     * @param startTime Stream start timestamp
     * @param stopTime Stream end timestamp
     * @return streamId The created stream ID
     */
    function createStream(
        address employee,
        address token,
        uint256 streamAmount,
        uint256 escrowAmount,
        uint64 startTime,
        uint64 stopTime
    ) external nonReentrant returns (uint256) {
        require(isTokenWhitelisted[token], "token not whitelisted");
        require(!newStreamsPaused, "stream creation is paused");
        require(employee != address(0), "invalid employee");
        require(employee != msg.sender, "company cannot be employee");
        require(token != address(0), "invalid token");
        require(
            streamAmount >= MIN_STREAM_AMOUNT || escrowAmount >= MIN_STREAM_AMOUNT,
            "amount too small"
        );
        require(stopTime > startTime, "stop time must be after start time");

        uint64 duration = stopTime - startTime;
        require(duration >= MIN_STREAM_DURATION, "duration too short");
        require(duration <= MAX_STREAM_DURATION, "duration too long");

        uint256 totalAmount = streamAmount + escrowAmount;

        // --- Fund Transfers ---
        IERC20 erc20 = IERC20(token);
        erc20.safeTransferFrom(msg.sender, address(this), totalAmount);

        // --- Stream Creation ---
        uint256 streamId = _nextStreamId++;
        streams[streamId] = Stream({
            company: msg.sender,
            employee: employee,
            token: erc20,
            streamAmount: streamAmount,
            escrowAmount: escrowAmount,
            startTime: startTime,
            stopTime: stopTime,
            lastWithdrawTime: startTime,
            withdrawn: 0,
            escrowed: escrowAmount, // Initialize escrowed with escrowAmount
            paused: false,
            cancelled: false,
            totalPausedDuration: 0,
            pausedAt: 0
        });

        employeeStreams[employee].push(streamId);
        companyStreams[msg.sender].push(streamId);

        emit StreamCreated(
            streamId,
            msg.sender,
            employee,
            token,
            streamAmount,
            escrowAmount,
            startTime,
            stopTime
        );
        return streamId;
    }

    // ============ Stream-Specific Auditor Management ============
    function addStreamAuditor(uint256 streamId, address auditor) external {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.company, "not stream company");
        require(auditor != address(0), "auditor address cannot be zero");
        require(auditor != s.employee, "auditor cannot be employee");

        if (!isStreamAuditor[streamId][auditor]) {
            isStreamAuditor[streamId][auditor] = true;
            auditorStreams[auditor].push(streamId);
            emit StreamAuditorAdded(streamId, auditor);
        }
    }

    function removeStreamAuditor(uint256 streamId, address auditor) external {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.company, "not stream company");

        if (isStreamAuditor[streamId][auditor]) {
            isStreamAuditor[streamId][auditor] = false;
            _removeFromArray(auditorStreams[auditor], streamId);
            emit StreamAuditorRemoved(streamId, auditor);
        }
    }

    // ============ Core Stream Interaction (Withdraw, Pause, etc.) ============

    function claimable(uint256 streamId) public view returns (uint256) {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < s.startTime) return 0;

        uint64 totalDuration = s.stopTime - s.startTime;
        if (totalDuration == 0) return s.streamAmount - s.withdrawn;

        uint64 rawElapsed = nowTs > s.stopTime
            ? totalDuration
            : nowTs - s.startTime;

        uint64 currentPauseDuration = s.paused ? nowTs - s.pausedAt : 0;
        uint64 totalPausedTime = s.totalPausedDuration + currentPauseDuration;

        uint64 workingTime = rawElapsed > totalPausedTime
            ? rawElapsed - totalPausedTime
            : 0;

        uint256 accrued = (s.streamAmount * workingTime) / totalDuration;
        if (accrued > s.streamAmount) accrued = s.streamAmount;

        if (accrued <= s.withdrawn) return 0;
        return accrued - s.withdrawn;
    }

    function withdraw(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(!s.cancelled, "stream cancelled");
        require(!s.paused, "stream paused");
        require(msg.sender == s.employee, "not employee");

        uint256 amount = claimable(streamId);
        require(amount > 0, "nothing to withdraw");

        s.withdrawn += amount;
        s.lastWithdrawTime = uint64(block.timestamp);

        s.token.safeTransfer(s.employee, amount);

        emit Withdrawn(streamId, s.employee, amount);
    }

    function pauseStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.company, "not company");
        require(!s.paused, "already paused");

        s.paused = true;
        s.pausedAt = uint64(block.timestamp);
        emit StreamPaused(streamId, msg.sender);
    }

    function resumeStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.company, "not company");
        require(s.paused, "not paused");

        uint64 pauseDuration = uint64(block.timestamp) - s.pausedAt;

        s.paused = false;
        s.totalPausedDuration += pauseDuration;
        s.pausedAt = 0;

        emit StreamResumed(streamId, msg.sender);
    }

    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(!s.cancelled, "already cancelled");
        require(msg.sender == s.company, "not company");

        s.cancelled = true;

        // Calculate the total amount earned by the employee from the continuous stream
        uint256 totalAccrued = getTotalEarned(streamId);

        // Refund the unearned stream amount
        // If streamAmount is less than totalAccrued (e.g., due to rounding or edge cases), refund 0 for stream.
        uint256 refundStream = s.streamAmount > totalAccrued ? s.streamAmount - totalAccrued : 0;
        uint256 refundEscrow = s.escrowed;

        if (refundStream > 0) {
            s.token.safeTransfer(s.company, refundStream);
        }
        if (refundEscrow > 0) {
            s.token.safeTransfer(s.company, refundEscrow);
        }

        emit StreamCancelled(streamId, msg.sender, refundStream, refundEscrow);
    }

    // ============ Milestone Management ============

    function submitMilestone(
        uint256 streamId,
        uint256 amount
    ) external returns (uint256) {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.employee, "not employee");
        require(amount > 0, "amount must be > 0");
        require(amount <= s.escrowed, "exceeds available escrow");

        uint256 milestoneId = _nextMilestoneId++;
        milestones[milestoneId] = Milestone({
            streamId: streamId,
            submitter: msg.sender,
            amount: amount,
            status: MilestoneStatus.PENDING,
            createdAt: block.timestamp,
            approvedAt: 0
        });

        streamMilestones[streamId].push(milestoneId);
        employeeMilestones[msg.sender].push(milestoneId);

        emit MilestoneSubmitted(milestoneId, streamId, msg.sender, amount);
        return milestoneId;
    }

    function approveMilestone(uint256 milestoneId) external {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.PENDING, "milestone not pending");
        require(isStreamAuditor[m.streamId][msg.sender], "not stream auditor");
        require(msg.sender != m.submitter, "auditor cannot be submitter");

        m.status = MilestoneStatus.APPROVED;
        m.approvedAt = block.timestamp;

        emit MilestoneApproved(milestoneId, m.streamId, msg.sender);
    }

    function rejectMilestone(uint256 milestoneId) external {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.PENDING, "milestone not pending");
        require(isStreamAuditor[m.streamId][msg.sender], "not stream auditor");
        require(msg.sender != m.submitter, "auditor cannot be submitter");

        m.status = MilestoneStatus.REJECTED;

        emit MilestoneRejected(milestoneId, m.streamId, msg.sender);
    }

    function claimMilestone(uint256 milestoneId) external nonReentrant {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.APPROVED, "milestone not approved");

        Stream storage s = streams[m.streamId];
        require(msg.sender == s.employee, "not employee");
        require(m.amount <= s.escrowed, "insufficient escrowed balance");

        m.status = MilestoneStatus.CLAIMED;
        s.escrowed -= m.amount;

        s.token.safeTransfer(m.submitter, m.amount);

        emit MilestoneClaimed(milestoneId, m.streamId, m.submitter, m.amount);
    }

    // ============ Internal Helper ============
    /**
     * @dev Internal helper to remove a value from a uint256 array.
     * Swaps the element to delete with the last element, then pops.
     * Order is NOT preserved.
     */
    function _removeFromArray(uint256[] storage array, uint256 value) internal {
        uint256 length = array.length;
        for (uint256 i = 0; i < length; i++) {
            if (array[i] == value) {
                if (i != length - 1) {
                    array[i] = array[length - 1];
                }
                array.pop();
                break;
            }
        }
    }

    // ============ View Functions ============
    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }

    function getMilestone(
        uint256 milestoneId
    ) external view returns (Milestone memory) {
        return milestones[milestoneId];
    }

    function getStreamMilestones(
        uint256 streamId
    ) external view returns (uint256[] memory) {
        return streamMilestones[streamId];
    }

    function getEmployeeMilestones(
        address employee
    ) external view returns (uint256[] memory) {
        return employeeMilestones[employee];
    }

    function getEmployeeStreams(
        address employee
    ) external view returns (uint256[] memory) {
        return employeeStreams[employee];
    }

    function getCompanyStreams(
        address company
    ) external view returns (uint256[] memory) {
        return companyStreams[company];
    }

    function getAuditorStreams(
        address auditor
    ) external view returns (uint256[] memory) {
        return auditorStreams[auditor];
    }

    function getEscrowedAmount(
        uint256 streamId
    ) external view returns (uint256) {
        return streams[streamId].escrowed;
    }

    function getTotalEarned(uint256 streamId) external view returns (uint256) {
        Stream storage s = streams[streamId];

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < s.startTime) return 0;

        uint64 totalDuration = s.stopTime - s.startTime;
        if (totalDuration == 0) return s.streamAmount;

        uint64 rawElapsed = nowTs > s.stopTime
            ? totalDuration
            : nowTs - s.startTime;

        uint64 currentPauseDuration = s.paused ? nowTs - s.pausedAt : 0;
        uint64 totalPausedTime = s.totalPausedDuration + currentPauseDuration;

        uint64 workingTime = rawElapsed > totalPausedTime
            ? rawElapsed - totalPausedTime
            : 0;

        uint256 accrued = (s.streamAmount * workingTime) / totalDuration;
        if (accrued > s.streamAmount) accrued = s.streamAmount;

        return accrued;
    }
}
