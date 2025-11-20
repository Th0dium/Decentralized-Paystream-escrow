const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaystreamCore", function () {
  let paystream, mockToken, owner, company, employee, auditor;
  const INITIAL_BALANCE = ethers.parseEther("1000000");
  const STREAM_AMOUNT = ethers.parseEther("1000");
  const DURATION = 100; // seconds

  beforeEach(async function () {
    [owner, company, employee, auditor] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Test Token", "TEST", INITIAL_BALANCE);
    await mockToken.waitForDeployment();

    // Deploy PaystreamCore
    const PaystreamCore = await ethers.getContractFactory("PaystreamCore");
    paystream = await PaystreamCore.deploy();
    await paystream.waitForDeployment();

    // Grant roles
    const COMPANY_ROLE = await paystream.COMPANY_ROLE();
    const EMPLOYEE_ROLE = await paystream.EMPLOYEE_ROLE();

    await paystream.grantRole(COMPANY_ROLE, await company.getAddress());
    await paystream.grantRole(EMPLOYEE_ROLE, await employee.getAddress());

    // Transfer tokens and approve
    await mockToken.transfer(await company.getAddress(), INITIAL_BALANCE);
    await mockToken.connect(company).approve(await paystream.getAddress(), INITIAL_BALANCE);
  });

  describe("Stream Creation", function () {
    it("should create a stream with correct parameters", async function () {
      const tx = await paystream
        .connect(company)
        .createStream(
          await employee.getAddress(),
          await mockToken.getAddress(),
          STREAM_AMOUNT,
          DURATION
        );

      await expect(tx)
        .to.emit(paystream, "StreamCreated")
        .withArgs(1, await company.getAddress(), await employee.getAddress(), expect.any(String), STREAM_AMOUNT, expect.any(BigInt), expect.any(BigInt));

      const details = await paystream.getStreamDetails(1);
      expect(details.company).to.equal(await company.getAddress());
      expect(details.employee).to.equal(await employee.getAddress());
      expect(details.token).to.equal(await mockToken.getAddress());
      expect(details.totalAmount).to.equal(STREAM_AMOUNT);
      expect(details.withdrawn).to.equal(0);
      expect(details.isPaused).to.be.false;
      expect(details.isCancelled).to.be.false;
    });

    it("should reject stream creation from non-company", async function () {
      await expect(
        flowPayCore
          .connect(employee)
          .createStream(
            await employee.getAddress(),
            await mockToken.getAddress(),
            STREAM_AMOUNT,
            DURATION
          )
      ).to.be.revertedWithCustomError(flowPayCore, "AccessControlUnauthorizedAccount");
    });

    it("should reject invalid token address", async function () {
      await expect(
        flowPayCore
          .connect(company)
          .createStream(await employee.getAddress(), ethers.ZeroAddress, STREAM_AMOUNT, DURATION)
      ).to.be.revertedWith("Invalid token");
    });

    it("should reject zero amount", async function () {
      await expect(
        flowPayCore
          .connect(company)
          .createStream(
            await employee.getAddress(),
            await mockToken.getAddress(),
            0,
            DURATION
          )
      ).to.be.revertedWith("StreamMath: amount must be > 0");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await flowPayCore
        .connect(company)
        .createStream(
          await employee.getAddress(),
          await mockToken.getAddress(),
          STREAM_AMOUNT,
          DURATION
        );
    });

    it("should allow employee to withdraw available funds", async function () {
      // Mine blocks to pass time
      await ethers.provider.send("hardhat_mine", ["0x64"]); // 100 blocks

      const available = await paystream.getAvailableAmount(1);
      expect(available).to.be.greaterThan(0);

      const balanceBefore = await mockToken.balanceOf(await employee.getAddress());

      await paystream.connect(employee).withdraw(1, available);

      const balanceAfter = await mockToken.balanceOf(await employee.getAddress());
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });

    it("should prevent withdrawal of non-existent amount", async function () {
      const tooMuch = ethers.parseEther("2000");

      await expect(
        paystream.connect(employee).withdraw(1, tooMuch)
      ).to.be.revertedWith("Insufficient available");
    });

    it("should prevent non-employee from withdrawing", async function () {
      await ethers.provider.send("hardhat_mine", ["0x64"]);

      const available = await paystream.getAvailableAmount(1);

      await expect(
        paystream.connect(auditor).withdraw(1, available)
      ).to.be.revertedWith("Only employee can withdraw from this stream");
    });

    it("should prevent withdrawal from paused stream", async function () {
      await ethers.provider.send("hardhat_mine", ["0x64"]);
      await paystream.connect(company).pauseStream(1);

      const available = await paystream.getAvailableAmount(1);

      await expect(
        paystream.connect(employee).withdraw(1, available)
      ).to.be.revertedWith("Stream paused");
    });

    it("should prevent withdrawal from cancelled stream", async function () {
      await ethers.provider.send("hardhat_mine", ["0x64"]);
      await paystream.connect(company).cancelStream(1);

      const available = await paystream.getAvailableAmount(1);

      await expect(
        paystream.connect(employee).withdraw(1, available)
      ).to.be.revertedWith("Stream cancelled");
    });
  });

  describe("Stream Management", function () {
    beforeEach(async function () {
      await paystream
        .connect(company)
        .createStream(
          await employee.getAddress(),
          await mockToken.getAddress(),
          STREAM_AMOUNT,
          DURATION
        );
    });

    it("should pause a stream", async function () {
      await expect(paystream.connect(company).pauseStream(1))
        .to.emit(paystream, "StreamPaused")
        .withArgs(1, await company.getAddress(), expect.any(BigInt));

      const details = await paystream.getStreamDetails(1);
      expect(details.isPaused).to.be.true;
    });

    it("should resume a paused stream", async function () {
      await paystream.connect(company).pauseStream(1);

      await expect(paystream.connect(company).resumeStream(1))
        .to.emit(paystream, "StreamResumed")
        .withArgs(1, await company.getAddress(), expect.any(BigInt));

      const details = await paystream.getStreamDetails(1);
      expect(details.isPaused).to.be.false;
    });

    it("should cancel a stream and refund", async function () {
      const companyBalanceBefore = await mockToken.balanceOf(await company.getAddress());

      await paystream.connect(company).cancelStream(1);

      const companyBalanceAfter = await mockToken.balanceOf(await company.getAddress());
      expect(companyBalanceAfter - companyBalanceBefore).to.equal(STREAM_AMOUNT);
    });

    it("should not allow non-company to manage stream", async function () {
      await expect(
        paystream.connect(employee).pauseStream(1)
      ).to.be.revertedWith("Only company can manage this stream");
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await paystream
        .connect(company)
        .createStream(
          await employee.getAddress(),
          await mockToken.getAddress(),
          STREAM_AMOUNT,
          DURATION
        );
    });

    it("should return correct available amount over time", async function () {
      const available1 = await paystream.getAvailableAmount(1);
      expect(available1).to.equal(0);

      await ethers.provider.send("hardhat_mine", ["0x32"]); // 50 blocks

      const available2 = await paystream.getAvailableAmount(1);
      expect(available2).to.be.greaterThan(0);
    });

    it("should return employee streams", async function () {
      const streams = await paystream.getEmployeeStreams(await employee.getAddress());
      expect(streams.length).to.equal(1);
      expect(streams[0]).to.equal(1);
    });

    it("should return company streams", async function () {
      const streams = await paystream.getCompanyStreams(await company.getAddress());
      expect(streams.length).to.equal(1);
      expect(streams[0]).to.equal(1);
    });

    it("should return complete stream info", async function () {
      const info = await paystream.getStreamInfo(1);
      expect(info[0]).to.equal(await company.getAddress());
      expect(info[1]).to.equal(await employee.getAddress());
      expect(info[2]).to.equal(await mockToken.getAddress());
    });
  });

  describe("Emergency Pause", function () {
    it("should allow admin to pause all withdrawals", async function () {
      await paystream
        .connect(company)
        .createStream(
          await employee.getAddress(),
          await mockToken.getAddress(),
          STREAM_AMOUNT,
          DURATION
        );

      await paystream.pause();

      await ethers.provider.send("hardhat_mine", ["0x64"]);
      const available = await paystream.getAvailableAmount(1);

      await expect(
        paystream.connect(employee).withdraw(1, available)
      ).to.be.revertedWithCustomError(paystream, "EnforcedPause");
    });

    it("should allow admin to unpause", async function () {
      await paystream.pause();
      await paystream.unpause();

      // Should be able to withdraw after unpause
      await paystream
        .connect(company)
        .createStream(
          await employee.getAddress(),
          await mockToken.getAddress(),
          STREAM_AMOUNT,
          DURATION
        );

      await ethers.provider.send("hardhat_mine", ["0x64"]);
      const available = await paystream.getAvailableAmount(1);

      await expect(
        paystream.connect(employee).withdraw(1, available)
      ).not.to.be.reverted;
    });
  });
});
