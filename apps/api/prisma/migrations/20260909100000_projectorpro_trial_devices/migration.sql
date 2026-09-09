CREATE TABLE "ProjectorProTrialDevice" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectorProTrialDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectorProTrialDevice_deviceId_key" ON "ProjectorProTrialDevice"("deviceId");
CREATE INDEX "ProjectorProTrialDevice_userId_idx" ON "ProjectorProTrialDevice"("userId");
ALTER TABLE "ProjectorProTrialDevice" ADD CONSTRAINT "ProjectorProTrialDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
