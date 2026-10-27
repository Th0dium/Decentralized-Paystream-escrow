# Decentralized Paystream & Escrow Protocol

A comprehensive DeFi payment solution that hybridizes **Real-time Salary Streaming** with **Milestone-based Escrow**. This protocol allows organizations to manage payroll and project-based compensation in a trustless, transparent, and efficient manner on the Ethereum blockchain.

**Live demo:** [decentralized-paystream-escrow.vercel.app](https://decentralized-paystream-escrow.vercel.app) (Sepolia testnet, pay with [test USDC](https://faucet.circle.com)) · **Contract:** [`0xEF1e…b071`](https://sepolia.etherscan.io/address/0xEF1ea8Adb57Ece1a196C0fF4A52dAd2C9eeDb071)

## 🌟 Key Features

### 1. Hybrid Payment Architecture
Unlike traditional streaming protocols that only handle linear flows, Paystream combines two models in a single contract interaction:
*   **Continuous Streaming:** Pay employees second-by-second for their time (e.g., Base Salary). Funds are unlocked linearly over the set duration.
*   **Milestone Escrow:** Lock funds that are only released upon completion of specific deliverables (e.g., Performance Bonuses, Project Deliverables).

### 2. Role-Based Ecosystem
The platform provides distinct dashboards and capabilities for three key roles:

#### 🏢 Company (Payer)
*   **Create Unified Payments:** Set up a payment with both a stream amount and an escrow amount in one transaction. Streams last 1 to 365 days and start when the transaction is mined.
*   **Payment Control:** Ability to **Pause** (stop streaming temporarily) and **Resume** payments. Paused time does not count toward vesting, and the Employee cannot withdraw while paused.
*   **Cancellation & Refunds:** Cancel streams at any time. Unvested stream funds and locked escrow funds are automatically refunded to the Company, while the Employee keeps what they have already earned.
*   **Auditor Assignment:** Designate a specific Auditor (or leave blank to self-assign) to oversee milestone approvals. The Employee can never be the Company or the Auditor.

#### 👷 Employee (Payee)
*   **Real-time Withdrawals:** Claim vested streaming funds ("salary") at any time.
*   **Milestone Submission:** Request funds from the Escrow pool by creating Milestones.
*   **Milestone Claim:** Once a milestone is approved, claim its amount from escrow.
*   **Evidence Upload:** Upload proof of work (files, documents) to IPFS directly from the dashboard.
*   **Evidence Privacy:** Optional encryption hides the evidence link so only the Auditor can locate it (see limitations below).

#### 🕵️ Auditor (Verifier)
*   **Third-Party Verification:** A designated neutral party (or the Company itself) responsible for reviewing work.
*   **Evidence Review:** Decrypt and inspect evidence files submitted by employees.
*   **Approve/Reject:** Approve a milestone to reserve its amount for the Employee (it can no longer be refunded on cancel), or reject it and leave the funds in escrow.

### 3. 🔒 Security & Privacy (Encryption)
We prioritize user privacy for sensitive work contracts.
*   **Hybrid Encryption (NaCl):** Utilizes Curve25519 and XSalsa20 to encrypt the evidence's IPFS link (CID) client-side.
*   **Limitation:** The evidence file itself is uploaded to IPFS unencrypted, so anyone who obtains the CID can read it. Encrypting the file before upload is the next step.
*   **Opt-in Privacy:** Companies can choose to enforce encryption or allow public evidence transparency.
*   **Key Sharing:** When a payment is created with encryption on, the Company's browser generates the Auditor keypair, stores the public key on-chain, and shows the secret key once. The Company must send it to the Auditor off-chain. No server ever sees it, but the Company also holds it.
*   *Learn more in the [Encryption Mechanism Documentation](./docs/ENCRYPTION_MECHANISM.md).*

### 4. 💾 Decentralized Storage
*   **IPFS Integration:** All evidence files are stored on the InterPlanetary File System (via Pinata) ensuring data immutability and decentralization.
*   **Smart Contract Reference:** Only the IPFS Hash (CID) and encryption metadata are stored on-chain to minimize gas costs.
*   **Limitation:** Uploads call Pinata directly from the browser with `NEXT_PUBLIC_PINATA_JWT`, so the key is visible to users. A production setup should upload through a server route.

### 5. 🛡️ Admin & Governance
*   **Token Whitelist:** The protocol Admin manages a whitelist of allowed ERC-20 tokens (the UI offers Sepolia USDC and USDT) to prevent spam or malicious token usage.
*   **Emergency Pause:** Admin can pause the creation of *new* payments in case of system maintenance (existing streams continue uninterrupted).

## 🛠️ Tech Stack

*   **Blockchain:** Solidity 0.8.30 (Hardhat), OpenZeppelin Contracts v5, deployed on Sepolia.
*   **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand.
*   **Web3 Integration:** Wagmi, Viem, Web3Modal (WalletConnect).
*   **Storage:** IPFS (Pinata).
*   **Cryptography:** TweetNaCl.js.

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   A browser wallet (e.g. MetaMask) on the Sepolia network, with some Sepolia ETH and [test USDC](https://faucet.circle.com)

### Run the Frontend

The contract address, RPC URL and Pinata key are already set in `frontend/next.config.js`, so the frontend runs against the live Sepolia contract with no extra setup.

```bash
git clone <repo-url>
cd Decentralized-Paystream-escrow/frontend
npm install
npm run dev
```
`npm run dev` opens http://localhost:3000 in your browser once the server is up.

Optional: copy `frontend/.env.example` to `frontend/.env.local` and set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` to enable WalletConnect (mobile wallets). Browser extension wallets work without it.

### Deploy Your Own Contract (Optional)

The frontend only supports Sepolia, so deploy there.

1.  Install root dependencies:
    ```bash
    npm install
    ```
2.  Copy `.env.example` to `.env` and fill in `SEPOLIA_RPC_URL` and `PRIVATE_KEY` (the deployer becomes the Admin).
3.  Deploy:
    ```bash
    npm run deploy:sepolia
    ```
    The address is printed and saved to `deployed-contracts.json`.
4.  Whitelist USDC: put the new address in `scripts/whitelist-token.ts`, then run
    ```bash
    npx hardhat run scripts/whitelist-token.ts --network sepolia
    ```
    (Other tokens can be added from the Admin page in the dashboard.)
5.  Set the new address as `NEXT_PUBLIC_CONTRACT_ADDRESS` in `frontend/next.config.js`.

## 🧪 Testing
```bash
npm test
```
Runs on Hardhat's in-memory network. Covers salary streaming, role checks, and regression tests for cancel accounting (earned salary is paid out on cancel, approved milestones stay claimable and are never refunded twice) and pause handling.

## 📜 License
MIT