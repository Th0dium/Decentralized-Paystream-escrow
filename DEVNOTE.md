# Paystream Architecture & Development Notes

This document tracks architectural decisions and the evolution of the codebase, serving as a technical changelog and decision log.

---

## 1. Core Architecture: Pure Web3 (No-Backend)

**Decision (Updated):** The project has shifted from a Backend-Indexer model to a **Pure Web3** architecture.
- **Old Model:** Node.js Backend listening to events -> Database -> Frontend API.
- **Current Model:** Frontend (Next.js) -> Direct JSON-RPC Calls (Wagmi/Viem) -> Smart Contract.

**Why:**
- **Simplicity:** Reduces infrastructure complexity and maintenance costs.
- **Trustlessness:** Users query data directly from the blockchain, ensuring data integrity without relying on a centralized indexer.
- **Development Speed:** Rapid iteration on frontend features without needing backend synchronization.

**Implication:** All data fetching (My Payments, My Milestones) now happens via `useContractRead` hooks or direct `publicClient.readContract` calls in the frontend, aggregating data client-side.

---

## 2. Smart Contract: Hybrid Payment Protocol

**Design:** A single contract (`Paystream.sol`) handling two payment types simultaneously:
1.  **Streaming:** Linear vesting (salary).
2.  **Escrow:** Milestone-based unlocking (bonuses/deliverables).

**Security Evolution:**
- **Role Checks:** Strict `require` statements ensure `Company != Employee` and `Auditor != Employee` in production code.
- *Note:* During local development, these checks may be temporarily commented out to allow "Self-Testing" (Single Wallet Testing), but must be restored for deployment.

---

## 3. Evidence Privacy & Encryption Mechanism

**Problem:** Evidence files (PDFs/images) uploaded to IPFS are public by default. Companies need confidentiality.

**Solution:** Client-side **Hybrid Encryption (NaCl Sealed Box)**.

**Evolution of Implementation:**
1.  **Initial Idea:** Auditor generates keypair -> Company uses it.
    *   *Flaw:* Requires Auditor to be online/active before payment creation.
2.  **Iteration 1 (Auto-gen):** Company generates keys for Auditor.
    *   *Bug:* Missing `ephemeralPublicKey` in payload caused "Decryption Failed" errors.
    *   *Fix:* Updated encryption lib to include sender's ephemeral key in the JSON payload.
3.  **Final Model (Shared Password):**
    *   Company generates a "Auditor Password" (Secret Key) during Payment Creation.
    *   Company shares this Password securely with the Auditor off-chain.
    *   Auditor enters Password to decrypt evidence.
    *   **Opt-in:** Encryption is optional. Companies can choose "Public Mode" (no keys, plain IPFS).

**Technical Details:**
- **Algo:** Curve25519 (ECDH) + XSalsa20 + Poly1305.
- **Payload:** `{ nonce, ciphertext, ephemeralPublicKey }`.
- **Storage:** Only the JSON payload (or plain IPFS hash) is stored on-chain.

---

## 4. UX Improvements

**Claiming Funds:**
- **Issue:** Employees didn't know they had to manually claim funds after approval.
- **Fix:** Added a "My Milestones" view with a clear "Claim Funds" button that appears only when Status = Approved.

**Sidebar Navigation:**
- **Issue:** Generic menus confused users about their roles.
- **Fix:** Restructured Sidebar into role-specific sections: `Employee`, `Company`, `Auditor`.

---

## 5. Known Limitations & Future Work

- **Gas Costs:** Pure Web3 approach requires multiple RPC calls to fetch lists (looping through IDs). Future optimization might involve a Subgraph (The Graph) for efficient indexing.
- **Key Management:** Currently relies on manual key sharing. Future version could implement on-chain PKI (Public Key Infrastructure) where Auditors register their Public Keys in a profile contract.
