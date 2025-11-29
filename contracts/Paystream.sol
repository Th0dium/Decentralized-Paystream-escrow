// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Paystream
 * @dev A unified contract for payments with optional streaming and milestone-based escrow components.
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
    struct Payment {
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
        bool paused; // Payment-specific pause by company
        bool cancelled;
        uint64 totalPausedDuration; // Cumulative duration of all completed pauses
        uint64 pausedAt; // Timestamp when the current pause started (0 if not paused)
    }

    struct Milestone {
        uint256 paymentId; // Which payment this belongs to
        address submitter; // Employee who did the work
        uint256 amount; // How much escrow they're claiming
        MilestoneStatus status; // PENDING → APPROVED → CLAIMED
        uint256 createdAt; // When submitted
        uint256 approvedAt; // When auditor approved
    }

    // ============ State ============
    uint256 private _nextPaymentId = 1;
    uint256 private _nextMilestoneId = 1;

    mapping(uint256 => Payment) public payments;
    mapping(uint256 => Milestone) public milestones;
    mapping(uint256 => uint256[]) public paymentMilestones;
    mapping(address => uint256[]) public employeeMilestones;
    mapping(address => uint256[]) public companyPayments;
    mapping(address => uint256[]) public employeePayments;

    // --- Payment-Specific Roles ---
    mapping(uint256 => mapping(address => bool)) public isPaymentAuditor;
    mapping(address => uint256[]) public auditorPayments;

    // --- Admin-Controlled State ---
    bool public newPaymentsPaused;
    mapping(address => bool) public isTokenWhitelisted;

    // --- Validation Bounds ---
    uint256 public constant MIN_PAYMENT_DURATION = 1 days;
    uint256 public constant MAX_PAYMENT_DURATION = 365 days;
    uint256 public constant MIN_PAYMENT_AMOUNT = 1000; // 0.000000000001 tokens (wei)

    // ============ Events ============
    event NewPaymentCreationPaused(bool status);
    event TokenWhitelistUpdated(address indexed token, bool isWhitelisted);

    event PaymentAuditorAdded(uint256 indexed paymentId, address indexed auditor);
    event PaymentAuditorRemoved(
        uint256 indexed paymentId,
        address indexed auditor
    );

    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed company,
        address indexed employee,
        address token,
        uint256 streamAmount,
        uint256 escrowAmount,
        uint64 startTime,
        uint64 stopTime
    );

    event Withdrawn(
        uint256 indexed paymentId,
        address indexed employee,
        uint256 amount
    );
    event PaymentPaused(uint256 indexed paymentId, address indexed by);
    event PaymentResumed(uint256 indexed paymentId, address indexed by);
    event PaymentCancelled(
        uint256 indexed paymentId,
        address indexed by,
        uint256 refundedStream,
        uint256 refundedEscrow
    );

    event MilestoneSubmitted(
        uint256 indexed milestoneId,
        uint256 indexed paymentId,
        address indexed submitter,
        uint256 amount
    );
    event MilestoneApproved(
        uint256 indexed milestoneId,
        uint256 indexed paymentId,
        address indexed auditor
    );
    event MilestoneRejected(
        uint256 indexed milestoneId,
        uint256 indexed paymentId,
        address indexed auditor
    );
    event MilestoneClaimed(
        uint256 indexed milestoneId,
        uint256 indexed paymentId,
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
     * @notice Toggles the pause state for new payment creation.
     * @param status The new pause status.
     */
    function setNewPaymentPause(
        bool status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        newPaymentsPaused = status;
        emit NewPaymentCreationPaused(status);
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

    // ============ Payment Creation ============
    /**
     * @notice Create a new payment. The caller must have approved tokens.
     * @param employee Address receiving the payment
     * @param token ERC20 token address
     * @param streamAmount Amount to stream continuously over duration
     * @param escrowAmount Amount to lock in escrow for milestones
     * @param startTime Payment start timestamp
     * @param stopTime Payment end timestamp
     * @return paymentId The created payment ID
     */
    function createPayment(
        address employee,
        address token,
        uint256 streamAmount,
        uint256 escrowAmount,
        uint64 startTime,
        uint64 stopTime
    ) external nonReentrant returns (uint256) {
        require(isTokenWhitelisted[token], "token not whitelisted");
        require(!newPaymentsPaused, "payment creation is paused");
        require(employee != address(0), "invalid employee");
        require(employee != msg.sender, "company cannot be employee");
        require(token != address(0), "invalid token");
        require(
            streamAmount >= MIN_PAYMENT_AMOUNT || escrowAmount >= MIN_PAYMENT_AMOUNT,
            "amount too small"
        );
        require(stopTime > startTime, "stop time must be after start time");

        uint64 duration = stopTime - startTime;
        require(duration >= MIN_PAYMENT_DURATION, "duration too short");
        require(duration <= MAX_PAYMENT_DURATION, "duration too long");

        uint256 totalAmount = streamAmount + escrowAmount;

        // --- Fund Transfers ---
        IERC20 erc20 = IERC20(token);
        erc20.safeTransferFrom(msg.sender, address(this), totalAmount);

        // --- Payment Creation ---
        uint256 paymentId = _nextPaymentId++;
        payments[paymentId] = Payment({
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

        employeePayments[employee].push(paymentId);
        companyPayments[msg.sender].push(paymentId);

        emit PaymentCreated(
            paymentId,
            msg.sender,
            employee,
            token,
            streamAmount,
            escrowAmount,
            startTime,
            stopTime
        );
        return paymentId;
    }

    // ============ Payment-Specific Auditor Management ============
    function addPaymentAuditor(uint256 paymentId, address auditor) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not payment company");
        require(auditor != address(0), "auditor address cannot be zero");
        require(auditor != p.employee, "auditor cannot be employee");

        if (!isPaymentAuditor[paymentId][auditor]) {
            isPaymentAuditor[paymentId][auditor] = true;
            auditorPayments[auditor].push(paymentId);
            emit PaymentAuditorAdded(paymentId, auditor);
        }
    }

    function removePaymentAuditor(uint256 paymentId, address auditor) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not payment company");

        if (isPaymentAuditor[paymentId][auditor]) {
            isPaymentAuditor[paymentId][auditor] = false;
            _removeFromArray(auditorPayments[auditor], paymentId);
            emit PaymentAuditorRemoved(paymentId, auditor);
        }
    }

    // ============ Core Payment Interaction (Withdraw, Pause, etc.) ============

    function claimable(uint256 paymentId) public view returns (uint256) {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < p.startTime) return 0;

        uint64 totalDuration = p.stopTime - p.startTime;
        if (totalDuration == 0) return p.streamAmount - p.withdrawn;

        uint64 rawElapsed = nowTs > p.stopTime
            ? totalDuration
            : nowTs - p.startTime;

        uint64 currentPauseDuration = p.paused ? nowTs - p.pausedAt : 0;
        uint64 totalPausedTime = p.totalPausedDuration + currentPauseDuration;

        uint64 workingTime = rawElapsed > totalPausedTime
            ? rawElapsed - totalPausedTime
            : 0;

        uint256 accrued = (p.streamAmount * workingTime) / totalDuration;
        if (accrued > p.streamAmount) accrued = p.streamAmount;

        if (accrued <= p.withdrawn) return 0;
        return accrued - p.withdrawn;
    }

    function withdraw(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(!p.cancelled, "payment cancelled");
        require(!p.paused, "payment paused");
        require(msg.sender == p.employee, "not employee");

        uint256 amount = claimable(paymentId);
        require(amount > 0, "nothing to withdraw");

        p.withdrawn += amount;
        p.lastWithdrawTime = uint64(block.timestamp);

        p.token.safeTransfer(p.employee, amount);

        emit Withdrawn(paymentId, p.employee, amount);
    }

    function pausePayment(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not company");
        require(!p.paused, "already paused");

        p.paused = true;
        p.pausedAt = uint64(block.timestamp);
        emit PaymentPaused(paymentId, msg.sender);
    }

    function resumePayment(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not company");
        require(p.paused, "not paused");

        uint64 pauseDuration = uint64(block.timestamp) - p.pausedAt;

        p.paused = false;
        p.totalPausedDuration += pauseDuration;
        p.pausedAt = 0;

        emit PaymentResumed(paymentId, msg.sender);
    }

    function cancelPayment(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(!p.cancelled, "already cancelled");
        require(msg.sender == p.company, "not company");

        p.cancelled = true;

        // Calculate the total amount earned by the employee from the continuous stream
        uint256 totalAccrued = getTotalEarned(paymentId);

        // Refund the unearned stream amount
        uint256 refundStream = p.streamAmount > totalAccrued ? p.streamAmount - totalAccrued : 0;
        uint256 refundEscrow = p.escrowed;

        if (refundStream > 0) {
            p.token.safeTransfer(p.company, refundStream);
        }
        if (refundEscrow > 0) {
            p.token.safeTransfer(p.company, refundEscrow);
        }

        emit PaymentCancelled(paymentId, msg.sender, refundStream, refundEscrow);
    }

    // ============ Milestone Management ============

    function submitMilestone(
        uint256 paymentId,
        uint256 amount
    ) external returns (uint256) {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.employee, "not employee");
        require(amount > 0, "amount must be > 0");
        require(amount <= p.escrowed, "exceeds available escrow");

        uint256 milestoneId = _nextMilestoneId++;
        milestones[milestoneId] = Milestone({
            paymentId: paymentId,
            submitter: msg.sender,
            amount: amount,
            status: MilestoneStatus.PENDING,
            createdAt: block.timestamp,
            approvedAt: 0
        });

        paymentMilestones[paymentId].push(milestoneId);
        employeeMilestones[msg.sender].push(milestoneId);

        emit MilestoneSubmitted(milestoneId, paymentId, msg.sender, amount);
        return milestoneId;
    }

    function approveMilestone(uint256 milestoneId) external {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.PENDING, "milestone not pending");
        require(isPaymentAuditor[m.paymentId][msg.sender], "not payment auditor");
        require(msg.sender != m.submitter, "auditor cannot be submitter");

        m.status = MilestoneStatus.APPROVED;
        m.approvedAt = block.timestamp;

        emit MilestoneApproved(milestoneId, m.paymentId, msg.sender);
    }

    function rejectMilestone(uint256 milestoneId) external {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.PENDING, "milestone not pending");
        require(isPaymentAuditor[m.paymentId][msg.sender], "not payment auditor");
        require(msg.sender != m.submitter, "auditor cannot be submitter");

        m.status = MilestoneStatus.REJECTED;

        emit MilestoneRejected(milestoneId, m.paymentId, msg.sender);
    }

    function claimMilestone(uint256 milestoneId) external nonReentrant {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.APPROVED, "milestone not approved");

        Payment storage p = payments[m.paymentId];
        require(msg.sender == p.employee, "not employee");
        require(m.amount <= p.escrowed, "insufficient escrowed balance");

        m.status = MilestoneStatus.CLAIMED;
        p.escrowed -= m.amount;

        p.token.safeTransfer(m.submitter, m.amount);

        emit MilestoneClaimed(milestoneId, m.paymentId, m.submitter, m.amount);
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
    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    function getMilestone(
        uint256 milestoneId
    ) external view returns (Milestone memory) {
        return milestones[milestoneId];
    }

    function getPaymentMilestones(
        uint256 paymentId
    ) external view returns (uint256[] memory) {
        return paymentMilestones[paymentId];
    }

    function getEmployeeMilestones(
        address employee
    ) external view returns (uint256[] memory) {
        return employeeMilestones[employee];
    }

    function getEmployeePayments(
        address employee
    ) external view returns (uint256[] memory) {
        return employeePayments[employee];
    }

    function getCompanyPayments(
        address company
    ) external view returns (uint256[] memory) {
        return companyPayments[company];
    }

    function getAuditorPayments(
        address auditor
    ) external view returns (uint256[] memory) {
        return auditorPayments[auditor];
    }

    function getEscrowedAmount(
        uint256 paymentId
    ) external view returns (uint256) {
        return payments[paymentId].escrowed;
    }

    function getTotalEarned(uint256 paymentId) public view returns (uint256) {
        Payment storage p = payments[paymentId];

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < p.startTime) return 0;

        uint64 totalDuration = p.stopTime - p.startTime;
        if (totalDuration == 0) return p.streamAmount;

        uint64 rawElapsed = nowTs > p.stopTime
            ? totalDuration
            : nowTs - p.startTime;

        uint64 currentPauseDuration = p.paused ? nowTs - p.pausedAt : 0;
        uint64 totalPausedTime = p.totalPausedDuration + currentPauseDuration;

        uint64 workingTime = rawElapsed > totalPausedTime
            ? rawElapsed - totalPausedTime
            : 0;

        uint256 accrued = (p.streamAmount * workingTime) / totalDuration;
        if (accrued > p.streamAmount) accrued = p.streamAmount;

        return accrued;
    }
}
