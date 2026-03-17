-- CreateTable
CREATE TABLE "ChatRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "requirementSetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "inputMessageId" TEXT,
    "outputMessageId" TEXT,
    "errorMessage" TEXT,
    "meta" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "ChatRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatRunCheckpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt" INTEGER,
    "payload" TEXT,
    "runId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatRunCheckpoint_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ChatRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sql" TEXT,
    "presentation" TEXT,
    "resultSnapshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "errorMessage" TEXT,
    "parseError" BOOLEAN NOT NULL DEFAULT false,
    "validated" BOOLEAN,
    "validationMode" TEXT,
    "validationError" TEXT,
    "validationAttempts" INTEGER,
    "sessionId" TEXT NOT NULL,
    "runId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ChatRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ChatMessage" ("completedAt", "content", "createdAt", "errorMessage", "id", "parseError", "presentation", "resultSnapshot", "role", "sessionId", "sql", "startedAt", "status", "validated", "validationAttempts", "validationError", "validationMode")
SELECT "completedAt", "content", "createdAt", "errorMessage", "id", "parseError", "presentation", "resultSnapshot", "role", "sessionId", "sql", "startedAt", "status", "validated", "validationAttempts", "validationError", "validationMode" FROM "ChatMessage";
DROP TABLE "ChatMessage";
ALTER TABLE "new_ChatMessage" RENAME TO "ChatMessage";
CREATE INDEX "ChatRun_sessionId_idx" ON "ChatRun"("sessionId");
CREATE INDEX "ChatRun_sessionId_status_idx" ON "ChatRun"("sessionId", "status");
CREATE INDEX "ChatRunCheckpoint_runId_createdAt_idx" ON "ChatRunCheckpoint"("runId", "createdAt");
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");
CREATE INDEX "ChatMessage_sessionId_status_idx" ON "ChatMessage"("sessionId", "status");
CREATE INDEX "ChatMessage_runId_idx" ON "ChatMessage"("runId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
