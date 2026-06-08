-- Tier 1: ImportBatch table + importBatchId tracking columns on Node, Edge, Source

-- ── ImportBatch table ────────────────────────────────────────────────────────
CREATE TABLE "ImportBatch" (
  "id"               TEXT NOT NULL,
  "importedBy"       TEXT,
  "inputFormat"      TEXT NOT NULL DEFAULT 'json',
  "parsedCount"      INTEGER NOT NULL DEFAULT 0,
  "acceptedCount"    INTEGER NOT NULL DEFAULT 0,
  "rejectedCount"    INTEGER NOT NULL DEFAULT 0,
  "warningCount"     INTEGER NOT NULL DEFAULT 0,
  "validationReport" JSONB NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'committed',
  "rolledBackAt"     TIMESTAMP(3),
  "rolledBackBy"     TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ImportBatch_status_idx"    ON "ImportBatch"("status");
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- ── importBatchId on Node ────────────────────────────────────────────────────
ALTER TABLE "Node"
  ADD COLUMN "importBatchId" TEXT;

ALTER TABLE "Node"
  ADD CONSTRAINT "Node_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Node_importBatchId_idx" ON "Node"("importBatchId");

-- ── importBatchId on Edge ────────────────────────────────────────────────────
ALTER TABLE "Edge"
  ADD COLUMN "importBatchId" TEXT;

ALTER TABLE "Edge"
  ADD CONSTRAINT "Edge_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Edge_importBatchId_idx" ON "Edge"("importBatchId");

-- ── importBatchId on Source ──────────────────────────────────────────────────
ALTER TABLE "Source"
  ADD COLUMN "importBatchId" TEXT;

ALTER TABLE "Source"
  ADD CONSTRAINT "Source_importBatchId_fkey"
  FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Source_importBatchId_idx" ON "Source"("importBatchId");
