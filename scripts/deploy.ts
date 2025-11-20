import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying Paystream to Sepolia...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Deploy Paystream
  console.log("Deploying Paystream...");
  const PaystreamFactory = await ethers.getContractFactory("Paystream");
  const paystream = await PaystreamFactory.deploy();
  await paystream.waitForDeployment();
  const paystreamAddress = await paystream.getAddress();
  console.log(`✓ Paystream deployed to: ${paystreamAddress}\n`);

  // Output deployment summary
  console.log("=== Deployment Summary ===\n");
  console.log("Network: Sepolia");
  console.log(`Paystream: ${paystreamAddress}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Save deployment addresses to file
  const deploymentData = {
    network: "sepolia",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      Paystream: paystreamAddress,
    },
  };

  const deploymentPath = path.join(__dirname, "../deployments/sepolia.json");
  const deploymentDir = path.dirname(deploymentPath);

  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`✓ Deployment addresses saved to: deployments/sepolia.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
