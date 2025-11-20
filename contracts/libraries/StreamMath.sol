// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StreamMath
 * @dev Library for salary stream calculations
 * Handles per-second token unlocking, escrow calculations, and precision
 */
library StreamMath {
    /**
     * @dev Calculate tokens unlocked since last update
     * @param releaseRate Tokens per second
     * @param lastUpdateTime Previous update timestamp
     * @param currentTime Current timestamp
     * @return unlocked Amount of tokens unlocked
     */
    function calculateUnlocked(
        uint256 releaseRate,
        uint256 lastUpdateTime,
        uint256 currentTime
    ) internal pure returns (uint256) {
        if (currentTime <= lastUpdateTime) {
            return 0;
        }

        uint256 timeElapsed = currentTime - lastUpdateTime;
        return releaseRate * timeElapsed;
    }

    /**
     * @dev Calculate total unlocked since stream start
     * @param releaseRate Tokens per second
     * @param startTime Stream start timestamp
     * @param currentTime Current timestamp
     * @param totalAmount Total stream amount (cap)
     * @return unlocked Amount of tokens unlocked (capped at totalAmount)
     */
    function calculateTotalUnlocked(
        uint256 releaseRate,
        uint256 startTime,
        uint256 currentTime,
        uint256 totalAmount
    ) internal pure returns (uint256) {
        if (currentTime <= startTime) {
            return 0;
        }

        uint256 timeElapsed = currentTime - startTime;
        uint256 unlocked = releaseRate * timeElapsed;

        return unlocked > totalAmount ? totalAmount : unlocked;
    }

    /**
     * @dev Calculate escrow amount (30% of withdrawal)
     * @param withdrawAmount Amount being withdrawn
     * @return escrowAmount Amount to lock in escrow (30%)
     * @return releasedAmount Amount released to employee (70%)
     */
    function splitWithdrawal(uint256 withdrawAmount)
        internal
        pure
        returns (uint256 escrowAmount, uint256 releasedAmount)
    {
        escrowAmount = (withdrawAmount * 30) / 100;
        releasedAmount = withdrawAmount - escrowAmount;
    }

    /**
     * @dev Validate stream parameters
     * @param totalAmount Total amount to stream
     * @param duration Duration in seconds
     */
    function validateStreamParams(uint256 totalAmount, uint256 duration)
        internal
        pure
    {
        require(totalAmount > 0, "StreamMath: amount must be > 0");
        require(duration > 0, "StreamMath: duration must be > 0");
        require(totalAmount >= duration, "StreamMath: amount must be >= duration (1 token/sec minimum)");
    }

    /**
     * @dev Calculate release rate (tokens per second)
     * @param totalAmount Total amount to stream
     * @param duration Duration in seconds
     * @return releaseRate Tokens per second
     */
    function calculateReleaseRate(uint256 totalAmount, uint256 duration)
        internal
        pure
        returns (uint256)
    {
        validateStreamParams(totalAmount, duration);
        return totalAmount / duration;
    }
}
