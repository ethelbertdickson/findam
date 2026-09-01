-- Create the project and API-key tables before changing existing media rows.
CREATE TABLE "MediaProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaApiKey" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "MediaApiKey_pkey" PRIMARY KEY ("id")
);

-- Preserve every existing folder and asset under the initial Findam project.
INSERT INTO "MediaProject" (
    "id", "name", "slug", "description", "updatedAt"
) VALUES (
    '00000000-0000-4000-8000-000000000001',
    'Findam',
    'findam',
    'Media used by the Findam marketplace applications.',
    CURRENT_TIMESTAMP
);

ALTER TABLE "MediaFolder" ADD COLUMN "projectId" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN "projectId" TEXT;

UPDATE "MediaFolder"
SET "projectId" = '00000000-0000-4000-8000-000000000001'
WHERE "namespace" = 'findam';

UPDATE "MediaAsset"
SET "projectId" = '00000000-0000-4000-8000-000000000001'
WHERE "namespace" = 'findam';

ALTER TABLE "MediaFolder" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "MediaAsset" ALTER COLUMN "projectId" SET NOT NULL;

DROP INDEX "MediaAsset_namespace_createdAt_idx";
DROP INDEX "MediaFolder_namespace_createdAt_idx";
DROP INDEX "MediaFolder_namespace_path_key";

ALTER TABLE "MediaAsset" DROP COLUMN "namespace";
ALTER TABLE "MediaFolder" DROP COLUMN "namespace";

CREATE UNIQUE INDEX "MediaProject_slug_key" ON "MediaProject"("slug");
CREATE INDEX "MediaProject_createdAt_idx" ON "MediaProject"("createdAt");
CREATE UNIQUE INDEX "MediaApiKey_keyHash_key" ON "MediaApiKey"("keyHash");
CREATE INDEX "MediaApiKey_projectId_createdAt_idx" ON "MediaApiKey"("projectId", "createdAt");
CREATE INDEX "MediaApiKey_projectId_revokedAt_idx" ON "MediaApiKey"("projectId", "revokedAt");
CREATE INDEX "MediaAsset_projectId_createdAt_idx" ON "MediaAsset"("projectId", "createdAt");
CREATE INDEX "MediaFolder_projectId_createdAt_idx" ON "MediaFolder"("projectId", "createdAt");
CREATE UNIQUE INDEX "MediaFolder_projectId_path_key" ON "MediaFolder"("projectId", "path");

ALTER TABLE "MediaFolder"
ADD CONSTRAINT "MediaFolder_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "MediaProject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaAsset"
ADD CONSTRAINT "MediaAsset_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "MediaProject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaApiKey"
ADD CONSTRAINT "MediaApiKey_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "MediaProject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
