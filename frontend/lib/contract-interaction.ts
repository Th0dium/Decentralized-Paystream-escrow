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
      { indexed: false, internalType: "uint256", name: "paymentId", type: "uint256" },
      { indexed: false, internalType: "string", name: "name", type: "string" },
      { indexed: true, internalType: "address", name: "company", type: "address" },
      { indexed: true, internalType: "address", name: "employee", type: "address" },
      { indexed: true, internalType: "address", name: "auditor", type: "address" },
      { indexed: false, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint256", name: "streamAmount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "escrowAmount", type: "uint256" },
      { indexed: false, internalType: "uint64", name: "startTime", type: "uint64" },
      { indexed: false, internalType: "uint64", name: "stopTime", type: "uint64" },
    ],
    name: "PaymentCreated",
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
    inputs: [{ internalType: "uint256", name: "paymentId", type: "uint256" }],
    name: "getPayment",
    outputs: [
      {
        components: [
          { internalType: "string", name: "name", type: "string" },
          { internalType: "address", name: "company", type: "address" },
          { internalType: "address", name: "employee", type: "address" },
          { internalType: "address", name: "auditor", type: "address" },
          { internalType: "string", name: "auditorPublicKey", type: "string" },
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
        internalType: "struct Paystream.Payment",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "payments",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "address", name: "company", type: "address" },
      { internalType: "address", name: "employee", type: "address" },
      { internalType: "address", name: "auditor", type: "address" },
      { internalType: "string", name: "auditorPublicKey", type: "string" },
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
    name: "getEmployeePayments",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "company", type: "address" }],
    name: "getCompanyPayments",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "getAuditorPayments",
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
    inputs: [{ internalType: "uint256", name: "paymentId", type: "uint256" }],
    name: "getPaymentMilestones",
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
          { internalType: "uint256", name: "paymentId", type: "uint256" },
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
      { internalType: "string", name: "name", type: "string" },
      { internalType: "address", name: "employee", type: "address" },
      { internalType: "address", name: "auditor", type: "address" },
      { internalType: "string", name: "auditorPublicKey", type: "string" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "streamAmount", type: "uint256" },
      { internalType: "uint256", name: "escrowAmount", type: "uint256" },
      { internalType: "uint64", name: "startTime", type: "uint64" },
      { internalType: "uint64", name: "stopTime", type: "uint64" },
    ],
    name: "createPayment",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "paymentId", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "paymentId", type: "uint256" }],
    name: "pausePayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "paymentId", type: "uint256" }],
    name: "resumePayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "paymentId", type: "uint256" }],
    name: "cancelPayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "paymentId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "submitMilestone",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "paymentId", type: "uint256" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "string", name: "encryptedEvidenceHash", type: "string" },
    ],
    name: "submitMilestoneWithEvidence",
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
 * Fetch all payments where the user is the employee.
 * Strategy:
 * 1. Filter 'PaymentCreated' events where 'employee' == userAddress.
 * 2. Extract paymentIds.
 * 3. Fetch current payment details for each ID.
 */
export async function getEmployeePayments(
  contractAddress: Address,
  employeeAddress: Address,
  publicClient: any // Pass the public client from wagmi/viem
) {
  console.log(`🔍 Fetching payments for employee: ${employeeAddress}`);

  // 1. Get Logs (Indexed Query)
  // We look for PaymentCreated events where the 3rd indexed argument (employee) matches
  const logs = await publicClient.getLogs({
    address: contractAddress,
    event: parseAbiItem('event PaymentCreated(uint256 paymentId, string name, address indexed company, address indexed employee, address indexed auditor, address token, uint256 streamAmount, uint256 escrowAmount, uint64 startTime, uint64 stopTime)'),
    args: {
      employee: employeeAddress,
    },
    fromBlock: 'earliest', // Or a specific deployment block to save RPC calls
  });

  console.log(`Found ${logs.length} payment creation events.`);

  // 2. Extract Payment IDs
  const paymentIds = logs.map((log: any) => log.args.paymentId);

  // 3. Fetch Details (in parallel)
  // Note: In a production app, you might want to use multicall here
  const paymentDetailsPromises = paymentIds.map((id: bigint) =>
    publicClient.readContract({
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: 'getPayment',
      args: [id],
    })
  );

  const payments = await Promise.all(paymentDetailsPromises);

  // Combine ID with data
  return payments.map((payment: any, index: number) => ({
    paymentId: paymentIds[index].toString(),
    ...payment,
  }));
}

/**
 * Fetch all payments where the user is the company.
 * Strategy:
 * 1. Filter 'PaymentCreated' events where 'company' == userAddress.
 * 2. Extract paymentIds.
 * 3. Fetch current payment details for each ID.
 */
export async function getCompanyPayments(
  contractAddress: Address,
  companyAddress: Address,
  publicClient: any
) {
  console.log(`🔍 Fetching payments for company: ${companyAddress}`);

  // 1. Get Logs (Indexed Query)
  const logs = await publicClient.getLogs({
    address: contractAddress,
    event: parseAbiItem('event PaymentCreated(uint256 paymentId, string name, address indexed company, address indexed employee, address indexed auditor, address token, uint256 streamAmount, uint256 escrowAmount, uint64 startTime, uint64 stopTime)'),
    args: {
      company: companyAddress,
    },
    fromBlock: 'earliest',
  });

  console.log(`Found ${logs.length} company payment creation events.`);

  // 2. Extract Payment IDs
  const paymentIds = logs.map((log: any) => log.args.paymentId);

  // 3. Fetch Details (in parallel)
  const paymentDetailsPromises = paymentIds.map((id: bigint) =>
    publicClient.readContract({
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: 'getPayment',
      args: [id],
    })
  );

  const payments = await Promise.all(paymentDetailsPromises);

  // Combine ID with data
  return payments.map((payment: any, index: number) => ({
    paymentId: paymentIds[index].toString(),
    ...payment,
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
 * Create a payment on the Paystream contract with separate stream and escrow amounts
 */
export async function createPayment(
  contractAddress: Address,
  name: string,
  employeeAddress: Address,
  auditorAddress: Address,
  auditorPublicKey: string,
  tokenAddress: Address,
  streamAmount: string,
  escrowAmount: string,
  durationDays: number,
  tokenDecimals: number = 18
): Promise<{ transactionHash: string; paymentId?: string }> {

  // Get current block timestamp
  const block = await getBlock(config);
  const startTime = Number(block.timestamp); // viem timestamp is bigint
  const stopTime = startTime + durationDays * 24 * 60 * 60;

  // Convert amounts to wei
  const streamAmountInWei = parseUnits(streamAmount, tokenDecimals);
  const escrowAmountInWei = parseUnits(escrowAmount, tokenDecimals);

  console.log("\n💰 === CREATE PAYMENT (viem) ===");
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`📝 Name: ${name}`);
  console.log(`👤 Employee: ${employeeAddress}`);
  console.log(`🕵️ Auditor: ${auditorAddress || "Company (Self)"}`);
  console.log(`🔐 Auditor Public Key: ${auditorPublicKey.substring(0, 20)}...`);
  console.log(`💰 Stream Amount: ${streamAmount} tokens (${streamAmountInWei} wei)`);
  console.log(`🎯 Escrow Amount: ${escrowAmount} tokens (${escrowAmountInWei} wei)`);
  console.log(`📅 Duration: ${durationDays} days`);
  console.log(`⏰ Start: ${startTime}, Stop: ${stopTime}`);

  try {
    console.log("\n📤 Submitting createPayment transaction...");
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "createPayment",
      args: [
        name,
        employeeAddress,
        auditorAddress,
        auditorPublicKey,
        tokenAddress,
        streamAmountInWei,
        escrowAmountInWei,
        BigInt(startTime),
        BigInt(stopTime),
      ],
    });

    console.log(`✅ Transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });

    // Parse logs to find PaymentCreated event and extract paymentId
    let paymentId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const decodedLog = decodeEventLog({
          abi: PAYSTREAM_ABI,
          eventName: 'PaymentCreated',
          data: log.data,
          topics: log.topics,
        });
        if (decodedLog.eventName === 'PaymentCreated') {
          paymentId = decodedLog.args.paymentId.toString();
          console.log(`✅ Found PaymentCreated event. ID: ${paymentId}`);
          break;
        }
      } catch {
        // Not our event, ignore
      }
    }

    return {
      transactionHash: hash,
      paymentId
    };
  } catch (error) {
    console.error("\n❌ === CREATE PAYMENT FAILED ===");
    if (error instanceof Error) {
      console.error("Error:", error.message);
      throw new Error(`Failed to create payment: ${error.message}`);
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

// ============ PAYMENT MANAGEMENT FUNCTIONS ============

/**
 * Withdraw vested funds from a payment
 */
export async function withdrawPayment(
  contractAddress: Address,
  paymentId: string
): Promise<{ transactionHash: string }> {
  console.log("\n💰 === WITHDRAW PAYMENT ===");
  console.log(`📍 Payment ID: ${paymentId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "withdraw",
      args: [BigInt(paymentId)],
    });

    console.log(`📤 Withdrawal transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Withdrawal confirmed in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Withdrawal failed";
    console.error("❌ Error withdrawing from payment:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Pause a payment
 */
export async function pausePayment(
  contractAddress: Address,
  paymentId: string
): Promise<{ transactionHash: string }> {
  console.log("\n⏸️ === PAUSE PAYMENT ===");
  console.log(`📍 Payment ID: ${paymentId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "pausePayment",
      args: [BigInt(paymentId)],
    });

    console.log(`📤 Pause transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Payment paused in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Pause failed";
    console.error("❌ Error pausing payment:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Resume a paused payment
 */
export async function resumePayment(
  contractAddress: Address,
  paymentId: string
): Promise<{ transactionHash: string }> {
  console.log("\n▶️ === RESUME PAYMENT ===");
  console.log(`📍 Payment ID: ${paymentId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "resumePayment",
      args: [BigInt(paymentId)],
    });

    console.log(`📤 Resume transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Payment resumed in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Resume failed";
    console.error("❌ Error resuming payment:", errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Cancel a payment and refund remaining balance
 */
export async function cancelPayment(
  contractAddress: Address,
  paymentId: string
): Promise<{ transactionHash: string }> {
  console.log("\n❌ === CANCEL PAYMENT ===");
  console.log(`📍 Payment ID: ${paymentId}`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "cancelPayment",
      args: [BigInt(paymentId)],
    });

    console.log(`📤 Cancel transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Payment cancelled in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Cancellation failed";
    console.error("❌ Error cancelling payment:", errorMsg);
    throw new Error(errorMsg);
  }
}

// ============ MILESTONE FUNCTIONS ============

/**
 * Submit a milestone for approval
 */
export async function submitMilestone(
  contractAddress: Address,
  paymentId: string,
  amount: string,
  tokenDecimals: number = 18
): Promise<{ transactionHash: string }> {
  const amountInWei = parseUnits(amount, tokenDecimals);

  console.log("\n📤 === SUBMIT MILESTONE ===");
  console.log(`📍 Payment ID: ${paymentId}`);
  console.log(`💰 Amount: ${amount} (${amountInWei} wei)`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "submitMilestone",
      args: [BigInt(paymentId), amountInWei],
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
 * Submit a milestone with encrypted evidence
 * Employee submits a milestone along with encrypted evidence (IPFS hash encrypted with auditor's public key)
 */
export async function submitMilestoneWithEvidence(
  contractAddress: Address,
  paymentId: string,
  amount: string,
  encryptedEvidenceHash: string,
  tokenDecimals: number = 18
): Promise<{ transactionHash: string }> {
  const amountInWei = parseUnits(amount, tokenDecimals);

  console.log("\n📤 === SUBMIT MILESTONE WITH EVIDENCE ===");
  console.log(`📍 Payment ID: ${paymentId}`);
  console.log(`💰 Amount: ${amount} (${amountInWei} wei)`);
  console.log(`🔐 Evidence: ${encryptedEvidenceHash.substring(0, 50)}...`);

  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: PAYSTREAM_ABI,
      functionName: "submitMilestoneWithEvidence",
      args: [BigInt(paymentId), amountInWei, encryptedEvidenceHash],
    });

    console.log(`📤 Milestone submission transaction sent: ${hash}`);
    const receipt = await waitForTransactionReceipt(config, { hash });
    console.log(`✅ Milestone submitted with evidence in block ${receipt.blockNumber}`);

    return { transactionHash: hash };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Milestone submission failed";
    console.error("❌ Error submitting milestone with evidence:", errorMsg);
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
