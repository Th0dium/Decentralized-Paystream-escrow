# Paystream Backend

This backend serves as an indexer and API for the Paystream smart contract. It's built with Express.js, Prisma, and PostgreSQL.

## Core Functions

- **Event Indexing:** Listens to the `Paystream.sol` contract for events and saves them to a PostgreSQL database.
- **REST API:** Provides the frontend with fast access to indexed blockchain data.
- **Authentication:** Handles wallet-based authentication using JWT.

## Tech Stack

- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Language:** TypeScript

## Getting Started

### 1. Environment Setup
Create a `.env` file by copying the example:
```bash
cp .env.example .env
```
Update the `.env` file with your configuration:
- `DATABASE_URL`: Your PostgreSQL connection string.
- `JWT_SECRET`: A secret key for signing JWTs.
- `RPC_URL`: An RPC endpoint for the blockchain network (e.g., Sepolia).
- `CONTRACT_ADDRESS`: The address of the deployed `Paystream.sol` contract.
- `CORS_ORIGIN`: The URL of your frontend application.

### 2. Installation
```bash
cd backend
npm install
```

### 3. Database Migration
Apply the schema to your database:
```bash
npx prisma migrate dev
```

### 4. Running the Server
```bash
npm run dev
```
The server will start, and the contract listener will begin indexing events.

## API Endpoints

The primary purpose of this backend is to provide data to the frontend. On-chain transactions are initiated directly from the frontend.

### Authentication
- `POST /api/auth/verify-wallet`: Verifies a wallet address and returns a JWT with the user's role.

### Data Endpoints
- `GET /api/payments/employee/{walletAddress}`: Retrieves all payment streams for a given employee.
- `GET /api/payments/company/{walletAddress}`: Retrieves all payment streams created by a given company.
- `GET /api/escrows/employee/{walletAddress}`: Retrieves all escrows for a given employee.
- `GET /api/escrows/auditor/{walletAddress}`: Retrieves all escrows pending approval for a given auditor.

## Database Schema

The schema is defined in `prisma/schema.prisma` and includes the following main models:

- **User:** Stores user wallet addresses and their roles.
- **Payment:** Stores details of payment streams, indexed by `paymentId`.
- **Escrow:** Stores details of escrows, indexed by `escrowId`.

## Contract Event Listener

The service at `src/services/contractListener.ts` listens for and processes the following events from the `Paystream.sol` contract:

- `PaymentCreated`
- `PaymentWithdrawn`
- `PaymentPaused`
- `PaymentResumed`
- `PaymentCancelled`
- `EscrowCreated`
- `EscrowApproved`
- `EscrowRejected`
- `EscrowClaimed`
- `EscrowCancelled`

When an event is detected, the listener updates the corresponding tables in the database.