-- CreateEnum
CREATE TYPE "OperationalTaskName" AS ENUM ('DATABASE_HEALTH_CHECK');

-- CreateEnum
CREATE TYPE "OperationalTaskStatus" AS ENUM ('SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "OperationalTaskRun" (
    "id" TEXT NOT NULL,
    "task" "OperationalTaskName" NOT NULL,
    "status" "OperationalTaskStatus" NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "detail" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalTaskRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperationalTaskRun_task_createdAt_idx" ON "OperationalTaskRun"("task", "createdAt");

-- CreateIndex
CREATE INDEX "OperationalTaskRun_status_createdAt_idx" ON "OperationalTaskRun"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "OperationalTaskRun" ADD CONSTRAINT "OperationalTaskRun_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
