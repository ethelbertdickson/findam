CREATE TYPE "DownloadEventStatus" AS ENUM ('STARTED', 'COMPLETED', 'FAILED');

CREATE TABLE "DownloadEvent" (
    "id" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "platform" TEXT,
    "status" "DownloadEventStatus" NOT NULL DEFAULT 'STARTED',
    "ipHash" TEXT,
    "countryCode" TEXT,
    "continent" TEXT,
    "region" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "DownloadEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DownloadEvent_product_startedAt_idx" ON "DownloadEvent"("product", "startedAt");
CREATE INDEX "DownloadEvent_product_status_startedAt_idx" ON "DownloadEvent"("product", "status", "startedAt");
CREATE INDEX "DownloadEvent_countryCode_idx" ON "DownloadEvent"("countryCode");
