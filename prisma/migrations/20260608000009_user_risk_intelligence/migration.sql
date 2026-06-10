-- Migration: user_risk_intelligence
-- Adds governance columns to User and three new intelligence models

-- ── User: new reputation + ban columns ────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trustScore"      DOUBLE PRECISION NOT NULL DEFAULT 50;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "activityScore"   DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "submissionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "approvedCount"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rejectedCount"   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBanned"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banReason"       TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "banExpiresAt"    TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveAt"    TIMESTAMP(3);

-- ── User indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "User_isBanned_idx"    ON "User"("isBanned");
CREATE INDEX IF NOT EXISTS "User_trustScore_idx"  ON "User"("trustScore");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx"   ON "User"("createdAt");

-- ── UserRiskProfile ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserRiskProfile" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "riskScore"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel"        TEXT NOT NULL DEFAULT 'low',
    "spamScore"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "botScore"         DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reasons"          JSONB NOT NULL DEFAULT '[]',
    CONSTRAINT "UserRiskProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserRiskProfile_userId_key"         ON "UserRiskProfile"("userId");
CREATE INDEX        IF NOT EXISTS "UserRiskProfile_riskScore_idx"      ON "UserRiskProfile"("riskScore");
CREATE INDEX        IF NOT EXISTS "UserRiskProfile_riskLevel_idx"      ON "UserRiskProfile"("riskLevel");
CREATE INDEX        IF NOT EXISTS "UserRiskProfile_lastCalculatedAt_idx" ON "UserRiskProfile"("lastCalculatedAt");
ALTER TABLE "UserRiskProfile" ADD CONSTRAINT "UserRiskProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── UserActivityEvent ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserActivityEvent" (
    "id"            TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "eventType"     TEXT NOT NULL,
    "path"          TEXT,
    "metadata"      JSONB NOT NULL DEFAULT '{}',
    "ipHash"        TEXT,
    "userAgentHash" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserActivityEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "UserActivityEvent_userId_createdAt_idx"   ON "UserActivityEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserActivityEvent_ipHash_createdAt_idx"   ON "UserActivityEvent"("ipHash", "createdAt");
CREATE INDEX IF NOT EXISTS "UserActivityEvent_eventType_createdAt_idx" ON "UserActivityEvent"("eventType", "createdAt");
ALTER TABLE "UserActivityEvent" ADD CONSTRAINT "UserActivityEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── UserModerationStatus ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "UserModerationStatus" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'active',
    "reason"    TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserModerationStatus_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "UserModerationStatus_userId_key"    ON "UserModerationStatus"("userId");
CREATE INDEX        IF NOT EXISTS "UserModerationStatus_status_idx"    ON "UserModerationStatus"("status");
CREATE INDEX        IF NOT EXISTS "UserModerationStatus_changedAt_idx" ON "UserModerationStatus"("changedAt");
ALTER TABLE "UserModerationStatus" ADD CONSTRAINT "UserModerationStatus_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
