import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "localhost" : network.name;
  console.log(`Deploying to ${networkName} network...\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // Deploy Paystream
  console.log("Deploying Paystream contract...");
  const PaystreamFactory = await ethers.getContractFactory("Paystream");
  const paystream = await PaystreamFactory.deploy();
  await paystream.waitForDeployment();
  const paystreamAddress = await paystream.getAddress();
  console.log(`✓ Paystream deployed to: ${paystreamAddress}\n`);

  // Output deployment summary
  console.log("=== Deployment Summary ===");
  console.log(`Network:   ${networkName}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("--------------------------");
  console.log(`Paystream: ${paystreamAddress}`);
  console.log("==========================\n");

  // Save deployment addresses to file
  const deploymentData = {
    network: networkName,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      Paystream: paystreamAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`✓ Deployment addresses saved to: deployments/${networkName}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
