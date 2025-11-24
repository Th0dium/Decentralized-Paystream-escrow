# Paystream Architecture Decisions

This document outlines the key architectural decisions for the Paystream project, covering the smart contract, backend, and frontend.

---

## 1. Smart Contract: Dual Protocol Model

**Decision:** Implement two separate but related protocols within a single `Paystream.sol` contract: a Payment Protocol for time-based streaming and an Escrow Protocol for milestone-based payments.

**Why:**
- **Clarity:** Separating the logic for streaming and escrow makes the contract easier to understand and audit.
- **Flexibility:** Companies can choose the protocol that best suits their needs—streaming for salaries, escrow for project milestones, or both.
- **Gas Efficiency:** Users only interact with the parts of the contract they need, avoiding unnecessary gas costs.

**How it works:**
- **Payment Protocol:** Creates a stream that unlocks tokens linearly over time. The employee can withdraw accrued funds at any point.
- **Escrow Protocol:** Creates a milestone-based payment that is locked until an auditor approves it. Escrows can be standalone or linked to a payment stream.

---

## 2. Roles and Permissions

**Decision:** Use a role-based system to manage access and permissions, leveraging OpenZeppelin's `AccessControl`.

**Roles:**
1.  **Admin (`DEFAULT_ADMIN_ROLE`):** Manages contract-level settings like platform fees and can pause the creation of new payments.
2.  **Company:** Creates payment streams and escrows, and assigns auditors.
3.  **Employee:** The recipient of payments and escrows. Can withdraw from streams and claim approved escrows.
4.  **Auditor:** Approves or rejects escrows. Auditors are assigned by the company on a per-payment or per-escrow basis.

**Why:** This separation of concerns enhances security by ensuring that each participant only has the permissions necessary for their role.

---

## 3. Backend Event Indexer

**Decision:** A Node.js backend listens for events emitted by the smart contract and indexes them in a PostgreSQL database.

**Why:**
- **Performance:** Direct blockchain queries for historical data are slow and resource-intensive. The indexed database provides a fast and efficient way to retrieve information.
- **Enhanced UX:** The frontend can quickly fetch data like a user's payment streams or escrows, providing a smoother user experience.
- **Scalability:** This approach scales well, even with a large number of on-chain transactions.

---

## 4. Frontend and State Management

**Decision:** The frontend is built with Next.js, TypeScript, and Tailwind CSS. It interacts with both the blockchain (for transactions) and the backend (for data).

**State Management Philosophy:**
- **Blockchain as the Single Source of Truth:** All financial states and transactions are managed by the smart contract.
- **Backend as a Fast Read-Layer:** The backend provides a cached, indexed version of the blockchain data for quick retrieval.
- **Frontend State:** The frontend does not cache financial data. It fetches data from the backend for display and initiates transactions with the blockchain. After a transaction, it re-fetches data to ensure the UI is up-to-date.

---

## 5. Authentication

**Decision:** Wallet-based authentication is used. Users sign a message to prove ownership of their address, and the backend issues a session token (JWT) for subsequent API requests.

**Why:** This is the standard for Web3 applications, providing a secure and user-friendly way to authenticate without relying on traditional email/password credentials.

---

## Architecture Summary

```
┌────────────────────────────────┐
│  Frontend (Next.js on Vercel)  │
│  - UI & Wallet Interaction     │
│  - Sends Transactions          │
└────────────────────────────────┘
         ↓ ↑ (API Calls)      ↓ (Transactions)
         ↓ ↑                  ↓
┌──────────────────┐    ┌──────────────────┐
│  Backend (Node.js) │    │   Blockchain     │
│  - Event Indexer  │←───┤ (Paystream.sol)  │
│  - Database (SQL)│    │   - Holds Funds    │
│  - REST API      │    │   - Enforces Rules │
└──────────────────┘    └──────────────────┘
```

**Workflow:**
1.  **Write Operations (e.g., creating a payment):** The frontend prompts the user to sign a transaction, which is sent directly to the blockchain.
2.  **Events:** The smart contract emits an event upon a successful transaction.
3.  **Indexing:** The backend service listens for these events and updates the database.
4.  **Read Operations (e.g., viewing payments):** The frontend queries the backend's REST API, which returns the indexed data from the database.
