ALTER TABLE "User" ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE "Listing" ADD COLUMN "currencyCode" TEXT NOT NULL DEFAULT 'NGN';

CREATE INDEX "Listing_currencyCode_idx" ON "Listing"("currencyCode");
