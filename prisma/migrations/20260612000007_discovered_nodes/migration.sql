-- DiscoveredNode: AI-proposed new graph nodes awaiting admin review
CREATE TABLE "DiscoveredNode" (
    "id"              TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "category"        TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "mainstreamView"  TEXT,
    "evidenceLevel"   TEXT NOT NULL DEFAULT 'speculative',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "color"           TEXT,
    "icon"            TEXT,
    "year"            INTEGER,
    "tags"            JSONB NOT NULL DEFAULT '[]',
    "claims"          JSONB NOT NULL DEFAULT '[]',
    "criticisms"      JSONB NOT NULL DEFAULT '[]',
    "openQuestions"   JSONB NOT NULL DEFAULT '[]',
    "discoveryQuery"  TEXT,
    "relatedNodeIds"  JSONB NOT NULL DEFAULT '[]',
    "sourceUrl"       TEXT,
    "relevanceScore"  DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "qualityScore"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "noveltyScore"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "aiCostUsd"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status"          TEXT NOT NULL DEFAULT 'pending_review',
    "promotedNodeId"  TEXT,
    "reviewedBy"      TEXT,
    "reviewedAt"      TIMESTAMP(3),
    "rejectionReason" TEXT,
    "discoveredAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveredNode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiscoveredNode_slug_key" ON "DiscoveredNode"("slug");
CREATE INDEX "DiscoveredNode_status_idx" ON "DiscoveredNode"("status");
CREATE INDEX "DiscoveredNode_relevanceScore_idx" ON "DiscoveredNode"("relevanceScore" DESC);
CREATE INDEX "DiscoveredNode_discoveredAt_idx" ON "DiscoveredNode"("discoveredAt" DESC);
