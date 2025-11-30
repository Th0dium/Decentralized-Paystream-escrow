# Evidence Encryption Mechanism in Decentralized Paystream

This document details the cryptographic implementation used to secure evidence files uploaded by employees in the Paystream system. The system employs a **Hybrid Encryption** scheme to ensure that sensitive work evidence stored on public IPFS networks remains confidential and accessible only to designated Auditors.

## 1. Overview

In a decentralized environment, evidence files (PDFs, images, code) are stored on IPFS, which is publicly accessible by default. To protect user privacy and business secrets, we implement an optional client-side encryption layer. 

The core philosophy is **"Company-controlled Access"**: The Company (Payer) generates the decryption keys and shares them securely with the Auditor (Verifier) off-chain.

## 2. Cryptographic Model

We utilize the **NaCl (Networking and Cryptography library)** standard via the `tweetnacl` library. Specifically, we implement a **Sealed Box** pattern.

*   **Algorithm:** Curve25519 (Key Exchange) + XSalsa20 (Stream Cipher) + Poly1305 (MAC).
*   **Type:** Hybrid Encryption (Asymmetric for key exchange, Symmetric for payload).
*   **Ephemeral Keys:** Each encryption operation generates a unique, temporary keypair for the sender to ensure forward secrecy for the sender side.

## 3. Workflow

### A. Payment Creation (Company Side)
1.  **Opt-in:** When creating a payment, the Company can check "Encrypt Evidence".
2.  **Key Generation:**
    *   The browser generates a **Curve25519 Keypair** (`AuditorPublicKey`, `AuditorSecretKey`).
    *   `AuditorPublicKey` is submitted to the Smart Contract and stored immutably with the Payment record.
    *   `AuditorSecretKey` is displayed **once** to the Company.
3.  **Key Distribution:** The Company must securely copy the `AuditorSecretKey` and transmit it to the designated Auditor via a secure channel (e.g., Signal, encrypted email).

### B. Evidence Upload (Employee Side)
1.  **Check Requirement:** The system checks if the Payment has an `AuditorPublicKey`.
2.  **Upload:** The file is uploaded to IPFS, returning a public Hash (CID).
3.  **Encryption:**
    *   System generates an **Ephemeral Keypair** (`SenderEphemeralPublic`, `SenderEphemeralSecret`).
    *   A random `Nonce` is generated.
    *   The IPFS Hash is encrypted using the `AuditorPublicKey` and `SenderEphemeralSecret`.
4.  **Payload Construction:**
    ```json
    {
      "nonce": "Base64...",
      "ciphertext": "Base64...",
      "ephemeralPublicKey": "Base64..." // Crucial for decryption
    }
    ```
5.  **Submission:** This JSON payload is stored on-chain in the `Milestone` struct.

### C. Evidence Review (Auditor Side)
1.  **Retrieval:** The Auditor fetches the encrypted payload from the Smart Contract.
2.  **Decryption:**
    *   Auditor enters the `AuditorSecretKey` (received from Company).
    *   System uses `AuditorSecretKey` + `ephemeralPublicKey` (from payload) + `Nonce` to decrypt the `ciphertext`.
3.  **Result:** The original IPFS Hash is revealed, allowing the Auditor to view the file.

## 4. Technical Implementation

### Libraries
*   **`tweetnacl`**: Core cryptographic primitives.
*   **`tweetnacl-util`**: Encoding utilities (Base64/UTF-8).

### Data Structures

**On-Chain (Smart Contract):**
```solidity
struct Payment {
    // ...
    string auditorPublicKey; // Base64 encoded Curve25519 Public Key
}

struct Milestone {
    // ...
    string encryptedEvidenceHash; // Base64 encoded JSON payload OR plain IPFS hash
}
```

**Off-Chain (JSON Payload):**
The `encryptedEvidenceHash` string is a serialized JSON object:
```typescript
interface EncryptedData {
  nonce: string;              // Random 24 bytes
  ciphertext: string;         // Encrypted IPFS Hash
  ephemeralPublicKey: string; // Sender's temporary public key (32 bytes)
}
```

### Public Mode (Opt-out)
If "Encrypt Evidence" is unchecked:
1.  `auditorPublicKey` is set to an empty string `""`.
2.  Evidence is NOT encrypted.
3.  The plain IPFS Hash is stored directly in `encryptedEvidenceHash`.
4.  The UI automatically detects this (non-JSON format) and displays the file publicly.

## 5. Security Considerations

1.  **Key Management:** The security of the evidence relies entirely on the secure transmission and storage of the `AuditorSecretKey`. If the Company loses this key, the evidence is permanently unrecoverable.
2.  **Company Trust:** The Company (Creator) has access to the Secret Key (since they generated it). This means the Company can also view the evidence. This model assumes the Company is a trusted party in the audit process.
3.  **Metadata Leakage:** Only the *content* (IPFS Hash) is encrypted. Metadata such as "Who submitted", "When", and "How much" is public on the blockchain.
4.  **IPFS Public Nature:** If the file is uploaded to a public IPFS gateway *before* encryption (which is NOT how we do it - we upload the file, then encrypt the *link*), the file itself is technically public if someone guesses the hash.
    *   *Current Limitation:* We upload the plain file to IPFS, then encrypt the Hash. A sophisticated attacker monitoring the IPFS node traffic *could* potentially see the file content at the moment of upload.
    *   *Future Improvement:* Encrypt the file content *before* uploading to IPFS (PGP/AES style), then store the hash of the encrypted file. This would provide stronger security but requires significantly more client-side processing power.