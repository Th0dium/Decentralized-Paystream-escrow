// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../access/AccessControl.sol";
import "./SalaryStreamEscrow.sol";

/**
 * @title MilestoneEscrow
 * @dev Milestone-based escrow system
 * 30% of streamed salary is automatically locked in escrow
 * Employees submit milestones with evidence
 * Auditors approve or reject submissions
 * Upon approval, employees can claim escrowed funds
 */
contract MilestoneEscrow is ReentrancyGuard {
    IERC20 public paymentToken;
    AccessControl public accessControl;
    SalaryStreamEscrow public salaryStream;

    uint256 public constant ESCROW_PERCENTAGE = 30; // 30% of salary

    enum MilestoneStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CLAIMED
    }

    struct Milestone {
        uint256 streamId;
        address employee;
        uint256 amount;
        string ipfsHash; // IPFS hash for milestone evidence
        uint256 submissionTime;
        uint256 decisionTime;
        address auditor;
        MilestoneStatus status;
    }

    mapping(uint256 => Milestone) public milestones;
    mapping(address => uint256[]) public employeeMilestones;
    mapping(uint256 => uint256[]) public streamMilestones;

    uint256 private nextMilestoneId = 1;
    mapping(uint256 => uint256) public streamEscrowBalance; // Balance locked for each stream

    event MilestoneSubmitted(
        uint256 indexed milestoneId,
        uint256 indexed streamId,
        address indexed employee,
        uint256 amount,
        string ipfsHash
    );
    event MilestoneApproved(
        uint256 indexed milestoneId,
        address indexed auditor,
        uint256 approvalTime
    );
    event MilestoneRejected(
        uint256 indexed milestoneId,
        address indexed auditor,
        uint256 rejectionTime
    );
    event MilestoneClaimed(uint256 indexed milestoneId, address indexed employee, uint256 amount);
    event EscrowLocked(uint256 indexed streamId, uint256 amount);
    event EscrowUnlocked(uint256 indexed streamId, uint256 amount);

    modifier milestoneExists(uint256 _milestoneId) {
        require(_milestoneId > 0 && _milestoneId < nextMilestoneId, "Milestone does not exist");
        _;
    }

    modifier onlyEmployee(uint256 _milestoneId) {
        require(
            milestones[_milestoneId].employee == msg.sender,
            "Only milestone employee can perform this action"
        );
        _;
    }

    modifier onlyAuditor() {
        require(
            accessControl.hasRole(accessControl.AUDITOR_ROLE(), msg.sender),
            "Only auditors can approve/reject milestones"
        );
        _;
    }

    constructor(
        address _paymentToken,
        address _accessControl,
        address _salaryStream
    ) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_accessControl != address(0), "Invalid access control");
        require(_salaryStream != address(0), "Invalid salary stream");

        paymentToken = IERC20(_paymentToken);
        accessControl = AccessControl(_accessControl);
        salaryStream = SalaryStreamEscrow(_salaryStream);
    }

    /**
     * @dev Lock funds into escrow when a withdrawal occurs
     * This is called by external logic when an employee withdraws
     * 30% is locked, 70% is released to the employee
     */
    function lockEscrow(uint256 _streamId, uint256 _withdrawnAmount) external returns (uint256) {
        require(_withdrawnAmount > 0, "Amount must be greater than 0");

        uint256 escrowAmount = (_withdrawnAmount * ESCROW_PERCENTAGE) / 100;

        if (escrowAmount > 0) {
            streamEscrowBalance[_streamId] += escrowAmount;
            emit EscrowLocked(_streamId, escrowAmount);
        }

        return escrowAmount;
    }

    /**
     * @dev Submit a milestone for approval
     * @param _streamId The stream ID associated with the milestone
     * @param _amount Amount being claimed for this milestone (must be <= available escrow)
     * @param _ipfsHash IPFS hash containing milestone evidence
     */
    function submitMilestone(
        uint256 _streamId,
        uint256 _amount,
        string calldata _ipfsHash
    ) external returns (uint256) {
        require(_amount > 0, "Amount must be greater than 0");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");

        // Get stream to verify employee
        (address company, address employee, , , , , , bool isPaused, bool isCancelled) = salaryStream
            .getStreamDetails(_streamId);

        require(employee == msg.sender, "Only stream employee can submit milestones");
        require(!isCancelled, "Cannot submit milestone for cancelled stream");

        // Check available escrow
        uint256 available = streamEscrowBalance[_streamId];
        require(_amount <= available, "Amount exceeds available escrow");

        uint256 milestoneId = nextMilestoneId++;

        milestones[milestoneId] = Milestone({
            streamId: _streamId,
            employee: msg.sender,
            amount: _amount,
            ipfsHash: _ipfsHash,
            submissionTime: block.timestamp,
            decisionTime: 0,
            auditor: address(0),
            status: MilestoneStatus.PENDING
        });

        employeeMilestones[msg.sender].push(milestoneId);
        streamMilestones[_streamId].push(milestoneId);

        // Deduct from available escrow (funds are reserved)
        streamEscrowBalance[_streamId] -= _amount;

        emit MilestoneSubmitted(milestoneId, _streamId, msg.sender, _amount, _ipfsHash);

        return milestoneId;
    }

    /**
     * @dev Approve a milestone
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
        milestone.decisionTime = block.timestamp;
        milestone.auditor = msg.sender;

        emit MilestoneApproved(_milestoneId, msg.sender, block.timestamp);
    }

    /**
     * @dev Reject a milestone and unlock the reserved funds
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
        milestone.decisionTime = block.timestamp;
        milestone.auditor = msg.sender;

        // Return funds to available escrow
        streamEscrowBalance[milestone.streamId] += milestone.amount;

        emit MilestoneRejected(_milestoneId, msg.sender, block.timestamp);
    }

    /**
     * @dev Claim approved milestone funds
     */
    function claimMilestone(uint256 _milestoneId)
        external
        nonReentrant
        milestoneExists(_milestoneId)
        onlyEmployee(_milestoneId)
    {
        Milestone storage milestone = milestones[_milestoneId];

        require(milestone.status == MilestoneStatus.APPROVED, "Milestone not approved");

        uint256 amount = milestone.amount;
        milestone.status = MilestoneStatus.CLAIMED;

        // Transfer funds to employee
        bool success = paymentToken.transfer(milestone.employee, amount);
        require(success, "Token transfer failed");

        emit MilestoneClaimed(_milestoneId, milestone.employee, amount);
    }

    /**
     * @dev Get available escrow balance for a stream
     */
    function getEscrowBalance(uint256 _streamId) external view returns (uint256) {
        return streamEscrowBalance[_streamId];
    }

    /**
     * @dev Get all milestones for an employee
     */
    function getEmployeeMilestones(address _employee) external view returns (uint256[] memory) {
        return employeeMilestones[_employee];
    }

    /**
     * @dev Get all milestones for a stream
     */
    function getStreamMilestones(uint256 _streamId) external view returns (uint256[] memory) {
        return streamMilestones[_streamId];
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
            uint256 submissionTime,
            uint256 decisionTime,
            address auditor,
            MilestoneStatus status
        )
    {
        Milestone storage milestone = milestones[_milestoneId];
        return (
            milestone.streamId,
            milestone.employee,
            milestone.amount,
            milestone.ipfsHash,
            milestone.submissionTime,
            milestone.decisionTime,
            milestone.auditor,
            milestone.status
        );
    }
}
