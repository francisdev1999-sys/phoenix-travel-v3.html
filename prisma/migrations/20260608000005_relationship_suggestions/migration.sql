-- RelationshipSuggestion: AI/rule-based edge suggestions pending admin review
-- Requirement: every connection needs reason, evidence, confidence, risk, review status

CREATE TABLE IF NOT EXISTS "RelationshipSuggestion" (
    "id"                TEXT         NOT NULL,
    "fromNodeId"        TEXT         NOT NULL,
    "toNodeId"          TEXT         NOT NULL,
    "relationshipType"  TEXT         NOT NULL,
    "reason"            TEXT         NOT NULL,
    "evidenceBasis"     TEXT         NOT NULL,
    "confidenceScore"   FLOAT8       NOT NULL DEFAULT 0.5,
    "riskLevel"         TEXT         NOT NULL DEFAULT 'medium',
    "signalBreakdown"   JSONB        NOT NULL DEFAULT '{}',
    "status"            TEXT         NOT NULL DEFAULT 'pending',
    "reviewedBy"        TEXT,
    "reviewerEmail"     TEXT,
    "reviewedAt"        TIMESTAMP(3),
    "reviewNote"        TEXT,
    "promotedEdgeId"    TEXT,
    "triggeredByNodeId" TEXT,
    "generationMethod"  TEXT         NOT NULL DEFAULT 'rule_based',
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RelationshipSuggestion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RelationshipSuggestion"
    ADD CONSTRAINT "RelationshipSuggestion_fromNodeId_fkey"
    FOREIGN KEY ("fromNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RelationshipSuggestion"
    ADD CONSTRAINT "RelationshipSuggestion_toNodeId_fkey"
    FOREIGN KEY ("toNodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "RelationshipSuggestion_fromNodeId_toNodeId_key"
    ON "RelationshipSuggestion"("fromNodeId","toNodeId");

CREATE INDEX IF NOT EXISTS "RelationshipSuggestion_status_idx"          ON "RelationshipSuggestion"("status");
CREATE INDEX IF NOT EXISTS "RelationshipSuggestion_fromNodeId_idx"       ON "RelationshipSuggestion"("fromNodeId");
CREATE INDEX IF NOT EXISTS "RelationshipSuggestion_toNodeId_idx"         ON "RelationshipSuggestion"("toNodeId");
CREATE INDEX IF NOT EXISTS "RelationshipSuggestion_confidenceScore_idx"  ON "RelationshipSuggestion"("confidenceScore");
CREATE INDEX IF NOT EXISTS "RelationshipSuggestion_triggeredByNodeId_idx" ON "RelationshipSuggestion"("triggeredByNodeId");
CREATE INDEX IF NOT EXISTS "RelationshipSuggestion_createdAt_idx"        ON "RelationshipSuggestion"("createdAt");
