# Paystream Frontend

A modern, role-based web interface for the Paystream platform, supporting both payment streams and milestone-based escrows.

## Features

### User Roles
- **Company**: Create and manage payment streams and escrows.
- **Employee**: View streams, withdraw funds, and manage escrows.
- **Auditor**: Review and approve/reject escrows.

### Core Functionality
- 💼 Wallet connection (MetaMask).
- 📊 Management of payment streams (create, pause, cancel).
- 💰 Withdrawal from streams.
- ✅ Escrow workflow (create, approve, claim).
- 🔐 Role-based access control via a backend service.

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Blockchain Interaction**: ethers.js, wagmi

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask browser extension

### Installation
```bash
cd frontend
npm install
```

### Configuration
Create a `.env.local` file by copying the example:
```bash
cp .env.local.example .env.local
```
Update the `.env.local` file with your environment settings:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=11155111 # Sepolia
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

### Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

The frontend relies on a backend service for authentication and data indexing. The expected endpoints are:

### Authentication
- `POST /api/auth/verify-wallet`: Verify wallet ownership and retrieve the user's role.

### Payments
- `GET /api/payments/employee/{walletAddress}`: Get all payment streams for an employee.
- `GET /api/payments/company/{walletAddress}`: Get all payment streams created by a company.

### Escrows
- `GET /api/escrows/employee/{walletAddress}`: Get all escrows for an employee.
- `GET /api/escrows/pending`: Get all escrows pending approval for an auditor.

## Smart Contract Integration

The frontend will interact directly with the `Paystream.sol` smart contract for all on-chain actions. Key functions to be implemented include:

- **Payment Functions**: `createPayment`, `withdrawPayment`, `pausePayment`, `resumePayment`, `cancelPayment`.
- **Escrow Functions**: `createEscrow`, `approveEscrow`, `rejectEscrow`, `claimEscrow`, `cancelEscrow`.

These interactions should be managed using hooks, leveraging `wagmi` for wallet integration and transaction handling.

## License

MIT