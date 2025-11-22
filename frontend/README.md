# Paystream Frontend

A modern, role-based web3 interface for the Paystream salary streaming and milestone escrow platform.

## Features

### User Roles
- **Company**: Create and manage salary streams for employees
- **Employee**: View streams, withdraw funds, submit and claim milestones
- **Auditor**: Review and approve/reject milestone submissions

### Core Functionality
- 💼 Wallet connection (MetaMask support)
- 📊 Real-time stream management
- 💰 Fund withdrawal interface
- ✅ Milestone submission and approval workflow
- 🔐 Role-based access control via backend
- 📁 IPFS integration for milestone evidence

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Blockchain**: ethers.js v6, wagmi
- **HTTP Client**: axios

## Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Role-based dashboards
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # Reusable React components
├── lib/                   # Utilities, hooks, types
│   ├── api-client.ts      # API client configuration
│   ├── auth-store.ts      # Zustand auth store
│   ├── hooks.ts           # Custom React hooks
│   └── types.ts           # TypeScript definitions
├── public/                # Static assets
├── styles/                # Global styles
└── .env.local            # Environment variables
```

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

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_TIMEOUT=10000
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Authentication Flow

1. User navigates to `/login`
2. User clicks "Connect MetaMask"
3. User approves wallet connection
4. Frontend sends wallet address to backend API
5. Backend returns user role (COMPANY, EMPLOYEE, AUDITOR, or null)
6. User is redirected to `/dashboard` with role-based navigation

## Pages Overview

### Public Pages
- `/` - Landing page
- `/login` - Wallet connection

### Dashboard Pages (Protected)
- `/dashboard` - Overview and quick links

#### Employee Routes
- `/dashboard/employee/streams` - View active salary streams
- `/dashboard/employee/withdraw` - Withdraw available funds
- `/dashboard/employee/milestones` - Submit and manage milestones

#### Company Routes
- `/dashboard/company/create-stream` - Create new salary stream
- `/dashboard/company/streams` - Manage active streams

#### Auditor Routes
- `/dashboard/auditor/milestones` - Review pending milestones

## API Endpoints

The frontend expects the following backend API endpoints:

### Authentication
- `POST /auth/verify-wallet` - Verify wallet and get role
- `POST /auth/logout` - Logout user

### Streams
- `GET /streams/employee/{walletAddress}` - Get employee streams
- `GET /streams/company/{walletAddress}` - Get company streams
- `GET /streams/{streamId}` - Get stream details

### Milestones
- `GET /milestones/employee/{walletAddress}` - Get employee milestones
- `GET /milestones/pending` - Get pending milestones (auditor)
- `GET /milestones/{milestoneId}` - Get milestone details

### IPFS
- `POST /ipfs/upload` - Upload file to IPFS

## Smart Contract Integration

The frontend is designed to interact with the Paystream smart contract. Contract interactions are planned for:

- Create streams
- Withdraw funds
- Pause/Resume/Cancel streams
- Submit milestones
- Approve/Reject/Claim milestones

These require wagmi configuration with contract ABIs.

## TODO: Implementation

- [ ] Configure wagmi with contract ABIs
- [ ] Implement smart contract function calls
- [ ] Add transaction status feedback
- [ ] Implement IPFS file uploads
- [ ] Add real-time notifications
- [ ] Implement gas estimation display
- [ ] Add transaction history
- [ ] Create mobile responsive improvements
- [ ] Add unit and e2e tests
- [ ] Deploy to production

## Development Notes

### State Management
- **Auth State**: Zustand store in `lib/auth-store.ts`
- **API Data**: React hooks with useState in `lib/hooks.ts`
- **Form State**: Component-level state

### API Client
All API calls go through `lib/api-client.ts` with:
- Automatic token management
- Request/response interceptors
- Global error handling

### Component Organization
- `/components/` - Reusable UI components (Button, Card, etc.)
- Route components live in their respective `/app/` directories

## Building for Production

```bash
npm run build
npm run start
```

## Troubleshooting

### MetaMask Not Connecting
- Ensure MetaMask is installed and unlocked
- Check that you're on Sepolia testnet
- Verify `window.ethereum` is available

### API Calls Failing
- Check that backend server is running
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check browser console for CORS errors

### Wallet Address Verification Issues
- Ensure backend API `/auth/verify-wallet` endpoint is working
- Check that wallet address is valid
- Verify API response format matches expected schema

## License

MIT
