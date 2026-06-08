-- Tier 2: Admin workflow — AuditLog table + admin review fields on Node

-- ── Node admin review fields ──────────────────────────────────────────────────
ALTER TABLE "Node"
  ADD COLUMN IF NOT EXISTS "adminReviewStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "adminReviewNote"   TEXT;

-- ── AuditLog table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id"         TEXT         NOT NULL PRIMARY KEY,
  "userId"     TEXT,
  "userEmail"  TEXT,
  "action"     TEXT         NOT NULL,
  "entityType" TEXT         NOT NULL,
  "entityId"   TEXT         NOT NULL,
  "detail"     JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx"              ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx"           ON "AuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx"              ON "AuditLog"("action");
