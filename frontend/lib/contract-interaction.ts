import { BrowserProvider, Contract, parseUnits } from "ethers";

// Minimal Paystream ABI with just the functions we need
const PAYSTREAM_ABI = [
  {
    inputs: [
      { internalType: "address", name: "employee", type: "address" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint256", name: "totalAmount", type: "uint256" },
      { internalType: "uint64", name: "startTime", type: "uint64" },
      { internalType: "uint64", name: "stopTime", type: "uint64" },
      { internalType: "uint16", name: "escrowBps", type: "uint16" },
    ],
    name: "createStream",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

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
];

/**
 * Get the MetaMask provider
 */
function getProvider() {
  if (typeof window === "undefined") {
    throw new Error("Window object not found");
  }

  const provider = (window as any).ethereum;

  if (!provider) {
    throw new Error("MetaMask wallet not found. Please install the extension.");
  }

  return new ethers.BrowserProvider(provider);
}

/**
 * Request account access from wallet
 */
export async function requestAccount(): Promise<string> {
  const provider = getEthereumProvider();
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  return accounts[0];
}

/**
 * Get the ethers.js provider and signer
 */
export async function getProviderAndSigner() {
  const provider = getEthereumProvider();
  const ethersProvider = new BrowserProvider(provider);
  const signer = await ethersProvider.getSigner();
  return { ethersProvider, signer };
}

/**
 * Approve tokens for the Paystream contract
 */
export async function approveTokens(
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  decimals: number = 18
): Promise<string> {
  const { signer } = await getProviderAndSigner();

  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
  const amountInWei = parseUnits(amount, decimals);

  console.log("🔐 Approving tokens...");
  console.log(`Token: ${tokenAddress}`);
  console.log(`Spender: ${spenderAddress}`);
  console.log(`Amount: ${amount} tokens (${amountInWei} wei)`);

  const tx = await tokenContract.approve(spenderAddress, amountInWei);
  console.log(`✅ Approval transaction sent: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`✅ Approval confirmed in block ${receipt?.blockNumber}`);

  return tx.hash;
}

/**
 * Create a stream on the Paystream contract
 */
export async function createStream(
  contractAddress: string,
  employeeAddress: string,
  tokenAddress: string,
  totalAmount: string,
  durationDays: number,
  escrowPercentage: number,
  tokenDecimals: number = 18
): Promise<{ transactionHash: string; streamId?: string }> {
  const { signer, ethersProvider } = await getProviderAndSigner();

  // Get current block timestamp
  const block = await ethersProvider.getBlock("latest");
  if (!block) throw new Error("Failed to get current block");

  const startTime = Math.floor(block.timestamp);
  const stopTime = startTime + durationDays * 24 * 60 * 60;

  // Convert amount to wei
  const amountInWei = parseUnits(totalAmount, tokenDecimals);

  // Convert percentage to basis points (0-10000)
  const escrowBps = Math.floor(escrowPercentage * 100);

  console.log("\n💰 === CREATE STREAM ===");
  console.log(`📍 Contract: ${contractAddress}`);
  console.log(`👤 Employee: ${employeeAddress}`);
  console.log(`💵 Token: ${tokenAddress}`);
  console.log(`💰 Amount: ${totalAmount} tokens (${amountInWei} wei)`);
  console.log(`📅 Start: ${new Date(startTime * 1000).toISOString()}`);
  console.log(`📅 Stop: ${new Date(stopTime * 1000).toISOString()}`);
  console.log(`⏱️ Duration: ${durationDays} days`);
  console.log(`🔒 Escrow: ${escrowPercentage}% (${escrowBps} bps)`);

  const contract = new Contract(contractAddress, PAYSTREAM_ABI, signer);

  try {
    console.log("\n📤 Submitting createStream transaction...");
    const tx = await contract.createStream(
      employeeAddress,
      tokenAddress,
      amountInWei,
      startTime,
      stopTime,
      escrowBps
    );

    console.log(`✅ Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`✅ Confirmed in block ${receipt?.blockNumber}`);

    return {
      transactionHash: tx.hash,
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
  tokenAddress: string,
  accountAddress: string
): Promise<string> {
  const { ethersProvider } = await getProviderAndSigner();
  const contract = new Contract(tokenAddress, ERC20_ABI, ethersProvider);
  const balance = await contract.balanceOf(accountAddress);
  return balance.toString();
}

/**
 * Get token decimals
 */
export async function getTokenDecimals(tokenAddress: string): Promise<number> {
  const { ethersProvider } = await getProviderAndSigner();
  const contract = new Contract(tokenAddress, ERC20_ABI, ethersProvider);
  const decimals = await contract.decimals();
  return decimals;
}

/**
 * Check if connected to correct network
 */
export async function checkNetwork(expectedChainId: number): Promise<boolean> {
  const { ethersProvider } = await getProviderAndSigner();
  const network = await ethersProvider.getNetwork();
  console.log(`Connected to chain ID: ${network.chainId}, expected: ${expectedChainId}`);
  return network.chainId === expectedChainId;
}
