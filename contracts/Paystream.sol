// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Paystream
 * @dev Unified contract with 2 separate protocols:
 * - Payment Protocol: Time-based streaming payments.
 * - Escrow Protocol: Milestone-based payments requiring auditor approval.
 *
 * @notice This contract manages the on-chain logic for payment streams and escrows.
 * The roles of "Company", "Employee", and "Auditor" are defined contextually per payment/escrow.
 * An off-chain backend service is expected to manage user profiles and persistent roles.
 * - A user becomes a "Company" by creating a payment stream.
 * - A user becomes an "Employee" by being the recipient of a stream or escrow.
 * - A user becomes an "Auditor" by being assigned to a stream or escrow for oversight.
 */
contract Paystream is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    // ============ Enums ============
    enum EscrowStatus {
        PENDING, // Created, waiting for approval
        APPROVED, // Auditor approved
        REJECTED, // Auditor rejected
        CLAIMED, // Employee claimed
        CANCELLED // Company cancelled
    }

    // ============ Structs ============

    /**
     * @notice Payment Protocol: Pure streaming payment
     * No escrow logic - 100% withdraw as it unlocks
     */
    struct Payment {
        address company;
        address employee;
        IERC20 token;
        uint256 totalAmount; // Total funded by company
        uint64 startTime; // Stream start
        uint64 stopTime; // Stream end
        uint64 lastWithdrawTime; // Last withdrawal timestamp
        uint256 withdrawn; // Total withdrawn
        bool paused; // Stream paused by company
        bool cancelled; // Stream cancelled
        uint64 totalPausedDuration; // Cumulative pause duration
        uint64 pausedAt; // Current pause start (0 if not paused)
    }

    /**
     * @notice Escrow Protocol: Milestone-based payment
     * Requires auditor approval before employee can claim
     */
    struct Escrow {
        uint256 paymentId; // Optional link to payment (0 = standalone)
        address company;
        address employee;
        IERC20 token;
        uint256 amount; // Escrowed amount
        string description; // Brief on-chain description
        EscrowStatus status; // Lifecycle status
        uint256 createdAt; // Creation timestamp
        uint256 approvedAt; // Approval timestamp (0 if not approved)
        uint256 claimedAt; // Claim timestamp (0 if not claimed)
    }

    // ============ State ============
    uint256 private _nextPaymentId = 1;
    uint256 private _nextEscrowId = 1;

    mapping(uint256 => Payment) public payments;
    mapping(uint256 => Escrow) public escrows;

    // Tracking arrays
    mapping(address => uint256[]) public employeePayments;
    mapping(address => uint256[]) public companyPayments;
    mapping(address => uint256[]) public employeeEscrows;
    mapping(address => uint256[]) public companyEscrows;
    mapping(uint256 => uint256[]) public paymentEscrows; // paymentId => escrowIds[]

    // Auditor management
    mapping(uint256 => mapping(address => bool)) public isPaymentAuditor;
    mapping(uint256 => mapping(address => bool)) public isEscrowAuditor;

    // Admin settings
    bool public newPaymentsPaused;
    uint16 public platformFeeBps;
    address public feeRecipient;
    mapping(address => bool) public isTokenWhitelisted;

    // Validation bounds
    uint256 public constant MIN_PAYMENT_DURATION = 1 days;
    uint256 public constant MAX_PAYMENT_DURATION = 365 days;
    uint256 public constant MIN_PAYMENT_AMOUNT = 1000; // wei
    uint256 public constant MIN_ESCROW_AMOUNT = 1000; // wei

    // ============ Events ============

    // Admin events
    event PlatformFeeUpdated(uint16 newFeeBps);
    event FeeRecipientUpdated(address indexed newRecipient);
    event NewPaymentsCreationPaused(bool status);
    event TokenWhitelistUpdated(address indexed token, bool isWhitelisted);

    // Payment events
    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed company,
        address indexed employee,
        address token,
        uint256 totalAmount,
        uint64 startTime,
        uint64 stopTime,
        uint256 feeAmount
    );
    event PaymentWithdrawn(
        uint256 indexed paymentId,
        address indexed employee,
        uint256 amount
    );
    event PaymentPaused(uint256 indexed paymentId, address indexed by);
    event PaymentResumed(uint256 indexed paymentId, address indexed by);
    event PaymentCancelled(
        uint256 indexed paymentId,
        address indexed by,
        uint256 refunded
    );

    // Escrow events
    event EscrowCreated(
        uint256 escrowId,
        uint256 indexed paymentId,
        address indexed company,
        address indexed employee,
        address token,
        uint256 amount,
        string description
    );
    event EscrowApproved(uint256 indexed escrowId, address indexed auditor);
    event EscrowRejected(uint256 indexed escrowId, address indexed auditor);
    event EscrowClaimed(
        uint256 indexed escrowId,
        address indexed employee,
        uint256 amount
    );
    event EscrowCancelled(
        uint256 indexed escrowId,
        address indexed company,
        uint256 refunded
    );

    // Auditor events
    event PaymentAuditorAdded(
        uint256 indexed paymentId,
        address indexed auditor
    );
    event PaymentAuditorRemoved(
        uint256 indexed paymentId,
        address indexed auditor
    );
    event EscrowAuditorAdded(uint256 indexed escrowId, address indexed auditor);
    event EscrowAuditorRemoved(
        uint256 indexed escrowId,
        address indexed auditor
    );

    // ============ Constructor ============
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        platformFeeBps = 5; // Default 0.05%
        feeRecipient = msg.sender;

        // Whitelist popular stablecoins on Ethereum Mainnet by default
        // On other networks, these addresses must be updated.
        // USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        isTokenWhitelisted[
            address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)
        ] = true;
        // USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
        isTokenWhitelisted[
            address(0xdAC17F958D2ee523a2206206994597C13D831ec7)
        ] = true;
        // DAI: 0x6B175474E89094C44Da98b954EedeAC495271d0F
        isTokenWhitelisted[
            address(0x6B175474E89094C44Da98b954EedeAC495271d0F)
        ] = true;
    }

    // ============ Admin Functions ============

    function setNewPaymentsPause(
        bool status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        newPaymentsPaused = status;
        emit NewPaymentsCreationPaused(status);
    }

    function setPlatformFee(
        uint16 newFeeBps
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeBps <= 10000, "fee cannot exceed 10000");
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    function setFeeRecipient(
        address newRecipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipient != address(0), "recipient cannot be zero");
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
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

    // ============ Payment Protocol ============

    /**
     * @notice Create a pure streaming payment
     * @param employee Recipient address
     * @param token ERC20 token address
     * @param totalAmount Total to stream over duration
     * @param startTime Stream start timestamp
     * @param stopTime Stream end timestamp
     * @return paymentId The created payment ID
     */
    function createPayment(
        address employee,
        address token,
        uint256 totalAmount,
        uint64 startTime,
        uint64 stopTime
    ) external nonReentrant returns (uint256) {
        require(isTokenWhitelisted[token], "Token is not supported");
        require(!newPaymentsPaused, "payment creation paused"); // For admin pause
        require(employee != address(0), "invalid employee");
        require(token != address(0), "invalid token");
        require(totalAmount >= MIN_PAYMENT_AMOUNT, "amount too small");
        require(stopTime > startTime, "invalid duration");

        uint64 duration = stopTime - startTime;
        require(duration >= MIN_PAYMENT_DURATION, "duration too short");
        require(duration <= MAX_PAYMENT_DURATION, "duration too long");

        // Calculate platform fee
        uint256 feeAmount = 0;
        if (platformFeeBps > 0 && feeRecipient != address(0)) {
            feeAmount = (totalAmount * platformFeeBps) / 10000;
        }

        require(totalAmount >= feeAmount, "amount less than fee");
        uint256 streamAmount = totalAmount - feeAmount;
        require(
            streamAmount >= MIN_PAYMENT_AMOUNT,
            "amount after fee too small"
        );

        // Transfer funds
        IERC20 erc20 = IERC20(token);
        if (feeAmount > 0) {
            erc20.safeTransferFrom(msg.sender, feeRecipient, feeAmount);
        }
        erc20.safeTransferFrom(msg.sender, address(this), streamAmount);

        // Create payment
        uint256 paymentId = _nextPaymentId++;
        payments[paymentId] = Payment({
            company: msg.sender,
            employee: employee,
            token: erc20,
            totalAmount: streamAmount,
            startTime: startTime,
            stopTime: stopTime,
            lastWithdrawTime: startTime,
            withdrawn: 0,
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
            totalAmount,
            startTime,
            stopTime,
            feeAmount
        );
        return paymentId;
    }

    /**
     * @notice Calculate accrued amount for a payment stream
     * @param p The payment object
     * @return The total amount accrued
     */
    function _getAccruedAmount(
        Payment storage p
    ) internal view returns (uint256) {
        uint64 nowTs = uint64(block.timestamp);
        if (nowTs < p.startTime) return 0;

        uint64 totalDuration = p.stopTime - p.startTime;
        if (totalDuration == 0) return p.totalAmount;

        uint64 rawElapsed = nowTs > p.stopTime
            ? totalDuration
            : nowTs - p.startTime;
        uint64 currentPauseDuration = p.paused ? nowTs - p.pausedAt : 0;
        uint64 totalPausedTime = p.totalPausedDuration + currentPauseDuration;
        uint64 workingTime = rawElapsed > totalPausedTime
            ? rawElapsed - totalPausedTime
            : 0;

        uint256 accrued = (p.totalAmount * workingTime) / totalDuration;

        return accrued > p.totalAmount ? p.totalAmount : accrued;
    }

    /**
     * @notice Calculate claimable amount for a payment
     * @param paymentId Payment ID
     * @return Claimable amount
     */
    function claimablePayment(uint256 paymentId) public view returns (uint256) {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        if (p.cancelled) return 0;

        uint256 accrued = _getAccruedAmount(p);
        if (accrued <= p.withdrawn) return 0;

        return accrued - p.withdrawn;
    }

    /**
     * @notice Withdraw from payment stream
     * @param paymentId Payment ID
     */
    function withdrawPayment(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(!p.cancelled, "payment cancelled");
        require(!p.paused, "payment paused");
        require(msg.sender == p.employee, "not employee");

        uint256 amount = claimablePayment(paymentId);
        require(amount > 0, "nothing to withdraw");

        p.withdrawn += amount;
        p.lastWithdrawTime = uint64(block.timestamp);

        p.token.safeTransfer(p.employee, amount);

        emit PaymentWithdrawn(paymentId, p.employee, amount);
    }

    /**
     * @notice Pause a payment stream
     * @param paymentId Payment ID
     */
    function pausePayment(uint256 paymentId) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not company");
        require(!p.paused, "already paused");

        p.paused = true;
        p.pausedAt = uint64(block.timestamp);
        emit PaymentPaused(paymentId, msg.sender);
    }

    /**
     * @notice Resume a paused payment stream
     * @param paymentId Payment ID
     */
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

    /**
     * @notice Cancel a payment and refund remaining
     * @param paymentId Payment ID
     */
    function cancelPayment(uint256 paymentId) external nonReentrant {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(!p.cancelled, "already cancelled");
        require(msg.sender == p.company, "not company");

        p.cancelled = true;

        uint256 refundAmount = p.totalAmount - p.withdrawn;
        if (refundAmount > 0) {
            p.token.safeTransfer(p.company, refundAmount);
        }

        emit PaymentCancelled(paymentId, msg.sender, refundAmount);
    }

    // ============ Escrow Protocol ============

    /**
     * @notice Create a milestone-based escrow
     * @param employee Recipient address
     * @param token ERC20 token address
     * @param amount Escrow amount
     * @param description Brief description
     * @param paymentId Optional link to payment (0 for standalone)
     * @return escrowId The created escrow ID
     */
    function createEscrow(
        address employee,
        address token,
        uint256 amount,
        string calldata description,
        uint256 paymentId
    ) external nonReentrant returns (uint256) {
        require(isTokenWhitelisted[token], "Token is not supported");
        require(employee != msg.sender, "company cannot be employee");
        require(employee != address(0), "invalid employee");
        require(token != address(0), "invalid token");
        require(amount >= MIN_ESCROW_AMOUNT, "amount too small");
        require(bytes(description).length > 0, "description required");

        // If linked to payment, validate
        if (paymentId > 0) {
            Payment storage p = payments[paymentId];
            require(p.company != address(0), "payment does not exist");
            require(p.company == msg.sender, "not payment company");
            require(p.employee == employee, "employee mismatch");
            require(address(p.token) == token, "token mismatch");
        }

        // Transfer escrow funds
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Create escrow
        uint256 escrowId = _nextEscrowId++;
        escrows[escrowId] = Escrow({
            paymentId: paymentId,
            company: msg.sender,
            employee: employee,
            token: IERC20(token),
            amount: amount,
            description: description,
            status: EscrowStatus.PENDING,
            createdAt: block.timestamp,
            approvedAt: 0,
            claimedAt: 0
        });

        employeeEscrows[employee].push(escrowId);
        companyEscrows[msg.sender].push(escrowId);

        if (paymentId > 0) {
            paymentEscrows[paymentId].push(escrowId);
        }

        emit EscrowCreated(
            escrowId,
            paymentId,
            msg.sender,
            employee,
            token,
            amount,
            description
        );
        return escrowId;
    }

    /**
     * @notice Approve an escrow (auditor only)
     * @param escrowId Escrow ID
     */
    function approveEscrow(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        require(e.company != address(0), "escrow does not exist");
        require(e.status == EscrowStatus.PENDING, "not pending");

        // Check auditor permission
        bool isAuthorized = false;
        if (e.paymentId > 0) {
            isAuthorized = isPaymentAuditor[e.paymentId][msg.sender];
        } else {
            isAuthorized = isEscrowAuditor[escrowId][msg.sender];
        }
        require(isAuthorized, "not auditor");
        require(msg.sender != e.employee, "auditor cannot be employee");

        e.status = EscrowStatus.APPROVED;
        e.approvedAt = block.timestamp;

        emit EscrowApproved(escrowId, msg.sender);
    }

    /**
     * @notice Reject an escrow (auditor only)
     * @param escrowId Escrow ID
     */
    function rejectEscrow(uint256 escrowId) external {
        Escrow storage e = escrows[escrowId];
        require(e.company != address(0), "escrow does not exist");
        require(e.status == EscrowStatus.PENDING, "not pending");

        // Check auditor permission
        bool isAuthorized = false;
        if (e.paymentId > 0) {
            isAuthorized = isPaymentAuditor[e.paymentId][msg.sender];
        } else {
            isAuthorized = isEscrowAuditor[escrowId][msg.sender];
        }
        require(isAuthorized, "not auditor");
        require(msg.sender != e.employee, "auditor cannot be employee");

        e.status = EscrowStatus.REJECTED;

        emit EscrowRejected(escrowId, msg.sender);
    }

    /**
     * @notice Claim approved escrow (employee only)
     * @param escrowId Escrow ID
     */
    function claimEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.company != address(0), "escrow does not exist");
        require(e.status == EscrowStatus.APPROVED, "not approved");
        require(msg.sender == e.employee, "not employee");

        e.status = EscrowStatus.CLAIMED;
        e.claimedAt = block.timestamp;

        e.token.safeTransfer(e.employee, e.amount);

        emit EscrowClaimed(escrowId, e.employee, e.amount);
    }

    /**
     * @notice Cancel escrow and refund (company only, if pending or rejected)
     * @param escrowId Escrow ID
     */
    function cancelEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.company != address(0), "escrow does not exist");
        require(msg.sender == e.company, "not company");
        require(
            e.status == EscrowStatus.PENDING ||
                e.status == EscrowStatus.REJECTED,
            "cannot cancel"
        );

        e.status = EscrowStatus.CANCELLED;

        e.token.safeTransfer(e.company, e.amount);

        emit EscrowCancelled(escrowId, e.company, e.amount);
    }

    // ============ Auditor Management ============

    function addPaymentAuditor(uint256 paymentId, address auditor) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not company");
        require(auditor != address(0), "invalid auditor");
        require(auditor != p.employee, "auditor cannot be employee");

        isPaymentAuditor[paymentId][auditor] = true;
        emit PaymentAuditorAdded(paymentId, auditor);
    }

    function removePaymentAuditor(uint256 paymentId, address auditor) external {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        require(msg.sender == p.company, "not company");

        isPaymentAuditor[paymentId][auditor] = false;
        emit PaymentAuditorRemoved(paymentId, auditor);
    }

    function addEscrowAuditor(uint256 escrowId, address auditor) external {
        Escrow storage e = escrows[escrowId];
        require(e.company != address(0), "escrow does not exist");
        require(msg.sender == e.company, "not company");
        require(auditor != address(0), "invalid auditor");
        require(auditor != e.employee, "auditor cannot be employee");
        require(e.paymentId == 0, "use payment auditor for linked escrow");

        isEscrowAuditor[escrowId][auditor] = true;
        emit EscrowAuditorAdded(escrowId, auditor);
    }

    function removeEscrowAuditor(uint256 escrowId, address auditor) external {
        Escrow storage e = escrows[escrowId];
        require(e.company != address(0), "escrow does not exist");
        require(msg.sender == e.company, "not company");
        require(e.paymentId == 0, "use payment auditor for linked escrow");

        isEscrowAuditor[escrowId][auditor] = false;
        emit EscrowAuditorRemoved(escrowId, auditor);
    }

    // ============ View Functions ============

    function getPayment(
        uint256 paymentId
    ) external view returns (Payment memory) {
        return payments[paymentId];
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
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

    function getEmployeeEscrows(
        address employee
    ) external view returns (uint256[] memory) {
        return employeeEscrows[employee];
    }

    function getCompanyEscrows(
        address company
    ) external view returns (uint256[] memory) {
        return companyEscrows[company];
    }

    function getPaymentEscrows(
        uint256 paymentId
    ) external view returns (uint256[] memory) {
        return paymentEscrows[paymentId];
    }

    /**
     * @notice Get all claimable escrows for an employee
     * @param employee Employee address
     * @return Array of escrow IDs with APPROVED status
     */
    function getClaimableEscrows(
        address employee
    ) external view returns (uint256[] memory) {
        uint256[] memory allEscrows = employeeEscrows[employee];
        uint256[] memory claimable = new uint256[](allEscrows.length);
        uint256 claimableCount = 0;

        for (uint256 i = 0; i < allEscrows.length; i++) {
            uint256 escrowId = allEscrows[i];
            if (escrows[escrowId].status == EscrowStatus.APPROVED) {
                claimable[claimableCount] = escrowId;
                claimableCount++;
            }
        }

        // Resize the array to the actual number of claimable escrows
        assembly {
            mstore(claimable, claimableCount)
        }

        return claimable;
    }

    /**
     * @notice Get total earned for a payment (including withdrawn + claimable)
     * @param paymentId Payment ID
     */
    function getTotalEarned(uint256 paymentId) external view returns (uint256) {
        Payment storage p = payments[paymentId];
        require(p.company != address(0), "payment does not exist");
        return _getAccruedAmount(p);
    }
}
