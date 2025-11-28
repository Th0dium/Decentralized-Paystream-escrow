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

// ============ STREAM MANAGEMENT FUNCTIONS ============

/**
 * Withdraw vested funds from a payment stream
 */
export async function withdrawStream(
  contractAddress: Address,
  streamId: string
): Promise<{ transactionHash: string }> {
  console.log("\n💰 === WITHDRAW STREAM ===");
  console.log(`📍 Stream ID: ${streamId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "withdrawPayment",
      args: [BigInt(streamId)],
    });

    console.log(`📤 Withdrawal transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Withdrawal confirmed in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Withdrawal failed";
    console.error("❌ Error withdrawing from stream:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Pause a payment stream
 */
export async function pauseStream(
  contractAddress: Address,
  streamId: string
): Promise<{ transactionHash: string }> {
  console.log("\n⏸️ === PAUSE STREAM ===");
  console.log(`📍 Stream ID: ${streamId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "pausePayment",
      args: [BigInt(streamId)],
    });

    console.log(`📤 Pause transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Stream paused in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Pause failed";
    console.error("❌ Error pausing stream:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Resume a paused payment stream
 */
export async function resumeStream(
  contractAddress: Address,
  streamId: string
): Promise<{ transactionHash: string }> {
  console.log("\n▶️ === RESUME STREAM ===");
  console.log(`📍 Stream ID: ${streamId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "resumePayment",
      args: [BigInt(streamId)],
    });

    console.log(`📤 Resume transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Stream resumed in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Resume failed";
    console.error("❌ Error resuming stream:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Cancel a payment stream and refund remaining balance
 */
export async function cancelStream(
  contractAddress: Address,
  streamId: string
): Promise<{ transactionHash: string }> {
  console.log("\n❌ === CANCEL STREAM ===");
  console.log(`📍 Stream ID: ${streamId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "cancelPayment",
      args: [BigInt(streamId)],
    });

    console.log(`📤 Cancel transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Stream cancelled in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Cancellation failed";
    console.error("❌ Error cancelling stream:", errorMsg);
    throw new Error(errorMsg);
  }
}

// ============ MILESTONE FUNCTIONS ============

/**
 * Submit a milestone for approval
 */
export async function submitMilestone(
  contractAddress: Address,
  streamId: string,
  amount: string,
  descriptionHash: string,
  tokenDecimals: number = 18
): Promise<{ transactionHash: string }> {
  const amountInWei = parseUnits(amount, tokenDecimals);

  console.log("\n📤 === SUBMIT MILESTONE ===");
  console.log(`📍 Stream ID: ${streamId}`);
  console.log(`💰 Amount: ${amount} (${amountInWei} wei)`);
  console.log(`📄 Description Hash: ${descriptionHash}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "submitMilestone",
      args: [BigInt(streamId), amountInWei, descriptionHash],
    });

    console.log(`📤 Milestone submission transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Milestone submitted in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Milestone submission failed";
    console.error("❌ Error submitting milestone:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Approve a submitted milestone (auditor only)
 */
export async function approveMilestone(
  contractAddress: Address,
  milestoneId: string
): Promise<{ transactionHash: string }> {
  console.log("\n✅ === APPROVE MILESTONE ===");
  console.log(`📍 Milestone ID: ${milestoneId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "approveMilestone",
      args: [BigInt(milestoneId)],
    });

    console.log(`📤 Approve transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Milestone approved in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Milestone approval failed";
    console.error("❌ Error approving milestone:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Reject a submitted milestone (auditor only)
 */
export async function rejectMilestone(
  contractAddress: Address,
  milestoneId: string
): Promise<{ transactionHash: string }> {
  console.log("\n❌ === REJECT MILESTONE ===");
  console.log(`📍 Milestone ID: ${milestoneId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "rejectMilestone",
      args: [BigInt(milestoneId)],
    });

    console.log(`📤 Reject transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Milestone rejected in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Milestone rejection failed";
    console.error("❌ Error rejecting milestone:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Claim funds from an approved milestone
 */
export async function claimMilestone(
  contractAddress: Address,
  milestoneId: string
): Promise<{ transactionHash: string }> {
  console.log("\n🎯 === CLAIM MILESTONE ===");
  console.log(`📍 Milestone ID: ${milestoneId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "claimMilestone",
      args: [BigInt(milestoneId)],
    });

    console.log(`📤 Claim transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Milestone claimed in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Milestone claim failed";
    console.error("❌ Error claiming milestone:", errorMsg);
    throw new Error(errorMsg);
  }
}
