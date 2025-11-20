# Quick Start Guide

Get the Paystream Escrow MVP up and running in minutes.

## 1. Install Dependencies

```bash
npm install
```

## 2. Compile Contracts

```bash
npm run compile
```

This will generate the typechain types needed for testing and deployment.

## 3. Run Tests

```bash
npm run test
```

You should see all tests passing. The test suite includes:
- **AccessControl Tests**: Role management and permissions
- **SalaryStreamEscrow Tests**: Stream creation, withdrawal, and management
- **MilestoneEscrow Tests**: Milestone submission, approval, and claiming

## 4. Deploy Locally

```bash
npm run deploy
```

This deploys all contracts to a local Hardhat network and outputs the contract addresses.

## 5. Deploy to Sepolia Testnet

First, set up your `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with:
- `SEPOLIA_RPC_URL`: Get from Infura, Alchemy, or similar
- `PRIVATE_KEY`: Your testnet account's private key (without `0x` prefix)

Then deploy:

```bash
npm run deploy:sepolia
```

## Basic Usage Example

### 1. Create a Stream

A company creates a salary stream for an employee:

```solidity
// Company creates a stream paying 1000 tokens over 100 seconds
salaryStream.createStream(employeeAddress, ethers.parseEther("1000"), 100);
// Returns streamId = 1
```

**What happens:**
- Company sends 1000 tokens to the contract
- Tokens unlock at 10 tokens/second
- 300 tokens (30%) are designated for escrow
- 700 tokens are available for withdrawal

### 2. Withdraw Available Funds

After some time, the employee withdraws available funds:

```solidity
// Check available amount
const available = await salaryStream.getAvailableAmount(1);

// Withdraw 100 tokens
await salaryStream.connect(employee).withdraw(1, ethers.parseEther("100"));
```

**What happens:**
- Employee receives 70 tokens (100 - 30% escrow)
- 30 tokens go into escrow for this milestone
- Escrow can now be claimed through milestone approval

### 3. Submit a Milestone

Employee submits evidence of completed work:

```solidity
// Upload evidence to IPFS and get hash (e.g., "QmXxxx...")
const ipfsHash = "QmExample...";

// Submit milestone claiming 15 tokens from escrow
await milestoneEscrow.connect(employee).submitMilestone(1, ethers.parseEther("15"), ipfsHash);
// Returns milestoneId = 1
```

### 4. Auditor Reviews Milestone

Auditor approves the milestone:

```solidity
// Approve milestone
await milestoneEscrow.connect(auditor).approveMilestone(1);
```

Or reject and unlock funds back to escrow:

```solidity
// Reject milestone
await milestoneEscrow.connect(auditor).rejectMilestone(1);
```

### 5. Claim Milestone Funds

After approval, employee claims the escrowed funds:

```solidity
// Claim approved milestone
await milestoneEscrow.connect(employee).claimMilestone(1);
```

**What happens:**
- Employee receives 15 tokens
- Milestone marked as CLAIMED
- Funds deducted from escrow balance

## Key Operations

### Company Actions
- ✅ Create streams: `createStream(employee, amount, duration)`
- ✅ Pause stream: `pauseStream(streamId)`
- ✅ Resume stream: `resumeStream(streamId)`
- ✅ Cancel stream: `cancelStream(streamId)` - refunds remaining tokens

### Employee Actions
- ✅ Withdraw funds: `withdraw(streamId, amount)`
- ✅ Submit milestone: `submitMilestone(streamId, amount, ipfsHash)`
- ✅ Claim milestone: `claimMilestone(milestoneId)`
- ✅ View streams: `getEmployeeStreams(employeeAddress)`
- ✅ View milestones: `getEmployeeMilestones(employeeAddress)`

### Auditor Actions
- ✅ Approve milestone: `approveMilestone(milestoneId)`
- ✅ Reject milestone: `rejectMilestone(milestoneId)`

## Important Constants

- **Escrow Percentage**: 30% of all withdrawals
- **Release Rate**: Calculated as `totalAmount / duration` (tokens per second)
- **Roles**:
  - `COMPANY_ROLE`: Can create and manage streams
  - `EMPLOYEE_ROLE`: Can withdraw and submit milestones
  - `AUDITOR_ROLE`: Can approve/reject milestones

## Testing Workflow

Run a specific test file:

```bash
npm run test test/unit/SalaryStreamEscrow.test.ts
```

Run tests with gas reporting:

```bash
REPORT_GAS=true npm run test
```

## Troubleshooting

### "Role not granted" error
Make sure the account has the required role. In tests, roles are automatically assigned via the setup fixture. For deployment, grant roles manually:

```solidity
accessControl.grantRole(COMPANY_ROLE, companyAddress);
```

### "Insufficient available balance" on withdrawal
Wait for more time to pass. Funds unlock per second at the `releaseRate` calculated during stream creation.

### "Amount exceeds available escrow" on milestone submission
The requested milestone amount is more than what's currently in escrow. Withdraw more funds first to increase the escrow balance.

## Next Steps

1. Deploy to testnet and test interactions
2. Create a frontend application to interact with contracts
3. Set up event listeners for stream and milestone updates
4. Implement IPFS integration for milestone evidence
5. Create a subgraph for efficient indexing and querying

For more details, see [README.md](README.md).
