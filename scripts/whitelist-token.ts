import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0x55225ca36FF331838223194E8Edac30BA5B0600c";
  const usdcSepoliaAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  console.log("🔐 Whitelisting USDC token on Sepolia...");
  console.log(`Contract: ${contractAddress}`);
  console.log(`Token: ${usdcSepoliaAddress}`);

  // Get the contract instance
  const paystream = await ethers.getContractAt("Paystream", contractAddress);

  // Call updateTokenWhitelist
  console.log("\n📝 Calling updateTokenWhitelist...");
  const tx = await paystream.updateTokenWhitelist(usdcSepoliaAddress, true);
  console.log(`Transaction sent: ${tx.hash}`);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log(`✅ Transaction confirmed in block ${receipt?.blockNumber}`);
  console.log(`Gas used: ${receipt?.gasUsed.toString()}`);

  // Verify the token is whitelisted
  console.log("\n✓ Verifying token whitelist status...");
  const isWhitelisted = await paystream.isTokenWhitelisted(usdcSepoliaAddress);
  console.log(`Token whitelisted: ${isWhitelisted}`);

  if (isWhitelisted) {
    console.log("\n✅ SUCCESS! USDC token is now whitelisted on Sepolia");
  } else {
    console.log("\n❌ ERROR: Token whitelist failed");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
