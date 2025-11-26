#!/usr/bin/env node

/**
 * Direct token whitelisting script
 * Usage: node fix-whitelist.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/xEdjPWL3Yc6MaDLNA1VWr";
const PRIVATE_KEY = "8adf874d1c763748e5bf5e9072f40c38dd7cbfbd362704b4812ca5c17f4050ae";
const CONTRACT_ADDRESS = "0x55225ca36FF331838223194E8Edac30BA5B0600c";
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// Minimal ABI with updateTokenWhitelist function
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

async function whitelistToken() {
  try {
    console.log("🔐 Whitelisting USDC token on Sepolia...");
    console.log(`Contract: ${CONTRACT_ADDRESS}`);
    console.log(`Token: ${USDC_ADDRESS}\n`);

    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log(`📍 Using account: ${signer.address}`);

    // Get contract instance
    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      PAYSTREAM_ABI,
      signer
    );

    // Check current whitelist status
    console.log("\n🔍 Checking current whitelist status...");
    const isWhitelisted = await contract.isTokenWhitelisted(USDC_ADDRESS);
    console.log(`Token currently whitelisted: ${isWhitelisted}`);

    if (isWhitelisted) {
      console.log(
        "✅ Token is already whitelisted! Payment creation should work now.\n"
      );
      process.exit(0);
    }

    // Estimate gas
    console.log("\n📊 Estimating gas...");
    const gasEstimate = await contract.updateTokenWhitelist.estimateGas(
      USDC_ADDRESS,
      true
    );
    console.log(`Estimated gas: ${gasEstimate.toString()}`);

    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    console.log(`Current gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    // Call updateTokenWhitelist
    console.log("\n📝 Sending transaction to whitelist token...");
    const tx = await contract.updateTokenWhitelist(USDC_ADDRESS, true);
    console.log(`✅ Transaction sent!`);
    console.log(`📋 Hash: ${tx.hash}`);

    // Wait for confirmation
    console.log("\n⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      console.log(`💨 Gas used: ${receipt.gasUsed.toString()}`);

      // Verify whitelist status
      console.log("\n🔍 Verifying whitelist status...");
      const verified = await contract.isTokenWhitelisted(USDC_ADDRESS);

      if (verified) {
        console.log(
          "✅ SUCCESS! USDC token is now whitelisted on Sepolia!\n"
        );
        console.log("🎉 You can now create payment streams with USDC!");
        console.log("🚀 Navigate to http://localhost:3000/dashboard/company/create-stream to test\n");
        process.exit(0);
      } else {
        console.log("❌ ERROR: Token is still not whitelisted");
        process.exit(1);
      }
    } else {
      console.log(`❌ Transaction failed in block ${receipt.blockNumber}`);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("Contract error data:", error.data);
    }
    process.exit(1);
  }
}

whitelistToken();
