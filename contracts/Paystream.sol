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

    /// @notice Possible states for a milestone submission
    enum MilestoneStatus {
        PENDING, // Awaiting auditor review
        APPROVED, // Approved by auditor, ready to claim
        REJECTED, // Rejected by auditor
        CLAIMED // Funds have been transferred to employee
    }

    /// @notice Represents a hybrid payment with streaming and escrow components
    struct Payment {
        string name; // Payment title/description
        address company; // Payer address
        address employee; // Payee address
        address auditor; // Milestone approver (can be company)
        string auditorPublicKey; // NaCl public key for evidence encryption (base64)
        IERC20 token; // ERC20 token used for payment
        uint256 streamAmount; // Total amount to stream linearly over duration
        uint256 escrowAmount; // Initial amount locked for milestone claims
        uint64 startTime; // Payment start timestamp
        uint64 stopTime; // Payment end timestamp
        uint64 lastWithdrawTime; // Last withdrawal timestamp (for tracking)
        uint256 withdrawn; // Total amount withdrawn from stream
        uint256 escrowed; // Current remaining escrow balance
        bool paused; // Stream pause state
        bool cancelled; // Cancellation state
        uint64 totalPausedDuration; // Accumulated pause time in seconds
        uint64 pausedAt; // Timestamp when last paused (0 if not paused)
    }

    /// @notice Represents a milestone submission for escrow fund release
    struct Milestone {
        uint256 paymentId; // Associated payment ID
        address submitter; // Employee who submitted (must match payment employee)
        uint256 amount; // Amount requested from escrow
        MilestoneStatus status; // Current approval status
        uint256 createdAt; // Submission timestamp
        uint256 approvedAt; // Approval timestamp (0 if not approved)
        string encryptedEvidenceHash; // Encrypted IPFS hash or public hash (JSON payload)
    }

    // Auto-incrementing ID counters
    uint256 private _nextPaymentId = 1;
    uint256 private _nextMilestoneId = 1;

    // Core data mappings
    mapping(uint256 => Payment) public payments; // paymentId => Payment
    mapping(uint256 => Milestone) public milestones; // milestoneId => Milestone
    mapping(uint256 => uint256[]) public paymentMilestones; // paymentId => milestoneIds[]
    mapping(address => uint256[]) public employeeMilestones; // employee => milestoneIds[]
    mapping(address => uint256[]) public companyPayments; // company => paymentIds[]
    mapping(address => uint256[]) public employeePayments; // employee => paymentIds[]
    mapping(address => uint256[]) public auditorPayments; // auditor => paymentIds[]

    // Admin controls
    bool public newPaymentsPaused; // Emergency pause for new payment creation
    mapping(address => bool) public isTokenWhitelisted; // Allowed ERC20 tokens

    // Payment validation constants
    uint256 public constant MIN_PAYMENT_DURATION = 1 days; // Minimum stream duration
    uint256 public constant MAX_PAYMENT_DURATION = 365 days; // Maximum stream duration (1 year)
    uint256 public constant MIN_PAYMENT_AMOUNT = 1000; // Minimum payment (in token's smallest unit)

    event NewPaymentCreationPaused(bool status);
    event TokenWhitelistUpdated(address indexed token, bool isWhitelisted);

    event PaymentCreated(
        uint256 paymentId,
        string name,
        address indexed company,
        address indexed employee,
        address indexed auditor,
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
    event MilestoneSubmittedWithEvidence(
        uint256 indexed milestoneId,
        uint256 indexed paymentId,
        address indexed submitter,
        uint256 amount,
        string encryptedEvidenceHash
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

    /**
     * @notice Contract initialization
     * @dev Grants admin role to deployer and whitelists common stablecoins
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Mainnet stablecoins
        isTokenWhitelisted[
            address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) // USDC
        ] = true;
        isTokenWhitelisted[
            address(0xdAC17F958D2ee523a2206206994597C13D831ec7) // USDT
        ] = true;
        isTokenWhitelisted[
            address(0x6B175474E89094C44Da98b954EedeAC495271d0F) // DAI
        ] = true;

        // Sepolia testnet tokens
        isTokenWhitelisted[
            address(0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) // USDC (Sepolia)
        ] = true;
        isTokenWhitelisted[
            address(0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0) // USDT (Sepolia)
        ] = true;
        isTokenWhitelisted[
            address(0xff34B3d4aEE5D82176C1E28c29d5cc3d426eb39D) // DAI (Sepolia)
        ] = true;
    }

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

    /**
     * @notice Create a new payment. The caller must have approved tokens.
     * @param name Name/Title of the payment
     * @param employee Address receiving the payment
     * @param auditor Address of the auditor for milestones. If address(0), company is the auditor.
     * @param auditorPublicKey Base64-encoded public key of auditor (NaCl Box format) for encrypting evidence
     * @param token ERC20 token address
     * @param streamAmount Amount to stream continuously over duration
     * @param escrowAmount Amount to lock in escrow for milestones
     * @param startTime Payment start timestamp
     * @param stopTime Payment end timestamp
     * @return paymentId The created payment ID
     */
    function createPayment(
        string memory name,
        address employee,
        address auditor,
        string memory auditorPublicKey,
        address token,
        uint256 streamAmount,
        uint256 escrowAmount,
        uint64 startTime,
        uint64 stopTime
    ) external nonReentrant returns (uint256) {
        require(isTokenWhitelisted[token], "token not whitelisted");
        require(!newPaymentsPaused, "payment creation is paused");
        require(employee != address(0), "invalid employee");
        require(token != address(0), "invalid token");
        require(bytes(name).length > 0, "name required");
        require(
            streamAmount >= MIN_PAYMENT_AMOUNT ||
                escrowAmount >= MIN_PAYMENT_AMOUNT,
            "amount too small"
        );
        require(stopTime > startTime, "stop time must be after start time");

        uint64 duration = stopTime - startTime;
        require(duration >= MIN_PAYMENT_DURATION, "duration too short");
        require(duration <= MAX_PAYMENT_DURATION, "duration too long");

        address finalAuditor = auditor == address(0) ? msg.sender : auditor;

        uint256 totalAmount = streamAmount + escrowAmount;

        IERC20 erc20 = IERC20(token);
        erc20.safeTransferFrom(msg.sender, address(this), totalAmount);

        uint256 paymentId = _nextPaymentId++;
        payments[paymentId] = Payment({
            name: name,
            company: msg.sender,
            employee: employee,
            auditor: finalAuditor,
            auditorPublicKey: auditorPublicKey,
            token: erc20,
            streamAmount: streamAmount,
            escrowAmount: escrowAmount,
            startTime: startTime,
            stopTime: stopTime,
            lastWithdrawTime: startTime,
            withdrawn: 0,
            escrowed: escrowAmount,
            paused: false,
            cancelled: false,
            totalPausedDuration: 0,
            pausedAt: 0
        });

        employeePayments[employee].push(paymentId);
        companyPayments[msg.sender].push(paymentId);
        auditorPayments[finalAuditor].push(paymentId);

        emit PaymentCreated(
            paymentId,
            name,
            msg.sender,
            employee,
            finalAuditor,
            token,
            streamAmount,
            escrowAmount,
            startTime,
            stopTime
        );
        return paymentId;
    }

    /**
     * @notice Calculate currently claimable stream amount for a payment
     * @dev Accounts for pause durations to ensure fair vesting
     * @param paymentId The payment to check
     * @return The amount available for withdrawal
     */
    function claimable(uint256 paymentId) public view returns (uint256) {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");

        uint64 nowTs = uint64(block.timestamp);
        // Payment hasn't started yet
        if (nowTs < p.startTime) return 0;

        uint64 totalDuration = p.stopTime - p.startTime;
        // Edge case: instant payment (should not happen due to MIN_PAYMENT_DURATION)
        if (totalDuration == 0) return p.streamAmount - p.withdrawn;

        // Cap elapsed time at total duration
        uint64 rawElapsed = nowTs > p.stopTime
            ? totalDuration
            : nowTs - p.startTime;

        // Calculate total pause time (historical + current if paused)
        uint64 currentPauseDuration = p.paused ? nowTs - p.pausedAt : 0;
        uint64 totalPausedTime = p.totalPausedDuration + currentPauseDuration;

        // Subtract paused time from elapsed time to get actual working time
        uint64 workingTime = rawElapsed > totalPausedTime
            ? rawElapsed - totalPausedTime
            : 0;

        // Linear vesting: (totalAmount * workingTime) / totalDuration
        uint256 accrued = (p.streamAmount * workingTime) / totalDuration;
        if (accrued > p.streamAmount) accrued = p.streamAmount; // Safety cap

        // Return only unvested amount
        if (accrued <= p.withdrawn) return 0;
        return accrued - p.withdrawn;
    }

    /**
     * @notice Withdraw vested stream funds
     * @dev Only employee can call; payment must be active (not paused/cancelled)
     * @param paymentId The payment to withdraw from
     */
    function withdraw(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(!p.cancelled, "payment cancelled");
        require(!p.paused, "payment paused");
        require(msg.sender == p.employee, "not employee");

        uint256 amount = claimable(paymentId);
        require(amount > 0, "nothing to withdraw");

        // Update state before transfer (CEI pattern)
        p.withdrawn += amount;
        p.lastWithdrawTime = uint64(block.timestamp);

        // Transfer vested stream amount to employee
        p.token.safeTransfer(p.employee, amount);

        emit Withdrawn(paymentId, p.employee, amount);
    }

    /**
     * @notice Pause stream vesting (company only)
     * @dev Stops time-based vesting; employee cannot withdraw while paused
     * @param paymentId The payment to pause
     */
    function pausePayment(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not company");
        require(!p.paused, "already paused");

        p.paused = true;
        p.pausedAt = uint64(block.timestamp); // Record pause start time
        emit PaymentPaused(paymentId, msg.sender);
    }

    /**
     * @notice Resume stream vesting (company only)
     * @dev Accumulates pause duration and resumes time-based vesting
     * @param paymentId The payment to resume
     */
    function resumePayment(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not company");
        require(p.paused, "not paused");

        // Calculate and accumulate pause duration
        uint64 pauseDuration = uint64(block.timestamp) - p.pausedAt;

        p.paused = false;
        p.totalPausedDuration += pauseDuration; // Add to total for claimable() calculation
        p.pausedAt = 0;

        emit PaymentResumed(paymentId, msg.sender);
    }

    /**
     * @notice Cancel payment and refund unvested funds (company only)
     * @dev Employee keeps earned stream funds; company gets back unvested stream + remaining escrow
     * @param paymentId The payment to cancel
     */
    function cancelPayment(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(!p.cancelled, "already cancelled");
        require(msg.sender == p.company, "not company");

        p.cancelled = true;

        // Calculate total earned (may exceed withdrawn if employee hasn't claimed yet)
        uint256 totalAccrued = getTotalEarned(paymentId);

        // Refund unvested stream amount
        uint256 refundStream = p.streamAmount > totalAccrued
            ? p.streamAmount - totalAccrued
            : 0;
        // Refund all remaining escrow (unclaimed milestones)
        uint256 refundEscrow = p.escrowed;

        // Transfer refunds to company (CEI pattern)
        if (refundStream > 0) {
            p.token.safeTransfer(p.company, refundStream);
        }
        if (refundEscrow > 0) {
            p.token.safeTransfer(p.company, refundEscrow);
        }

        emit PaymentCancelled(
            paymentId,
            msg.sender,
            refundStream,
            refundEscrow
        );
    }

    /**
     * @notice Submit a milestone without evidence (public mode)
     * @dev Employee requests escrow release; requires auditor approval
     * @param paymentId The payment this milestone belongs to
     * @param amount The escrow amount to claim (must not exceed current escrowed balance)
     * @return milestoneId The created milestone ID
     */
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
            approvedAt: 0,
            encryptedEvidenceHash: "" // No evidence for public submissions
        });

        // Track milestone associations
        paymentMilestones[paymentId].push(milestoneId);
        employeeMilestones[msg.sender].push(milestoneId);

        emit MilestoneSubmitted(milestoneId, paymentId, msg.sender, amount);
        return milestoneId;
    }

    /**
     * @notice Submit a milestone with encrypted evidence
     * Submits a milestone and includes encrypted evidence (IPFS hash encrypted with auditor's public key)
     * @param paymentId The payment this milestone is for
     * @param amount The amount of escrow being claimed
     * @param encryptedEvidenceHash JSON string containing {nonce, ciphertext, publicKey} (base64 encoded)
     * @return milestoneId The created milestone ID
     */
    function submitMilestoneWithEvidence(
        uint256 paymentId,
        uint256 amount,
        string memory encryptedEvidenceHash
    ) external returns (uint256) {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.employee, "not employee");
        require(amount > 0, "amount must be > 0");
        require(amount <= p.escrowed, "exceeds available escrow");
        require(
            bytes(encryptedEvidenceHash).length > 0,
            "encrypted evidence required"
        );

        uint256 milestoneId = _nextMilestoneId++;
        milestones[milestoneId] = Milestone({
            paymentId: paymentId,
            submitter: msg.sender,
            amount: amount,
            status: MilestoneStatus.PENDING,
            createdAt: block.timestamp,
            approvedAt: 0,
            encryptedEvidenceHash: encryptedEvidenceHash
        });

        paymentMilestones[paymentId].push(milestoneId);
        employeeMilestones[msg.sender].push(milestoneId);

        emit MilestoneSubmittedWithEvidence(
            milestoneId,
            paymentId,
            msg.sender,
            amount,
            encryptedEvidenceHash
        );
        return milestoneId;
    }

    /**
     * @notice Approve a pending milestone (auditor only)
     * @dev Changes status to APPROVED; employee can then claim funds
     * @param milestoneId The milestone to approve
     */
    function approveMilestone(uint256 milestoneId) external {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.PENDING, "milestone not pending");

        Payment storage p = payments[m.paymentId];
        require(msg.sender == p.auditor, "not payment auditor");
        require(p.auditor != m.submitter, "auditor cannot be submitter"); // Prevent self-approval

        m.status = MilestoneStatus.APPROVED;
        m.approvedAt = block.timestamp;

        emit MilestoneApproved(milestoneId, m.paymentId, msg.sender);
    }

    /**
     * @notice Reject a pending milestone (auditor only)
     * @dev Changes status to REJECTED; funds remain in escrow
     * @param milestoneId The milestone to reject
     */
    function rejectMilestone(uint256 milestoneId) external {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.PENDING, "milestone not pending");

        Payment storage p = payments[m.paymentId];
        require(msg.sender == p.auditor, "not payment auditor");
        require(p.auditor != m.submitter, "auditor cannot be submitter"); // Prevent self-rejection

        m.status = MilestoneStatus.REJECTED;

        emit MilestoneRejected(milestoneId, m.paymentId, msg.sender);
    }

    /**
     * @notice Claim funds from an approved milestone (employee only)
     * @dev Transfers escrow funds to employee and updates balances
     * @param milestoneId The approved milestone to claim
     */
    function claimMilestone(uint256 milestoneId) external nonReentrant {
        Milestone storage m = milestones[milestoneId];
        require(m.submitter != address(0), "milestone does not exist");
        require(m.status == MilestoneStatus.APPROVED, "milestone not approved");

        Payment storage p = payments[m.paymentId];
        require(msg.sender == p.employee, "not employee");
        require(m.amount <= p.escrowed, "insufficient escrowed balance");

        // Update state before transfer (CEI pattern)
        m.status = MilestoneStatus.CLAIMED;
        p.escrowed -= m.amount;

        // Transfer milestone amount from escrow to employee
        p.token.safeTransfer(m.submitter, m.amount);

        emit MilestoneClaimed(milestoneId, m.paymentId, m.submitter, m.amount);
    }

    /**
     * @notice Get complete payment details
     * @param paymentId The payment ID to query
     * @return The full Payment struct
     */
    function getPayment(
        uint256 paymentId
    ) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /**
     * @notice Get complete milestone details
     * @param milestoneId The milestone ID to query
     * @return The full Milestone struct
     */
    function getMilestone(
        uint256 milestoneId
    ) external view returns (Milestone memory) {
        return milestones[milestoneId];
    }

    /**
     * @notice Get all milestone IDs associated with a payment
     * @param paymentId The payment to query
     * @return Array of milestone IDs
     */
    function getPaymentMilestones(
        uint256 paymentId
    ) external view returns (uint256[] memory) {
        return paymentMilestones[paymentId];
    }

    /**
     * @notice Get all milestone IDs submitted by an employee
     * @param employee The employee address to query
     * @return Array of milestone IDs
     */
    function getEmployeeMilestones(
        address employee
    ) external view returns (uint256[] memory) {
        return employeeMilestones[employee];
    }

    /**
     * @notice Get all payment IDs where address is the employee
     * @param employee The employee address to query
     * @return Array of payment IDs
     */
    function getEmployeePayments(
        address employee
    ) external view returns (uint256[] memory) {
        return employeePayments[employee];
    }

    /**
     * @notice Get all payment IDs where address is the company
     * @param company The company address to query
     * @return Array of payment IDs
     */
    function getCompanyPayments(
        address company
    ) external view returns (uint256[] memory) {
        return companyPayments[company];
    }

    /**
     * @notice Get all payment IDs where address is the auditor
     * @param auditor The auditor address to query
     * @return Array of payment IDs
     */
    function getAuditorPayments(
        address auditor
    ) external view returns (uint256[] memory) {
        return auditorPayments[auditor];
    }

    /**
     * @notice Get current remaining escrow balance for a payment
     * @param paymentId The payment to query
     * @return Remaining escrowed amount
     */
    function getEscrowedAmount(
        uint256 paymentId
    ) external view returns (uint256) {
        return payments[paymentId].escrowed;
    }

    /**
     * @notice Calculate total earned stream amount (regardless of withdrawals)
     * @dev Used for cancellation refund calculations
     * @param paymentId The payment to calculate for
     * @return Total vested amount (may exceed withdrawn if employee hasn't claimed)
     */
    function getTotalEarned(uint256 paymentId) public view returns (uint256) {
        Payment storage p = payments[paymentId];

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < p.startTime) return 0;

        uint64 totalDuration = p.stopTime - p.startTime;
        if (totalDuration == 0) return p.streamAmount;

        // Calculate elapsed time (capped at stopTime)
        uint64 rawElapsed = nowTs > p.stopTime
            ? totalDuration
            : nowTs - p.startTime;

        // Account for pause time
        uint64 currentPauseDuration = p.paused ? nowTs - p.pausedAt : 0;
        uint64 totalPausedTime = p.totalPausedDuration + currentPauseDuration;

        // Calculate actual working time
        uint64 workingTime = rawElapsed > totalPausedTime
            ? rawElapsed - totalPausedTime
            : 0;

        // Linear vesting calculation
        uint256 accrued = (p.streamAmount * workingTime) / totalDuration;
        if (accrued > p.streamAmount) accrued = p.streamAmount;

        return accrued;
    }
}
