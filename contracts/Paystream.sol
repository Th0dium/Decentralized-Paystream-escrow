// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./StreamMath.sol";

/**
 * @title Paystream
 *
 * Flow:
 * 1. Company deposits funds → All locked in this contract
 * 2. Employee calls withdraw():
 *    - Calculate earned since last withdrawal
 *    - Transfer (100% - escrowBPS) to employee
 *    - Keep escrowBPS portion locked in contract.escrowed
 * 3. Employee submits milestone with IPFS hash
 * 4. Auditor approves milestone
 * 5. Employee claims approved escrowed amount
 */
contract Paystream is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using StreamMath for uint64;

    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

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
        uint256 totalAmount; // Total funded by company
        uint256 ratePerSecond; // Unlocks per second
        uint64 startTime; // Stream start
        uint64 stopTime; // Stream end
        uint64 lastWithdrawTime; // Last withdrawal timestamp
        uint256 withdrawn; // Total withdrawn (payout + escrowed)
        uint16 escrowBps; // Basis points to lock (e.g., 3000 = 30%)
        uint256 escrowed; // Amount locked in escrow (waiting for milestone approval)
        bool paused; // Stream frozen
        bool cancelled; // Stream ended
    }

    struct Milestone {
        uint256 streamId;
        address submitter; // Employee who submitted
        string ipfsHash; // IPFS proof of work
        uint256 amount; // Amount being claimed
        MilestoneStatus status; // PENDING → APPROVED/REJECTED → CLAIMED
        uint256 createdAt; // Submission timestamp
        uint256 approvedAt; // Approval timestamp (0 if not approved)
    }

    // ============ State ============
    uint256 private _nextStreamId = 1;
    uint256 private _nextMilestoneId = 1;

    mapping(uint256 => Stream) public streams;
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => uint256[]) public streamMilestones; // streamId => milestoneIds[]
    mapping(address => uint256[]) public employeeMilestones; // employee => milestoneIds[]

    // ============ Events ============
    event StreamCreated(
        uint256 indexed streamId,
        address indexed company,
        address indexed employee,
        address token,
        uint256 totalAmount,
        uint64 startTime,
        uint64 stopTime,
        uint16 escrowBps
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
        string ipfsHash,
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
        _grantRole(AUDITOR_ROLE, msg.sender);
    }

    // ============ Stream Management ============

    /**
     * @notice Create a new salary stream
     * @param employee Address receiving the stream
     * @param token ERC20 token address
     * @param totalAmount Total to stream over duration
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
        require(employee != address(0), "invalid employee");
        require(token != address(0), "invalid token");
        require(totalAmount > 0, "amount=0");
        require(stopTime > startTime, "bad duration");
        require(escrowBps <= 10000, "escrowBps > 10000");

        uint64 duration = stopTime - startTime;
        uint256 rate = totalAmount / duration;

        // Transfer funds from company to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);

        uint256 streamId = _nextStreamId++;
        streams[streamId] = Stream({
            company: msg.sender,
            employee: employee,
            token: IERC20(token),
            totalAmount: totalAmount,
            ratePerSecond: rate,
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
            escrowBps
        );
        return streamId;
    }

    /**
     * @notice Get how much is currently claimable (earned - already withdrawn)
     * @param streamId Stream ID
     * @return Claimable amount
     */
    function claimable(uint256 streamId) public view returns (uint256) {
        Stream storage s = streams[streamId];
        if (s.cancelled) return 0;

        uint64 nowTs = uint64(block.timestamp);
        uint64 elapsedSecs = StreamMath.elapsed(s.startTime, s.stopTime, nowTs);
        uint256 accrued = s.ratePerSecond * elapsedSecs;
        if (accrued > s.totalAmount) accrued = s.totalAmount;

        if (accrued <= s.withdrawn) return 0;
        return accrued - s.withdrawn;
    }

    /**
     * @notice Withdraw earned salary
     *
     * Flow:
     * 1. Calculate earned since last withdrawal
     * 2. Split into: payout (100% - escrowBPS) + escrowed (escrowBPS%)
     * 3. Transfer payout to employee immediately
     * 4. Lock escrowed portion in contract.escrowed
     *
     * @param streamId Stream ID
     */
    function withdraw(uint256 streamId) external nonReentrant whenNotPaused {
        Stream storage s = streams[streamId];
        require(!s.paused, "stream paused");
        require(!s.cancelled, "stream cancelled");
        require(msg.sender == s.employee, "not employee");

        uint256 amount = claimable(streamId);
        require(amount > 0, "nothing to withdraw");

        // Calculate split
        uint256 escrowAmount = (amount * s.escrowBps) / 10000;
        uint256 payout = amount - escrowAmount;

        // Update state
        s.withdrawn += amount;
        s.lastWithdrawTime = uint64(block.timestamp);
        s.escrowed += escrowAmount;

        // Transfer payout to employee
        if (payout > 0) {
            s.token.safeTransfer(s.employee, payout);
        }

        emit Withdrawn(streamId, s.employee, payout, escrowAmount);
    }

    /**
     * @notice Pause a stream (company only)
     * @param streamId Stream ID
     */
    function pauseStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(msg.sender == s.company, "not company");
        require(!s.paused, "already paused");

        s.paused = true;
        emit StreamPaused(streamId, msg.sender);
    }

    /**
     * @notice Resume a paused stream (company only)
     * @param streamId Stream ID
     */
    function resumeStream(uint256 streamId) external {
        Stream storage s = streams[streamId];
        require(msg.sender == s.company, "not company");
        require(s.paused, "not paused");

        s.paused = false;
        emit StreamResumed(streamId, msg.sender);
    }

    /**
     * @notice Cancel a stream and refund unlocked amount to company
     *
     * Note: Escrowed funds remain locked until milestones are resolved
     *
     * @param streamId Stream ID
     */
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        require(!s.cancelled, "already cancelled");
        require(
            msg.sender == s.company || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "not authorized"
        );

        s.cancelled = true;

        // Calculate accrued and refund unlocked remainder
        uint64 nowTs = uint64(block.timestamp);
        uint64 elapsedSecs = StreamMath.elapsed(s.startTime, s.stopTime, nowTs);
        uint256 accrued = s.ratePerSecond * elapsedSecs;
        if (accrued > s.totalAmount) accrued = s.totalAmount;

        uint256 owed = 0;
        if (accrued > s.withdrawn) {
            owed = accrued - s.withdrawn;
        }

        // Refund unlocked remainder (escrowed stays locked for milestones)
        if (owed > 0) {
            s.withdrawn += owed;
            s.token.safeTransfer(s.company, owed);
        }

        emit StreamCancelled(streamId, msg.sender, owed);
    }

    // ============ Milestone Management ============

    /**
     * @notice Employee submits a milestone for work completed
     *
     * @param streamId Stream ID
     * @param ipfsHash IPFS hash of proof/documentation
     * @param amount Amount being claimed from escrow (must be <= stream.escrowed)
     * @return milestoneId The created milestone ID
     */
    function submitMilestone(
        uint256 streamId,
        string calldata ipfsHash,
        uint256 amount
    ) external returns (uint256) {
        Stream storage s = streams[streamId];
        require(msg.sender == s.employee, "not employee");
        require(amount > 0, "amount=0");
        require(amount <= s.escrowed, "exceeds escrowed");
        require(bytes(ipfsHash).length > 0, "no ipfs hash");

        uint256 milestoneId = _nextMilestoneId++;
        milestones[milestoneId] = Milestone({
            streamId: streamId,
            submitter: msg.sender,
            ipfsHash: ipfsHash,
            amount: amount,
            status: MilestoneStatus.PENDING,
            createdAt: block.timestamp,
            approvedAt: 0
        });

        streamMilestones[streamId].push(milestoneId);
        employeeMilestones[msg.sender].push(milestoneId);

        emit MilestoneSubmitted(
            milestoneId,
            streamId,
            msg.sender,
            ipfsHash,
            amount
        );
        return milestoneId;
    }

    /**
     * @notice Auditor approves a milestone
     * @param milestoneId Milestone ID
     */
    function approveMilestone(
        uint256 milestoneId
    ) external onlyRole(AUDITOR_ROLE) {
        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.PENDING, "not pending");

        m.status = MilestoneStatus.APPROVED;
        m.approvedAt = block.timestamp;

        emit MilestoneApproved(milestoneId, m.streamId, msg.sender);
    }

    /**
     * @notice Auditor rejects a milestone (returns escrowed amount to available escrow)
     * @param milestoneId Milestone ID
     */
    function rejectMilestone(
        uint256 milestoneId
    ) external onlyRole(AUDITOR_ROLE) {
        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.PENDING, "not pending");

        m.status = MilestoneStatus.REJECTED;

        emit MilestoneRejected(milestoneId, m.streamId, msg.sender);
    }

    /**
     * @notice Employee claims approved milestone escrowed amount
     *
     * Flow:
     * 1. Milestone must be APPROVED
     * 2. Transfer amount from contract.escrowed to employee
     * 3. Reduce stream.escrowed by amount
     * 4. Mark milestone as CLAIMED
     *
     * @param milestoneId Milestone ID
     */
    function claimMilestone(
        uint256 milestoneId
    ) external nonReentrant whenNotPaused {
        Milestone storage m = milestones[milestoneId];
        require(m.status == MilestoneStatus.APPROVED, "not approved");

        Stream storage s = streams[m.streamId];
        require(msg.sender == s.employee, "not employee");
        require(m.amount <= s.escrowed, "insufficient escrowed");

        m.status = MilestoneStatus.CLAIMED;
        s.escrowed -= m.amount;

        s.token.safeTransfer(m.submitter, m.amount);

        emit MilestoneClaimed(milestoneId, m.streamId, m.submitter, m.amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get full stream details
     * @param streamId Stream ID
     */
    function getStream(uint256 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }

    /**
     * @notice Get full milestone details
     * @param milestoneId Milestone ID
     */
    function getMilestone(
        uint256 milestoneId
    ) external view returns (Milestone memory) {
        return milestones[milestoneId];
    }

    /**
     * @notice Get all milestone IDs for a stream
     * @param streamId Stream ID
     */
    function getStreamMilestones(
        uint256 streamId
    ) external view returns (uint256[] memory) {
        return streamMilestones[streamId];
    }

    /**
     * @notice Get all milestone IDs for an employee
     * @param employee Employee address
     */
    function getEmployeeMilestones(
        address employee
    ) external view returns (uint256[] memory) {
        return employeeMilestones[employee];
    }

    /**
     * @notice Get available escrowed amount for a stream
     * @param streamId Stream ID
     */
    function getEscrowedAmount(
        uint256 streamId
    ) external view returns (uint256) {
        return streams[streamId].escrowed;
    }

    /**
     * @notice Get total earned for a stream (including withdrawn + claimable)
     * @param streamId Stream ID
     */
    function getTotalEarned(uint256 streamId) external view returns (uint256) {
        Stream storage s = streams[streamId];
        if (s.cancelled) return s.withdrawn;

        uint64 nowTs = uint64(block.timestamp);
        uint64 elapsedSecs = StreamMath.elapsed(s.startTime, s.stopTime, nowTs);
        uint256 accrued = s.ratePerSecond * elapsedSecs;
        if (accrued > s.totalAmount) accrued = s.totalAmount;

        return accrued;
    }

    // ============ Admin Functions ============

    /**
     * @notice Admin: Sweep tokens accidentally sent to contract
     * @param token Token address
     * @param to Recipient
     * @param amount Amount to sweep
     */
    function sweepToken(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(to, amount);
    }
}
