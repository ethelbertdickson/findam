ALTER TABLE "MediaAsset"
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "uploadedById" TEXT,
  ADD COLUMN "uploadedByRole" TEXT,
  ADD COLUMN "uploadedByName" TEXT,
  ADD COLUMN "uploadedByEmail" TEXT;

CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");
CREATE INDEX "MediaAsset_uploadedByEmail_idx" ON "MediaAsset"("uploadedByEmail");
