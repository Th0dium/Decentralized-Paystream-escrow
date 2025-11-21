# Paystream - Architecture & Development Notes

## Project Overview
A unified, single-deployment smart contract for decentralized salary streaming and milestone-based escrow on EVM-compatible chains.

**Key Features:**
- ✅ Single, shared contract for all users.
- ✅ Second-by-second payment streaming.
- ✅ Per-stream configurable escrow for milestone-based payments.
- ✅ Milestone workflow (submit, approve, reject, claim).
- ✅ Multi-token support (any ERC20).
- ✅ Stream-level controls: pause, resume, and cancellation by the company.
- ✅ Platform-level controls: emergency pause for new streams and platform fee management by an admin.

---

## Architecture

### Unified Contract Model

The entire system is encapsulated within a single contract: `Paystream.sol`. This monolithic design was chosen for simplicity of deployment and interaction, reducing complexity and potential points of failure between contracts. All state, including streams and milestones, is managed within this one contract.

```
┌─────────────────────────────────────────┐
│              Paystream.sol              │
│ (Unified Streaming & Escrow Logic)      │
├─────────────────────────────────────────┤
│                                         │
│  ====== Global State & Admin ======     │
│  • Platform Fee, Fee Recipient          │
│  • Emergency Pause (for new streams)    │
│                                         │
│  ====== Core Logic (Streams) ======     │
│  • Stream Creation & Funding            │
│  • Withdrawals (Payout + Escrow)        │
│  • Cancellation, Pause/Resume           │
│                                         │
│  ====== Core Logic (Milestones) ======  │
│  • Milestone Submission & Approval      │
│  • Milestone Claiming                   │
│                                         │
└─────────────────────────────────────────┘
```

### Key Design Decisions

#### 1. **Unified Contract for Simplicity**
- A single `Paystream.sol` contract manages all logic and state.
- Eliminates the need for contract-to-contract calls for core features (e.g., locking escrow), reducing gas costs and attack surface.
- Simplifies deployment and administration.

#### 2. **Decentralized Roles**
- **`DEFAULT_ADMIN_ROLE`**: A single admin role for platform health. Can pause new stream creation in an emergency and manage platform fees.
- **`Company`**: The `msg.sender` who creates and funds a stream. Manages that specific stream (pause, cancel, add auditors).
- **`Employee`**: The recipient of a stream. Can withdraw funds and manage milestones.
- **`Stream Auditor`**: An address granted permission by a `Company` to approve/reject milestones *for a specific stream only*.

#### 3. **Flexible Escrow & Fees**
- **Escrow**: The `escrowBps` (basis points) is set per-stream at creation, allowing companies to decide how much of the streamed payment is subject to milestone approval.
- **Platform Fee**: A small, admin-configurable fee (`platformFeeBps`) is taken on stream creation to sustain the platform.

#### 4. **Time-Based Accrual**
- The `StreamMath.sol` library is used for gas-efficient calculation of streamed funds based on elapsed time.
- Payouts are linear and accrue per second.

---

## Critical Components in `Paystream.sol`

### State Structs
```solidity
struct Stream {
    address company;
    address employee;
    IERC20 token;
    uint256 totalAmount; // Total funded for the stream
    uint64 startTime;
    uint64 stopTime;
    uint256 withdrawn;   // Total "earned" by employee (payout + escrowed)
    uint16 escrowBps;    // % of stream to lock in escrow
    uint256 escrowed;    // Current balance locked in escrow
    bool paused;         // Stream-specific pause
    bool cancelled;
}

struct Milestone {
    uint256 streamId;
    address submitter;
    string ipfsHash;
    uint256 amount;
    MilestoneStatus status; // PENDING, APPROVED, REJECTED, CLAIMED
    // ... timestamps
}
```

### Key Functions

**Admin Functions:**
```solidity
// Emergency pause on new streams
setNewStreamPause(bool status)

// Manage platform fees
setPlatformFee(uint16 newFeeBps)
setFeeRecipient(address newRecipient)
```

**Core Stream Functions:**
```solidity
// Create and fund a new stream
createStream(employee, token, totalAmount, startTime, stopTime, escrowBps)

// Employee withdraws available funds
withdraw(streamId)
    → Splits funds into direct payout and escrow balance

// Company manages the stream
pauseStream(streamId)
resumeStream(streamId)
cancelStream(streamId) // FIXED: Now correctly refunds the entire remaining balance
addStreamAuditor(streamId, auditor)
```

**Milestone Functions:**
```solidity
// Employee submits work for approval
submitMilestone(streamId, ipfsHash, amount)

// Auditor reviews the milestone
approveMilestone(milestoneId)
rejectMilestone(milestoneId)

// Employee claims the approved milestone funds
claimMilestone(milestoneId)
```

---

## Feature Status

### ✅ Completed Features
- **Unified Contract**: The entire system is in `Paystream.sol`.
- **Milestone Workflow**: Full lifecycle (submit, approve, reject, claim) is implemented.
- **Stream Management**: Create, withdraw, pause, resume, and cancel are implemented.
- **`cancelStream` Bug Fix**: The function now correctly refunds the entire remaining balance (`totalAmount - withdrawn + escrowed`), preventing locked funds.
- **Platform Admin Controls**: Emergency pause and fee management are implemented.
- **Stream-Specific Auditors**: Companies can assign auditors to their own streams.

### ⚠️ Medium Priority (Future Improvements)

#### 1. **Token Whitelist (Security)**
- Currently accepts any ERC20. A whitelist would prevent malicious or fake tokens.
```solidity
// Add:
mapping(address => bool) public supportedTokens;
// And check in createStream()
```

#### 2. **Input Validation & Bounds**
- Add constraints to prevent streams that are too short, too long, or for dust amounts.
```solidity
// Add constants like:
uint256 public constant MIN_STREAM_DURATION = 1 days;
uint256 public constant MAX_STREAM_AMOUNT = 1000; // e.g., in wei
```

### ⚠️ Lower Priority (Hardening)

#### 3. **Event for Admin Changes**
- `setNewStreamPause` is missing an event. Other admin functions have them. Add `emit NewStreamCreationPaused(status);` for better off-chain tracking. (Correction: This event already exists).

#### 4. **Integer Division Dust**
- When calculating accrued amounts, there can be rounding errors leaving tiny "dust" amounts in the contract. This is a minor issue but could be handled by a sweep function for ended streams.

---

## Setup & Deployment

### Environment
Ensure `.env` is configured with an RPC URL and private key.

### Compilation & Testing
```bash
# Compile contracts
npm run compile

# Run tests
npm run test
```

### Deployment
The deployment process is now much simpler.
```bash
# Local hardhat network
npm run deploy

# Sepolia testnet (requires .env)
npm run deploy:sepolia
```
The deploy script in `scripts/deploy.ts` should be updated to deploy only the `Paystream.sol` contract.

---

## Architecture Scorecard

### Strengths ✅
1.  **Simplicity**: Unified contract is easy to deploy, manage, and interact with.
2.  **Gas Efficiency**: No cross-contract calls for core operations like withdrawals.
3.  **Clear & Decentralized Roles**: Strong separation between platform admin and stream-level participants.
4.  **Complete Feature Set**: Implements the full streaming and milestone escrow workflow.
5.  **Secure**: Uses `ReentrancyGuard` and `SafeERC20`, and the critical `cancelStream` bug has been fixed.

### Weaknesses / Areas for Improvement ⚠️
1.  **No Token Whitelist**: Potential for users to be tricked with fake ERC20 tokens.
2.  **Rigidity**: A single contract is harder to upgrade. A future version might consider a proxy pattern if significant changes are needed.

**Overall Score: 9/10** - A robust and complete system with a solid, simplified foundation. Ready for comprehensive testing and further hardening.

---

*Last Updated: 2025-11-21*