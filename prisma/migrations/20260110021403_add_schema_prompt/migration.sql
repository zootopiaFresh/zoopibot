-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sqlKeywordCase" TEXT NOT NULL DEFAULT 'uppercase',
    "aliasStyle" TEXT NOT NULL DEFAULT 'meaningful',
    "indentation" TEXT NOT NULL DEFAULT '2spaces',
    "explanationDetail" TEXT NOT NULL DEFAULT 'detailed',
    "responseTone" TEXT NOT NULL DEFAULT 'formal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DomainTerm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "mapping" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DomainTerm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLearned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FrequentTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FrequentTable_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "messageId" TEXT,
    "feedback" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "learnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SchemaPrompt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "password", "role", "status", "updatedAt") SELECT "createdAt", "email", "id", "name", "password", "role", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "DomainTerm_userId_idx" ON "DomainTerm"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DomainTerm_userId_term_key" ON "DomainTerm"("userId", "term");

-- CreateIndex
CREATE INDEX "BusinessRule_userId_idx" ON "BusinessRule"("userId");

-- CreateIndex
CREATE INDEX "FrequentTable_userId_idx" ON "FrequentTable"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FrequentTable_userId_tableName_key" ON "FrequentTable"("userId", "tableName");

-- CreateIndex
CREATE INDEX "PromptFeedback_userId_idx" ON "PromptFeedback"("userId");

-- CreateIndex
CREATE INDEX "PromptFeedback_isProcessed_idx" ON "PromptFeedback"("isProcessed");

-- CreateIndex
CREATE INDEX "LearningLog_userId_idx" ON "LearningLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SchemaPrompt_name_key" ON "SchemaPrompt"("name");

-- CreateIndex
CREATE INDEX "SchemaPrompt_isActive_idx" ON "SchemaPrompt"("isActive");

-- CreateIndex
CREATE INDEX "SchemaPrompt_name_idx" ON "SchemaPrompt"("name");
