# Paystream Frontend - Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Create .env.local with your settings
cp .env.local.example .env.local

# Start development server
npm run dev

# Open http://localhost:3000
```

## Project Overview

This is a Next.js 14 frontend for the Paystream platform, which supports both time-based payment streams and milestone-based escrows. It includes role-based dashboards for Companies, Employees, and Auditors.

## Key Technologies

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Blockchain Interaction**: ethers.js, wagmi

## Folder Structure

- `/app`: Contains all the pages for the application, following the Next.js App Router structure.
- `/components`: Reusable React components (e.g., `Button`, `Card`).
- `/lib`: Core logic, including the API client, state management, custom hooks, and type definitions.

## Common Tasks

### Adding a New Page or Component
- To add a new page, create a `page.tsx` file within a new folder in the `/app/dashboard` directory.
- To add a new component, create a `.tsx` file in the `/components` directory.

### Calling an API Endpoint
The API client is configured in `lib/api-client.ts`. Use it to fetch data from the backend.
```typescript
import { paymentsApi } from "@/lib/api-client";

const fetchPayments = async (walletAddress) => {
  try {
    const response = await paymentsApi.getEmployeePayments(walletAddress);
    console.log(response.data);
  } catch (error) {
    console.error("Failed to fetch payments:", error);
  }
};
```

### Using the Auth Store
The Zustand auth store (`lib/auth-store.ts`) provides access to the user's authentication state.
```typescript
import { useAuthStore } from "@/lib/auth-store";

const { walletAddress, role } = useAuthStore.getState();
```

## Smart Contract Integration

Interactions with the smart contract should be handled via custom hooks that use `wagmi`.

### Example: Creating a Payment
```typescript
// lib/hooks/useCreatePayment.ts
import { useWriteContract } from 'wagmi';
import { PAYSTREAM_ABI, PAYSTREAM_ADDRESS } from '../contracts';

export function useCreatePayment() {
  const { writeContract, isPending } = useWriteContract();

  const createPayment = async (employee, token, amount, startTime, stopTime) => {
    return writeContract({
      address: PAYSTREAM_ADDRESS,
      abi: PAYSTREAM_ABI,
      functionName: 'createPayment',
      args: [employee, token, amount, startTime, stopTime],
    });
  };

  return { createPayment, isPending };
}
```

### Example: Creating an Escrow
```typescript
// lib/hooks/useCreateEscrow.ts
import { useWriteContract } from 'wagmi';
import { PAYSTREAM_ABI, PAYSTREAM_ADDRESS } from '../contracts';

export function useCreateEscrow() {
  const { writeContract, isPending } = useWriteContract();

  const createEscrow = async (employee, token, amount, description, paymentId) => {
    return writeContract({
      address: PAYSTREAM_ADDRESS,
      abi: PAYSTREAM_ABI,
      functionName: 'createEscrow',
      args: [employee, token, amount, description, paymentId],
    });
  };

  return { createEscrow, isPending };
}
```

## Environment Variables

The following environment variables are required in `.env.local`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | The URL of the backend API. |
| `NEXT_PUBLIC_CHAIN_ID` | The ID of the blockchain network (e.g., 11155111 for Sepolia). |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | The address of the deployed `Paystream.sol` contract. |

## Git Workflow

1.  Create a feature branch from `main`.
2.  Make your changes and commit them with a descriptive message.
3.  Push the branch to the repository.
4.  Open a pull request for review.

## Deployment

The frontend is intended to be deployed on a platform like Vercel. Pushing to the `main` branch can trigger an automatic deployment.

- **Build:** `npm run build`
- **Start:** `npm run start`