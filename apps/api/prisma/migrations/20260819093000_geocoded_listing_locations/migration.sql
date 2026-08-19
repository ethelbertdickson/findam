ALTER TABLE "Listing"
ADD COLUMN "formattedAddress" TEXT,
ADD COLUMN "locationProvider" TEXT,
ADD COLUMN "locationPlaceId" TEXT;

CREATE INDEX "Listing_locationProvider_locationPlaceId_idx"
ON "Listing"("locationProvider", "locationPlaceId");
