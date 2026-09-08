-- CreateEnum
CREATE TYPE "ProfessionalCategory" AS ENUM ('PLUMBER', 'ELECTRICIAN', 'TILER', 'BRICKLAYER', 'CARPENTER', 'PAINTER', 'ENGINEER', 'ARCHITECT', 'SURVEYOR', 'QUANTITY_SURVEYOR', 'INTERIOR_DESIGNER', 'ROOFER', 'HVAC_TECHNICIAN', 'PROPERTY_MANAGER', 'SUPPLIER', 'OTHER');

-- AlterTable
ALTER TABLE "PropertyDetails" ADD COLUMN     "availableRooms" INTEGER,
ADD COLUMN     "coRentingNote" TEXT,
ADD COLUMN     "currentTenants" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isCoRenting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalRooms" INTEGER;

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "category" "ProfessionalCategory" NOT NULL,
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "portfolioUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countryId" TEXT,
    "stateId" TEXT,
    "cityId" TEXT,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_category_idx" ON "ProfessionalProfile"("category");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_countryId_stateId_cityId_idx" ON "ProfessionalProfile"("countryId", "stateId", "cityId");

-- CreateIndex
CREATE INDEX "ProfessionalProfile_isVerified_idx" ON "ProfessionalProfile"("isVerified");

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
