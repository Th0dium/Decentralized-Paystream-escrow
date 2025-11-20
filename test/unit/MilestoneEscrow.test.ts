import { expect } from "chai";
import { ethers } from "hardhat";
import { deployContracts } from "../fixtures/setup";

describe("MilestoneEscrow", function () {
  const SALARY_AMOUNT = ethers.parseEther("1000");
  const DURATION = 100;
  const IPFS_HASH = "QmXxxx..."; // Example IPFS hash

  describe("Escrow Locking", function () {
    it("should lock escrow amount correctly", async function () {
      const setup = await deployContracts();
      const { milestoneEscrow } = setup;

      const withdrawAmount = ethers.parseEther("100");
      const expectedEscrow = (withdrawAmount * BigInt(30)) / BigInt(100);

      const escrowAmount = await milestoneEscrow.lockEscrow(1, withdrawAmount);

      expect(escrowAmount).to.equal(expectedEscrow);
    });

    it("should handle zero amount gracefully", async function () {
      const setup = await deployContracts();
      const { milestoneEscrow } = setup;

      await expect(milestoneEscrow.lockEscrow(1, 0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });
  });

  describe("Milestone Submission", function () {
    it("should allow employee to submit milestone", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee } = setup;

      // Create stream
      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      // Lock escrow funds
      const escrowAmount = (SALARY_AMOUNT * BigInt(30)) / BigInt(100);
      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      // Submit milestone
      const tx = await milestoneEscrow.connect(employee).submitMilestone(
        1,
        escrowAmount / BigInt(2),
        IPFS_HASH
      );

      await expect(tx)
        .to.emit(milestoneEscrow, "MilestoneSubmitted")
        .withArgs(1, 1, await employee.getAddress(), expect.any(BigInt), IPFS_HASH);
    });

    it("should prevent non-employee from submitting milestone", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee, otherUser } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      await expect(
        milestoneEscrow.connect(otherUser).submitMilestone(1, ethers.parseEther("100"), IPFS_HASH)
      ).to.be.revertedWith("Only stream employee can submit milestones");
    });

    it("should revert when submitting milestone for cancelled stream", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);
      await salaryStream.connect(company).cancelStream(1);

      await expect(
        milestoneEscrow.connect(employee).submitMilestone(1, ethers.parseEther("100"), IPFS_HASH)
      ).to.be.revertedWith("Cannot submit milestone for cancelled stream");
    });

    it("should prevent submitting milestone with empty IPFS hash", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      await expect(
        milestoneEscrow.connect(employee).submitMilestone(1, ethers.parseEther("100"), "")
      ).to.be.revertedWith("IPFS hash cannot be empty");
    });

    it("should revert when milestone amount exceeds available escrow", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      const escrowAmount = (SALARY_AMOUNT * BigInt(30)) / BigInt(100);
      const tooMuch = escrowAmount * BigInt(2);

      await expect(
        milestoneEscrow.connect(employee).submitMilestone(1, tooMuch, IPFS_HASH)
      ).to.be.revertedWith("Amount exceeds available escrow");
    });
  });

  describe("Milestone Approval/Rejection", function () {
    async function setupMilestoneSubmission(setup: any) {
      const { salaryStream, milestoneEscrow, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      const escrowAmount = (SALARY_AMOUNT * BigInt(30)) / BigInt(100);
      await milestoneEscrow.connect(employee).submitMilestone(
        1,
        escrowAmount / BigInt(2),
        IPFS_HASH
      );

      return escrowAmount;
    }

    it("should allow auditor to approve milestone", async function () {
      const setup = await deployContracts();
      const { milestoneEscrow, auditor } = setup;

      await setupMilestoneSubmission(setup);

      await expect(milestoneEscrow.connect(auditor).approveMilestone(1))
        .to.emit(milestoneEscrow, "MilestoneApproved")
        .withArgs(1, await auditor.getAddress(), expect.any(BigInt));
    });

    it("should allow auditor to reject milestone", async function () {
      const setup = await deployContracts();
      const { milestoneEscrow, auditor } = setup;

      const escrowAmount = await setupMilestoneSubmission(setup);

      await expect(milestoneEscrow.connect(auditor).rejectMilestone(1))
        .to.emit(milestoneEscrow, "MilestoneRejected")
        .withArgs(1, await auditor.getAddress(), expect.any(BigInt));

      // Check that funds are returned to escrow
      const balance = await milestoneEscrow.getEscrowBalance(1);
      expect(balance).to.be.greaterThan(0);
    });

    it("should prevent non-auditor from approving/rejecting", async function () {
      const setup = await deployContracts();
      const { milestoneEscrow, employee } = setup;

      await setupMilestoneSubmission(setup);

      await expect(milestoneEscrow.connect(employee).approveMilestone(1))
        .to.be.revertedWith("Only auditors can approve/reject milestones");
    });

    it("should prevent double decision on milestone", async function () {
      const setup = await deployContracts();
      const { milestoneEscrow, auditor } = setup;

      await setupMilestoneSubmission(setup);

      await milestoneEscrow.connect(auditor).approveMilestone(1);

      await expect(
        milestoneEscrow.connect(auditor).approveMilestone(1)
      ).to.be.revertedWith("Milestone already decided");
    });
  });

  describe("Milestone Claiming", function () {
    async function setupApprovedMilestone(setup: any) {
      const { salaryStream, milestoneEscrow, company, employee, auditor, paymentToken } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      const escrowAmount = (SALARY_AMOUNT * BigInt(30)) / BigInt(100);
      const claimAmount = escrowAmount / BigInt(2);

      await milestoneEscrow.connect(employee).submitMilestone(1, claimAmount, IPFS_HASH);
      await milestoneEscrow.connect(auditor).approveMilestone(1);

      // Approve payment for milestoneEscrow contract
      await paymentToken.connect(company).approve(
        await milestoneEscrow.getAddress(),
        SALARY_AMOUNT
      );

      return claimAmount;
    }

    it("should allow employee to claim approved milestone", async function () {
      const setup = await deployContracts();
      const { milestoneEscrow, paymentToken, employee } = setup;

      const claimAmount = await setupApprovedMilestone(setup);

      const employeeBalanceBefore = await paymentToken.balanceOf(await employee.getAddress());

      await milestoneEscrow.connect(employee).claimMilestone(1);

      const employeeBalanceAfter = await paymentToken.balanceOf(await employee.getAddress());
      expect(employeeBalanceAfter - employeeBalanceBefore).to.equal(claimAmount);
    });

    it("should prevent claiming unapproved milestone", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee, paymentToken } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      const escrowAmount = (SALARY_AMOUNT * BigInt(30)) / BigInt(100);
      await milestoneEscrow.connect(employee).submitMilestone(
        1,
        escrowAmount / BigInt(2),
        IPFS_HASH
      );

      await expect(milestoneEscrow.connect(employee).claimMilestone(1)).to.be.revertedWith(
        "Milestone not approved"
      );
    });

    it("should prevent non-employee from claiming", async function () {
      const setup = await deployContracts();
      const { milestoneEscrow, otherUser } = setup;

      await setupApprovedMilestone(setup);

      await expect(milestoneEscrow.connect(otherUser).claimMilestone(1)).to.be.revertedWith(
        "Only milestone employee can perform this action"
      );
    });
  });

  describe("Query Functions", function () {
    it("should return employee milestones", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      const escrowAmount = (SALARY_AMOUNT * BigInt(30)) / BigInt(100);
      await milestoneEscrow.connect(employee).submitMilestone(
        1,
        escrowAmount / BigInt(2),
        IPFS_HASH
      );

      const milestones = await milestoneEscrow.getEmployeeMilestones(await employee.getAddress());
      expect(milestones.length).to.equal(1);
    });

    it("should return stream milestones", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      const escrowAmount = (SALARY_AMOUNT * BigInt(30)) / BigInt(100);
      await milestoneEscrow.connect(employee).submitMilestone(
        1,
        escrowAmount / BigInt(2),
        IPFS_HASH
      );

      const milestones = await milestoneEscrow.getStreamMilestones(1);
      expect(milestones.length).to.equal(1);
    });

    it("should return correct escrow balance", async function () {
      const setup = await deployContracts();
      const { salaryStream, milestoneEscrow, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await milestoneEscrow.lockEscrow(1, SALARY_AMOUNT);

      const balance = await milestoneEscrow.getEscrowBalance(1);
      const expected = (SALARY_AMOUNT * BigInt(30)) / BigInt(100);
      expect(balance).to.equal(expected);
    });
  });
});
