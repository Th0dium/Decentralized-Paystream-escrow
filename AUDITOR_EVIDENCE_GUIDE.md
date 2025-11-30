# 🔐 Auditor Evidence Review System - Complete Guide

## Overview

The auditor evidence review system allows auditors to review encrypted evidence submitted by employees for milestone approvals. The workflow is end-to-end encrypted and secure.

## System Components

### 1. **Smart Contract (Paystream.sol)**
- **Updated Milestone Struct**: Now includes `encryptedEvidenceHash` field
- **Two submission methods**:
  - `submitMilestone()`: Basic milestone without evidence
  - `submitMilestoneWithEvidence()`: Milestone with encrypted evidence

### 2. **Frontend Features**

#### Auditor Dashboard
- **Location**: `/auditor/milestones`
- **View**: Two tabs
  - **Pending Reviews**: Milestones waiting for approval
  - **History**: Past milestones (approved/rejected/claimed)

#### Milestones Table
| Column | Description |
|--------|-------------|
| ID | Milestone number |
| Payment | Payment name and ID |
| Amount | Requested escrow amount |
| Status | PENDING, APPROVED, REJECTED, or CLAIMED |
| Evidence | Shows "🔐 Encrypted" if evidence present, "None" if no evidence |
| Date | Submission date |
| Actions | "📋 Review" button |

#### Evidence Modal
Opened when auditor clicks "📋 Review" button. Shows:

**For all milestones:**
- Milestone ID and payment name
- Amount requested (displayed prominently)
- Current status
- Submission details (employee address, date/time)

**For milestones with evidence:**
1. **Decryption Section**:
   - Text area to paste auditor's secret key (Base64)
   - "🔓 Decrypt Evidence" button
   - Shows decrypted IPFS hash
   - "📎 View on IPFS" link to access actual file

2. **Action Buttons** (only for pending milestones):
   - "✅ Approve & Unlock": Approves milestone and unlocks amount for employee withdrawal
   - "❌ Reject": Rejects the milestone claim

## Workflow for Auditor

### Step 1: Access Auditor Dashboard
```
Navigate to: /auditor/milestones
See: List of pending milestone reviews
```

### Step 2: Review a Milestone
```
Click "📋 Review" button on any milestone
Modal opens showing:
  - Payment details
  - Requested amount
  - Evidence status (if any)
  - Submission information
```

### Step 3: Decrypt Evidence (if applicable)
```
If evidence present:
  1. Copy your auditor secret key from payment creation logs
  2. Paste in "Your Auditor Secret Key" text area
  3. Click "🔓 Decrypt Evidence"
  4. View decrypted IPFS hash
  5. Click "📎 View on IPFS" to see actual file
```

### Step 4: Make Decision
```
After reviewing evidence:
  ✅ "Approve & Unlock"
     - Unlocks the escrow amount
     - Employee can now withdraw
     - Milestone moves to APPROVED status

  ❌ "Reject"
     - Denies the milestone claim
     - Amount stays in escrow
     - Milestone moves to REJECTED status
```

## Security Architecture

### Encryption Flow
```
Employee Side:
1. Upload evidence file
2. File → IPFS (via Pinata)
3. IPFS hash ← Encrypt with auditor's PUBLIC key
4. Encrypted hash → Smart contract
5. Auditor public key stored at payment creation

Auditor Side:
1. Fetch encrypted hash from contract
2. Use SECRET key to decrypt (only auditor has this)
3. View decrypted IPFS hash
4. Access file via IPFS gateway
```

### Key Security Features
- **Asymmetric Encryption**: NaCl Box (Curve25519)
- **Public Key Storage**: Stored on-chain at payment creation
- **Secret Key Storage**: Only auditor knows (not stored anywhere)
- **Evidence Hash Encryption**: Only auditor can decrypt with their secret key
- **On-Chain Transparency**: Encrypted hash visible to everyone, unreadable without secret key

## Technical Details

### Encrypted Evidence Hash Format
```json
{
  "nonce": "base64_encoded_nonce",
  "ciphertext": "base64_encoded_encrypted_data",
  "publicKey": "base64_encoded_auditor_public_key"
}
```

### ABI Integration
**Milestone Struct (7 fields)**:
```solidity
struct Milestone {
  uint256 paymentId;
  address submitter;
  uint256 amount;
  MilestoneStatus status;
  uint256 createdAt;
  uint256 approvedAt;
  string encryptedEvidenceHash;  // NEW - encrypted IPFS hash
}
```

**Functions**:
- `getMilestone(uint256 milestoneId)` - Returns full milestone with evidence
- `approveMilestone(uint256 milestoneId)` - Approves and unlocks amount
- `rejectMilestone(uint256 milestoneId)` - Rejects milestone

## Troubleshooting

### "Milestones not loading"
**Possible causes:**
1. Token symbol fetch failed → Now handled gracefully, defaults to 'UNKNOWN'
2. Contract not redeployed → Ensure Paystream.sol with updated Milestone struct is deployed
3. No milestones yet → Employee must submit milestone first

**Solution:**
- Check browser console for errors
- Verify contract address in `.env.local`
- Ensure employee has submitted milestones

### "Decryption failed"
**Possible causes:**
1. Wrong secret key → Use the key from payment creation logs
2. Evidence corrupted → Try again or contact support
3. Invalid key format → Must be valid Base64

**Solution:**
- Double-check secret key (copy-paste carefully)
- Ensure no extra spaces or newlines
- Try refreshing the page and retry

### "View on IPFS returns error"
**Possible causes:**
1. File recently uploaded → Wait a moment and retry
2. IPFS gateway down → Try again in a moment
3. Pinata API issue → Check https://status.pinata.cloud

**Solution:**
- Wait 30 seconds and retry
- Check network connectivity
- Verify IPFS hash looks correct (starts with Qm or ba)

## Files Modified

### Smart Contract
- `contracts/Paystream.sol` - Updated Milestone struct

### Frontend
- `frontend/lib/hooks/useMyMilestones.ts` - Added encryptedEvidenceHash field
- `frontend/lib/contract-interaction.ts` - Updated getMilestone ABI, added error handling
- `frontend/components/MilestoneEvidenceModal.tsx` - NEW: Evidence review modal
- `frontend/components/dashboard/AuditorMilestonesContent.tsx` - Integrated evidence modal

### Environment
- `.env.local` - NEXT_PUBLIC_CONTRACT_ADDRESS set to new deployment

## Contract Deployment Info

**Current Deployment**: 0x9c7E48BEeb2C749D70149836093894AC45F5D5a6 (Sepolia Testnet)

Ensure this address is set in:
- `frontend/.env.local` - NEXT_PUBLIC_CONTRACT_ADDRESS
- `deployed-contracts.json` - sepolia.Paystream

---

**Status**: ✅ Implementation Complete
**Last Updated**: 2025-11-30
