// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

library StreamMath {
    /// @notice Compute how many seconds have elapsed between start and timestamp (clamped by stop)
    function elapsed(
        uint64 start,
        uint64 stop,
        uint64 timestamp
    ) internal pure returns (uint64) {
        if (timestamp <= start) return 0;
        uint64 end = timestamp;
        if (stop != 0 && timestamp > stop) end = stop;
        if (end <= start) return 0;
        return end - start;
    }

    /// @notice Compute available amount given ratePerSecond and elapsed seconds
    function available(
        uint256 ratePerSecond,
        uint64 secondsElapsed
    ) internal pure returns (uint256) {
        return ratePerSecond * secondsElapsed;
    }
}
