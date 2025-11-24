# Paystream

A decentralized payment streaming and milestone-based escrow system built on Solidity.

## Overview

Paystream is a unified contract that handles two distinct payment protocols:

### 1. Payment Protocol (Time-Based Streaming)
- Companies can create payment streams for employees that unlock tokens over a specified duration.
- Employees can withdraw their accrued funds at any time.
- Companies retain control to pause, resume, or cancel streams.

### 2. Escrow Protocol (Milestone-Based Payments)
- Companies can create milestone-based escrows for employees.
- Each escrow must be approved by a designated auditor before the employee can claim the funds.
- Escrows can be standalone or linked to a payment stream.

This dual-protocol approach allows for flexible compensation models, from simple salary streams to complex project-based payments.

## Project Structure

```
contracts/
└── Paystream.sol          # Unified streaming and escrow logic

test/
└── Paystream.ts           # Tests for the Paystream contract

scripts/
└── deploy.ts              # Deployment script
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Environment variables:
- `SEPOLIA_RPC_URL`: Sepolia testnet RPC endpoint.
- `PRIVATE_KEY`: Private key for the deployment account.
- `ETHERSCAN_API_KEY`: For contract verification on Etherscan.

## Usage

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Deploy Contracts
```bash
# Local/Hardhat
npm run deploy

# Sepolia Testnet
npm run deploy:sepolia
```

## Contract Functions

### Admin Functions
Functions for managing contract-level settings.

- `setNewPaymentsPause(bool status)`: Pause or resume the creation of new payments.
- `setPlatformFee(uint16 newFeeBps)`: Set the platform fee in basis points.
- `setFeeRecipient(address newRecipient)`: Set the address that receives platform fees.

### Payment Protocol Functions
Functions for managing time-based payment streams.

- `createPayment(...)`: Creates a new payment stream.
- `withdrawPayment(uint256 paymentId)`: Allows an employee to withdraw accrued funds.
- `pausePayment(uint256 paymentId)`: Pauses a payment stream.
- `resumePayment(uint256 paymentId)`: Resumes a paused payment stream.
- `cancelPayment(uint256 paymentId)`: Cancels a payment stream and refunds the remainder to the company.
- `claimablePayment(uint256 paymentId)`: View function to check the amount available for withdrawal.
- `addPaymentAuditor(uint256 paymentId, address auditor)`: Adds an auditor to a payment stream.
- `removePaymentAuditor(uint256 paymentId, address auditor)`: Removes an auditor from a payment stream.

### Escrow Protocol Functions
Functions for managing milestone-based escrows.

- `createEscrow(...)`: Creates a new escrow.
- `approveEscrow(uint256 escrowId)`: Allows an auditor to approve an escrow.
- `rejectEscrow(uint256 escrowId)`: Allows an auditor to reject an escrow.
- `claimEscrow(uint256 escrowId)`: Allows an employee to claim an approved escrow.
- `cancelEscrow(uint256 escrowId)`: Allows a company to cancel a pending or rejected escrow.
- `addEscrowAuditor(uint256 escrowId, address auditor)`: Adds an auditor to a standalone escrow.
- `removeEscrowAuditor(uint256 escrowId, address auditor)`: Removes an auditor from a standalone escrow.

### View Functions
General-purpose functions for retrieving information.

- `getPayment(uint256 paymentId)`: Returns details of a payment.
- `getEscrow(uint256 escrowId)`: Returns details of an escrow.
- `getEmployeePayments(address employee)`: Returns all payment IDs for an employee.
- `getCompanyPayments(address company)`: Returns all payment IDs for a company.
- `getEmployeeEscrows(address employee)`: Returns all escrow IDs for an employee.
- `getCompanyEscrows(address company)`: Returns all escrow IDs for a company.
- `getPaymentEscrows(uint256 paymentId)`: Returns all escrow IDs linked to a payment.
- `getClaimableEscrows(address employee)`: Returns all approved escrows for an employee.
- `getTotalEarned(uint256 paymentId)`: Returns the total amount earned in a stream (withdrawn + claimable).

## Key Features

### Security
- **Reentrancy Guard**: Protects against reentrancy attacks on key functions.
- **Access Control**: Role-based access ensures that only authorized addresses can perform sensitive actions.
- **Pausable Contract**: Admins can pause the creation of new payments.
- **Auditor Approval**: Escrows require auditor sign-off, preventing unauthorized fund claims.

### Functionality
- **Dual Payment Models**: Supports both continuous streaming and discrete milestone payments.
- **Flexible Escrows**: Escrows can be independent or linked to payment streams.
- **Platform Fees**: A configurable fee can be taken on payments.
- **Comprehensive Event Logs**: All major actions emit events for transparency and off-chain tracking.

## Future Enhancements

- [ ] Multi-token support within a single stream/escrow.
- [ ] Governance mechanism for protocol parameters.
- [ ] Frontend application for interacting with the contract.
- [ ] Subgraph for efficient data querying.

## License

MIT