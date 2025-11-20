import { expect } from "chai";
import { ethers } from "hardhat";
import { deployContracts } from "../fixtures/setup";

describe("SalaryStreamEscrow", function () {
  const SALARY_AMOUNT = ethers.parseEther("1000");
  const DURATION = 100; // seconds

  describe("Stream Creation", function () {
    it("should create a stream with correct parameters", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      const tx = await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await expect(tx)
        .to.emit(salaryStream, "StreamCreated")
        .withArgs(1, await company.getAddress(), await employee.getAddress(), SALARY_AMOUNT, SALARY_AMOUNT / BigInt(DURATION), expect.any(BigInt));

      const details = await salaryStream.getStreamDetails(1);
      expect(details.company).to.equal(await company.getAddress());
      expect(details.employee).to.equal(await employee.getAddress());
      expect(details.totalAmount).to.equal(SALARY_AMOUNT);
      expect(details.withdrawn).to.equal(0);
      expect(details.isPaused).to.be.false;
      expect(details.isCancelled).to.be.false;
    });

    it("should revert if non-company tries to create stream", async function () {
      const setup = await deployContracts();
      const { salaryStream, employee } = setup;

      await expect(
        salaryStream.connect(employee).createStream(
          await employee.getAddress(),
          SALARY_AMOUNT,
          DURATION
        )
      ).to.be.revertedWith("Only companies can create streams");
    });

    it("should revert with invalid employee address", async function () {
      const setup = await deployContracts();
      const { salaryStream, company } = setup;

      await expect(
        salaryStream.connect(company).createStream(ethers.ZeroAddress, SALARY_AMOUNT, DURATION)
      ).to.be.revertedWith("Invalid employee address");
    });

    it("should revert with zero amount", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await expect(
        salaryStream.connect(company).createStream(await employee.getAddress(), 0, DURATION)
      ).to.be.revertedWith("Amount must be greater than 0");
    });

    it("should revert with zero duration", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await expect(
        salaryStream.connect(company).createStream(await employee.getAddress(), SALARY_AMOUNT, 0)
      ).to.be.revertedWith("Duration must be greater than 0");
    });
  });

  describe("Withdrawals", function () {
    it("should allow employee to withdraw available amount", async function () {
      const setup = await deployContracts();
      const { salaryStream, paymentToken, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      // Wait some time for funds to unlock
      await ethers.provider.send("hardhat_mine", ["0x64"]); // Mine 100 blocks (roughly 100 seconds)

      const available = await salaryStream.getAvailableAmount(1);
      expect(available).to.be.greaterThan(0);

      const employeeBalanceBefore = await paymentToken.balanceOf(await employee.getAddress());

      await salaryStream.connect(employee).withdraw(1, available);

      const employeeBalanceAfter = await paymentToken.balanceOf(await employee.getAddress());
      expect(employeeBalanceAfter - employeeBalanceBefore).to.equal(available);
    });

    it("should revert withdrawal of non-existent amount", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      const tooMuch = ethers.parseEther("2000");

      await expect(
        salaryStream.connect(employee).withdraw(1, tooMuch)
      ).to.be.revertedWith("Insufficient available balance");
    });

    it("should revert withdrawal from paused stream", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await salaryStream.connect(company).pauseStream(1);

      await expect(
        salaryStream.connect(employee).withdraw(1, ethers.parseEther("10"))
      ).to.be.revertedWith("Stream is paused");
    });

    it("should revert non-employee from withdrawing", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee, otherUser } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await ethers.provider.send("hardhat_mine", ["0x64"]);

      await expect(
        salaryStream.connect(otherUser).withdraw(1, ethers.parseEther("10"))
      ).to.be.revertedWith("Only employee can withdraw from this stream");
    });
  });

  describe("Stream Management", function () {
    it("should pause a stream", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await expect(salaryStream.connect(company).pauseStream(1))
        .to.emit(salaryStream, "StreamPaused")
        .withArgs(1, await company.getAddress());

      const details = await salaryStream.getStreamDetails(1);
      expect(details.isPaused).to.be.true;
    });

    it("should resume a paused stream", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await salaryStream.connect(company).pauseStream(1);

      await expect(salaryStream.connect(company).resumeStream(1))
        .to.emit(salaryStream, "StreamResumed")
        .withArgs(1, await company.getAddress());

      const details = await salaryStream.getStreamDetails(1);
      expect(details.isPaused).to.be.false;
    });

    it("should cancel a stream and refund remaining balance", async function () {
      const setup = await deployContracts();
      const { salaryStream, paymentToken, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      const companyBalanceBefore = await paymentToken.balanceOf(await company.getAddress());

      await salaryStream.connect(company).cancelStream(1);

      const companyBalanceAfter = await paymentToken.balanceOf(await company.getAddress());

      // Should have refunded the full amount since no withdrawals were made
      expect(companyBalanceAfter - companyBalanceBefore).to.equal(SALARY_AMOUNT);

      const details = await salaryStream.getStreamDetails(1);
      expect(details.isCancelled).to.be.true;
    });

    it("should not allow non-company to pause/resume/cancel", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      await expect(salaryStream.connect(employee).pauseStream(1))
        .to.be.revertedWith("Only company can manage this stream");
    });
  });

  describe("Query Functions", function () {
    it("should return correct available amount over time", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      const available1 = await salaryStream.getAvailableAmount(1);
      expect(available1).to.equal(0); // Nothing available immediately

      // Advance time by 50 seconds
      await ethers.provider.send("hardhat_mine", ["0x32"]);

      const available2 = await salaryStream.getAvailableAmount(1);
      expect(available2).to.be.greaterThan(0);
    });

    it("should return employee streams", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      const streams = await salaryStream.getEmployeeStreams(await employee.getAddress());
      expect(streams.length).to.equal(1);
      expect(streams[0]).to.equal(1);
    });

    it("should return company streams", async function () {
      const setup = await deployContracts();
      const { salaryStream, company, employee } = setup;

      await salaryStream.connect(company).createStream(
        await employee.getAddress(),
        SALARY_AMOUNT,
        DURATION
      );

      const streams = await salaryStream.getCompanyStreams(await company.getAddress());
      expect(streams.length).to.equal(1);
      expect(streams[0]).to.equal(1);
    });
  });
});
