# Backend Setup and Architecture

## Overview

The backend for Paystream is a Node.js application built with Express. Its primary responsibilities are:

1.  **Indexing Blockchain Events:** It listens for events emitted by the `Paystream.sol` smart contract and stores them in a PostgreSQL database. This provides a fast and efficient way to query historical data.
2.  **Providing a REST API:** It exposes a set of API endpoints for the frontend to fetch data and verify user roles.
3.  **Authentication:** It handles wallet-based authentication, allowing users to sign in and receive a session token.

This architecture ensures that the frontend has a fast and reliable way to access data without having to query the blockchain directly for everything.

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma         # Database schema definition
├── src/
│   ├── config/               # Configuration files
│   ├── controllers/          # Request handlers for API routes
│   ├── middleware/           # Express middleware (e.g., auth)
│   ├── routes/               # API route definitions
│   ├── services/
│   │   └── contractListener.ts # Service for listening to blockchain events
│   └── server.ts             # Main server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

## Key Components

-   **Express.js:** Used as the web server framework to build the REST API.
-   **Prisma:** A modern ORM for Node.js that simplifies database access. The database schema is defined in `prisma/schema.prisma`.
-   **Contract Listener:** A dedicated service (`src/services/contractListener.ts`) that uses a library like `ethers.js` or `viem` to listen for new blocks and process events from the `Paystream.sol` contract.

## Setup and Installation

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Set Up the Database
The backend uses PostgreSQL. You can run it locally using Docker or use a cloud-based provider. Once you have a database, create a `.env` file and set the `DATABASE_URL`.

```bash
cp .env.example .env
```

Update your `.env` file:
```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

### 3. Run Database Migrations
Apply the database schema using Prisma Migrate:
```bash
npx prisma migrate dev
```

### 4. Start the Server
```bash
npm run dev
```
The backend server will start, typically on port 3001.

## API Endpoints

The backend provides the following main endpoints:

-   `POST /api/auth/verify-wallet`: Verifies a user's wallet and returns their role.
-   `GET /api/payments/...`: Endpoints for fetching payment stream data.
-   `GET /api/escrows/...`: Endpoints for fetching escrow data.

These endpoints are used by the frontend to display information to the user and to manage the application state.