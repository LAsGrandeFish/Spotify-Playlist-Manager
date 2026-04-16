-- CreateTable
CREATE TABLE "ReviewConfirmAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "removedRequested" INTEGER NOT NULL DEFAULT 0,
    "removedApplied" INTEGER NOT NULL DEFAULT 0,
    "addedRequested" INTEGER NOT NULL DEFAULT 0,
    "addedApplied" INTEGER NOT NULL DEFAULT 0,
    "totalTargets" INTEGER NOT NULL DEFAULT 0,
    "playlistsCreated" INTEGER NOT NULL DEFAULT 0,
    "playlistsSkipped" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "failureLog" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewConfirmAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewConfirmAttempt_sessionId_idx" ON "ReviewConfirmAttempt"("sessionId");

-- CreateIndex
CREATE INDEX "ReviewConfirmAttempt_status_idx" ON "ReviewConfirmAttempt"("status");

-- CreateIndex
CREATE INDEX "ReviewConfirmAttempt_createdAt_idx" ON "ReviewConfirmAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "ReviewConfirmAttempt" ADD CONSTRAINT "ReviewConfirmAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ReviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
