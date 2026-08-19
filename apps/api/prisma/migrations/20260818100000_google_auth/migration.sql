ALTER TABLE "User"
  ADD COLUMN "googleId" TEXT,
  ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
