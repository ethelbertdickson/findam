ALTER TABLE "ProjectorProSession"
ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3);

-- Existing ACTIVE sessions only recorded metered elapsed seconds. Use their
-- last persisted metering point as the best available heartbeat estimate.
UPDATE "ProjectorProSession"
SET "lastHeartbeatAt" = "createdAt" + ("consumedSeconds" * INTERVAL '1 second')
WHERE "status" = 'ACTIVE'
  AND "consumedSeconds" > 0;
