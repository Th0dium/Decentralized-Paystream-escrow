import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Paystream Escrow MVP...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}\n`);

  // Deploy PaymentToken
  console.log("Deploying PaymentToken...");
  const PaymentTokenFactory = await ethers.getContractFactory("PaymentToken");
  const paymentToken = await PaymentTokenFactory.deploy();
  await paymentToken.waitForDeployment();
  const paymentTokenAddress = await paymentToken.getAddress();
  console.log(`PaymentToken deployed to: ${paymentTokenAddress}\n`);

  // Deploy AccessControl
  console.log("Deploying AccessControl...");
  const AccessControlFactory = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControlFactory.deploy();
  await accessControl.waitForDeployment();
  const accessControlAddress = await accessControl.getAddress();
  console.log(`AccessControl deployed to: ${accessControlAddress}\n`);

  // Deploy SalaryStreamEscrow
  console.log("Deploying SalaryStreamEscrow...");
  const SalaryStreamFactory = await ethers.getContractFactory("SalaryStreamEscrow");
  const salaryStream = await SalaryStreamFactory.deploy(paymentTokenAddress, accessControlAddress);
  await salaryStream.waitForDeployment();
  const salaryStreamAddress = await salaryStream.getAddress();
  console.log(`SalaryStreamEscrow deployed to: ${salaryStreamAddress}\n`);

  // Deploy MilestoneEscrow
  console.log("Deploying MilestoneEscrow...");
  const MilestoneFactory = await ethers.getContractFactory("MilestoneEscrow");
  const milestoneEscrow = await MilestoneFactory.deploy(
    paymentTokenAddress,
    accessControlAddress,
    salaryStreamAddress
  );
  await milestoneEscrow.waitForDeployment();
  const milestoneEscrowAddress = await milestoneEscrow.getAddress();
  console.log(`MilestoneEscrow deployed to: ${milestoneEscrowAddress}\n`);

  // Output deployment summary
  console.log("=== Deployment Summary ===\n");
  console.log("Deployed Contracts:");
  console.log(`  PaymentToken:       ${paymentTokenAddress}`);
  console.log(`  AccessControl:      ${accessControlAddress}`);
  console.log(`  SalaryStreamEscrow: ${salaryStreamAddress}`);
  console.log(`  MilestoneEscrow:    ${milestoneEscrowAddress}`);
  console.log(`\nDeployer:            ${deployer.address}\n`);

  // Save deployment addresses
  const deploymentData = {
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PaymentToken: paymentTokenAddress,
      AccessControl: accessControlAddress,
      SalaryStreamEscrow: salaryStreamAddress,
      MilestoneEscrow: milestoneEscrowAddress,
    },
  };

  console.log("Deployment Data:");
  console.log(JSON.stringify(deploymentData, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
