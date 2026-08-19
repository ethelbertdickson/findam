CREATE TYPE "AgencyFeeType" AS ENUM ('FLAT', 'PERCENTAGE');

ALTER TABLE "PropertyDetails"
ADD COLUMN "agencyFeeType" "AgencyFeeType" NOT NULL DEFAULT 'FLAT';
