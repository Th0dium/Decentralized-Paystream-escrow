# Paystream Project - Complete Implementation Plan

**Status:** Phase 1 Partially Complete - Event Listener Fixed
**Last Updated:** 2024-11-28
**Priority:** CRITICAL → HIGH → MEDIUM

---

## ✅ COMPLETED

### ✅ Task 1: Fix Event Listener ABI
- **File:** `backend/src/services/contractListener.ts`
- **Status:** DONE ✅
- **What was done:**
  - Updated PAYSTREAM_ABI to match actual Solidity events
  - Replaced old PaymentCreated/PaymentWithdrawn events with StreamCreated/Withdrawn
  - Added all milestone events (MilestoneSubmitted, MilestoneApproved, MilestoneRejected, MilestoneClaimed)
  - Added StreamPaused, StreamResumed, StreamCancelled events
  - Implemented proper event handlers for all 9+ events
  - Added proper error handling and logging

---

## 🔄 IN PROGRESS / NEXT STEPS

### Task 2: Update Database Schema (CRITICAL)

**Status:** PENDING - Ready to implement

#### Why this is critical:
- Event listener saves data but database schema doesn't match contract structure
- Missing fields: `streamAmount`, `escrowAmount`, `pausedAt`, `lastWithdrawTime`
- `Payment` table needs new fields to reflect Stream structure

#### Changes needed in `backend/prisma/schema.prisma`:

```prisma
// BEFORE (current):
model Payment {
  paymentId       Int      @id @unique
  company         String
  employee        String
  token           String
  totalAmount     String   // ❌ Should be separate: streamAmount + escrowAmount
  startTime       BigInt
  stopTime        BigInt
  withdrawn       String   @default("0")
  paused          Boolean  @default(false)
  cancelled       Boolean  @default(false)
  // MISSING: streamAmount, escrowAmount, lastWithdrawTime, totalPausedDuration, pausedAt
}

// AFTER (required):
model Payment {
  paymentId          Int      @id @unique
  company            String
  employee           String
  token              String
  streamAmount       String   // ✅ NEW - amount for continuous stream
  escrowAmount       String   // ✅ NEW - amount locked for milestones
  startTime          BigInt
  stopTime           BigInt
  withdrawn          String   @default("0")
  lastWithdrawTime   BigInt?  // ✅ NEW - track last withdrawal time
  paused             Boolean  @default(false)
  cancelled          Boolean  @default(false)
  totalPausedDuration BigInt  @default(0) // ✅ NEW - total time paused
  pausedAt           BigInt   @default(0) // ✅ NEW - when paused
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  escrows Escrow[]

  @@index([company])
  @@index([employee])
  @@index([paused])
}

// Escrow table for milestones:
model Escrow {
  escrowId    Int      @id @unique
  paymentId   Int      // ✅ Foreign key to stream
  company     String
  employee    String
  token       String
  amount      String
  description String
  status      String   @default("PENDING") // PENDING, APPROVED, REJECTED, CLAIMED
  approvedAt  DateTime?
  claimedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  payment Payment @relation(fields: [paymentId], references: [paymentId])

  @@index([paymentId])
  @@index([status])
}
```

#### Implementation steps:
1. Edit `backend/prisma/schema.prisma`
2. Add the new fields to Payment model
3. Update existing model relations if needed
4. Run: `npx prisma migrate dev --name add_stream_fields`
5. Verify migration creates the new columns
6. Update contractListener.ts event handlers to use new fields (if needed)

---

### Task 3: Implement Missing Contract Functions - Frontend

**Status:** PENDING

Frontend currently can't:
- Withdraw funds
- Pause/Resume/Cancel streams
- Submit/Approve/Reject milestones
- Claim milestones

#### Required implementations:

##### A. Add to `frontend/lib/contract-interaction.ts`:

```typescript
// 1. WITHDRAW FUNCTION
export async function withdrawStream(
  contractAddress: Address,
  streamId: string,
  tokenDecimals: number = 18
): Promise<{ transactionHash: string }> {
  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "withdrawPayment",
    args: [BigInt(streamId)],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { transactionHash: hash };
}

// 2. PAUSE STREAM
export async function pauseStream(
  contractAddress: Address,
  streamId: string
): Promise<{ transactionHash: string }> {
  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "pausePayment",
    args: [BigInt(streamId)],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { transactionHash: hash };
}

// 3. RESUME STREAM
export async function resumeStream(
  contractAddress: Address,
  streamId: string
): Promise<{ transactionHash: string }> {
  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "resumePayment",
    args: [BigInt(streamId)],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { transactionHash: hash };
}

// 4. CANCEL STREAM
export async function cancelStream(
  contractAddress: Address,
  streamId: string
): Promise<{ transactionHash: string }> {
  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "cancelPayment",
    args: [BigInt(streamId)],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { transactionHash: hash };
}

// 5. SUBMIT MILESTONE
export async function submitMilestone(
  contractAddress: Address,
  streamId: string,
  amount: string,
  descriptionHash: string,
  tokenDecimals: number = 18
): Promise<{ transactionHash: string; milestoneId?: string }> {
  const amountInWei = parseUnits(amount, tokenDecimals);

  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "submitMilestone",
    args: [BigInt(streamId), amountInWei, descriptionHash],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { transactionHash: hash };
}

// 6. APPROVE MILESTONE
export async function approveMilestone(
  contractAddress: Address,
  milestoneId: string
): Promise<{ transactionHash: string }> {
  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "approveMilestone",
    args: [BigInt(milestoneId)],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { transactionHash: hash };
}

// 7. REJECT MILESTONE
export async function rejectMilestone(
  contractAddress: Address,
  milestoneId: string
): Promise<{ transactionHash: string }> {
  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "rejectMilestone",
    args: [BigInt(milestoneId)],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { transactionHash: hash };
}

// 8. CLAIM MILESTONE
export async function claimMilestone(
  contractAddress: Address,
  milestoneId: string
): Promise<{ transactionHash: string }> {
  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "claimMilestone",
    args: [BigInt(milestoneId)],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  return { transactionHash: hash };
}
```

##### B. Add these functions to PAYSTREAM_ABI:

```typescript
// Add to PAYSTREAM_ABI constant
{
  inputs: [{ internalType: "uint256", name: "paymentId", type: "uint256" }],
  name: "withdrawPayment",
  outputs: [],
  stateMutability: "nonpayable",
  type: "function",
},
{
  inputs: [{ internalType: "uint256", name: "paymentId", type: "uint256" }],
  name: "pausePayment",
  outputs: [],
  stateMutability: "nonpayable",
  type: "function",
},
// ... etc for all functions
```

---

### Task 4: Implement Frontend Pages

#### A. Complete Employee Withdraw Page
**File:** `frontend/app/dashboard/employee/withdraw/page.tsx`

Currently has TODO. Needs:
- List of employee's streams
- Show withdrawable amount for each stream
- Withdraw button with confirmation
- Transaction status feedback

#### B. Create Milestone Submission Page
**File:** Create `frontend/app/dashboard/employee/submit-milestone/page.tsx`

Needs:
- Select stream from dropdown
- Input milestone amount
- File upload for evidence (IPFS)
- Submit button
- Success message with milestone ID

#### C. Complete Auditor Milestone Review Page
**File:** `frontend/app/dashboard/auditor/milestones/page.tsx`

Currently has TODO. Needs:
- List pending milestones
- Show evidence (IPFS link)
- Approve/Reject buttons
- Show already reviewed milestones

#### D. Complete Company Stream Management
**File:** `frontend/app/dashboard/company/streams/page.tsx`

Currently has TODO. Needs:
- List company's streams
- Show pause/resume/cancel buttons based on state
- Add auditor button
- View details modal

---

### Task 5: Add Backend API Enhancements

#### A. Add computed fields to API responses

**File:** `backend/src/controllers/paymentsController.ts`

Add to payment responses:
```typescript
{
  ...payment,
  claimableAmount: calculateClaimable(payment),
  totalEarned: calculateTotalEarned(payment),
  progress: (Date.now() - payment.startTime) / (payment.stopTime - payment.startTime),
  currentStatus: payment.cancelled ? 'CANCELLED' : payment.paused ? 'PAUSED' : 'ACTIVE'
}
```

#### B. Add authorization middleware

**File:** `backend/src/middleware/auth.ts`

Ensure all GET endpoints check authorization:
```typescript
export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Verify user can access the requested resource
  if (req.params.walletAddress && req.params.walletAddress !== req.user.walletAddress) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

---

## 📋 PRIORITY ORDER FOR REMAINING WORK

### Phase 1 (CRITICAL) - Do these first:
1. ✅ Fix Event Listener ABI
2. ⏳ Update Database Schema (includes migration)
3. ⏳ Add Missing Contract Functions to Frontend
4. ⏳ Implement Employee Withdraw Page
5. ⏳ Add Authorization Checks to Backend

### Phase 2 (HIGH) - Do these next:
6. Create Milestone Submission Page
7. Complete Auditor Milestone Review
8. Add Stream State Computation to API
9. Implement Company Stream Management
10. Add Input Validation & Error Handling

### Phase 3 (MEDIUM) - Polish:
11. Add Pagination to API Endpoints
12. Implement Caching with Redis
13. Add Audit Logging
14. Improve Error Messages
15. Add Transaction Monitoring

### Phase 4 (LOW) - Nice to have:
16. Add Analytics Dashboard
17. Implement Notifications
18. Add Comprehensive Tests
19. Set up Monitoring/Alerts
20. Performance Optimization

---

## 🛠️ COMMON PATTERNS TO FOLLOW

### Adding a new contract function:

1. Add function to `contract-interaction.ts`:
```typescript
export async function myFunction(params): Promise<result> {
  const hash = await writeContract(config, {
    address: contractAddress,
    abi: PAYSTREAM_ABI,
    functionName: "myFunction",
    args: [arg1, arg2],
  });

  const receipt = await waitForTransactionReceipt(config, { hash });
  // Handle event if needed
  return { transactionHash: hash };
}
```

2. Use in frontend component:
```typescript
const handleClick = async () => {
  try {
    const result = await myFunction(...);
    setSuccess('Operation successful!');
  } catch (err) {
    setError(err.message);
  }
};
```

3. Update event listener in backend (if new event):
```typescript
contract.on('MyEvent', async (...args) => {
  try {
    const event = args[args.length - 1];
    const [param1, param2] = args.slice(0, -1);
    // Process event
    await logContractEvent('MyEvent', event.blockNumber, event.transactionHash, { param1, param2 });
  } catch (error) {
    console.error('Error processing MyEvent:', error);
  }
});
```

---

## 📌 KEY FILES TO MODIFY

### Backend
- `backend/src/services/contractListener.ts` ✅ DONE
- `backend/prisma/schema.prisma` ⏳ NEXT
- `backend/src/controllers/paymentsController.ts`
- `backend/src/controllers/escrowsController.ts`
- `backend/src/middleware/auth.ts`
- `backend/src/routes/payments.ts`
- `backend/src/routes/escrows.ts`

### Frontend
- `frontend/lib/contract-interaction.ts` ⏳ NEXT
- `frontend/app/dashboard/employee/withdraw/page.tsx`
- `frontend/app/dashboard/employee/submit-milestone/page.tsx` (CREATE NEW)
- `frontend/app/dashboard/auditor/milestones/page.tsx`
- `frontend/app/dashboard/company/streams/page.tsx`

### Smart Contract
- `contracts/Paystream.sol` (Already updated - no changes needed)

---

## 🚀 HOW TO DEPLOY

Once all phases complete:

```bash
# 1. Compile contracts (if changes made)
npm run compile

# 2. Run tests
npm run test

# 3. Deploy to testnet
npm run deploy:sepolia

# 4. Update deployed-contracts.json with new address
# 5. Update .env.local with new contract address

# 6. Restart backend event listener
cd backend
npm run dev

# 7. Rebuild frontend
cd frontend
npm run build

# 8. Deploy to Vercel
npm run deploy
```

---

## 🐛 DEBUGGING TIPS

### If event listener not catching events:
1. Check RPC_URL is correct
2. Check CONTRACT_ADDRESS is correct
3. Check event names match actual contract
4. Add console.logs at start of listener
5. Check wallet has permission to read contract

### If frontend can't call contract:
1. Verify NEXT_PUBLIC_CONTRACT_ADDRESS is set
2. Verify user is connected to correct network
3. Check ABI includes the function
4. Test in browser console: `window.ethereum` exists

### If database migration fails:
1. Check all fields have proper types
2. Verify foreign keys exist
3. Run: `npx prisma db push --skip-generate`
4. If still fails, backup database and try `npx prisma migrate reset`

---

## ✅ VERIFICATION CHECKLIST

After implementing each task, verify:

- [ ] Code compiles without errors
- [ ] No TypeScript errors (run `npx tsc --noEmit`)
- [ ] Event listener starts successfully
- [ ] Backend API returns correct data structure
- [ ] Frontend can call contract functions
- [ ] Database migrations complete
- [ ] All error cases handled
- [ ] Console logs are clear and helpful

---

**Questions?** Refer to original analysis in project root.
