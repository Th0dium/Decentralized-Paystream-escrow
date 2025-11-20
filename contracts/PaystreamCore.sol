// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./StreamMath.sol";
import "./MilestoneEscrow.sol";

contract PaystreamCore is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using StreamMath for uint64;

    bytes32 public constant COMPANY_ROLE = keccak256("COMPANY_ROLE");
    bytes32 public constant EMPLOYEE_ROLE = keccak256("EMPLOYEE_ROLE");

    MilestoneEscrow public milestoneEscrow;

    uint256 private _nextStreamId = 1;

    struct Stream {
        address company;
        address employee;
        IERC20 token;
        uint256 totalAmount;
        uint256 ratePerSecond;
        uint64 startTime;
        uint64 stopTime;
        uint64 lastWithdrawTime; // last time of accounting
        uint256 withdrawn; // total amount distributed (including escrowed portion)
        uint16 escrowBps; // basis points (parts per 10k) to lock into escrow on each withdraw
        bool paused;
        bool cancelled;
        uint256 lockedInEscrow; // amount already locked in MilestoneEscrow
    }

    mapping(uint256 => Stream) public streams;

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
        address to,
        uint256 amount,
        uint256 escrowed
    );
    event StreamCancelled(
        uint256 indexed streamId,
        address by,
        uint256 refunded
    );
    event MilestoneEscrowSet(address indexed escrow);

    constructor(address escrowAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if (escrowAddress != address(0)) {
            milestoneEscrow = MilestoneEscrow(escrowAddress);
            emit MilestoneEscrowSet(escrowAddress);
        }
    }

    function setMilestoneEscrow(
        address escrowAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        milestoneEscrow = MilestoneEscrow(escrowAddress);
        emit MilestoneEscrowSet(escrowAddress);
    }

    /// @notice Create a new stream. Caller is the company funding the stream.
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
        require(escrowBps <= 10000, "bad bps");

        uint64 duration = stopTime - startTime;
        uint256 rate = totalAmount / duration; // integer division; remainder handled at end

        // transfer funds from company to this contract
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
            paused: false,
            cancelled: false,
            lockedInEscrow: 0
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

    /// @notice View how much is currently claimable (earned minus already withdrawn)
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

    /// @notice Withdraw available funds; part may be locked in MilestoneEscrow.
    function withdraw(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        require(!s.paused, "paused");
        require(!s.cancelled, "cancelled");
        require(
            msg.sender == s.employee || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "not authorized"
        );

        uint256 amount = claimable(streamId);
        require(amount > 0, "nothing to withdraw");

        uint256 escrowAmount = (amount * s.escrowBps) / 10000;
        uint256 payout = amount - escrowAmount;

        // mark withdrawn first
        s.withdrawn += amount;
        s.lastWithdrawTime = uint64(block.timestamp);

        // if there is an escrow portion, move tokens to escrow contract and notify it
        if (escrowAmount > 0) {
            require(address(milestoneEscrow) != address(0), "escrow not set");
            // transfer tokens to escrow
            s.token.safeTransfer(address(milestoneEscrow), escrowAmount);
            // call lock on escrow
            milestoneEscrow.lockEscrow(
                streamId,
                address(s.token),
                escrowAmount
            );
            s.lockedInEscrow += escrowAmount;
        }

        if (payout > 0) {
            s.token.safeTransfer(s.employee, payout);
        }

        emit Withdrawn(streamId, s.employee, payout, escrowAmount);
    }

    /// @notice Cancel a stream; refunds remaining unlocked amount to the company.
    function cancelStream(uint256 streamId) external nonReentrant {
        Stream storage s = streams[streamId];
        require(!s.cancelled, "already cancelled");
        require(
            msg.sender == s.company || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "not authorized"
        );

        // mark cancelled to prevent further accruals
        s.cancelled = true;

        // compute accrued and refund remainder to company (excluding locked escrow)
        uint64 nowTs = uint64(block.timestamp);
        uint64 elapsedSecs = StreamMath.elapsed(s.startTime, s.stopTime, nowTs);
        uint256 accrued = s.ratePerSecond * elapsedSecs;
        if (accrued > s.totalAmount) accrued = s.totalAmount;

        uint256 owed = 0;
        if (accrued > s.withdrawn) {
            owed = accrued - s.withdrawn; // unlocked amount not yet withdrawn
        }

        // the locked escrow remains in milestoneEscrow and is handled separately by that contract
        // refund unlocked remainder to company
        if (owed > 0) {
            s.withdrawn += owed;
            s.token.safeTransfer(s.company, owed);
        }

        emit StreamCancelled(streamId, msg.sender, owed);
    }

    /// @notice Admin helper to sweep any token accidentally sent to this contract
    function sweepToken(
        address token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).safeTransfer(to, amount);
    }
}
