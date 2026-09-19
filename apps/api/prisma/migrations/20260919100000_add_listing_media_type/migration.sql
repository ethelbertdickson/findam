-- Preserve existing listing images while allowing one video media item per listing.
CREATE TYPE "ListingMediaType" AS ENUM ('IMAGE', 'VIDEO');

ALTER TABLE "ListingImage"
ADD COLUMN "mediaType" "ListingMediaType" NOT NULL DEFAULT 'IMAGE';

CREATE INDEX "ListingImage_listingId_mediaType_idx"
ON "ListingImage"("listingId", "mediaType");
