UPDATE "User"
SET "role" = 'AGENT'
WHERE "role" = 'USER'
  AND EXISTS (
    SELECT 1
    FROM "AgentProfile"
    WHERE "AgentProfile"."userId" = "User"."id"
  );
