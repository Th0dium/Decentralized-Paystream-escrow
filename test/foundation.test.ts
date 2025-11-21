import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Paystream Platform", function () {
    let paystream, paystreamAdmin, token;
    let owner, company, employee, auditor, other;

    const STREAM_AMOUNT = ethers.parseEther("1000");
    const DURATION = 60 * 60 * 24 * 30; // 30 days
    const FEE_BPS = 5; // 0.05%

    async function deployContracts() {
        [owner, company, employee, auditor, other] = await ethers.getSigners();

        // Deploy a mock ERC20 token
        const TokenFactory = await ethers.getContractFactory("TestToken");
        token = await TokenFactory.deploy(ethers.parseEther("1000000"));
        
        // Distribute tokens
        await token.transfer(company.address, ethers.parseEther("10000"));

        // Deploy Paystream
        const PaystreamFactory = await ethers.getContractFactory("Paystream");
        paystream = await PaystreamFactory.deploy();

        // Deploy PaystreamAdmin
        const PaystreamAdminFactory = await ethers.getContractFactory("PaystreamAdmin");
        paystreamAdmin = await PaystreamAdminFactory.deploy(owner.address, await paystream.getAddress());

        // Link contracts
        await paystream.setAdminContract(await paystreamAdmin.getAddress());
    }
    
    // Helper to create a TestToken factory since it's not in the project
    before(async function() {
        const TestTokenFactory = await ethers.getContractFactory(
            `contract TestToken {
                string public name = "Test Token";
                string public symbol = "TST";
                uint8 public decimals = 18;
                uint256 public totalSupply;
                mapping(address => uint256) public balanceOf;
                constructor(uint256 initialSupply) {
                    totalSupply = initialSupply;
                    balanceOf[msg.sender] = initialSupply;
                }
                function transfer(address to, uint256 amount) public returns (bool) {
                    balanceOf[msg.sender] -= amount;
                    balanceOf[to] += amount;
                    return true;
                }
                function approve(address spender, uint256 amount) public returns (bool) { return true; }
                function transferFrom(address from, address to, uint256 amount) public returns (bool) {
                    balanceOf[from] -= amount;
                    balanceOf[to] += amount;
                    return true;
                }
            }`
        );
        this.TestTokenFactory = TestTokenFactory;
    });


    describe("Deployment and Setup", function () {
        beforeEach(deployContracts);

        it("should set the admin contract correctly", async function () {
            expect(await paystream.adminContract()).to.equal(await paystreamAdmin.getAddress());
        });

        it("should set default fee parameters", async function () {
            expect(await paystream.platformFeeBps()).to.equal(FEE_BPS);
            expect(await paystream.feeRecipient()).to.equal(owner.address);
        });
    });

    describe("Admin Controls", function () {
        beforeEach(deployContracts);

        it("should allow admin to pause and unpause new stream creation", async function () {
            await paystreamAdmin.connect(owner).pauseNewStreamCreation();
            expect(await paystream.newStreamsPaused()).to.be.true;

            await expect(
                paystream.connect(company).createStream(employee.address, await token.getAddress(), STREAM_AMOUNT, 0, DURATION, 3000)
            ).to.be.revertedWith("stream creation is paused");

            await paystreamAdmin.connect(owner).resumeNewStreamCreation();
            expect(await paystream.newStreamsPaused()).to.be.false;

            await token.connect(company).approve(await paystream.getAddress(), STREAM_AMOUNT + (STREAM_AMOUNT * BigInt(FEE_BPS)) / 10000n);
            await expect(
                paystream.connect(company).createStream(employee.address, await token.getAddress(), STREAM_AMOUNT, 0, DURATION, 3000)
            ).to.not.be.reverted;
        });

        it("should allow admin to update fee and recipient", async function () {
            const newFee = 10; // 0.1%
            const newRecipient = other.address;

            await paystreamAdmin.connect(owner).updatePlatformFee(newFee);
            expect(await paystream.platformFeeBps()).to.equal(newFee);

            await paystreamAdmin.connect(owner).updateFeeRecipient(newRecipient);
            expect(await paystream.feeRecipient()).to.equal(newRecipient);
        });
    });
    
    describe("Stream Creation and Fee Mechanism", function () {
        beforeEach(deployContracts);

        it("should create a stream and transfer the fee", async function () {
            const feeAmount = (STREAM_AMOUNT * BigInt(FEE_BPS)) / 10000n;
            const totalAmount = STREAM_AMOUNT + feeAmount;

            await token.connect(company).approve(await paystream.getAddress(), totalAmount);
            
            const initialCompanyBalance = await token.balanceOf(company.address);
            const initialContractBalance = await token.balanceOf(await paystream.getAddress());
            const initialFeeRecipientBalance = await token.balanceOf(await paystream.feeRecipient());

            await paystream.connect(company).createStream(employee.address, await token.getAddress(), STREAM_AMOUNT, 0, DURATION, 3000);

            expect(await token.balanceOf(company.address)).to.equal(initialCompanyBalance - totalAmount);
            expect(await token.balanceOf(await paystream.getAddress())).to.equal(initialContractBalance + STREAM_AMOUNT);
            expect(await token.balanceOf(await paystream.feeRecipient())).to.equal(initialFeeRecipientBalance + feeAmount);
        });
    });

    describe("Stream-Specific Auditor Workflow", function () {
        let streamId;

        beforeEach(async function() {
            await deployContracts();
            const totalAmount = STREAM_AMOUNT + (STREAM_AMOUNT * BigInt(FEE_BPS)) / 10000n;
            await token.connect(company).approve(await paystream.getAddress(), totalAmount);
            const tx = await paystream.connect(company).createStream(employee.address, await token.getAddress(), STREAM_AMOUNT, (await time.latest()), DURATION, 3000);
            const receipt = await tx.wait();
            streamId = receipt.logs.find(e => e.fragment.name === 'StreamCreated').args[0];
        });

        it("should allow company to add and remove an auditor for its stream", async function () {
            await paystream.connect(company).addStreamAuditor(streamId, auditor.address);
            expect(await paystream.isStreamAuditor(streamId, auditor.address)).to.be.true;

            await paystream.connect(company).removeStreamAuditor(streamId, auditor.address);
            expect(await paystream.isStreamAuditor(streamId, auditor.address)).to.be.false;
        });

        it("should only allow the company to manage auditors", async function () {
            await expect(
                paystream.connect(other).addStreamAuditor(streamId, auditor.address)
            ).to.be.revertedWith("not stream company");
        });

        it("should allow a stream-specific auditor to approve/reject milestones", async function () {
            // Setup: add auditor, withdraw to create escrow
            await paystream.connect(company).addStreamAuditor(streamId, auditor.address);
            await time.increase(DURATION / 2); // Fast-forward time
            await paystream.connect(employee).withdraw(streamId);
            
            // Submit milestone
            const escrowedAmount = await paystream.getEscrowedAmount(streamId);
            const milestoneAmount = escrowedAmount / 2n;
            const tx = await paystream.connect(employee).submitMilestone(streamId, "ipfs_hash", milestoneAmount);
            const receipt = await tx.wait();
            const milestoneId = receipt.logs.find(e => e.fragment.name === 'MilestoneSubmitted').args[0];

            // Auditor approves
            await expect(paystream.connect(auditor).approveMilestone(milestoneId)).to.not.be.reverted;
            
            const milestone = await paystream.getMilestone(milestoneId);
            expect(milestone.status).to.equal(1); // 1 = APPROVED
        });
        
        it("should NOT allow an auditor of another stream to approve milestones", async function () {
            // Setup for stream 1
            await paystream.connect(company).addStreamAuditor(streamId, auditor.address);
            await time.increase(DURATION / 2);
            await paystream.connect(employee).withdraw(streamId);
            const escrowedAmount1 = await paystream.getEscrowedAmount(streamId);
            const tx1 = await paystream.connect(employee).submitMilestone(streamId, "ipfs1", escrowedAmount1);
            const milestoneId1 = (await tx1.wait()).logs.find(e => e.fragment.name === 'MilestoneSubmitted').args[0];

            // Setup for stream 2 (different company, different auditor)
            const [_, company2, employee2, auditor2] = await ethers.getSigners();
            await token.transfer(company2.address, ethers.parseEther("10000"));
            const totalAmount2 = STREAM_AMOUNT + (STREAM_AMOUNT * BigInt(FEE_BPS)) / 10000n;
            await token.connect(company2).approve(await paystream.getAddress(), totalAmount2);
            const tx2_create = await paystream.connect(company2).createStream(employee2.address, await token.getAddress(), STREAM_AMOUNT, (await time.latest()), DURATION, 3000);
            const streamId2 = (await tx2_create.wait()).logs.find(e => e.fragment.name === 'StreamCreated').args[0];
            await paystream.connect(company2).addStreamAuditor(streamId2, auditor2.address);

            // The auditor for stream 2 CANNOT approve milestones for stream 1
            await expect(paystream.connect(auditor2).approveMilestone(milestoneId1)).to.be.revertedWith("not stream auditor");
        });
    });
});