import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying to Sepolia with account:", deployer.address);

    // Deploy MilestoneEscrow
    const Milestone = await ethers.getContractFactory("MilestoneEscrow");
    const milestone = await Milestone.connect(deployer).deploy();
    await milestone.waitForDeployment();
    console.log("MilestoneEscrow deployed to:", await milestone.getAddress());

    // Deploy PaystreamCore with escrow address
    const Core = await ethers.getContractFactory("PaystreamCore");
    const core = await Core.connect(deployer).deploy(await milestone.getAddress());
    await core.waitForDeployment();
    console.log("PaystreamCore deployed to:", await core.getAddress());

    // Grant MANAGER_ROLE on MilestoneEscrow to PaystreamCore
    const MANAGER_ROLE = await milestone.MANAGER_ROLE();
    const tx = await milestone.connect(deployer).grantRole(MANAGER_ROLE, await core.getAddress());
    await tx.wait();
    console.log("Granted MANAGER_ROLE on MilestoneEscrow to PaystreamCore");

    console.log("\nDeployment complete:\n", {
        MilestoneEscrow: await milestone.getAddress(),
        PaystreamCore: await core.getAddress(),
    });
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
