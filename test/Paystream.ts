import { ethers } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Paystream, TestERC20 } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Paystream", function () {
    let company: HardhatEthersSigner;
    let employee: HardhatEthersSigner;
    let auditor: HardhatEthersSigner;
    let paystream: Paystream;
    let token: TestERC20;

    const DAY = 24 * 60 * 60;
    const STREAM = ethers.parseUnits("1000", 18);
    const ESCROW = ethers.parseUnits("300", 18);

    beforeEach(async function () {
        [, company, employee, auditor] = await ethers.getSigners();

        token = await (await ethers.getContractFactory("TestERC20")).deploy("Test Token", "TTK");
        await token.mint(company.address, ethers.parseUnits("10000", 18));

        paystream = await (await ethers.getContractFactory("Paystream")).deploy();
        await paystream.updateTokenWhitelist(await token.getAddress(), true);
    });

    // 10-day payment: 1000 streamed (100/day) + 300 in escrow
    async function createPayment(employeeAddr = employee.address, auditorAddr = auditor.address) {
        const start = (await time.latest()) + 100;
        const stop = start + 10 * DAY;
        await token.connect(company).approve(await paystream.getAddress(), STREAM + ESCROW);
        await paystream.connect(company).createPayment(
            "Salary", employeeAddr, auditorAddr, "", await token.getAddress(), STREAM, ESCROW, start, stop
        );
        return { id: 1, start, stop };
    }

    // The contract must never owe more than it holds: once a payment is settled, nothing is left behind
    async function expectContractEmpty() {
        expect(await token.balanceOf(await paystream.getAddress())).to.equal(0);
    }

    it("streams salary linearly", async function () {
        const { id, start } = await createPayment();
        await time.setNextBlockTimestamp(start + 5 * DAY);
        await paystream.connect(employee).withdraw(id);
        expect(await token.balanceOf(employee.address)).to.equal(STREAM / 2n);
    });

    it("rejects company or auditor as employee", async function () {
        await expect(createPayment(company.address)).to.be.revertedWith("company cannot be employee");
        await expect(createPayment(employee.address, employee.address)).to.be.revertedWith(
            "auditor cannot be employee"
        );
    });

    it("cancel pays the employee earned salary they haven't withdrawn yet", async function () {
        const { id, start } = await createPayment();
        const companyBefore = await token.balanceOf(company.address);

        await time.setNextBlockTimestamp(start + 5 * DAY);
        await paystream.connect(company).cancelPayment(id);

        expect(await token.balanceOf(employee.address)).to.equal(STREAM / 2n);
        expect((await token.balanceOf(company.address)) - companyBefore).to.equal(STREAM / 2n + ESCROW);
        await expectContractEmpty();
    });

    it("approved milestone stays claimable after cancel, and is not refunded twice", async function () {
        const { id, start } = await createPayment();
        const bonus = ethers.parseUnits("100", 18);
        await paystream.connect(employee).submitMilestone(id, bonus);
        await paystream.connect(auditor).approveMilestone(1);

        const companyBefore = await token.balanceOf(company.address);
        await time.setNextBlockTimestamp(start + 5 * DAY);
        await paystream.connect(company).cancelPayment(id);
        await paystream.connect(employee).claimMilestone(1);

        expect((await token.balanceOf(company.address)) - companyBefore).to.equal(STREAM / 2n + ESCROW - bonus);
        expect(await token.balanceOf(employee.address)).to.equal(STREAM / 2n + bonus);
        await expectContractEmpty();
    });

    it("cannot pause after the stream ended", async function () {
        const { id, stop } = await createPayment();
        await time.increaseTo(stop + DAY);
        await expect(paystream.connect(company).pausePayment(id)).to.be.revertedWith("stream ended");
    });

    it("a pause left running past stopTime does not shrink earnings", async function () {
        const { id, start, stop } = await createPayment();

        await time.setNextBlockTimestamp(start + 8 * DAY);
        await paystream.connect(employee).withdraw(id); // 800 withdrawn
        await time.setNextBlockTimestamp(start + 9 * DAY);
        await paystream.connect(company).pausePayment(id); // 900 earned, frozen

        await time.increaseTo(stop + 30 * DAY);
        expect(await paystream.getTotalEarned(id)).to.equal((STREAM * 9n) / 10n);

        await paystream.connect(company).cancelPayment(id);
        expect(await token.balanceOf(employee.address)).to.equal((STREAM * 9n) / 10n);
        await expectContractEmpty();
    });
});
