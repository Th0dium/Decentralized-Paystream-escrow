import { ethers } from "hardhat";
import { PaymentToken, AccessControl, SalaryStreamEscrow, MilestoneEscrow } from "../../typechain-types";

export async function deployContracts() {
  const [owner, company, employee, auditor, otherUser] = await ethers.getSigners();

  // Deploy PaymentToken
  const PaymentTokenFactory = await ethers.getContractFactory("PaymentToken");
  const paymentToken = (await PaymentTokenFactory.deploy()) as PaymentToken;
  await paymentToken.waitForDeployment();

  // Deploy AccessControl
  const AccessControlFactory = await ethers.getContractFactory("AccessControl");
  const accessControl = (await AccessControlFactory.deploy()) as AccessControl;
  await accessControl.waitForDeployment();

  // Deploy SalaryStreamEscrow
  const SalaryStreamFactory = await ethers.getContractFactory("SalaryStreamEscrow");
  const salaryStream = (await SalaryStreamFactory.deploy(
    await paymentToken.getAddress(),
    await accessControl.getAddress()
  )) as SalaryStreamEscrow;
  await salaryStream.waitForDeployment();

  // Deploy MilestoneEscrow
  const MilestoneFactory = await ethers.getContractFactory("MilestoneEscrow");
  const milestoneEscrow = (await MilestoneFactory.deploy(
    await paymentToken.getAddress(),
    await accessControl.getAddress(),
    await salaryStream.getAddress()
  )) as MilestoneEscrow;
  await milestoneEscrow.waitForDeployment();

  // Setup roles
  const COMPANY_ROLE = await accessControl.COMPANY_ROLE();
  const EMPLOYEE_ROLE = await accessControl.EMPLOYEE_ROLE();
  const AUDITOR_ROLE = await accessControl.AUDITOR_ROLE();

  await accessControl.grantRole(COMPANY_ROLE, await company.getAddress());
  await accessControl.grantRole(EMPLOYEE_ROLE, await employee.getAddress());
  await accessControl.grantRole(AUDITOR_ROLE, await auditor.getAddress());

  // Mint tokens to company
  const tokenAmount = ethers.parseEther("1000000");
  await paymentToken.mint(await company.getAddress(), tokenAmount);

  // Approve spending
  await paymentToken.connect(company).approve(await salaryStream.getAddress(), tokenAmount);

  return {
    paymentToken,
    accessControl,
    salaryStream,
    milestoneEscrow,
    owner,
    company,
    employee,
    auditor,
    otherUser,
  };
}

export interface TestSetup {
  paymentToken: PaymentToken;
  accessControl: AccessControl;
  salaryStream: SalaryStreamEscrow;
  milestoneEscrow: MilestoneEscrow;
  owner: any;
  company: any;
  employee: any;
  auditor: any;
  otherUser: any;
}
