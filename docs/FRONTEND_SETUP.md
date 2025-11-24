# Paystream Frontend - Setup & Implementation Guide

## Overview

A complete Next.js frontend has been created for the Paystream platform, supporting both time-based payment streams and milestone-based escrows. The frontend is fully role-based, with backend API integration for authentication and data retrieval.

## Project Structure
```
frontend/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # Landing page
│   ├── login/page.tsx                # Wallet connection & login
│   ├── dashboard/
│   │   ├── layout.tsx                # Protected dashboard layout
│   │   ├── page.tsx                  # Dashboard overview
│   │   ├── employee/
│   │   │   ├── streams/page.tsx      # View employee streams
│   │   │   ├── withdraw/page.tsx     # Withdraw funds interface
│   │   │   └── milestones/page.tsx   # Milestone management
│   │   ├── company/
│   │   │   ├── create-stream/page.tsx    # Create new stream
│   │   │   └── streams/page.tsx      # Manage company streams
│   │   └── auditor/
│   │       └── milestones/page.tsx   # Review pending milestones
│   ├── globals.css                   # Global styles & Tailwind
│   └── layout.tsx                    # Root layout
│
├── components/                       # Reusable UI components
│   ├── Header.tsx                    # Navigation & wallet info
│   ├── Sidebar.tsx                   # Role-based navigation
│   ├── Button.tsx                    # Styled button component
│   └── Card.tsx                      # Card container component
│
├── lib/                              # Core utilities & logic
│   ├── api-client.ts                 # Axios API client with interceptors
│   ├── auth-store.ts                 # Zustand authentication store
│   ├── hooks.ts                      # Custom React hooks for data fetching
│   ├── types.ts                      # TypeScript type definitions
│   └── utils.ts                      # Helper utility functions
│
├── ...                               # Other configuration files
```

## Key Features Implemented

### ✅ Authentication & Authorization
- MetaMask wallet connection.
- Backend-driven role verification (COMPANY, EMPLOYEE, AUDITOR).
- Role-based route protection and navigation.
- localStorage-based session persistence.

### ✅ Role-Based Dashboards

**Employee Features:**
- View active payment streams and their progress.
- Withdraw available funds from streams.
- View associated escrows and their statuses (Pending, Approved, etc.).
- Claim funds from approved escrows.

**Company Features:**
- Create new payment streams for employees.
- Create standalone or linked escrows for milestones.
- Manage existing streams (pause, resume, cancel).
- Assign auditors to payments and escrows.

**Auditor Features:**
- Review pending milestone submissions.
- Approve or reject milestones.

### ✅ UI/UX
- Clean, modern design using Tailwind CSS.
- Form validation and clear error handling.
- Loading states to provide user feedback during transactions.

## Backend API Integration

The frontend is designed to work with a backend that provides the following endpoints:

### Authentication
- `POST /auth/verify-wallet`: Verifies wallet ownership and returns the user's role.

### Payments
- `GET /payments/employee/{walletAddress}`: Gets all payment streams for an employee.
- `GET /payments/company/{walletAddress}`: Gets all payment streams for a company.

### Escrows
- `GET /escrows/employee/{walletAddress}`: Gets all escrows for an employee.
- `GET /escrows/pending`: Gets all escrows pending approval for an auditor.

## Smart Contract Integration

The frontend needs to interact with the `Paystream.sol` smart contract. The following hooks are examples of how to implement these interactions.

### Example: Creating a Payment Stream
```typescript
// lib/hooks/useCreatePayment.ts
import { useWriteContract } from 'wagmi';
import { PAYSTREAM_ABI, PAYSTREAM_ADDRESS } from '../contracts';

export function useCreatePayment() {
  const { writeContract } = useWriteContract();

  return (employee, token, amount, startTime, stopTime) => {
    return writeContract({
      address: PAYSTREAM_ADDRESS,
      abi: PAYSTREAM_ABI,
      functionName: 'createPayment',
      args: [employee, token, amount, startTime, stopTime],
    });
  };
}
```

### Example: Creating an Escrow
```typescript
// lib/hooks/useCreateEscrow.ts
import { useWriteContract } from 'wagmi';
import { PAYSTREAM_ABI, PAYSTREAM_ADDRESS } from '../contracts';

export function useCreateEscrow() {
  const { writeContract } = useWriteContract();

  return (employee, token, amount, description, paymentId) => {
    return writeContract({
      address: PAYSTREAM_ADDRESS,
      abi: PAYSTREAM_ABI,
      functionName: 'createEscrow',
      args: [employee, token, amount, description, paymentId],
    });
  };
}
```

## Setup and Installation

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Create a `.env.local` file by copying the example file:
```bash
cp .env.local.example .env.local
```
Update the variables in `.env.local` with your own settings:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAIN_ID=11155111 # Sepolia
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

### 3. Run the Development Server
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).