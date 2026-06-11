-- Phase C: Source Intelligence Engine
-- All tables created with IF NOT EXISTS — safe to re-run

CREATE TABLE IF NOT EXISTS "SourceAnalysis" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "sourceId"         TEXT NOT NULL UNIQUE,
  "status"           TEXT NOT NULL DEFAULT 'pending',
  "pipelineVersion"  TEXT NOT NULL DEFAULT '1.0',
  "aiSummary"        TEXT,
  "relationshipHints" JSONB NOT NULL DEFAULT '[]',
  "entityCount"      INTEGER NOT NULL DEFAULT 0,
  "claimCount"       INTEGER NOT NULL DEFAULT 0,
  "timelineCount"    INTEGER NOT NULL DEFAULT 0,
  "locationCount"    INTEGER NOT NULL DEFAULT 0,
  "nodeCount"        INTEGER NOT NULL DEFAULT 0,
  "contradictionCount" INTEGER NOT NULL DEFAULT 0,
  "processingError"  TEXT,
  "startedAt"        TIMESTAMP(3),
  "completedAt"      TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceAnalysis_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "SourceAnalysis_status_idx"    ON "SourceAnalysis"("status");
CREATE INDEX IF NOT EXISTS "SourceAnalysis_createdAt_idx" ON "SourceAnalysis"("createdAt");

-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ExtractedEntity" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "analysisId"    TEXT NOT NULL,
  "entityType"    TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "aliases"       TEXT[] NOT NULL DEFAULT '{}',
  "context"       TEXT NOT NULL,
  "confidence"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "matchedNodeId" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtractedEntity_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SourceAnalysis"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExtractedEntity_analysisId_idx"    ON "ExtractedEntity"("analysisId");
CREATE INDEX IF NOT EXISTS "ExtractedEntity_entityType_idx"    ON "ExtractedEntity"("entityType");
CREATE INDEX IF NOT EXISTS "ExtractedEntity_matchedNodeId_idx" ON "ExtractedEntity"("matchedNodeId");

-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ExtractedClaim" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "analysisId"    TEXT NOT NULL,
  "claimText"     TEXT NOT NULL,
  "claimType"     TEXT NOT NULL,
  "confidence"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "supportedBy"   TEXT,
  "relatedNodeId" TEXT,
  "status"        TEXT NOT NULL DEFAULT 'pending',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExtractedClaim_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SourceAnalysis"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExtractedClaim_analysisId_idx"    ON "ExtractedClaim"("analysisId");
CREATE INDEX IF NOT EXISTS "ExtractedClaim_relatedNodeId_idx" ON "ExtractedClaim"("relatedNodeId");
CREATE INDEX IF NOT EXISTS "ExtractedClaim_status_idx"        ON "ExtractedClaim"("status");

-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "TimelineReference" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "analysisId"    TEXT NOT NULL,
  "year"          INTEGER,
  "yearStart"     INTEGER,
  "yearEnd"       INTEGER,
  "datePrecision" TEXT,
  "description"   TEXT NOT NULL,
  "period"        TEXT,
  "confidence"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "rawText"       TEXT NOT NULL,
  "relatedNodeId" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TimelineReference_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SourceAnalysis"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "TimelineReference_analysisId_idx" ON "TimelineReference"("analysisId");
CREATE INDEX IF NOT EXISTS "TimelineReference_year_idx"       ON "TimelineReference"("year");

-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LocationReference" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "analysisId"    TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "locationType"  TEXT NOT NULL,
  "modernName"    TEXT,
  "lat"           DOUBLE PRECISION,
  "lon"           DOUBLE PRECISION,
  "confidence"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "context"       TEXT NOT NULL,
  "relatedNodeId" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocationReference_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SourceAnalysis"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "LocationReference_analysisId_idx"   ON "LocationReference"("analysisId");
CREATE INDEX IF NOT EXISTS "LocationReference_locationType_idx" ON "LocationReference"("locationType");

-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PotentialNodeSuggestion" (
  "id"                     TEXT NOT NULL PRIMARY KEY,
  "analysisId"             TEXT NOT NULL,
  "sourceId"               TEXT NOT NULL,
  "suggestedTitle"         TEXT NOT NULL,
  "suggestedCategory"      TEXT NOT NULL,
  "suggestedDescription"   TEXT NOT NULL,
  "suggestedEvidenceLevel" TEXT NOT NULL DEFAULT 'speculative',
  "suggestedConfidence"    DOUBLE PRECISION NOT NULL DEFAULT 0.3,
  "suggestedTags"          TEXT[] NOT NULL DEFAULT '{}',
  "suggestedYear"          INTEGER,
  "suggestedLocation"      TEXT,
  "reasoning"              TEXT NOT NULL,
  "aiConfidence"           DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "status"                 TEXT NOT NULL DEFAULT 'pending',
  "reviewedBy"             TEXT,
  "reviewedAt"             TIMESTAMP(3),
  "appliedNodeId"          TEXT,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PotentialNodeSuggestion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SourceAnalysis"("id") ON DELETE CASCADE,
  CONSTRAINT "PotentialNodeSuggestion_sourceId_fkey"   FOREIGN KEY ("sourceId")   REFERENCES "Source"("id")         ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PotentialNodeSuggestion_analysisId_idx" ON "PotentialNodeSuggestion"("analysisId");
CREATE INDEX IF NOT EXISTS "PotentialNodeSuggestion_sourceId_idx"   ON "PotentialNodeSuggestion"("sourceId");
CREATE INDEX IF NOT EXISTS "PotentialNodeSuggestion_status_idx"     ON "PotentialNodeSuggestion"("status");

-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ContradictionSuggestion" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "analysisId"         TEXT NOT NULL,
  "sourceId"           TEXT NOT NULL,
  "existingNodeId"     TEXT NOT NULL,
  "contradictionType"  TEXT NOT NULL,
  "description"        TEXT NOT NULL,
  "sourceClaimText"    TEXT NOT NULL,
  "nodeClaimText"      TEXT NOT NULL,
  "severity"           TEXT NOT NULL DEFAULT 'moderate',
  "aiConfidence"       DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "status"             TEXT NOT NULL DEFAULT 'pending',
  "reviewedBy"         TEXT,
  "reviewedAt"         TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContradictionSuggestion_analysisId_fkey" FOREIGN KEY ("analysisId")     REFERENCES "SourceAnalysis"("id") ON DELETE CASCADE,
  CONSTRAINT "ContradictionSuggestion_sourceId_fkey"   FOREIGN KEY ("sourceId")       REFERENCES "Source"("id")         ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ContradictionSuggestion_analysisId_idx"     ON "ContradictionSuggestion"("analysisId");
CREATE INDEX IF NOT EXISTS "ContradictionSuggestion_existingNodeId_idx" ON "ContradictionSuggestion"("existingNodeId");
CREATE INDEX IF NOT EXISTS "ContradictionSuggestion_status_idx"         ON "ContradictionSuggestion"("status");
