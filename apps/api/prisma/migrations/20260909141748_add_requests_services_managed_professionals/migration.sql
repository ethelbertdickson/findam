-- CreateEnum
CREATE TYPE "ServiceListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserRequestType" AS ENUM ('PROPERTY', 'CO_RENTING', 'LAND', 'HOUSEHOLD', 'PROFESSIONAL', 'SERVICE');

-- CreateEnum
CREATE TYPE "UserRequestStatus" AS ENUM ('OPEN', 'MATCHED', 'CLOSED', 'EXPIRED');

-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN     "managedById" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ServiceListing" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ProfessionalCategory" NOT NULL,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceFrom" DECIMAL(14,2),
    "priceTo" DECIMAL(14,2),
    "status" "ServiceListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRequest" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "UserRequestType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "countryId" TEXT,
    "stateId" TEXT,
    "cityId" TEXT,
    "budgetMin" DECIMAL(14,2),
    "budgetMax" DECIMAL(14,2),
    "bedrooms" INTEGER,
    "serviceCategory" "ProfessionalCategory",
    "contactMode" TEXT NOT NULL DEFAULT 'MANAGED',
    "status" "UserRequestStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceListing_category_status_idx" ON "ServiceListing"("category", "status");

-- CreateIndex
CREATE INDEX "ServiceListing_providerId_idx" ON "ServiceListing"("providerId");

-- CreateIndex
CREATE INDEX "UserRequest_type_status_idx" ON "UserRequest"("type", "status");

-- CreateIndex
CREATE INDEX "UserRequest_serviceCategory_status_idx" ON "UserRequest"("serviceCategory", "status");

-- CreateIndex
CREATE INDEX "UserRequest_countryId_stateId_cityId_idx" ON "UserRequest"("countryId", "stateId", "cityId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_managedById_idx" ON "ProfessionalProfile"("managedById");

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_managedById_fkey" FOREIGN KEY ("managedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceListing" ADD CONSTRAINT "ServiceListing_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceListing" ADD CONSTRAINT "ServiceListing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRequest" ADD CONSTRAINT "UserRequest_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
