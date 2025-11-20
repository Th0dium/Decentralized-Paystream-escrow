import { expect } from "chai";
import { ethers } from "hardhat";
import { deployContracts } from "../fixtures/setup";

describe("AccessControl", function () {
  it("should grant roles correctly", async function () {
    const setup = await deployContracts();
    const { accessControl, owner, otherUser } = setup;

    const COMPANY_ROLE = await accessControl.COMPANY_ROLE();

    // Owner can grant roles
    await accessControl.grantRole(COMPANY_ROLE, await otherUser.getAddress());

    expect(await accessControl.hasRole(COMPANY_ROLE, await otherUser.getAddress())).to.be.true;
  });

  it("should revoke roles correctly", async function () {
    const setup = await deployContracts();
    const { accessControl, company } = setup;

    const COMPANY_ROLE = await accessControl.COMPANY_ROLE();

    expect(await accessControl.hasRole(COMPANY_ROLE, await company.getAddress())).to.be.true;

    // Owner revokes role
    await accessControl.revokeRole(COMPANY_ROLE, await company.getAddress());

    expect(await accessControl.hasRole(COMPANY_ROLE, await company.getAddress())).to.be.false;
  });

  it("should prevent non-owner from granting roles", async function () {
    const setup = await deployContracts();
    const { accessControl, company, otherUser } = setup;

    const COMPANY_ROLE = await accessControl.COMPANY_ROLE();

    await expect(
      accessControl.connect(company).grantRole(COMPANY_ROLE, await otherUser.getAddress())
    ).to.be.revertedWithCustomError(accessControl, "OwnableUnauthorizedAccount");
  });

  it("should prevent granting role to zero address", async function () {
    const setup = await deployContracts();
    const { accessControl } = setup;

    const COMPANY_ROLE = await accessControl.COMPANY_ROLE();

    await expect(accessControl.grantRole(COMPANY_ROLE, ethers.ZeroAddress)).to.be.revertedWith(
      "Invalid address"
    );
  });

  it("should prevent double granting of same role", async function () {
    const setup = await deployContracts();
    const { accessControl, company, otherUser } = setup;

    const COMPANY_ROLE = await accessControl.COMPANY_ROLE();

    await accessControl.grantRole(COMPANY_ROLE, await otherUser.getAddress());

    await expect(accessControl.grantRole(COMPANY_ROLE, await otherUser.getAddress())).to.be.revertedWith(
      "Role already granted"
    );
  });

  it("should emit RoleGranted event", async function () {
    const setup = await deployContracts();
    const { accessControl, owner, otherUser } = setup;

    const COMPANY_ROLE = await accessControl.COMPANY_ROLE();

    await expect(accessControl.grantRole(COMPANY_ROLE, await otherUser.getAddress()))
      .to.emit(accessControl, "RoleGranted")
      .withArgs(COMPANY_ROLE, await otherUser.getAddress(), await owner.getAddress());
  });

  it("should emit RoleRevoked event", async function () {
    const setup = await deployContracts();
    const { accessControl, owner, company } = setup;

    const COMPANY_ROLE = await accessControl.COMPANY_ROLE();

    await expect(accessControl.revokeRole(COMPANY_ROLE, await company.getAddress()))
      .to.emit(accessControl, "RoleRevoked")
      .withArgs(COMPANY_ROLE, await company.getAddress(), await owner.getAddress());
  });
});
