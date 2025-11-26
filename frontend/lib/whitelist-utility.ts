/**
 * Utility to whitelist tokens on the Paystream contract
 * This can be called from the frontend to whitelist tokens as needed
 */

import { Address, parseAbi } from "viem";
import { writeContract, readContract } from "wagmi/actions";
import { config } from "./wallet-provider";

// ABI for updateTokenWhitelist function
const WHITELIST_ABI = parseAbi([
  "function updateTokenWhitelist(address token, bool whitelisted) external",
  "function isTokenWhitelisted(address token) public view returns (bool)",
]);

/**
 * Check if a token is whitelisted
 */
export async function isTokenWhitelisted(
  contractAddress: Address,
  tokenAddress: Address
): Promise<boolean> {
  try {
    const result = await readContract(config, {
      address: contractAddress,
      abi: WHITELIST_ABI,
      functionName: "isTokenWhitelisted",
      args: [tokenAddress],
    });
    return result as boolean;
  } catch (error) {
    console.error("Error checking token whitelist:", error);
    return false;
  }
}

/**
 * Whitelist a token on the Paystream contract
 * IMPORTANT: Only the contract admin can call this function
 */
export async function whitelistToken(
  contractAddress: Address,
  tokenAddress: Address
): Promise<string> {
  try {
    console.log("🔐 Whitelisting token...");
    console.log(`Token: ${tokenAddress}`);

    // Check if already whitelisted
    const alreadyWhitelisted = await isTokenWhitelisted(
      contractAddress,
      tokenAddress
    );

    if (alreadyWhitelisted) {
      console.log("✅ Token is already whitelisted");
      return "";
    }

    // Call updateTokenWhitelist
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: WHITELIST_ABI,
      functionName: "updateTokenWhitelist",
      args: [tokenAddress as Address, true],
    });

    console.log(`✅ Whitelist transaction sent: ${hash}`);
    return hash;
  } catch (error) {
    console.error("❌ Failed to whitelist token:", error);
    if (error instanceof Error) {
      throw new Error(`Token whitelisting failed: ${error.message}`);
    }
    throw error;
  }
}
