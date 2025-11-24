# Example Scenario: Payment Stream and Escrow

This example demonstrates a typical workflow involving both a payment stream and a separate milestone escrow.

### Participants
- **Company:** Creates the payment and escrow.
- **Employee:** Receives the funds.
- **Auditor:** Approves the escrow.

---

### 1. Create a Payment Stream (Day 0)

The company creates a payment stream for the employee.

- **Total Amount:** 1000 DAI
- **Duration:** 10 days (Day 0 to Day 10)
- **Stream Rate:** 100 DAI per day

**Transaction:** `createPayment(employee, DAI_address, 1000, now, now + 10 days)`

**State:**
- **Payment 1:**
  - `totalAmount`: 1000
  - `startTime`: Day 0
  - `stopTime`: Day 10
  - `withdrawn`: 0
- **Contract Balance:** 1000 DAI

---

### 2. Employee Withdraws from Stream (Day 3)

After 3 days, the employee decides to withdraw their accrued funds.

**Calculation:**
- **Time Elapsed:** 3 days
- **Accrued Amount:** 1000 DAI * (3 / 10) = 300 DAI
- **Available to Withdraw:** 300 DAI

**Transaction:** `withdrawPayment(1)`

**State:**
- **Payment 1:**
  - `withdrawn`: 300
- **Contract Balance:** 700 DAI
- **Employee's Wallet:** 300 DAI

---

### 3. Create a Milestone Escrow (Day 4)

The company creates a separate escrow for a project milestone.

- **Amount:** 500 DAI
- **Description:** "Completion of Project Alpha"

**Transaction:** `createEscrow(employee, DAI_address, 500, "Completion of Project Alpha", 1)` (linked to payment 1)

**State:**
- **Escrow 1:**
  - `amount`: 500
  - `status`: PENDING
- **Contract Balance:** 1200 DAI (700 from stream + 500 from escrow)

---

### 4. Auditor Approves the Escrow (Day 5)

The employee completes the milestone and notifies the auditor, who then approves the escrow.

**Transaction:** `approveEscrow(1)`

**State:**
- **Escrow 1:**
  - `status`: APPROVED

---

### 5. Employee Claims the Escrow (Day 6)

The employee claims the funds from the approved escrow.

**Transaction:** `claimEscrow(1)`

**State:**
- **Escrow 1:**
  - `status`: CLAIMED
- **Contract Balance:** 700 DAI
- **Employee's Wallet:** 800 DAI (300 from stream + 500 from escrow)

---

### 6. Employee Withdraws Again (Day 8)

The employee withdraws from the payment stream again.

**Calculation:**
- **Time Elapsed:** 8 days
- **Total Accrued:** 1000 DAI * (8 / 10) = 800 DAI
- **Previously Withdrawn:** 300 DAI
- **Available to Withdraw:** 800 - 300 = 500 DAI

**Transaction:** `withdrawPayment(1)`

**State:**
- **Payment 1:**
  - `withdrawn`: 800
- **Contract Balance:** 200 DAI
- **Employee's Wallet:** 1300 DAI (300 + 500 + 500)

---

### 7. Final Withdrawal (Day 10)

At the end of the stream, the employee withdraws the remaining amount.

**Calculation:**
- **Total Accrued:** 1000 DAI
- **Previously Withdrawn:** 800 DAI
- **Available to Withdraw:** 1000 - 800 = 200 DAI

**Transaction:** `withdrawPayment(1)`

**State:**
- **Payment 1:**
  - `withdrawn`: 1000
- **Contract Balance:** 0 DAI
- **Employee's Wallet:** 1500 DAI (300 + 500 + 500 + 200)
