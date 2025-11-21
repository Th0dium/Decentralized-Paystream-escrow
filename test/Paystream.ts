
import { ethers, network } from "hardhat";
import { expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Paystream, TestERC20 } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Paystream", function () {
    let deployer: HardhatEthersSigner;
    let company: HardhatEthersSigner;
    let employee: HardhatEthersSigner;
    let auditor: HardhatEthersSigner;
    let paystream: Paystream;
    let token: TestERC20;

    const STREAM_AMOUNT = ethers.parseUnits("1000", 18);
    const ESCROW_BPS = 2000; // 20%

    beforeEach(async function () {
        [deployer, company, employee, auditor] = await ethers.getSigners();

        // Deploy TestERC20
        const TestERC20Factory = await ethers.getContractFactory("TestERC20");
        token = await TestERC20Factory.deploy("Test Token", "TTK");
        
        // Mint tokens for the company
        await token.mint(company.address, ethers.parseUnits("10000", 18));

        // Deploy Paystream
        const PaystreamFactory = await ethers.getContractFactory("Paystream");
        paystream = await PaystreamFactory.deploy();
        await paystream.waitForDeployment();
    });

    async function createStream() {
        const startTime = (await time.latest()) + 100;
        const stopTime = startTime + 2000;
        
        await token.connect(company).approve(await paystream.getAddress(), STREAM_AMOUNT);
        await paystream.connect(company).createStream(
            employee.address,
            await token.getAddress(),
            STREAM_AMOUNT,
            startTime,
            stopTime,
            ESCROW_BPS
        );
        return { streamId: 1, startTime, stopTime };
    }

    describe("cancelStream", function () {
        it("should refund the correct amount and not lock funds", async function () {
            const { streamId, startTime, stopTime } = await createStream();

            // Move time forward to the middle of the stream
            await time.setNextBlockTimestamp(startTime + 1000);

            // Employee withdraws
            await paystream.connect(employee).withdraw(streamId);

            const stream = await paystream.streams(streamId);
            const withdrawnAmount = stream.withdrawn;
            const escrowedAmount = stream.escrowed;
            
            const expectedPayout = (withdrawnAmount * BigInt(10000 - ESCROW_BPS)) / BigInt(10000);
            expect(await token.balanceOf(employee.address)).to.equal(expectedPayout);

            const companyBalanceBeforeCancel = await token.balanceOf(company.address);

            // Company cancels the stream
            await paystream.connect(company).cancelStream(streamId);

            const finalStream = await paystream.streams(streamId);
            expect(finalStream.cancelled).to.be.true;

            const accrued = (STREAM_AMOUNT * BigInt(1000)) / BigInt(2000);
            const refundAmount = STREAM_AMOUNT - accrued;
            
            const companyBalanceAfterCancel = await token.balanceOf(company.address);

            // This is the bug: company should get more back
            expect(companyBalanceAfterCancel - companyBalanceBeforeCancel).to.equal(refundAmount);
        });
    });

});
