-- CreateTable
CREATE TABLE "SlackUserMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slackUserId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "linkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SlackUserMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GenerationError" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "sessionId" TEXT,
    "messageId" TEXT,
    "errorType" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "prompt" TEXT,
    "rawResponse" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "SlackUserMapping_slackUserId_key" ON "SlackUserMapping"("slackUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SlackUserMapping_userId_key" ON "SlackUserMapping"("userId");

-- CreateIndex
CREATE INDEX "SlackUserMapping_slackUserId_idx" ON "SlackUserMapping"("slackUserId");

-- CreateIndex
CREATE INDEX "GenerationError_userId_idx" ON "GenerationError"("userId");

-- CreateIndex
CREATE INDEX "GenerationError_errorType_idx" ON "GenerationError"("errorType");

-- CreateIndex
CREATE INDEX "GenerationError_createdAt_idx" ON "GenerationError"("createdAt");
