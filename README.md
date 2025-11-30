# Decentralized Paystream & Escrow Protocol

A comprehensive DeFi payment solution that hybridizes **Real-time Salary Streaming** with **Milestone-based Escrow**. This protocol allows organizations to manage payroll and project-based compensation in a trustless, transparent, and efficient manner on the Ethereum blockchain.

## 🌟 Key Features

### 1. Hybrid Payment Architecture
Unlike traditional streaming protocols that only handle linear flows, Paystream combines two models in a single contract interaction:
*   **Continuous Streaming:** Pay employees second-by-second for their time (e.g., Base Salary). Funds are unlocked linearly over the set duration.
*   **Milestone Escrow:** Lock funds that are only released upon completion of specific deliverables (e.g., Performance Bonuses, Project Deliverables).

### 2. Role-Based Ecosystem
The platform provides distinct dashboards and capabilities for three key roles:

#### 🏢 Company (Payer)
*   **Create Unified Payments:** Set up a payment with both a stream amount and an escrow amount in one transaction.
*   **Payment Control:** Ability to **Pause** (stop streaming temporarily) and **Resume** payments.
*   **Cancellation & Refunds:** Cancel streams at any time. Unvested stream funds and locked escrow funds are automatically refunded to the Company, while the Employee keeps what they have already earned.
*   **Auditor Assignment:** Designate a specific Auditor (or self-assign) to oversee milestone approvals.

#### 👷 Employee (Payee)
*   **Real-time Withdrawals:** Claim vested streaming funds ("salary") at any time.
*   **Milestone Submission:** Request funds from the Escrow pool by creating Milestones.
*   **Evidence Upload:** Upload proof of work (files, documents) to IPFS directly from the dashboard.
*   **Secure Privacy:** Optional encryption ensures only the Auditor can view sensitive evidence.

#### 🕵️ Auditor (Verifier)
*   **Third-Party Verification:** A designated neutral party (or the Company itself) responsible for reviewing work.
*   **Evidence Review:** Decrypt and inspect evidence files submitted by employees.
*   **Approve/Reject:** Approve milestones to instantly release funds to the Employee, or reject them with feedback.

### 3. 🔒 Security & Privacy (Encryption)
We prioritize user privacy for sensitive work contracts.
*   **Hybrid Encryption (NaCl):** Utilizes Curve25519 and XSalsa20 to encrypt evidence files client-side before they touch the IPFS network.
*   **Opt-in Privacy:** Companies can choose to enforce encryption or allow public evidence transparency.
*   **Secure Key Sharing:** Decryption keys are generated client-side and shared securely off-chain, ensuring not even the protocol developers can access private data.
*   *Learn more in the [Encryption Mechanism Documentation](./docs/ENCRYPTION_MECHANISM.md).*

### 4. 💾 Decentralized Storage
*   **IPFS Integration:** All evidence files are stored on the InterPlanetary File System (via Pinata) ensuring data immutability and decentralization.
*   **Smart Contract Reference:** Only the IPFS Hash (CID) and encryption metadata are stored on-chain to minimize gas costs.

### 5. 🛡️ Admin & Governance
*   **Token Whitelist:** The protocol Admin manages a whitelist of allowed ERC-20 tokens (e.g., USDC, USDT, DAI) to prevent spam or malicious token usage.
*   **Emergency Pause:** Admin can pause the creation of *new* payments in case of system maintenance (existing streams continue uninterrupted).

## 🛠️ Tech Stack

*   **Blockchain:** Solidity (Hardhat), OpenZeppelin Contracts.
*   **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS.
*   **Web3 Integration:** Wagmi, Viem, RainbowKit.
*   **Storage:** IPFS (Pinata).
*   **Cryptography:** TweetNaCl.js.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   Metamask or a Web3 Wallet

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repo-url>
    cd Decentralized-Paystream-escrow
    ```

2.  **Install dependencies (Root):**
    ```bash
    npm install
    ```

3.  **Install dependencies (Frontend):**
    ```bash
    cd frontend
    npm install
    ```

4.  **Configure Environment:**
    *   Create a `.env` file in `frontend/` based on `.env.example`.
    *   Add your `NEXT_PUBLIC_PINATA_JWT` and `NEXT_PUBLIC_GATEWAY_URL`.

5.  **Run Local Node (Optional for Dev):**
    ```bash
    npx hardhat node
    ```

6.  **Deploy Contract:**
    ```bash
    npx hardhat run scripts/deploy.ts --network localhost
    ```

7.  **Start Frontend:**
    ```bash
    cd frontend
    npm run dev
    ```

## 📜 License
MIT