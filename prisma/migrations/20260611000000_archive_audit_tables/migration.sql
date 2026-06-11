-- Idempotent: safe to re-run even if tables already exist in Railway DB

CREATE TABLE IF NOT EXISTS "SystemConfig" (
    "key"       TEXT          NOT NULL,
    "value"     JSONB         NOT NULL,
    "updatedAt" TIMESTAMP(3)  NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "ArchiveAuditRun" (
    "id"          TEXT          NOT NULL,
    "status"      TEXT          NOT NULL DEFAULT 'running',
    "triggeredBy" TEXT          NOT NULL,
    "startedAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary"     JSONB         NOT NULL DEFAULT '{}',
    "settings"    JSONB         NOT NULL DEFAULT '{}',
    CONSTRAINT "ArchiveAuditRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ArchiveAuditFinding" (
    "id"          TEXT          NOT NULL,
    "runId"       TEXT          NOT NULL,
    "type"        TEXT          NOT NULL,
    "severity"    TEXT          NOT NULL,
    "status"      TEXT          NOT NULL DEFAULT 'pending',
    "nodeId"      TEXT,
    "edgeId"      TEXT,
    "title"       TEXT          NOT NULL,
    "description" TEXT          NOT NULL,
    "beforeState" JSONB         NOT NULL DEFAULT '{}',
    "afterState"  JSONB         NOT NULL DEFAULT '{}',
    "reasoning"   TEXT          NOT NULL,
    "autoFixable" BOOLEAN       NOT NULL DEFAULT false,
    "webSources"  JSONB         NOT NULL DEFAULT '[]',
    "reviewedBy"  TEXT,
    "reviewedAt"  TIMESTAMP(3),
    "appliedAt"   TIMESTAMP(3),
    "applyError"  TEXT,
    CONSTRAINT "ArchiveAuditFinding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ArchiveAuditRun_status_idx"             ON "ArchiveAuditRun"("status");
CREATE INDEX IF NOT EXISTS "ArchiveAuditRun_startedAt_idx"          ON "ArchiveAuditRun"("startedAt" DESC);
CREATE INDEX IF NOT EXISTS "ArchiveAuditFinding_runId_status_idx"   ON "ArchiveAuditFinding"("runId", "status");
CREATE INDEX IF NOT EXISTS "ArchiveAuditFinding_type_severity_idx"  ON "ArchiveAuditFinding"("type", "severity");
CREATE INDEX IF NOT EXISTS "ArchiveAuditFinding_nodeId_idx"         ON "ArchiveAuditFinding"("nodeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ArchiveAuditFinding_runId_fkey'
      AND table_name      = 'ArchiveAuditFinding'
  ) THEN
    ALTER TABLE "ArchiveAuditFinding"
      ADD CONSTRAINT "ArchiveAuditFinding_runId_fkey"
      FOREIGN KEY ("runId") REFERENCES "ArchiveAuditRun"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
