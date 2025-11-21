INITIAL STATE (Stream Creation - Day 0)

Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $0
├─ escrowed: $0
├─ totalPausedDuration: 0 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Money Location:
├─ In contract: $300
├─ Employee received (payout): $0
├─ Employee received (escrow): $0
└─ Locked in escrow: $0


DAY 5 - WITHDRAW #1

Before withdraw():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $0
├─ escrowed: $0
├─ totalPausedDuration: 0 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Calculation:
├─ rawElapsed: 5 days
├─ totalPaused: 0 days
├─ workingTime: 5 days
├─ earned: ($300 × 5) / 30 = $50
├─ available: $50 - $0 = $50
├─ escrowAmount: $50 × 30% = $15
└─ payout: $50 - $15 = $35

After withdraw():

Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $50        ← CHANGED
├─ escrowed: $15         ← CHANGED
├─ totalPausedDuration: 0 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Money Location:
├─ In contract: $250     ($300 - $50)
├─ Employee received (payout): $35
├─ Employee received (escrow): $0
└─ Locked in escrow: $15

DAY 5 - PAUSE
After pauseStream():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $50
├─ escrowed: $15
├─ totalPausedDuration: 0 days
├─ pausedAt: Day 5       ← CHANGED
├─ paused: true          ← CHANGED
└─ cancelled: false

Money Location:
├─ In contract: $250
├─ Employee received (payout): $35
├─ Employee received (escrow): $0
└─ Locked in escrow: $15

DAY 8 - CHECK AVAILABLE (WHILE PAUSED)
Query claimable() (read-only, no state change):
Stream State: (UNCHANGED)
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $50
├─ escrowed: $15
├─ totalPausedDuration: 0 days
├─ pausedAt: Day 5
├─ paused: true
└─ cancelled: false

Calculation:
├─ rawElapsed: 8 days
├─ currentPauseDuration: 8 - 5 = 3 days
├─ totalPaused: 0 + 3 = 3 days
├─ workingTime: 8 - 3 = 5 days
├─ earned: ($300 × 5) / 30 = $50
└─ available: $50 - $50 = $0    ← Nothing to withdraw!

Money Location: (UNCHANGED)
├─ In contract: $250
├─ Employee received (payout): $35
├─ Employee received (escrow): $0
└─ Locked in escrow: $15

DAY 10 - RESUME
After resumeStream():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $50
├─ escrowed: $15
├─ totalPausedDuration: 5 days    ← CHANGED (0 + 5)
├─ pausedAt: 0                     ← CHANGED (cleared)
├─ paused: false                   ← CHANGED
└─ cancelled: false

Money Location:
├─ In contract: $250
├─ Employee received (payout): $35
├─ Employee received (escrow): $0
└─ Locked in escrow: $15

DAY 15 - WITHDRAW #2
Before withdraw():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $50
├─ escrowed: $15
├─ totalPausedDuration: 5 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Calculation:
├─ rawElapsed: 15 days
├─ totalPaused: 5 + 0 = 5 days
├─ workingTime: 15 - 5 = 10 days
├─ earned: ($300 × 10) / 30 = $100
├─ available: $100 - $50 = $50
├─ escrowAmount: $50 × 30% = $15
└─ payout: $50 - $15 = $35
After withdraw():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $100       ← CHANGED ($50 + $50)
├─ escrowed: $30         ← CHANGED ($15 + $15)
├─ totalPausedDuration: 5 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Money Location:
├─ In contract: $200     ($300 - $100)
├─ Employee received (payout): $70    ($35 + $35)
├─ Employee received (escrow): $0
└─ Locked in escrow: $30

DAY 21 - PAUSE #2
After pauseStream():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $100
├─ escrowed: $30
├─ totalPausedDuration: 5 days
├─ pausedAt: Day 21      ← CHANGED
├─ paused: true          ← CHANGED
└─ cancelled: false

Money Location:
├─ In contract: $200
├─ Employee received (payout): $70
├─ Employee received (escrow): $0
└─ Locked in escrow: $30

DAY 23 - CHECK AVAILABLE (WHILE PAUSED AGAIN)
Query claimable() (read-only):
Stream State: (UNCHANGED)
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $100
├─ escrowed: $30
├─ totalPausedDuration: 5 days
├─ pausedAt: Day 21
├─ paused: true
└─ cancelled: false

Calculation:
├─ rawElapsed: 23 days
├─ currentPauseDuration: 23 - 21 = 2 days
├─ totalPaused: 5 + 2 = 7 days
├─ workingTime: 23 - 7 = 16 days
├─ earned: ($300 × 16) / 30 = $160
└─ available: $160 - $100 = $60

Money Location: (UNCHANGED)
├─ In contract: $200
├─ Employee received (payout): $70
├─ Employee received (escrow): $0
└─ Locked in escrow: $30
Note: $60 is "earned" but can't withdraw because paused!

DAY 25 - RESUME #2
After resumeStream():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $100
├─ escrowed: $30
├─ totalPausedDuration: 9 days    ← CHANGED (5 + 4)
├─ pausedAt: 0                     ← CHANGED (cleared)
├─ paused: false                   ← CHANGED
└─ cancelled: false

Money Location:
├─ In contract: $200
├─ Employee received (payout): $70
├─ Employee received (escrow): $0
└─ Locked in escrow: $30

DAY 30 - WITHDRAW #3 (FINAL)
Before withdraw():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $100
├─ escrowed: $30
├─ totalPausedDuration: 9 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Calculation:
├─ rawElapsed: 30 days
├─ totalPaused: 9 + 0 = 9 days
├─ workingTime: 30 - 9 = 21 days
├─ earned: ($300 × 21) / 30 = $210
├─ available: $210 - $100 = $110
├─ escrowAmount: $110 × 30% = $33
└─ payout: $110 - $33 = $77
After withdraw():
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $210       ← CHANGED ($100 + $110)
├─ escrowed: $63         ← CHANGED ($30 + $33)
├─ totalPausedDuration: 9 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Money Location:
├─ In contract: $90      ($300 - $210)
├─ Employee received (payout): $147   ($70 + $77)
├─ Employee received (escrow): $0
└─ Locked in escrow: $63

DAY 31 - SUBMIT MILESTONE #1
After submitMilestone(streamId, $30):
Stream State: (UNCHANGED)
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $210
├─ escrowed: $63
├─ totalPausedDuration: 9 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Milestone #1 State:
├─ milestoneId: 1
├─ streamId: 1
├─ submitter: employee
├─ amount: $30
├─ status: PENDING       ← Created
├─ createdAt: Day 31
└─ approvedAt: 0

Money Location:
├─ In contract: $90
├─ Employee received (payout): $147
├─ Employee received (escrow): $0
└─ Locked in escrow: $63

DAY 32 - APPROVE MILESTONE #1
After approveMilestone(1):
Stream State: (UNCHANGED)
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $210
├─ escrowed: $63
├─ totalPausedDuration: 9 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Milestone #1 State:
├─ milestoneId: 1
├─ streamId: 1
├─ submitter: employee
├─ amount: $30
├─ status: APPROVED      ← CHANGED
├─ createdAt: Day 31
└─ approvedAt: Day 32    ← CHANGED

Money Location:
├─ In contract: $90
├─ Employee received (payout): $147
├─ Employee received (escrow): $0
└─ Locked in escrow: $63

DAY 33 - CLAIM MILESTONE #1
After claimMilestone(1):
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $210
├─ escrowed: $33         ← CHANGED ($63 - $30)
├─ totalPausedDuration: 9 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Milestone #1 State:
├─ milestoneId: 1
├─ streamId: 1
├─ submitter: employee
├─ amount: $30
├─ status: CLAIMED       ← CHANGED
├─ createdAt: Day 31
└─ approvedAt: Day 32

Money Location:
├─ In contract: $60      ($90 - $30)
├─ Employee received (payout): $147
├─ Employee received (escrow): $30    ← CHANGED
└─ Locked in escrow: $33

DAY 34 - SUBMIT MILESTONE #2
After submitMilestone(streamId, $33):
Stream State: (UNCHANGED)
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $210
├─ escrowed: $33
├─ totalPausedDuration: 9 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Milestone #2 State:
├─ milestoneId: 2
├─ streamId: 1
├─ submitter: employee
├─ amount: $33
├─ status: PENDING       ← Created
├─ createdAt: Day 34
└─ approvedAt: 0

Money Location:
├─ In contract: $60
├─ Employee received (payout): $147
├─ Employee received (escrow): $30
└─ Locked in escrow: $33

DAY 35 - APPROVE & CLAIM MILESTONE #2
After approveMilestone(2) and claimMilestone(2):
Stream State:
├─ totalAmount: $300
├─ startTime: Day 0
├─ stopTime: Day 30
├─ withdrawn: $210
├─ escrowed: $0          ← CHANGED ($33 - $33)
├─ totalPausedDuration: 9 days
├─ pausedAt: 0
├─ paused: false
└─ cancelled: false

Milestone #2 State:
├─ milestoneId: 2
├─ streamId: 1
├─ submitter: employee
├─ amount: $33
├─ status: CLAIMED       ← CHANGED
├─ createdAt: Day 34
└─ approvedAt: Day 35

Money Location:
├─ In contract: $27      ($60 - $33)
├─ Employee received (payout): $147
├─ Employee received (escrow): $63    ($30 + $33)
└─ Locked in escrow: $0