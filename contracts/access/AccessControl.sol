// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AccessControl
 * @dev Manages three roles for the escrow system:
 * - COMPANY: Can create and manage salary streams
 * - EMPLOYEE: Can withdraw available funds and submit milestones
 * - AUDITOR: Can approve or reject milestone submissions
 */
contract AccessControl is Ownable {
    bytes32 public constant COMPANY_ROLE = keccak256("COMPANY_ROLE");
    bytes32 public constant EMPLOYEE_ROLE = keccak256("EMPLOYEE_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    mapping(address => mapping(bytes32 => bool)) private _roles;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Grant a role to an account
     */
    function grantRole(bytes32 role, address account) external onlyOwner {
        require(account != address(0), "Invalid address");
        require(!_roles[account][role], "Role already granted");

        _roles[account][role] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    /**
     * @dev Revoke a role from an account
     */
    function revokeRole(bytes32 role, address account) external onlyOwner {
        require(_roles[account][role], "Role not granted");

        _roles[account][role] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    /**
     * @dev Check if an account has a specific role
     */
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[account][role];
    }

    /**
     * @dev Modifier to check if caller has a specific role
     */
    modifier onlyRole(bytes32 role) {
        require(_roles[msg.sender][role], "Access denied: insufficient role");
        _;
    }
}
