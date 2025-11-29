import { parseUnits, Address, decodeEventLog, parseAbiItem } from "viem";
import {
  writeContract,
  readContract,
  getBlock,
  waitForTransactionReceipt
} from "wagmi/actions";
import { config } from "./wallet-provider";

// Minimal Paystream ABI with just the functions we need
export const PAYSTREAM_ABI = [
  // --- Events ---
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
  // --- View Functions ---
  {
    inputs: [{ internalType: "address", name: "token", type: "address" }],
    name: "isTokenWhitelisted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "streamId", type: "uint256" }],
    name: "getStream",
    outputs: [
      {
        components: [
          { internalType: "address", name: "company", type: "address" },
          { internalType: "address", name: "employee", type: "address" },
          { internalType: "address", name: "token", type: "address" }, // Note: changed from contract IERC20 to address for compatibility
          { internalType: "uint256", name: "streamAmount", type: "uint256" },
          { internalType: "uint256", name: "escrowAmount", type: "uint256" },
          { internalType: "uint64", name: "startTime", type: "uint64" },
          { internalType: "uint64", name: "stopTime", type: "uint64" },
          { internalType: "uint64", name: "lastWithdrawTime", type: "uint64" },
          { internalType: "uint256", name: "withdrawn", type: "uint256" },
          { internalType: "uint256", name: "escrowed", type: "uint256" },
          { internalType: "bool", name: "paused", type: "bool" },
          { internalType: "bool", name: "cancelled", type: "bool" },
          { internalType: "uint64", name: "totalPausedDuration", type: "uint64" },
          { internalType: "uint64", name: "pausedAt", type: "uint64" },
        ],
        internalType: "struct Paystream.Stream",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "streams",
    outputs: [
      { internalType: "address", name: "company", type: "address" },
      { internalType: "address", name: "employee", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "streamAmount", type: "uint256" },
      { internalType: "uint256", name: "escrowAmount", type: "uint256" },
      { internalType: "uint64", name: "startTime", type: "uint64" },
      { internalType: "uint64", name: "stopTime", type: "uint64" },
      { internalType: "uint64", name: "lastWithdrawTime", type: "uint64" },
      { internalType: "uint256", name: "withdrawn", type: "uint256" },
      { internalType: "uint256", name: "escrowed", type: "uint256" },
      { internalType: "bool", name: "paused", type: "bool" },
      { internalType: "bool", name: "cancelled", type: "bool" },
      { internalType: "uint64", name: "totalPausedDuration", type: "uint64" },
      { internalType: "uint64", name: "pausedAt", type: "uint64" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "employee", type: "address" }],
    name: "getEmployeeStreams",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "company", type: "address" }],
    name: "getCompanyStreams",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "getAuditorStreams",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "employee", type: "address" }],
    name: "getEmployeeMilestones",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "streamId", type: "uint256" }],
    name: "getStreamMilestones",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "milestoneId", type: "uint256" }],
    name: "getMilestone",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "streamId", type: "uint256" },
          { internalType: "address", name: "submitter", type: "address" },
          { internalType: "uint256", name: "amount", type: "uint256" },
          { internalType: "enum Paystream.MilestoneStatus", name: "status", type: "uint8" },
          { internalType: "uint256", name: "createdAt", type: "uint256" },
          { internalType: "uint256", name: "approvedAt", type: "uint256" },
        ],
        internalType: "struct Paystream.Milestone",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  // --- Write Functions ---
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
    inputs: [{ internalType: "uint256", name: "streamId", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "streamId", type: "uint256" }],
    name: "pauseStream",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "streamId", type: "uint256" }],
    name: "resumeStream",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "streamId", type: "uint256" }],
    name: "cancelStream",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "streamId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "submitMilestone",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "milestoneId", type: "uint256" }],
    name: "approveMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "milestoneId", type: "uint256" }],
    name: "rejectMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "milestoneId", type: "uint256" }],
    name: "claimMilestone",
    outputs: [],
    stateMutability: "nonpayable",
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
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Get token symbol
 */
export async function getTokenSymbol(
  tokenAddress: Address,
): Promise<string> {
    const symbol = await readContract(config, {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol',
    });
    return symbol as string;
}

/**
 * Get token name
 */
export async function getTokenName(
  tokenAddress: Address,
): Promise<string> {
    const name = await readContract(config, {
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name',
    });
    return name as string;
}

/**
 * Fetch all streams where the user is the employee.
 * Strategy:
 * 1. Filter 'StreamCreated' events where 'employee' == userAddress.
 * 2. Extract streamIds.
 * 3. Fetch current stream details for each ID.
 */
export async function getEmployeeStreams(
  contractAddress: Address,
  employeeAddress: Address,
  publicClient: any // Pass the public client from wagmi/viem
) {
  console.log(`🔍 Fetching streams for employee: ${employeeAddress}`);

  // 1. Get Logs (Indexed Query)
  // We look for StreamCreated events where the 3rd indexed argument (employee) matches
  const logs = await publicClient.getLogs({
    address: contractAddress,
    event: parseAbiItem('event StreamCreated(uint256 indexed streamId, address indexed company, address indexed employee, address token, uint256 streamAmount, uint256 escrowAmount, uint64 startTime, uint64 stopTime)'),
    args: {
      employee: employeeAddress,
    },
    fromBlock: 'earliest', // Or a specific deployment block to save RPC calls
  });

  console.log(`Found ${logs.length} stream creation events.`);

  // 2. Extract Stream IDs
  const streamIds = logs.map((log: any) => log.args.streamId);

  // 3. Fetch Details (in parallel)
  // Note: In a production app, you might want to use multicall here
  const streamDetailsPromises = streamIds.map((id: bigint) =>
    publicClient.readContract({
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: 'getStream',
      args: [id],
    })
  );

  const streams = await Promise.all(streamDetailsPromises);

  // Combine ID with data
  return streams.map((stream: any, index: number) => ({
    streamId: streamIds[index].toString(),
    ...stream,
  }));
}

/**
 * Fetch all streams where the user is the company.
 * Strategy:
 * 1. Filter 'StreamCreated' events where 'company' == userAddress.
 * 2. Extract streamIds.
 * 3. Fetch current stream details for each ID.
 */
export async function getCompanyStreams(
  contractAddress: Address,
  companyAddress: Address,
  publicClient: any
) {
  console.log(`🔍 Fetching streams for company: ${companyAddress}`);

  // 1. Get Logs (Indexed Query)
  const logs = await publicClient.getLogs({
    address: contractAddress,
    event: parseAbiItem('event StreamCreated(uint256 indexed streamId, address indexed company, address indexed employee, address token, uint256 streamAmount, uint256 escrowAmount, uint64 startTime, uint64 stopTime)'),
    args: {
      company: companyAddress,
    },
    fromBlock: 'earliest',
  });

  console.log(`Found ${logs.length} company stream creation events.`);

  // 2. Extract Stream IDs
  const streamIds = logs.map((log: any) => log.args.streamId);

  // 3. Fetch Details (in parallel)
  const streamDetailsPromises = streamIds.map((id: bigint) =>
    publicClient.readContract({
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: 'getStream',
      args: [id],
    })
  );

  const streams = await Promise.all(streamDetailsPromises);

  // Combine ID with data
  return streams.map((stream: any, index: number) => ({
    streamId: streamIds[index].toString(),
    ...stream,
  }));
}

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
      functionName: "withdraw",
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
      functionName: "pauseStream",
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
      functionName: "resumeStream",
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
      functionName: "cancelStream",
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
      args: [BigInt(streamId), amountInWei],
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
