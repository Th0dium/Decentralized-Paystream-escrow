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

  // 1. Deploy Paystream
  console.log("Deploying Paystream contract...");
  const PaystreamFactory = await ethers.getContractFactory("Paystream");
  const paystream = await PaystreamFactory.deploy();
  await paystream.waitForDeployment();
  const paystreamAddress = await paystream.getAddress();
  console.log(`✓ Paystream deployed to: ${paystreamAddress}`);

  // 2. Deploy PaystreamAdmin
  console.log("\nDeploying PaystreamAdmin contract...");
  const PaystreamAdminFactory = await ethers.getContractFactory("PaystreamAdmin");
  const paystreamAdmin = await PaystreamAdminFactory.deploy(deployer.address, paystreamAddress);
  await paystreamAdmin.waitForDeployment();
  const paystreamAdminAddress = await paystreamAdmin.getAddress();
  console.log(`✓ PaystreamAdmin deployed to: ${paystreamAdminAddress}`);

  // 3. Link Paystream to PaystreamAdmin
  console.log("\nLinking Paystream contract to its Admin contract...");
  const tx = await paystream.setAdminContract(paystreamAdminAddress);
  await tx.wait();
  console.log("✓ Link successful. `adminContract` set on Paystream.");
  
  // 4. (Optional) Set initial fee recipient if different from deployer
  console.log("\nSetting initial fee recipient...");
  const feeTx = await paystreamAdmin.updateFeeRecipient(deployer.address);
  await feeTx.wait();
  console.log(`✓ Fee recipient set to: ${deployer.address}`);

  // Output deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log(`Network:   ${networkName}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("--------------------------");
  console.log(`Paystream:      ${paystreamAddress}`);
  console.log(`PaystreamAdmin: ${paystreamAdminAddress}`);
  console.log("==========================\n");

  // Save deployment addresses to file
  const deploymentData = {
    network: networkName,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      Paystream: paystreamAddress,
      PaystreamAdmin: paystreamAdminAddress,
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