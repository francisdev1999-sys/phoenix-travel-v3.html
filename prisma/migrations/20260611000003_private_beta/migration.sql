-- Phase D: Private Beta Program
-- Safe to re-run (IF NOT EXISTS on all tables)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "betaGroup" TEXT;

CREATE TABLE IF NOT EXISTS "BetaFeedback" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId"        TEXT,
  "category"      TEXT NOT NULL,
  "severity"      TEXT NOT NULL,
  "page"          TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "screenshotUrl" TEXT,
  "reproSteps"    TEXT,
  "status"        TEXT NOT NULL DEFAULT 'open',
  "adminNotes"    TEXT,
  "resolvedAt"    TIMESTAMP(3),
  "resolvedBy"    TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BetaFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BetaInvite" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "code"      TEXT NOT NULL,
  "email"     TEXT,
  "group"     TEXT NOT NULL,
  "maxUses"   INTEGER NOT NULL DEFAULT 1,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "createdBy" TEXT NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BetaInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BetaInviteRedemption" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid(),
  "inviteId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BetaInviteRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UsageEvent" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId"    TEXT,
  "sessionId" TEXT,
  "eventType" TEXT NOT NULL,
  "meta"      JSONB,
  "page"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BetaInvite_code_key') THEN
    ALTER TABLE "BetaInvite" ADD CONSTRAINT "BetaInvite_code_key" UNIQUE ("code");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BetaInviteRedemption_inviteId_userId_key') THEN
    ALTER TABLE "BetaInviteRedemption" ADD CONSTRAINT "BetaInviteRedemption_inviteId_userId_key" UNIQUE ("inviteId", "userId");
  END IF;
END $$;

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BetaFeedback_userId_fkey') THEN
    ALTER TABLE "BetaFeedback" ADD CONSTRAINT "BetaFeedback_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BetaInviteRedemption_inviteId_fkey') THEN
    ALTER TABLE "BetaInviteRedemption" ADD CONSTRAINT "BetaInviteRedemption_inviteId_fkey"
      FOREIGN KEY ("inviteId") REFERENCES "BetaInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BetaInviteRedemption_userId_fkey') THEN
    ALTER TABLE "BetaInviteRedemption" ADD CONSTRAINT "BetaInviteRedemption_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UsageEvent_userId_fkey') THEN
    ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "BetaFeedback_status_idx"    ON "BetaFeedback"("status");
CREATE INDEX IF NOT EXISTS "BetaFeedback_category_idx"  ON "BetaFeedback"("category");
CREATE INDEX IF NOT EXISTS "BetaFeedback_severity_idx"  ON "BetaFeedback"("severity");
CREATE INDEX IF NOT EXISTS "BetaFeedback_createdAt_idx" ON "BetaFeedback"("createdAt");
CREATE INDEX IF NOT EXISTS "BetaFeedback_userId_idx"    ON "BetaFeedback"("userId");

CREATE INDEX IF NOT EXISTS "BetaInvite_code_idx"      ON "BetaInvite"("code");
CREATE INDEX IF NOT EXISTS "BetaInvite_group_idx"     ON "BetaInvite"("group");
CREATE INDEX IF NOT EXISTS "BetaInvite_createdAt_idx" ON "BetaInvite"("createdAt");

CREATE INDEX IF NOT EXISTS "BetaInviteRedemption_inviteId_idx" ON "BetaInviteRedemption"("inviteId");
CREATE INDEX IF NOT EXISTS "BetaInviteRedemption_userId_idx"   ON "BetaInviteRedemption"("userId");

CREATE INDEX IF NOT EXISTS "UsageEvent_eventType_createdAt_idx" ON "UsageEvent"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "UsageEvent_userId_idx"              ON "UsageEvent"("userId");
CREATE INDEX IF NOT EXISTS "UsageEvent_createdAt_idx"           ON "UsageEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "UsageEvent_sessionId_idx"           ON "UsageEvent"("sessionId");
