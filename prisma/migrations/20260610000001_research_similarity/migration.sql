-- ResearchSimilarity: computed similarity metadata between node pairs.
-- NEVER creates graph edges. Advisory metadata only.
CREATE TABLE IF NOT EXISTS "ResearchSimilarity" (
  "id"                     TEXT NOT NULL,
  "nodeAId"                TEXT NOT NULL,
  "nodeBId"                TEXT NOT NULL,

  -- Dimension scores (0.0–1.0)
  "overallSimilarity"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "thematicSimilarity"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "timelineSimilarity"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "geographicSimilarity"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sourceSimilarity"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "evidenceSimilarity"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "entitySimilarity"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "relationshipSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,

  "researchPotentialScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence"             DOUBLE PRECISION NOT NULL DEFAULT 0,

  -- Human-readable analysis (JSON arrays/strings)
  "explanation"      TEXT NOT NULL DEFAULT '',
  "criticAnalysis"   JSONB NOT NULL DEFAULT '[]',
  "breakdown"        JSONB NOT NULL DEFAULT '{}',

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ResearchSimilarity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ResearchSimilarity_nodeAId_nodeBId_key"
  ON "ResearchSimilarity"("nodeAId", "nodeBId");

CREATE INDEX IF NOT EXISTS "ResearchSimilarity_nodeAId_idx"   ON "ResearchSimilarity"("nodeAId");
CREATE INDEX IF NOT EXISTS "ResearchSimilarity_nodeBId_idx"   ON "ResearchSimilarity"("nodeBId");
CREATE INDEX IF NOT EXISTS "ResearchSimilarity_overall_idx"   ON "ResearchSimilarity"("overallSimilarity" DESC);
CREATE INDEX IF NOT EXISTS "ResearchSimilarity_potential_idx" ON "ResearchSimilarity"("researchPotentialScore" DESC);
