import { expect } from "chai";
import { ethers } from "hardhat";

describe("Foundation contracts", function () {
    it("deploys PaystreamCore and MilestoneEscrow", async function () {
        const [deployer, company, employee] = await ethers.getSigners();

        const Escrow = await ethers.getContractFactory("MilestoneEscrow");
        const escrow = await Escrow.connect(deployer).deploy();
        await escrow.deployed();

        const Core = await ethers.getContractFactory("PaystreamCore");
        const core = await Core.connect(deployer).deploy(escrow.address);
        await core.deployed();

        expect(await core.milestoneEscrow()).to.equal(escrow.address);
    });
});
