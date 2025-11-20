# Paystream Escrow MVP

A decentralized salary streaming and milestone-based escrow system built on Solidity.

## Overview

Paystream Escrow enables companies to stream salary payments to employees with built-in escrow for milestone-based verification. The system consists of three main components:

### 1. Salary Streaming Contract
- Companies deposit tokens for employees
- Money unlocks per second (calculated mathematically)
- Employees can withdraw available amount at any time
- Companies can pause, resume, or cancel streams
- Automatic refund on cancellation

### 2. Milestone Escrow
- 30% of streamed salary automatically goes into escrow
- Employees submit milestones with IPFS evidence
- Auditors approve or reject submissions
- Upon approval, employees claim escrowed funds
- Rejected funds return to available escrow

### 3. Access Control
Three distinct roles with specific permissions:
- **Company**: Create and manage salary streams
- **Employee**: Withdraw available funds and submit milestones
- **Auditor**: Approve or reject milestone submissions

## Project Structure

```
contracts/
├── core/
│   ├── SalaryStreamEscrow.sol     # Core streaming logic
│   └── MilestoneEscrow.sol         # Milestone and escrow management
├── tokens/
│   └── PaymentToken.sol            # ERC20 token for payments
└── access/
    └── AccessControl.sol           # Role-based access control

test/
├── fixtures/
│   └── setup.ts                    # Test setup utilities
└── unit/
    ├── AccessControl.test.ts
    ├── SalaryStreamEscrow.test.ts
    └── MilestoneEscrow.test.ts

scripts/
└── deploy.ts                       # Deployment script
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Environment variables:
- `SEPOLIA_RPC_URL`: Sepolia testnet RPC endpoint
- `PRIVATE_KEY`: Private key for deployment account
- `REPORT_GAS`: Enable gas reporting (true/false)
- `ETHERSCAN_API_KEY`: For contract verification

## Usage

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Run Specific Test File
```bash
npm run test test/unit/SalaryStreamEscrow.test.ts
```

### Deploy Contracts
```bash
# Local/Hardhat
npm run deploy

# Sepolia Testnet
npm run deploy:sepolia
```

### Type Check
```bash
npm run typecheck
```

## Contract Interfaces

### SalaryStreamEscrow

#### Creating a Stream
```solidity
function createStream(
    address employee,
    uint256 totalAmount,
    uint256 duration
) external returns (uint256 streamId)
```

#### Withdrawing Funds
```solidity
function withdraw(uint256 streamId, uint256 amount) external
```

#### Managing Streams
```solidity
function pauseStream(uint256 streamId) external
function resumeStream(uint256 streamId) external
function cancelStream(uint256 streamId) external
```

#### Querying
```solidity
function getAvailableAmount(uint256 streamId) public view returns (uint256)
function getTotalUnlockedAmount(uint256 streamId) public view returns (uint256)
function getStreamDetails(uint256 streamId) external view returns (...)
function getEmployeeStreams(address employee) external view returns (uint256[])
function getCompanyStreams(address company) external view returns (uint256[])
```

### MilestoneEscrow

#### Locking Escrow (Called during Withdrawal)
```solidity
function lockEscrow(uint256 streamId, uint256 withdrawnAmount) external returns (uint256)
```

#### Submitting Milestone
```solidity
function submitMilestone(
    uint256 streamId,
    uint256 amount,
    string calldata ipfsHash
) external returns (uint256 milestoneId)
```

#### Approving/Rejecting
```solidity
function approveMilestone(uint256 milestoneId) external
function rejectMilestone(uint256 milestoneId) external
```

#### Claiming Funds
```solidity
function claimMilestone(uint256 milestoneId) external
```

#### Querying
```solidity
function getEscrowBalance(uint256 streamId) external view returns (uint256)
function getEmployeeMilestones(address employee) external view returns (uint256[])
function getStreamMilestones(uint256 streamId) external view returns (uint256[])
function getMilestoneDetails(uint256 milestoneId) external view returns (...)
```

### AccessControl

#### Managing Roles
```solidity
function grantRole(bytes32 role, address account) external
function revokeRole(bytes32 role, address account) external
function hasRole(bytes32 role, address account) external view returns (bool)
```

#### Roles
```solidity
bytes32 public constant COMPANY_ROLE = keccak256("COMPANY_ROLE");
bytes32 public constant EMPLOYEE_ROLE = keccak256("EMPLOYEE_ROLE");
bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
```

## Key Features

### Security
- **ReentrancyGuard**: Protects against reentrancy attacks
- **Role-Based Access Control**: Ensures only authorized actors can perform actions
- **Safe Math**: Uses Solidity 0.8.24 built-in overflow protection
- **Pausable Streams**: Companies can pause streams to prevent unexpected funds flow

### Functionality
- **Time-Based Unlocking**: Funds unlock linearly per second
- **Flexible Withdrawals**: Employees can withdraw at any time without penalty
- **Escrow Percentage**: Fixed 30% escrow for milestone verification
- **IPFS Evidence**: Milestones reference IPFS hashes for decentralized evidence storage
- **Audit Trail**: All actions emit events for transparency

## Testing

The test suite covers:
- ✅ Role-based access control
- ✅ Stream creation and management
- ✅ Withdrawal mechanics
- ✅ Escrow locking and unlocking
- ✅ Milestone submission, approval, and claiming
- ✅ Edge cases and error conditions

Run full test suite:
```bash
npm run test
```

## Gas Optimization

The contracts use the following optimizations:
- `optimizer: true` with `runs: 200`
- Efficient storage layout
- Minimal state changes per operation
- Batch operations where possible

## Future Enhancements

- [ ] Multi-token support
- [ ] Tiered escrow percentages
- [ ] Timelock for milestone approvals
- [ ] Bulk stream creation
- [ ] Frontend application
- [ ] Subgraph for indexing
- [ ] Governance for escrow percentage changes

## License

MIT

## Support

For issues and questions, please refer to the contract documentation or create an issue in the repository.
