# FlowPay - Architecture & Development Notes

## Project Overview
Decentralized salary streaming & milestone-based escrow system on Ethereum.

**Key Features:**
- ✅ Second-by-second salary streaming
- ✅ Configurable escrow locking (basis points)
- ✅ Milestone-based fund release (auditor approved)
- ✅ Multi-token support (USDC, DAI, USDT, etc.)
- ✅ Stream pause/resume/cancel
- ✅ Role-based access control

---

## Architecture

### Contract Structure (Composition Pattern)

```
┌─────────────────────────────────────────┐
│         PaystreamCore.sol               │ ← Main entry point
│   (Streaming logic + Coordination)      │
├─────────────────────────────────────────┤
│ • createStream()                        │
│ • withdraw()                            │
│ • cancelStream()                        │
│ • sweepToken() [admin]                  │
└────────┬─────────────────────┬──────────┘
         │                     │
    Uses │                     │ References
         ↓                     ↓
    ┌──────────────┐    ┌──────────────────┐
    │ StreamMath   │    │ MilestoneEscrow  │
    │  (Library)   │    │   (Contract)     │
    └──────────────┘    └──────────────────┘
    • elapsed()         • lockEscrow()
    • available()       • releaseEscrow()
                        • lockedAmount()
```

### Key Design Decisions

#### 1. **Composition Over Inheritance**
- PaystreamCore **references** MilestoneEscrow (not inherits)
- Allows independent deployment & upgrades
- Easier testing (can mock escrow)
- Clean one-way dependency flow

#### 2. **Multi-Token Support**
Each stream stores its own token address:
```solidity
struct Stream {
    IERC20 token;  // Per-stream token selection
    // ...
}
```
- Companies can pay in USDC, DAI, USDT, etc.
- Single deployment supports all ERC20s
- Future: Add token whitelist for security

#### 3. **Flexible Escrow Percentage**
```solidity
uint16 escrowBps;  // basis points (10000 = 100%)
```
- Default: 3000 bps (30% escrow)
- Can be customized per stream
- Configurable at stream creation time

#### 4. **Time-Based Accrual**
```solidity
uint256 accrued = ratePerSecond * elapsedSecs;
```
- Linear streaming (no cliff)
- Per-second calculations
- Minimal gas (library functions)

#### 5. **Separated Roles**
- **PaystreamCore**: Company/Employee roles (stream management)
- **MilestoneEscrow**: Manager/Auditor roles (fund release)

---

## Critical Components

### PaystreamCore

**Key Functions:**
```solidity
// Create stream (company funds it)
createStream(employee, token, amount, startTime, stopTime, escrowBps)
    → Returns streamId

// Check how much employee can withdraw
claimable(streamId)
    → Returns unlocked - withdrawn

// Withdraw (splits into payout + escrow)
withdraw(streamId)
    → Transfer escrow to MilestoneEscrow
    → Transfer payout to employee

// Cancel stream (refund unlocked remainder)
cancelStream(streamId)
    → Stops accrual
    → Refunds unlocked amount to company
    → Leaves escrow in MilestoneEscrow

// Admin: Swap escrow contract
setMilestoneEscrow(newEscrowAddress)
```

**State Tracking:**
```solidity
Stream {
    company,                    // Stream creator
    employee,                   // Recipient
    token,                      // ERC20 address
    totalAmount,               // Total funded
    ratePerSecond,             // unlocks per second
    startTime, stopTime,       // Duration window
    lastWithdrawTime,          // Last withdrawal timestamp
    withdrawn,                 // Total distributed (includes escrow)
    escrowBps,                 // Escrow % (basis points)
    paused,                    // Stream frozen flag
    cancelled,                 // Stream ended flag
    lockedInEscrow             // Total locked in escrow contract
}
```

### MilestoneEscrow

**Current Functions:**
```solidity
// Called by PaystreamCore when employee withdraws
lockEscrow(streamId, token, amount)
    → Requires MANAGER_ROLE
    → Updates _locked[streamId][token]

// Called by auditor to release milestone funds
releaseEscrow(streamId, token, to, amount)
    → Requires AUDITOR_ROLE
    → Transfers tokens to recipient

// View locked amount for a stream
lockedAmount(streamId, token)
    → Returns locked balance
```

**State Tracking:**
```solidity
_locked[streamId][token] = amount  // Escrowed funds per stream/token
```

### StreamMath (Library)

**Pure Functions:**
```solidity
// Calculate elapsed seconds (clamped by stop time)
elapsed(start, stop, timestamp)
    → Returns seconds elapsed

// Calculate available amount from rate
available(ratePerSecond, secondsElapsed)
    → Returns amount unlocked
```

---

## Missing / Incomplete Features

### ⚠️ HIGH PRIORITY

#### 1. **Milestone Workflow (Not Implemented)**
MilestoneEscrow lacks:
- Milestone submission (employee submits proof)
- Milestone approval (auditor reviews & approves)
- Milestone rejection (auditor rejects, returns to escrow)
- Milestone claiming (employee claims released funds)

**Needed Structure:**
```solidity
enum MilestoneStatus { PENDING, APPROVED, REJECTED, CLAIMED }

struct Milestone {
    uint256 streamId;
    address submitter;      // Employee
    string ipfsHash;       // Proof of work
    uint256 amount;        // Amount to release
    MilestoneStatus status;
    uint256 createdAt;
    uint256 approvedAt;
}

// Functions to add:
function submitMilestone(uint256 streamId, string ipfsHash, uint256 amount)
function approveMilestone(uint256 milestoneId)
function rejectMilestone(uint256 milestoneId)
function claimMilestone(uint256 milestoneId)
function getMilestones(uint256 streamId)
```

#### 2. **Stream Pause/Resume (Incomplete)**
PaystreamCore checks `paused` flag but no functions to set it:
```solidity
// Missing in PaystreamCore:
function pauseStream(uint256 streamId) external {
    require(msg.sender == streams[streamId].company);
    streams[streamId].paused = true;
}

function resumeStream(uint256 streamId) external {
    require(msg.sender == streams[streamId].company);
    streams[streamId].paused = false;
}
```

### ⚠️ MEDIUM PRIORITY

#### 3. **Token Whitelist (Security)**
Currently accepts any ERC20:
```solidity
// Add:
mapping(address => bool) public supportedTokens;

function addSupportedToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
    supportedTokens[token] = true;
}

// In createStream:
require(supportedTokens[token], "Token not whitelisted");
```

#### 4. **System-Wide Emergency Pause**
Add `Pausable` from OpenZeppelin for emergencies:
```solidity
import "@openzeppelin/contracts/security/Pausable.sol";

contract PaystreamCore is AccessControl, ReentrancyGuard, Pausable {
    function withdraw(...) external nonReentrant whenNotPaused {
        // ...
    }
}
```

#### 5. **Input Validation & Bounds**
Add limits to prevent issues:
```solidity
uint256 public constant MIN_STREAM_DURATION = 1 days;
uint256 public constant MAX_STREAM_DURATION = 365 days;
uint256 public constant MIN_STREAM_AMOUNT = 1000; // wei

// In createStream:
require(duration >= MIN_STREAM_DURATION, "Duration too short");
require(duration <= MAX_STREAM_DURATION, "Duration too long");
require(totalAmount >= MIN_STREAM_AMOUNT, "Amount too small");
```

### ⚠️ LOWER PRIORITY (Security Hardening)

#### 6. **sweepToken() Safety**
Currently allows admin to drain any token:
```solidity
// Current (dangerous):
function sweepToken(address token, address to, uint256 amount)
    external onlyRole(DEFAULT_ADMIN_ROLE) {
    IERC20(token).safeTransfer(to, amount);
}

// Better: Only allow sweeping tokens NOT in active streams
// Or: Remove and handle differently
```

#### 7. **setMilestoneEscrow() One-Time Lock**
Can be called multiple times, breaking existing locks:
```solidity
// Add:
bool private _escrowSet = false;

function setMilestoneEscrow(address escrowAddress)
    external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(!_escrowSet, "Escrow already set");
    // Validate escrow address is contract
    require(escrowAddress.code.length > 0, "Not a contract");
    milestoneEscrow = MilestoneEscrow(escrowAddress);
    _escrowSet = true;
}
```

#### 8. **Integer Division Dust**
Stream creation loses remainder wei:
```solidity
uint256 rate = totalAmount / duration;  // loses remainder
// Example: 100 / 3 = 33, only 99 wei will stream
```
Not critical but could handle with dust at stream end.

---

## Setup & Development

### Environment Setup

1. **Copy .env.example to .env:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in values:**
   ```
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   PRIVATE_KEY=your_private_key_without_0x
   REPORT_GAS=true
   ETHERSCAN_API_KEY=your_api_key
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

### Compilation & Testing

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Run tests with gas reporting
REPORT_GAS=true npm run test

# Type check TypeScript
npm run typecheck
```

### Deployment

```bash
# Local hardhat network
npm run deploy

# Sepolia testnet (requires .env)
npm run deploy:sepolia

# Verify on Etherscan
npm run verify
```

---

## Deployment Order

1. **MilestoneEscrow** (standalone, no dependencies)
   ```bash
   → Address: 0x...
   ```

2. **PaystreamCore** (references MilestoneEscrow)
   ```bash
   → Constructor: (milestoneEscrowAddress)
   → Address: 0x...
   ```

3. **Set Roles** (Post-deployment)
   - Grant `MANAGER_ROLE` to PaystreamCore in MilestoneEscrow
   - Grant `AUDITOR_ROLE` to auditor wallet in MilestoneEscrow

### Example Deploy Script

```javascript
// scripts/deploy.ts
async function main() {
    // 1. Deploy MilestoneEscrow
    const MilestoneEscrow = await ethers.getContractFactory("MilestoneEscrow");
    const escrow = await MilestoneEscrow.deploy();
    await escrow.deployed();
    console.log("MilestoneEscrow:", escrow.address);

    // 2. Deploy PaystreamCore with escrow address
    const PaystreamCore = await ethers.getContractFactory("PaystreamCore");
    const core = await PaystreamCore.deploy(escrow.address);
    await core.deployed();
    console.log("PaystreamCore:", core.address);

    // 3. Grant roles
    await escrow.grantRole(
        ethers.id("MANAGER_ROLE"),
        core.address
    );
    console.log("Granted MANAGER_ROLE to PaystreamCore");
}

main();
```

---

## Testing Strategy

### Unit Tests Needed

1. **PaystreamCore**
   - [ ] Stream creation (valid/invalid params)
   - [ ] Claimable calculations (time-based)
   - [ ] Withdrawals (escrow split)
   - [ ] Stream cancellation
   - [ ] Pause/resume (once implemented)
   - [ ] Access control

2. **MilestoneEscrow**
   - [ ] Lock escrow (MANAGER_ROLE)
   - [ ] Release escrow (AUDITOR_ROLE)
   - [ ] View locked amounts
   - [ ] Milestone workflow (once implemented)
   - [ ] Access control

3. **StreamMath**
   - [ ] elapsed() time calculations
   - [ ] available() amount calculations
   - [ ] Edge cases (start=stop, before start, after stop)

4. **Integration**
   - [ ] Full workflow: createStream → withdraw → cancelStream
   - [ ] Multi-token streams
   - [ ] Escrow locking + release flow

---

## Gas Optimization Notes

**Current Costs (Estimated):**
- Stream creation: ~74k gas
- Withdrawal: ~52k gas (includes escrow lock)
- Stream cancellation: ~24k gas

**Future Optimizations:**
- StreamMath could be expanded with custom calculations
- Consider packing Stream struct (use uint96 for amounts if possible)
- Batch operations for admin functions

---

## Security Checklist

- [x] ReentrancyGuard on sensitive functions
- [x] SafeERC20 for token transfers
- [x] Checks-Effects-Interactions pattern
- [x] Access control on admin functions
- [ ] Token whitelist (HIGH PRIORITY)
- [ ] System-wide Pausable (MEDIUM)
- [ ] Input validation bounds (MEDIUM)
- [ ] sweepToken() safety guard (MEDIUM)
- [ ] setMilestoneEscrow() one-time lock (MEDIUM)
- [ ] Formal audit (before mainnet)

---

## Next Steps

### Phase 1: Complete Core Features
1. Implement milestone submission/approval/rejection/claim in MilestoneEscrow
2. Add pauseStream() / resumeStream() to PaystreamCore
3. Add token whitelist security

### Phase 2: Hardening
1. Add system-wide Pausable
2. Add input validation bounds
3. Fix sweepToken() and setMilestoneEscrow()
4. Handle integer division dust

### Phase 3: Testing & Deployment
1. Write comprehensive unit tests
2. Integration test full workflows
3. Deploy to Sepolia testnet
4. Verify on Etherscan
5. Prepare for audit

### Phase 4: Frontend Integration
1. Generate TypeChain types
2. Create React hooks for common operations
3. Build simple UI for stream management

---

## Key Contacts & Resources

**Contracts:**
- PaystreamCore: `contracts/PaystreamCore.sol`
- MilestoneEscrow: `contracts/MilestoneEscrow.sol`
- StreamMath: `contracts/StreamMath.sol`

**Dependencies:**
- OpenZeppelin Contracts v5.4.0
- Hardhat v2.22.2
- Ethers.js v6.13.1

**Documentation:**
- [OpenZeppelin Docs](https://docs.openzeppelin.com/contracts/)
- [Hardhat Docs](https://hardhat.org/docs)
- [Solidity Docs](https://docs.soliditylang.org/)

---

## Architecture Strengths ✅

1. **Clean composition pattern** - Independent contracts, easy to test
2. **Multi-token support** - Single deployment, multiple tokens
3. **Flexible escrow %** - Configurable per-stream
4. **Minimal dependencies** - Only OpenZeppelin, no complex libs
5. **Good safety** - ReentrancyGuard, SafeERC20
6. **Event-driven** - All state changes emit events (good for indexing)

## Architecture Weaknesses ⚠️

1. **Incomplete milestone workflow** - Escrow exists but no approval logic
2. **Missing pause/resume** - Flags exist but no control functions
3. **No token whitelist** - Accepts any ERC20 (security risk)
4. **sweepToken() dangerous** - Can drain active stream tokens
5. **No system pause** - Emergency stop missing

**Overall Score: 8.5/10** - Solid foundation, needs completion & hardening

---

*Last Updated: 2025-11-21*
