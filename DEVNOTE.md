# Paystream Architecture Decisions

Complete architectural documentation for the Paystream decentralized salary streaming platform.

---

## 1. Hybrid Payment Model: Streaming + Milestone Escrow

**Decision:** Combine continuous salary streaming with milestone-based escrow in a single stream.

**Why:**
- Employees get regular cash flow (streaming portion)
- Companies get accountability (escrow released only after milestone approval)
- Single stream handles both base salary and performance bonuses

**How it works:**
- `escrowBps` parameter defines what percentage goes to escrow (e.g., 3000 = 30%)
- On withdrawal: 70% paid immediately, 30% locked in escrow
- Escrowed funds released only after auditor approves milestone

---

## 2. Role-Based Access Control

**Decision:** Three distinct roles with clear permissions using OpenZeppelin AccessControl.

**Roles:**
1. **Platform Admin** - Global settings (fees, pause new streams)
2. **Company** - Creates streams, manages pause/cancel, assigns auditors
3. **Employee** - Withdraws earnings, submits milestones, claims escrow
4. **Stream Auditor** - Approves/rejects milestones (assigned per-stream by company)

**Why:** Security through separation of duties. Each role can only perform their intended actions.

---

## 3. Pause Mechanism with Working Time Calculation

**Decision:** Pausing a stream freezes earnings by tracking cumulative paused time.

**Why:** Fair to employees - they only get paid for actual working time, not paused periods.

**How it works:**
- `totalPausedDuration` accumulates all completed pause periods
- `pausedAt` marks when current pause started
- Earnings = (totalAmount × workingTime) / totalDuration
- workingTime = elapsed - totalPausedDuration - currentPauseDuration

**Result:** Employee working 21 days in a 30-day period (9 days paused) earns 21/30 of total amount.

---

## 4. Backend Event Indexer

**Decision:** Node.js backend continuously listens to contract events and indexes them in PostgreSQL database.

**Why:**
- **Performance:** Querying blockchain for "all streams for this user" requires checking every stream (slow, expensive)
- **UX:** Backend returns results instantly from database
- **Scalability:** Works efficiently even with thousands of streams

**What it does:**
- Listens to all contract events (StreamCreated, Withdrawn, MilestoneSubmitted, etc.)
- Stores event data in normalized database tables
- Provides REST API for frontend to query indexed data

**Key endpoints:**
- `GET /api/user/:address/roles` - What roles does this wallet have?
- `GET /api/employee/:address/streams` - All streams for employee
- `GET /api/company/:address/streams` - All streams created by company
- `GET /api/milestones/pending` - Pending milestones for auditor

---

## 5. Milestone Content Storage

**Decision:** Store milestone evidence (descriptions, links, screenshots) in backend database, not on-chain.

**Why:**
- **Cost:** On-chain storage costs $5-50 per milestone. Database costs $0.
- **Flexibility:** Content can be updated if auditor requests changes
- **Practicality:** Can store images, PDFs, long descriptions

**How it works:**
1. Employee submits milestone content to backend API
2. Backend stores in database, returns content ID
3. Frontend submits transaction to blockchain with content ID
4. Auditor fetches full content from backend when reviewing

**Trade-off:** Backend is centralized point. Future enhancement: add IPFS backup for decentralization.

---

## 6. Multi-Role Wallet Handling

**Decision:** One wallet address can have multiple roles simultaneously. Frontend adapts based on backend response.

**Why:** Real users might be company for some streams, employee for others, auditor for third streams.

**Flow:**
1. User connects wallet
2. Frontend queries backend: "What roles does this address have?"
3. Backend checks indexed data, returns all roles
4. If single role → auto-redirect to that dashboard
5. If multiple roles → show selection UI
6. If no roles → show onboarding

---

## 7. Frontend Stack

**Decision:** Next.js 14 + TypeScript + Tailwind CSS + Zustand

**Why:**
- Next.js: Modern React framework with routing, SSR, optimizations
- TypeScript: Type safety across frontend and API integration
- Tailwind: Fast styling without CSS bloat
- Zustand: Lightweight state management (simpler than Redux)

**Structure:**
```
app/ - Pages and routing
components/ - Reusable UI (buttons, cards, forms)
lib/ - API client, hooks, utilities, auth store
```

**Role-based routes:**
- `/dashboard/employee/*` - Employee view
- `/dashboard/company/*` - Company view
- `/dashboard/auditor/*` - Auditor view

---

## 8. State Management: Blockchain as Source of Truth

**Decision:** Blockchain holds authoritative financial state. Backend mirrors for fast reads. Frontend never caches money data.

**Rules:**
- **Financial operations** (withdraw, claim) → Always check blockchain for latest state
- **Display data** (lists, history) → Query backend for speed
- **After transaction** → Frontend refetches from backend (which re-indexed from blockchain)

**Why:** Prevents showing stale balances while maintaining fast UX.

---

## 9. Authentication

**Decision:** Wallet-based authentication only. No email/password.

**How:**
- User signs message with wallet
- Backend verifies signature matches wallet address
- Session token issued for API calls

**Why:** Web3 native, no custodial risk, simple.

---

## 10. Deployment Strategy

**Decision:** Deploy smart contract, backend, and frontend separately.

**Environments:**
- **Development:** Sepolia testnet + local backend + local frontend
- **Production:** Ethereum mainnet + Railway backend + Vercel frontend

**Why:** Independent scaling. Backend can update without redeploying contract. Frontend deploys instantly.

---

## 11. Error Handling & Transaction UX

**Decision:** Clear transaction states with user feedback at every step.

**Implementation:**
- Show loading state during transaction submission
- Display transaction hash with Etherscan link
- Poll for confirmation (don't assume success)
- Show clear error messages if transaction reverts
- Update UI only after blockchain confirms

**Why:** Users need to understand what's happening with their money.

---

## Current Implementation Status

### ✅ Completed
- **Frontend**: Next.js 14 setup with Phantom wallet integration, Zustand auth store, role-based routing
- **Backend API**: Express.js server with Prisma ORM, PostgreSQL database
- **Authentication**: Wallet verification endpoint (`/auth/verify-wallet`) with JWT token generation
- **Database Schema**: User, Stream, Milestone, ContractEvent models
- **Deployed Infrastructure**:
  - Frontend: Vercel
  - Backend: Railway
  - Database: Neon PostgreSQL (cloud)
- **API Endpoints**: All CRUD endpoints for streams and milestones

### 🚧 In Progress / Needs Implementation
- **Event Indexing**: ContractListener service (structure exists, needs blockchain event listening)
- **Smart Contract Integration**: Contract deployment and event emission
- **Multi-role Wallet Support**: Current backend returns single role per user
- **Role-based Middleware**: Validate roles for protected operations
- **IPFS Integration**: Backup storage for milestone content
- **Transaction UX**: Etherscan links, polling, error feedback
- **Pause Mechanism Logic**: Full pause/resume functionality
- **Comprehensive Error Handling**: Better error messages and validation

### 📋 Not Started
- **Smart Contract Tests**: Hardhat test suite
- **Backend Integration Tests**: Event indexing and API tests
- **Frontend E2E Tests**: Critical user flows

---

## 12. Testing Approach

**Contract:** Hardhat tests for all financial logic, pause mechanics, access control
**Backend:** Integration tests for event indexing and API endpoints
**Frontend:** E2E tests for critical flows (create stream, withdraw, submit milestone)

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│  FRONTEND (Next.js on Vercel)          │
│  - User interface                       │
│  - Wallet connection                    │
│  - Transaction submission               │
└─────────────────────────────────────────┘
         ↓ ↑ (reads)          ↓ (writes)
         ↓ ↑                  ↓
┌──────────────────┐    ┌──────────────────┐
│  BACKEND (API)   │    │  BLOCKCHAIN      │
│  - Event indexer │←───│  Smart Contract  │
│  - Fast queries  │    │  - Money logic   │
│  - Milestone DB  │    │  - Access control│
└──────────────────┘    └──────────────────┘
```

**Data flow:**
- Writes (transactions) → Frontend → Blockchain
- Blockchain emits events → Backend indexes
- Reads (queries) → Frontend → Backend → Fast response

**Result:** Decentralized money logic + centralized performance layer.