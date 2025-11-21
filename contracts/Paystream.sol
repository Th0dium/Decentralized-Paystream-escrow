// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./StreamMath.sol";

/**
 * @title Paystream
 * @dev A unified, single-deployment contract for streaming payments and milestone-based escrow.
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
        uint256 totalAmount; // Total funded by company for the stream
        uint64 startTime;
        uint64 stopTime;
        uint64 lastWithdrawTime;
        uint256 withdrawn; // Total withdrawn (payout + escrowed)
        uint16 escrowBps; // Basis points to lock (e.g., 3000 = 30%)
        uint256 escrowed; // Amount currently locked in escrow
        bool paused; // Stream-specific pause by company
        bool cancelled;
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

    // --- Stream-Specific Roles ---
    mapping(uint256 => mapping(address => bool)) public isStreamAuditor;

    // --- Admin-Controlled State ---
    bool public newStreamsPaused;
    uint16 public platformFeeBps;
    address public feeRecipient;

    // --- Validation Bounds ---
    uint256 public constant MIN_STREAM_DURATION = 1 days;
    uint256 public constant MAX_STREAM_DURATION = 365 days;
    uint256 public constant MIN_STREAM_AMOUNT = 1000; // 0.000000000001 tokens (wei)

    // ============ Events ============
    event PlatformFeeUpdated(uint16 newFeeBps);
    event FeeRecipientUpdated(address indexed newRecipient);
    event NewStreamCreationPaused(bool status);

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
        uint256 totalAmount,
        uint64 startTime,
        uint64 stopTime,
        uint16 escrowBps,
        uint256 feeAmount
    );

    event Withdrawn(
        uint256 indexed streamId,
        address indexed employee,
        uint256 payout,
        uint256 escrowed
    );
    event StreamPaused(uint256 indexed streamId, address indexed by);
    event StreamResumed(uint256 indexed streamId, address indexed by);
    event StreamCancelled(
        uint256 indexed streamId,
        address indexed by,
        uint256 refunded
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
        platformFeeBps = 5; // Default 0.05%
        feeRecipient = msg.sender; // Default to deployer
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
     * @notice Sets the platform fee.
     * @param newFeeBps The new fee in basis points.
     */
    function setPlatformFee(
        uint16 newFeeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 10000, "fee cannot exceed 10000");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    /**
     * @notice Sets the recipient for platform fees.
     * @param newRecipient The new address to receive fees.
     */
    function setFeeRecipient(
        address newRecipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipient != address(0), "recipient cannot be zero");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    // ============ Stream Creation ============
    /**
     * @notice Create a new salary stream. The caller must have approved (totalAmount + fee) tokens.
     * @param employee Address receiving the stream
     * @param token ERC20 token address
     * @param totalAmount Total to stream over duration (excluding platform fee)
     * @param startTime Stream start timestamp
     * @param stopTime Stream end timestamp
     * @param escrowBps Basis points to lock in escrow (e.g., 3000 = 30%)
     * @return streamId The created stream ID
     */
    function createStream(
        address employee,
        address token,
        uint256 totalAmount,
        uint64 startTime,
        uint64 stopTime,
        uint16 escrowBps
    ) external nonReentrant returns (uint256) {
        require(!newStreamsPaused, "stream creation is paused");
        require(employee != address(0), "invalid employee");
        require(token != address(0), "invalid token");
        require(totalAmount >= MIN_STREAM_AMOUNT, "amount too small");
        require(stopTime > startTime, "stop time must be after start time");

        uint64 duration = stopTime - startTime;
        require(duration >= MIN_STREAM_DURATION, "duration too short");
        require(duration <= MAX_STREAM_DURATION, "duration too long");
        require(escrowBps <= 10000, "escrow bps cannot exceed 10000");

        // --- Fee Calculation ---
        uint256 feeAmount = 0;
        if (platformFeeBps > 0 && feeRecipient != address(0)) {
            feeAmount = (totalAmount * platformFeeBps) / 10000;
        }

        // --- Fund Transfers ---
        IERC20 erc20 = IERC20(token);
        if (feeAmount > 0) {
            erc20.safeTransferFrom(msg.sender, feeRecipient, feeAmount);
        }
        erc20.safeTransferFrom(msg.sender, address(this), totalAmount);

        // --- Stream Creation ---
        uint256 streamId = _nextStreamId++;
        streams[streamId] = Stream({
            company: msg.sender,
            employee: employee,
            token: erc20,
            totalAmount: totalAmount,
            startTime: startTime,
            stopTime: stopTime,
            lastWithdrawTime: startTime,
            withdrawn: 0,
            escrowBps: escrowBps,
            escrowed: 0,
            paused: false,
            cancelled: false
        });

        emit StreamCreated(
            streamId,
            msg.sender,
            employee,
            token,
            totalAmount,
            startTime,
            stopTime,
            escrowBps,
            feeAmount
        );
        return streamId;
    }

    // ============ Stream-Specific Auditor Management ============
    function addStreamAuditor(uint256 streamId, address auditor) external {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.company, "not stream company");
        require(auditor != address(0), "auditor address cannot be zero");
        isStreamAuditor[streamId][auditor] = true;
        emit StreamAuditorAdded(streamId, auditor);
    }

    function removeStreamAuditor(uint256 streamId, address auditor) external {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.company, "not stream company");
        isStreamAuditor[streamId][auditor] = false;
        emit StreamAuditorRemoved(streamId, auditor);
    }

    // ============ Core Stream Interaction (Withdraw, Pause, etc.) ============

    function claimable(uint256 streamId) public view returns (uint256) {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");

        uint64 nowTs = uint64(block.timestamp);
        uint64 elapsedSecs = StreamMath.elapsed(s.startTime, s.stopTime, nowTs);
        uint256 accrued = (s.totalAmount * elapsedSecs) /
            (s.stopTime - s.startTime);
        if (accrued > s.totalAmount) accrued = s.totalAmount;

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

        uint256 escrowAmount = (amount * s.escrowBps) / 10000;
        uint256 payout = amount - escrowAmount;

        s.withdrawn += amount;
        s.lastWithdrawTime = uint64(block.timestamp);
        s.escrowed += escrowAmount;

        if (payout > 0) {
            s.token.safeTransfer(s.employee, payout);
        }

        emit Withdrawn(streamId, s.employee, payout, escrowAmount);
    }

    function pauseStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.company, "not company");
        require(!s.paused, "already paused");

        s.paused = true;
        emit StreamPaused(streamId, msg.sender);
    }

    function resumeStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(msg.sender == s.company, "not company");
        require(s.paused, "not paused");

        s.paused = false;
        emit StreamResumed(streamId, msg.sender);
    }

    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        require(s.company != address(0), "stream does not exist");
        require(!s.cancelled, "already cancelled");
        require(msg.sender == s.company, "not company");

        s.cancelled = true;

        // The remaining unvested and unwithdrawn amount is refunded to the company.
        uint256 refundAmount = s.totalAmount - s.withdrawn; // Corrected logic
        if (refundAmount > 0) {
            s.token.safeTransfer(s.company, refundAmount);
        }

        emit StreamCancelled(streamId, msg.sender, refundAmount);
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

    function getEscrowedAmount(
        uint256 streamId
    ) external view returns (uint256) {
        return streams[streamId].escrowed;
    }

    function getTotalEarned(uint256 streamId) external view returns (uint256) {
        Stream storage s = streams[streamId];

        uint64 nowTs = uint64(block.timestamp);
        uint64 elapsedSecs = StreamMath.elapsed(s.startTime, s.stopTime, nowTs);
        uint256 accrued = (s.totalAmount * elapsedSecs) /
            (s.stopTime - s.startTime);
        if (accrued > s.totalAmount) accrued = s.totalAmount;

        return accrued;
    }
}
