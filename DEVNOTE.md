# Paystream Architecture Decisions

This document outlines the core architectural decisions made during the development of the Paystream platform (smart contract + frontend).

---

### 1. Hybrid Payment Model: Streaming + Milestone Escrow

**Decision:** Instead of a simple time-based token stream, the contract implements a hybrid model that combines continuous streaming with a milestone-based escrow system.

**Rationale:**
*   **Flexibility:** This supports both regular salary-like payments (streaming) and performance-based compensation (milestones) within a single stream.
*   **Accountability:** Companies can hold a portion of the payment in escrow, contingent on the employee completing specific tasks or deliverables.

**Implementation:**
*   The `createStream` function includes an `escrowBps` (basis points) parameter.
*   During `withdraw`, a percentage of the claimable amount is transferred to the stream's internal `escrowed` balance instead of the employee's wallet.
*   This `escrowed` balance can only be accessed by the employee through the milestone submission and approval workflow.

---

### 2. Role-Based Access Control (RBAC)

**Decision:** The system is built on a clear hierarchy of roles using OpenZeppelin's `AccessControl` to enforce a separation of duties.

**Rationale:**
*   **Security & Clarity:** Clearly defines who can perform which actions, minimizing the risk of unauthorized operations.
*   **Decentralized Trust:** While the `Platform Admin` is a centralized role, the management of individual streams is delegated, and the `Stream Auditor` role acts as a designated third-party verifier for milestones.

**Role Breakdown:**
1.  **Platform Admin (`DEFAULT_ADMIN_ROLE`):** A global, centralized role for managing platform-level settings like fees and pausing the creation of new streams.
2.  **Company:** The creator of a stream. Manages stream-specific settings like pausing, canceling, and appointing auditors.
3.  **Employee:** The beneficiary. Can withdraw vested funds and submit milestones.
4.  **Stream Auditor:** Appointed per-stream by the `Company`. Their sole responsibility is to approve or reject milestones, acting as a check on the employee's work.

---

### 3. Off-Chain Milestone Content

**Decision:** The contract stores only the essential financial logic for milestones (`milestoneId`, `amount`, `status`) on-chain. The descriptive content (e.g., links to work, descriptions) is handled off-chain.

**Rationale:**
*   **Gas Efficiency:** Storing strings or large data on-chain is prohibitively expensive. This design significantly reduces the gas cost of `submitMilestone`.
*   **Focus & Scalability:** The smart contract remains lean and focused on its core financial purpose. A backend service, listening to `MilestoneSubmitted` events, can index and store detailed content in a traditional database, using the `milestoneId` as a primary key.

---

### 4. Pause Mechanism with "Working Time" Calculation

**Decision:** When a stream is paused, the vesting clock is frozen by tracking cumulative "dead time". The `stopTime` of the stream remains fixed. The amount earned is calculated based on the actual "working time".

**Rationale:**
*   **Fairness & Predictability:** This ensures that pausing a stream does not penalize the employee. The `stopTime` remains constant, which simplifies off-chain tracking and UI display, while the internal logic correctly calculates the vested amount based on non-paused periods.

**Implementation:**
*   The `Stream` struct contains `totalPausedDuration` (a running total of completed pauses) and `pausedAt` (the timestamp of the current pause, if active).
*   `resumeStream` calculates the duration of the just-ended pause and adds it to `totalPausedDuration`.
*   The `claimable` function calculates `workingTime` by subtracting the total paused time (both completed and current) from the total time elapsed since the stream started. This `workingTime` is then used to determine the vested amount.

---

### 5. Frontend: Backend-Driven Role Assignment

**Decision:** The frontend communicates with a backend API to determine user roles. No role is assumed from wallet address alone.

**Rationale:**
*   **Flexibility & Security:** Admin can assign or revoke roles without frontend changes.
*   **Auditability:** Role assignments are logged on the backend.
*   **Future-Ready:** Easy to add role tiers or custom permissions.

**Flow:**
1. User connects MetaMask wallet
2. Frontend sends wallet address → `POST /auth/verify-wallet`
3. Backend returns: `{ walletAddress, role: COMPANY|EMPLOYEE|AUDITOR|null }`
4. Frontend displays role-based dashboard

---

### 6. Frontend Stack: Next.js + Zustand

**Decision:** Modern Next.js 14 with TypeScript, Tailwind CSS, and Zustand for lightweight state management.

**Rationale:**
*   **Developer Experience:** Next.js provides routing, SSR, and optimizations out-of-box.
*   **Simplicity:** Zustand eliminates Redux boilerplate while handling global auth state.
*   **Type Safety:** TypeScript prevents bugs across frontend and API integration.

**Structure:**
*   `app/` - Next.js pages (routing, auth flows)
*   `components/` - Reusable UI (Header, Sidebar, Button, Card)
*   `lib/` - API client, hooks, utilities, auth store
*   Role-based routes: `/dashboard/employee/*`, `/dashboard/company/*`, `/dashboard/auditor/*`
