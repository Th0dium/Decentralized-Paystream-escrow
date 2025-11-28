import { parseUnits, Address, decodeEventLog } from "viem";
import {
  writeContract,
  readContract,
  getBlock,
  waitForTransactionReceipt
} from "wagmi/actions";
import { config } from "./wallet-provider";

// Minimal Paystream ABI with just the functions we need
const PAYSTREAM_ABI = [
  {
    inputs: [
      { internalType: "address", name: "employee", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "streamAmount", type: "uint256" },
      { internalType: "uint256", name: "escrowAmount", type: "uint256" },
      { internalType: "uint64", name: "startTime", type: "uint64" },
      { internalType: "uint64", name: "stopTime", type: "uint64" },
    ],
    name: "createStream",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "streamId", type: "uint256" },
      { indexed: true, internalType: "address", name: "company", type: "address" },
      { indexed: true, internalType: "address", name: "employee", type: "address" },
      { indexed: false, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint256", name: "streamAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "escrowAmount", type: "uint256" },
      { indexed: false, internalType: "uint64", name: "startTime", type: "uint64" },
      { indexed: false, internalType: "uint64", name: "stopTime", type: "uint64" },
    ],
    name: "StreamCreated",
    type: "event",
  },
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "isTokenWhitelisted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const; // Add 'as const' for better type inference with viem

// ERC20 ABI for approve function
const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Approve tokens for the Paystream contract
 */
export async function approveTokens(
  tokenAddress: Address,
  spenderAddress: Address,
  amount: string,
  decimals: number = 18
): Promise<string> {
  const amountInWei = parseUnits(amount, decimals);

  console.log("🔐 Approving tokens with viem...");
  console.log(`Token: ${tokenAddress}`);
  console.log(`Spender: ${spenderAddress}`);
  console.log(`Amount: ${amount} tokens (${amountInWei} wei)`);

  const hash = await writeContract(config, {
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spenderAddress, amountInWei],
  });

  console.log(`✅ Approval transaction sent: ${hash}`);

  const receipt = await waitForTransactionReceipt(config, { hash });
  console.log(`✅ Approval confirmed in block ${receipt.blockNumber}`);

  return hash;
}

/**
 * Create a payment stream on the Paystream contract with separate stream and escrow amounts
 */
export async function createStream(
  contractAddress: Address,
  employeeAddress: Address,
  tokenAddress: Address,
  streamAmount: string,
  escrowAmount: string,
  durationDays: number,
  tokenDecimals: number = 18
): Promise<{ transactionHash: string; streamId?: string }> {

  // Get current block timestamp
  const block = await getBlock(config);
  const startTime = Number(block.timestamp); // viem timestamp is bigint
  const stopTime = startTime + durationDays * 24 * 60 * 60;

  // Convert amounts to wei
  const streamAmountInWei = parseUnits(streamAmount, tokenDecimals);
  const escrowAmountInWei = parseUnits(escrowAmount, tokenDecimals);

  console.log("\n💰 === CREATE STREAM (viem) ===");
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`👤 Employee: ${employeeAddress}`);
  console.log(`💰 Stream Amount: ${streamAmount} tokens (${streamAmountInWei} wei)`);
  console.log(`🎯 Escrow Amount: ${escrowAmount} tokens (${escrowAmountInWei} wei)`);
  console.log(`📅 Duration: ${durationDays} days`);
  console.log(`⏰ Start: ${startTime}, Stop: ${stopTime}`);

  try {
    console.log("\n📤 Submitting createStream transaction...");
    const hash = await writeContract(config, {
        address: contractAddress,
        abi: PAYSTREAM_ABI,
        functionName: "createStream",
        args: [
            employeeAddress,
            tokenAddress,
            streamAmountInWei,
            escrowAmountInWei,
            BigInt(startTime),
            BigInt(stopTime),
        ],
    });

    console.log(`✅ Transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });

    // Parse logs to find StreamCreated event and extract streamId
    let streamId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const decodedLog = decodeEventLog({
          abi: PAYSTREAM_ABI,
          eventName: 'StreamCreated',
          data: log.data,
          topics: log.topics,
        });
        if (decodedLog.eventName === 'StreamCreated') {
          streamId = decodedLog.args.streamId.toString();
          console.log(`✅ Found StreamCreated event. ID: ${streamId}`);
          break;
        }
      } catch {
        // Not our event, ignore
      }
    }

    return {
      transactionHash: hash,
      streamId
    };
  } catch (error) {
    console.error("\n❌ === CREATE STREAM FAILED ===");
    if (error instanceof Error) {
      console.error("Error:", error.message);
      throw new Error(`Failed to create stream: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get token balance
 */
export async function getTokenBalance(
  tokenAddress: Address,
  accountAddress: Address
): Promise<string> {
    const balance = await readContract(config, {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [accountAddress]
    });
    return balance.toString();
}

/**
 * Get token decimals
 */
export async function getTokenDecimals(
  tokenAddress: Address,
): Promise<number> {
    const decimals = await readContract(config, {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals',
    });
    return decimals;
}

/**
 * Check if token is whitelisted on the Paystream contract
 */
export async function checkTokenWhitelisted(
  contractAddress: Address,
  tokenAddress: Address
): Promise<boolean> {
    try {
        const isWhitelisted = await readContract(config, {
            address: contractAddress,
            abi: PAYSTREAM_ABI,
            functionName: 'isTokenWhitelisted',
            args: [tokenAddress]
        });
        return isWhitelisted as boolean;
    } catch (error) {
        console.error("Error checking token whitelist:", error);
        return false;
    }
}
