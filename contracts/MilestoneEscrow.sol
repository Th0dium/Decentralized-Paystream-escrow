// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MilestoneEscrow is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // streamId => token => lockedAmount
    mapping(uint256 => mapping(address => uint256)) private _locked;

    event EscrowLocked(
        uint256 indexed streamId,
        address indexed token,
        uint256 amount
    );
    event EscrowReleased(
        uint256 indexed streamId,
        address indexed token,
        address to,
        uint256 amount
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(AUDITOR_ROLE, msg.sender);
    }

    /// @notice Lock escrowed tokens for a given stream. Caller must have transferred tokens to this contract beforehand.
    function lockEscrow(
        uint256 streamId,
        address token,
        uint256 amount
    ) external onlyRole(MANAGER_ROLE) {
        require(amount > 0, "amount=0");
        _locked[streamId][token] += amount;
        emit EscrowLocked(streamId, token, amount);
    }

    /// @notice Release locked escrow to `to`. Only auditors or manager can release (audit flow)
    function releaseEscrow(
        uint256 streamId,
        address token,
        address to,
        uint256 amount
    ) external onlyRole(AUDITOR_ROLE) {
        require(amount > 0, "amount=0");
        uint256 avail = _locked[streamId][token];
        require(avail >= amount, "insufficient locked");
        _locked[streamId][token] = avail - amount;
        IERC20(token).safeTransfer(to, amount);
        emit EscrowReleased(streamId, token, to, amount);
    }

    /// @notice View locked amount for a stream/token
    function lockedAmount(
        uint256 streamId,
        address token
    ) external view returns (uint256) {
        return _locked[streamId][token];
    }
}
