#!/bin/bash

# Token Whitelist Script using Web3 RPC calls
# This script whitelists USDC on the Paystream contract

set -e

RPC_URL="https://eth-sepolia.g.alchemy.com/v2/xEdjPWL3Yc6MaDLNA1VWr"
CONTRACT_ADDRESS="0x55225ca36FF331838223194E8Edac30BA5B0600c"
USDC_ADDRESS="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
PRIVATE_KEY="8adf874d1c763748e5bf5e9072f40c38dd7cbfbd362704b4812ca5c17f4050ae"

echo "🔐 Whitelisting USDC token on Sepolia..."
echo "Contract: $CONTRACT_ADDRESS"
echo "Token: $USDC_ADDRESS"
echo ""

# Check if required tools exist
if ! command -v curl &> /dev/null; then
    echo "❌ curl is required but not installed"
    exit 1
fi

# Try to use ethers or web3 via Node
if command -v node &> /dev/null; then
    echo "📌 Using Node.js to execute whitelist script..."
    node << 'EONODE'
const { ethers } = require("ethers");

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/xEdjPWL3Yc6MaDLNA1VWr";
const PRIVATE_KEY = "8adf874d1c763748e5bf5e9072f40c38dd7cbfbd362704b4812ca5c17f4050ae";
const CONTRACT_ADDRESS = "0x55225ca36FF331838223194E8Edac30BA5B0600c";
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const PAYSTREAM_ABI = [
  {
    type: "function",
    name: "updateTokenWhitelist",
    inputs: [
      { name: "token", type: "address" },
      { name: "whitelisted", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isTokenWhitelisted",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
];

async function whitelist() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, PAYSTREAM_ABI, signer);

    console.log(`📍 Using account: ${signer.address}`);

    // Check status
    console.log("\n🔍 Checking whitelist status...");
    const isWhitelisted = await contract.isTokenWhitelisted(USDC_ADDRESS);
    console.log(`Token whitelisted: ${isWhitelisted}`);

    if (isWhitelisted) {
      console.log("✅ Token is already whitelisted!\n");
      process.exit(0);
    }

    // Whitelist token
    console.log("\n📝 Whitelisting token...");
    const tx = await contract.updateTokenWhitelist(USDC_ADDRESS, true);
    console.log(`✅ Transaction sent: ${tx.hash}`);

    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
      console.log(`💨 Gas used: ${receipt.gasUsed.toString()}`);

      const verified = await contract.isTokenWhitelisted(USDC_ADDRESS);
      if (verified) {
        console.log("\n✅ SUCCESS! USDC is now whitelisted!");
        console.log("🎉 Payment creation should now work!");
        process.exit(0);
      }
    }
    process.exit(1);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

whitelist();
EONODE
else
    echo "❌ Node.js is required but not found"
    echo "Please install Node.js or run the hardhat script from your terminal:"
    echo "  npx hardhat run scripts/whitelist-token.ts --network sepolia"
    exit 1
fi
