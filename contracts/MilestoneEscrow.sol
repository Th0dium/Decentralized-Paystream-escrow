// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./libraries/StreamMath.sol";

/**
 * @title MilestoneEscrow
 * @dev Abstract escrow contract for milestone-based fund release
 * Employees submit milestones with evidence, auditors approve/reject
 */
abstract contract MilestoneEscrow is AccessControl, ReentrancyGuard {
    using StreamMath for uint256;

    // Role definitions
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // Milestone status enum
    enum MilestoneStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CLAIMED
    }

    // Milestone structure
    struct Milestone {
        uint256 streamId;
        address employee;
        uint256 amount;
        string ipfsHash; // IPFS hash for milestone evidence
        uint256 submittedAt;
        uint256 decidedAt;
        address auditor;
        MilestoneStatus status;
    }

    // State
    IERC20 public token;
    mapping(uint256 => Milestone) public milestones;
    mapping(address => uint256[]) public employeeMilestones;
    mapping(uint256 => uint256[]) public streamMilestones;
    mapping(uint256 => uint256) public streamEscrowBalance; // Available escrow per stream

    uint256 public nextMilestoneId = 1;

    // Events
    event MilestoneSubmitted(
        uint256 indexed milestoneId,
        uint256 indexed streamId,
        address indexed employee,
        uint256 amount,
        string ipfsHash,
        uint256 timestamp
    );

    event MilestoneApproved(
        uint256 indexed milestoneId,
        address indexed auditor,
        uint256 timestamp
    );

    event MilestoneRejected(
        uint256 indexed milestoneId,
        address indexed auditor,
        uint256 timestamp
    );

    event MilestoneClaimed(
        uint256 indexed milestoneId,
        address indexed employee,
        uint256 amount,
        uint256 timestamp
    );

    event EscrowLocked(
        uint256 indexed streamId,
        uint256 amount,
        uint256 timestamp
    );

    // Modifiers
    modifier milestoneExists(uint256 _milestoneId) {
        require(_milestoneId > 0 && _milestoneId < nextMilestoneId, "Milestone does not exist");
        _;
    }

    modifier onlyMilestoneEmployee(uint256 _milestoneId) {
        require(
            milestones[_milestoneId].employee == msg.sender,
            "Only milestone employee can claim"
        );
        _;
    }

    modifier onlyAuditor() {
        require(hasRole(AUDITOR_ROLE, msg.sender), "Only auditors can approve/reject");
        _;
    }

    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Internal function to lock escrow funds when withdrawal occurs
     * Called by FlowPayCore during employee withdrawals
     * @param _streamId Stream ID
     * @param _withdrawnAmount Amount withdrawn by employee
     * @return escrowAmount Amount locked in escrow (30%)
     */
    function _lockEscrow(uint256 _streamId, uint256 _withdrawnAmount)
        internal
        returns (uint256)
    {
        (uint256 escrowAmount, ) = _withdrawnAmount.splitWithdrawal();

        if (escrowAmount > 0) {
            streamEscrowBalance[_streamId] += escrowAmount;
            emit EscrowLocked(_streamId, escrowAmount, block.timestamp);
        }

        return escrowAmount;
    }

    /**
     * @dev Submit a milestone for auditor approval
     * @param _streamId Stream ID
     * @param _amount Amount to claim from escrow (must be <= available)
     * @param _ipfsHash IPFS hash containing milestone evidence
     * @return milestoneId ID of submitted milestone
     */
    function submitMilestone(
        uint256 _streamId,
        uint256 _amount,
        string calldata _ipfsHash
    ) external returns (uint256) {
        require(_amount > 0, "Amount must be > 0");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(
            streamEscrowBalance[_streamId] >= _amount,
            "Amount exceeds available escrow"
        );

        // Verify employee-stream relationship (implemented in FlowPayCore)
        _validateMilestoneSubmitter(_streamId, msg.sender);

        uint256 milestoneId = nextMilestoneId++;

        milestones[milestoneId] = Milestone({
            streamId: _streamId,
            employee: msg.sender,
            amount: _amount,
            ipfsHash: _ipfsHash,
            submittedAt: block.timestamp,
            decidedAt: 0,
            auditor: address(0),
            status: MilestoneStatus.PENDING
        });

        employeeMilestones[msg.sender].push(milestoneId);
        streamMilestones[_streamId].push(milestoneId);

        // Reserve funds (deduct from available)
        streamEscrowBalance[_streamId] -= _amount;

        emit MilestoneSubmitted(
            milestoneId,
            _streamId,
            msg.sender,
            _amount,
            _ipfsHash,
            block.timestamp
        );

        return milestoneId;
    }

    /**
     * @dev Approve a milestone (auditor only)
     * @param _milestoneId Milestone ID
     */
    function approveMilestone(uint256 _milestoneId)
        external
        nonReentrant
        milestoneExists(_milestoneId)
        onlyAuditor
    {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.PENDING, "Milestone already decided");

        milestone.status = MilestoneStatus.APPROVED;
        milestone.decidedAt = block.timestamp;
        milestone.auditor = msg.sender;

        emit MilestoneApproved(_milestoneId, msg.sender, block.timestamp);
    }

    /**
     * @dev Reject a milestone and return funds to escrow (auditor only)
     * @param _milestoneId Milestone ID
     */
    function rejectMilestone(uint256 _milestoneId)
        external
        nonReentrant
        milestoneExists(_milestoneId)
        onlyAuditor
    {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.PENDING, "Milestone already decided");

        milestone.status = MilestoneStatus.REJECTED;
        milestone.decidedAt = block.timestamp;
        milestone.auditor = msg.sender;

        // Return reserved funds to available escrow
        streamEscrowBalance[milestone.streamId] += milestone.amount;

        emit MilestoneRejected(_milestoneId, msg.sender, block.timestamp);
    }

    /**
     * @dev Claim approved milestone funds
     * @param _milestoneId Milestone ID
     */
    function claimMilestone(uint256 _milestoneId)
        external
        nonReentrant
        milestoneExists(_milestoneId)
        onlyMilestoneEmployee(_milestoneId)
    {
        Milestone storage milestone = milestones[_milestoneId];
        require(milestone.status == MilestoneStatus.APPROVED, "Not approved");

        uint256 amount = milestone.amount;
        milestone.status = MilestoneStatus.CLAIMED;

        bool success = token.transfer(milestone.employee, amount);
        require(success, "Transfer failed");

        emit MilestoneClaimed(_milestoneId, milestone.employee, amount, block.timestamp);
    }

    /**
     * @dev Get milestone details
     */
    function getMilestoneDetails(uint256 _milestoneId)
        external
        view
        milestoneExists(_milestoneId)
        returns (
            uint256 streamId,
            address employee,
            uint256 amount,
            string memory ipfsHash,
            uint256 submittedAt,
            uint256 decidedAt,
            address auditor,
            MilestoneStatus status
        )
    {
        Milestone storage m = milestones[_milestoneId];
        return (m.streamId, m.employee, m.amount, m.ipfsHash, m.submittedAt, m.decidedAt, m.auditor, m.status);
    }

    /**
     * @dev Get all milestones for an employee
     */
    function getEmployeeMilestones(address _employee)
        external
        view
        returns (uint256[] memory)
    {
        return employeeMilestones[_employee];
    }

    /**
     * @dev Get all milestones for a stream
     */
    function getStreamMilestones(uint256 _streamId)
        external
        view
        returns (uint256[] memory)
    {
        return streamMilestones[_streamId];
    }

    /**
     * @dev Get available escrow balance for a stream
     */
    function getEscrowBalance(uint256 _streamId) external view returns (uint256) {
        return streamEscrowBalance[_streamId];
    }

    /**
     * @dev Internal validation function (implemented in FlowPayCore)
     * Verifies that the address is the employee for the stream
     */
    function _validateMilestoneSubmitter(uint256 _streamId, address _submitter)
        internal
        view
        virtual;
}
