const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Paystream Escrow...\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deploying from: ${deployer.address}\n`);

  // Deploy PaystreamCore
  console.log("1️⃣  Deploying PaystreamCore...");
  const PaystreamCore = await ethers.getContractFactory("PaystreamCore");
  const paystream = await PaystreamCore.deploy();
  await paystream.waitForDeployment();
  const paystreamAddress = await paystream.getAddress();
  console.log(`✅ PaystreamCore deployed to: ${paystreamAddress}\n`);

  // Deploy MilestoneEscrowImpl
  console.log("2️⃣  Deploying MilestoneEscrowImpl...");
  // Note: For the actual deployment, you'll need to deploy a token first
  // This example assumes you have a token address
  const tokenAddress = process.env.TOKEN_ADDRESS || ethers.ZeroAddress;

  const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrowImpl");
  const milestoneEscrow = await MilestoneEscrow.deploy(tokenAddress, paystreamAddress);
  await milestoneEscrow.waitForDeployment();
  const milestoneEscrowAddress = await milestoneEscrow.getAddress();
  console.log(`✅ MilestoneEscrowImpl deployed to: ${milestoneEscrowAddress}\n`);

  // Link contracts
  console.log("3️⃣  Linking contracts...");
  await paystream.setMilestoneEscrow(milestoneEscrowAddress);
  console.log("✅ Contracts linked\n");

  // Summary
  console.log("═══════════════════════════════════════");
  console.log("🎉 Deployment Complete!");
  console.log("═══════════════════════════════════════\n");

  console.log("📋 Contract Addresses:");
  console.log(`   PaystreamCore:      ${paystreamAddress}`);
  console.log(`   MilestoneEscrow:    ${milestoneEscrowAddress}`);
  console.log(`   Token Address:      ${tokenAddress}\n`);

  console.log("📝 Next Steps:");
  console.log("   1. Grant COMPANY_ROLE to company accounts");
  console.log("   2. Grant EMPLOYEE_ROLE to employee accounts");
  console.log("   3. Grant AUDITOR_ROLE to auditor accounts");
  console.log("   4. Deploy or use existing ERC20 token\n");

  // Export deployment info
  const deploymentInfo = {
    network: hre.network.name,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PaystreamCore: paystreamAddress,
      MilestoneEscrow: milestoneEscrowAddress,
    },
  };

  console.log("📦 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
