// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IPaystream
 * @dev Interface for the Paystream contract containing functions accessible by the admin contract.
 */
interface IPaystream {
    function setNewStreamPause(bool status) external;
    function setPlatformFee(uint16 newFeeBps) external;
    function setFeeRecipient(address newRecipient) external;
}

/**
 * @title PaystreamAdmin
 * @dev This contract manages administrative actions for the main Paystream contract.
 * It provides a layer of separation, allowing the admin logic to be updated
 * in the future without touching the core contract holding user funds.
 */
contract PaystreamAdmin is Ownable {
    IPaystream public immutable paystream;

    event NewStreamCreationPaused;
    event NewStreamCreationResumed;
    event PlatformFeeUpdated(uint16 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);

    /**
     * @param initialOwner The address of the initial owner of this admin contract.
     * @param paystreamAddress The address of the main Paystream contract.
     */
    constructor(address initialOwner, address paystreamAddress) Ownable(initialOwner) {
        require(paystreamAddress != address(0), "Paystream address cannot be zero");
        paystream = IPaystream(paystreamAddress);
    }

    /**
     * @notice Pauses the creation of new streams on the platform.
     * Existing streams are unaffected.
     */
    function pauseNewStreamCreation() external onlyOwner {
        paystream.setNewStreamPause(true);
        emit NewStreamCreationPaused();
    }

    /**
     * @notice Resumes the creation of new streams on the platform.
     */
    function resumeNewStreamCreation() external onlyOwner {
        paystream.setNewStreamPause(false);
        emit NewStreamCreationResumed();
    }

    /**
     * @notice Updates the platform fee.
     * @param newFeeBps The new fee in basis points (e.g., 5 for 0.05%).
     */
    function updatePlatformFee(uint16 newFeeBps) external onlyOwner {
        require(newFeeBps <= 10000, "Fee cannot exceed 100%"); // 10000 bps = 100%
        paystream.setPlatformFee(newFeeBps);
        emit PlatformFeeUpdated(newFeeBps);
    }

    /**
     * @notice Updates the address that receives platform fees.
     * @param newRecipient The new address to receive fees.
     */
    function updateFeeRecipient(address newRecipient) external onlyOwner {
        require(newRecipient != address(0), "Recipient address cannot be zero");
        paystream.setFeeRecipient(newRecipient);
        emit FeeRecipientUpdated(newRecipient);
    }
}
