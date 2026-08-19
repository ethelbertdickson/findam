-- Add property categories and a clear offer type for property listings.
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SELF_CONTAINED';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SHORT_LET';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'SERVICED_APARTMENT';
ALTER TYPE "PropertyType" ADD VALUE IF NOT EXISTS 'NEW_PROJECT';

CREATE TYPE "PropertyOfferType" AS ENUM ('RENT', 'SHORT_LET', 'SALE');

ALTER TABLE "PropertyDetails"
ADD COLUMN "offerType" "PropertyOfferType" NOT NULL DEFAULT 'RENT';

CREATE INDEX "PropertyDetails_offerType_idx" ON "PropertyDetails"("offerType");
CREATE INDEX "PropertyDetails_bedrooms_idx" ON "PropertyDetails"("bedrooms");
