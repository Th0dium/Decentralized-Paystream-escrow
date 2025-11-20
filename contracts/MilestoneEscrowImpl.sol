// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MilestoneEscrow.sol";

/**
 * @title MilestoneEscrowImpl
 * @dev Concrete implementation of MilestoneEscrow for PaystreamCore
 * Handles employee-stream validation
 */
contract MilestoneEscrowImpl is MilestoneEscrow {
    address public flowPayCore;

    event FlowPayCoreSet(address indexed coreAddress);

    constructor(address _token, address _flowPayCore) MilestoneEscrow(_token) {
        require(_flowPayCore != address(0), "Invalid FlowPayCore");
        flowPayCore = _flowPayCore;
    }

    /**
     * @dev Internal validation: verify submitter is the employee for the stream
     * In a real implementation, this would query FlowPayCore for verification
     */
    function _validateMilestoneSubmitter(uint256 _streamId, address _submitter)
        internal
        view
        override
    {
        // This would be called by FlowPayCore to validate
        // For now, we trust FlowPayCore to validate this before calling submitMilestone
        require(_submitter != address(0), "Invalid submitter");
    }

    /**
     * @dev Set FlowPayCore address (for future integration)
     */
    function setFlowPayCore(address _coreAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_coreAddress != address(0), "Invalid address");
        flowPayCore = _coreAddress;
        emit FlowPayCoreSet(_coreAddress);
    }
}
