-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER');

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "folderId" TEXT,
    "originalFilename" TEXT NOT NULL,
    "storedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "urlPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaFolder_namespace_createdAt_idx" ON "MediaFolder"("namespace", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFolder_namespace_path_key" ON "MediaFolder"("namespace", "path");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storedFilename_key" ON "MediaAsset"("storedFilename");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_urlPath_key" ON "MediaAsset"("urlPath");

-- CreateIndex
CREATE INDEX "MediaAsset_namespace_createdAt_idx" ON "MediaAsset"("namespace", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_folderId_idx" ON "MediaAsset"("folderId");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_idx" ON "MediaAsset"("kind");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
