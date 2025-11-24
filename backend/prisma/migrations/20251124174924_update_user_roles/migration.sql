-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "wallet" TEXT NOT NULL,
    "isCompany" BOOLEAN NOT NULL DEFAULT false,
    "isEmployee" BOOLEAN NOT NULL DEFAULT false,
    "isAuditor" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "employee" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "totalAmount" TEXT NOT NULL,
    "startTime" BIGINT NOT NULL,
    "stopTime" BIGINT NOT NULL,
    "lastWithdrawTime" BIGINT,
    "withdrawn" TEXT NOT NULL DEFAULT '0',
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "totalPausedDuration" BIGINT NOT NULL DEFAULT 0,
    "pausedAt" BIGINT DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" SERIAL NOT NULL,
    "escrowId" INTEGER NOT NULL,
    "paymentId" INTEGER,
    "company" TEXT NOT NULL,
    "employee" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractEvent" (
    "id" SERIAL NOT NULL,
    "eventName" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "transactionHash" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_wallet_key" ON "User"("wallet");

-- CreateIndex
CREATE INDEX "User_wallet_idx" ON "User"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentId_key" ON "Payment"("paymentId");

-- CreateIndex
CREATE INDEX "Payment_company_idx" ON "Payment"("company");

-- CreateIndex
CREATE INDEX "Payment_employee_idx" ON "Payment"("employee");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_escrowId_key" ON "Escrow"("escrowId");

-- CreateIndex
CREATE INDEX "Escrow_paymentId_idx" ON "Escrow"("paymentId");

-- CreateIndex
CREATE INDEX "Escrow_company_idx" ON "Escrow"("company");

-- CreateIndex
CREATE INDEX "Escrow_employee_idx" ON "Escrow"("employee");

-- CreateIndex
CREATE INDEX "Escrow_status_idx" ON "Escrow"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContractEvent_transactionHash_key" ON "ContractEvent"("transactionHash");

-- CreateIndex
CREATE INDEX "ContractEvent_eventName_idx" ON "ContractEvent"("eventName");

-- CreateIndex
CREATE INDEX "ContractEvent_processed_idx" ON "ContractEvent"("processed");

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("paymentId") ON DELETE SET NULL ON UPDATE CASCADE;
