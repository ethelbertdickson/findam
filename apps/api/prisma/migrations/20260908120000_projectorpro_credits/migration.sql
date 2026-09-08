-- Projector Pro Deepgram credit ledger and Paystack purchases.
CREATE TYPE "ProjectorProCreditEntryType" AS ENUM ('PURCHASE', 'RESERVATION', 'CONSUMPTION', 'RELEASE');
CREATE TYPE "ProjectorProSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED');

CREATE TABLE "ProjectorProWallet" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balanceSeconds" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectorProWallet_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectorProWallet_userId_key" ON "ProjectorProWallet"("userId");
ALTER TABLE "ProjectorProWallet" ADD CONSTRAINT "ProjectorProWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectorProCreditEntry" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" "ProjectorProCreditEntryType" NOT NULL,
  "seconds" INTEGER NOT NULL,
  "reference" TEXT,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectorProCreditEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectorProCreditEntry_reference_key" ON "ProjectorProCreditEntry"("reference");
CREATE INDEX "ProjectorProCreditEntry_walletId_createdAt_idx" ON "ProjectorProCreditEntry"("walletId", "createdAt");
ALTER TABLE "ProjectorProCreditEntry" ADD CONSTRAINT "ProjectorProCreditEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "ProjectorProWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectorProPurchase" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "packageCode" TEXT NOT NULL,
  "amountKobo" INTEGER NOT NULL,
  "creditSeconds" INTEGER NOT NULL,
  "paystackRef" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fulfilledAt" TIMESTAMP(3),
  CONSTRAINT "ProjectorProPurchase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectorProPurchase_paystackRef_key" ON "ProjectorProPurchase"("paystackRef");
CREATE INDEX "ProjectorProPurchase_userId_createdAt_idx" ON "ProjectorProPurchase"("userId", "createdAt");
ALTER TABLE "ProjectorProPurchase" ADD CONSTRAINT "ProjectorProPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProjectorProSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "installationId" TEXT NOT NULL,
  "reservedSeconds" INTEGER NOT NULL,
  "consumedSeconds" INTEGER NOT NULL DEFAULT 0,
  "status" "ProjectorProSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ProjectorProSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProjectorProSession_userId_status_idx" ON "ProjectorProSession"("userId", "status");
CREATE INDEX "ProjectorProSession_installationId_idx" ON "ProjectorProSession"("installationId");
ALTER TABLE "ProjectorProSession" ADD CONSTRAINT "ProjectorProSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
