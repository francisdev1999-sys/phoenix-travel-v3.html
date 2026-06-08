-- Foundation Architecture Migration
-- Safe to re-run: all statements use IF NOT EXISTS.
-- pgvector is optional — degrades gracefully when not installed on the host.

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- pg_trgm and unaccent are standard on all PostgreSQL installations.
-- pgvector is optional — wrapped in exception handler so the migration
-- succeeds even on Railway's default PostgreSQL without pgvector installed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector not available (%), skipping — semantic search disabled', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TAXONOMY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Category" (
    "id"          TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "color"       TEXT,
    "parentId"    TEXT,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");

DO $$ BEGIN
  ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NODE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Node" (
    "id"              TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "categoryId"      TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "mainstreamView"  TEXT,
    "evidenceLevel"   TEXT NOT NULL DEFAULT 'speculative',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "color"           TEXT,
    "icon"            TEXT,
    "lat"             DOUBLE PRECISION,
    "lon"             DOUBLE PRECISION,
    "region"          TEXT,
    "country"         TEXT,
    "year"            INTEGER,
    "dateStart"       INTEGER,
    "dateEnd"         INTEGER,
    "datePrecision"   TEXT,
    "status"          TEXT NOT NULL DEFAULT 'draft',
    "version"         INTEGER NOT NULL DEFAULT 1,
    "publishedAt"     TIMESTAMP(3),
    "createdBy"       TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_vector"   tsvector,
    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Node_categoryId_idx"      ON "Node"("categoryId");
CREATE INDEX IF NOT EXISTS "Node_status_idx"          ON "Node"("status");
CREATE INDEX IF NOT EXISTS "Node_evidenceLevel_idx"   ON "Node"("evidenceLevel");
CREATE INDEX IF NOT EXISTS "Node_confidenceScore_idx" ON "Node"("confidenceScore");
CREATE INDEX IF NOT EXISTS "Node_geo_idx"             ON "Node"("lat", "lon");
CREATE INDEX IF NOT EXISTS "Node_year_idx"            ON "Node"("year");
CREATE INDEX IF NOT EXISTS "Node_dateRange_idx"       ON "Node"("dateStart", "dateEnd");
CREATE INDEX IF NOT EXISTS "Node_createdAt_idx"       ON "Node"("createdAt");
CREATE INDEX IF NOT EXISTS "Node_search_vector_idx"   ON "Node" USING GIN("search_vector");
CREATE INDEX IF NOT EXISTS "Node_title_trgm_idx"      ON "Node" USING GIN("title" gin_trgm_ops);

CREATE OR REPLACE FUNCTION node_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW."search_vector" :=
        setweight(to_tsvector('english', unaccent(coalesce(NEW."title", ''))),         'A') ||
        setweight(to_tsvector('english', unaccent(coalesce(NEW."evidenceLevel", ''))), 'B') ||
        setweight(to_tsvector('english', unaccent(coalesce(NEW."description", ''))),   'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Node_search_vector_trigger" ON "Node";
CREATE TRIGGER "Node_search_vector_trigger"
    BEFORE INSERT OR UPDATE OF "title", "evidenceLevel", "description"
    ON "Node"
    FOR EACH ROW EXECUTE FUNCTION node_search_vector_update();

DO $$ BEGIN
  ALTER TABLE "Node" ADD CONSTRAINT "Node_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NODE TAGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NodeTag" (
    "nodeId" TEXT NOT NULL,
    "tag"    TEXT NOT NULL,
    CONSTRAINT "NodeTag_pkey" PRIMARY KEY ("nodeId", "tag")
);

CREATE INDEX IF NOT EXISTS "NodeTag_tag_idx"      ON "NodeTag"("tag");
CREATE INDEX IF NOT EXISTS "NodeTag_tag_trgm_idx" ON "NodeTag" USING GIN("tag" gin_trgm_ops);

DO $$ BEGIN
  ALTER TABLE "NodeTag" ADD CONSTRAINT "NodeTag_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- EDGE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Edge" (
    "id"               TEXT NOT NULL,
    "fromId"           TEXT NOT NULL,
    "toId"             TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "strengthScore"    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "confidenceScore"  DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "explanation"      TEXT NOT NULL,
    "evidenceBasis"    TEXT NOT NULL,
    "sourceType"       TEXT NOT NULL,
    "sourceCount"      INTEGER,
    "status"           TEXT NOT NULL DEFAULT 'draft',
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Edge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Edge_fromId_toId_key"   ON "Edge"("fromId", "toId");
CREATE INDEX IF NOT EXISTS "Edge_fromId_idx"               ON "Edge"("fromId");
CREATE INDEX IF NOT EXISTS "Edge_toId_idx"                 ON "Edge"("toId");
CREATE INDEX IF NOT EXISTS "Edge_relationshipType_idx"     ON "Edge"("relationshipType");
CREATE INDEX IF NOT EXISTS "Edge_confidenceScore_idx"      ON "Edge"("confidenceScore");
CREATE INDEX IF NOT EXISTS "Edge_status_idx"               ON "Edge"("status");

DO $$ BEGIN
  ALTER TABLE "Edge" ADD CONSTRAINT "Edge_fromId_fkey"
    FOREIGN KEY ("fromId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Edge" ADD CONSTRAINT "Edge_toId_fkey"
    FOREIGN KEY ("toId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLAIMS / CRITICISMS / OPEN QUESTIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Claim" (
    "id"         TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "text"       TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Claim_nodeId_idx" ON "Claim"("nodeId");
DO $$ BEGIN
  ALTER TABLE "Claim" ADD CONSTRAINT "Claim_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Criticism" (
    "id"         TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "text"       TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Criticism_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Criticism_nodeId_idx" ON "Criticism"("nodeId");
DO $$ BEGIN
  ALTER TABLE "Criticism" ADD CONSTRAINT "Criticism_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OpenQuestion" (
    "id"         TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "text"       TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OpenQuestion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OpenQuestion_nodeId_idx" ON "OpenQuestion"("nodeId");
DO $$ BEGIN
  ALTER TABLE "OpenQuestion" ADD CONSTRAINT "OpenQuestion_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- NODE VERSIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NodeVersion" (
    "id"         TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "version"    INTEGER NOT NULL,
    "snapshot"   JSONB NOT NULL,
    "changedBy"  TEXT,
    "changeNote" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodeVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NodeVersion_nodeId_version_key" ON "NodeVersion"("nodeId", "version");
CREATE INDEX IF NOT EXISTS "NodeVersion_nodeId_idx" ON "NodeVersion"("nodeId");
DO $$ BEGIN
  ALTER TABLE "NodeVersion" ADD CONSTRAINT "NodeVersion_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- VECTOR EMBEDDINGS
-- Stored as float8[] when pgvector unavailable; vector(1536) when available.
-- The HNSW index is only created when the vector extension exists.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NodeEmbedding" (
    "nodeId"    TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "model"     TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodeEmbedding_pkey" PRIMARY KEY ("nodeId")
);
DO $$ BEGIN
  ALTER TABLE "NodeEmbedding" ADD CONSTRAINT "NodeEmbedding_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Upgrade embedding column to native vector type and create HNSW index
-- only when pgvector is installed. Fails silently otherwise.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE 'ALTER TABLE "NodeEmbedding" ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "NodeEmbedding_embedding_hnsw_idx"
             ON "NodeEmbedding" USING hnsw ("embedding" vector_cosine_ops)
             WITH (m = 16, ef_construction = 128)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not upgrade NodeEmbedding to vector type: %', SQLERRM;
END;
$$;

CREATE TABLE IF NOT EXISTS "SourceEmbedding" (
    "sourceId"  TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "model"     TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceEmbedding_pkey" PRIMARY KEY ("sourceId")
);
DO $$ BEGIN
  ALTER TABLE "SourceEmbedding" ADD CONSTRAINT "SourceEmbedding_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    EXECUTE 'ALTER TABLE "SourceEmbedding" ALTER COLUMN "embedding" TYPE vector(1536) USING "embedding"::vector';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "SourceEmbedding_embedding_hnsw_idx"
             ON "SourceEmbedding" USING hnsw ("embedding" vector_cosine_ops)
             WITH (m = 16, ef_construction = 128)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not upgrade SourceEmbedding to vector type: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADJACENCY CACHE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "AdjacencyCache" (
    "nodeId"   TEXT NOT NULL,
    "hop1"     JSONB NOT NULL,
    "hop2"     JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdjacencyCache_pkey" PRIMARY KEY ("nodeId")
);
DO $$ BEGIN
  ALTER TABLE "AdjacencyCache" ADD CONSTRAINT "AdjacencyCache_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- INGESTION JOB QUEUE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "IngestionJob" (
    "id"          TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "targetId"    TEXT NOT NULL,
    "priority"    INTEGER NOT NULL DEFAULT 50,
    "status"      TEXT NOT NULL DEFAULT 'pending',
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "lastError"   TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    CONSTRAINT "IngestionJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IngestionJob_status_priority_idx" ON "IngestionJob"("status", "priority" DESC);
CREATE INDEX IF NOT EXISTS "IngestionJob_type_status_idx"     ON "IngestionJob"("type", "status");
CREATE INDEX IF NOT EXISTS "IngestionJob_targetId_idx"        ON "IngestionJob"("targetId");

-- ─────────────────────────────────────────────────────────────────────────────
-- USER PROGRESS JUNCTION TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "NodeExploration" (
    "userId"     TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "exploredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xpAwarded"  INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "NodeExploration_pkey" PRIMARY KEY ("userId", "nodeId")
);
CREATE INDEX IF NOT EXISTS "NodeExploration_userId_idx"     ON "NodeExploration"("userId");
CREATE INDEX IF NOT EXISTS "NodeExploration_nodeId_idx"     ON "NodeExploration"("nodeId");
CREATE INDEX IF NOT EXISTS "NodeExploration_exploredAt_idx" ON "NodeExploration"("exploredAt");
DO $$ BEGIN
  ALTER TABLE "NodeExploration" ADD CONSTRAINT "NodeExploration_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ConnectionDiscovery" (
    "userId"       TEXT NOT NULL,
    "fromNodeId"   TEXT NOT NULL,
    "toNodeId"     TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConnectionDiscovery_pkey" PRIMARY KEY ("userId", "fromNodeId", "toNodeId")
);
CREATE INDEX IF NOT EXISTS "ConnectionDiscovery_userId_idx"       ON "ConnectionDiscovery"("userId");
CREATE INDEX IF NOT EXISTS "ConnectionDiscovery_discoveredAt_idx" ON "ConnectionDiscovery"("discoveredAt");
DO $$ BEGIN
  ALTER TABLE "ConnectionDiscovery" ADD CONSTRAINT "ConnectionDiscovery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserAchievement" (
    "userId"        TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xpAwarded"     INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId", "achievementId")
);
CREATE INDEX IF NOT EXISTS "UserAchievement_userId_idx" ON "UserAchievement"("userId");
DO $$ BEGIN
  ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCE LINK — add FK columns alongside legacy string-target columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "SourceLink" ADD COLUMN IF NOT EXISTS "nodeId"      TEXT;
ALTER TABLE "SourceLink" ADD COLUMN IF NOT EXISTS "edgeId"      TEXT;
ALTER TABLE "SourceLink" ADD COLUMN IF NOT EXISTS "claimId"     TEXT;
ALTER TABLE "SourceLink" ADD COLUMN IF NOT EXISTS "criticismId" TEXT;

DO $$ BEGIN
  ALTER TABLE "SourceLink" ALTER COLUMN "targetType" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SourceLink" ALTER COLUMN "targetId" DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "SourceLink_nodeId_idx"      ON "SourceLink"("nodeId");
CREATE INDEX IF NOT EXISTS "SourceLink_edgeId_idx"      ON "SourceLink"("edgeId");
CREATE INDEX IF NOT EXISTS "SourceLink_claimId_idx"     ON "SourceLink"("claimId");
CREATE INDEX IF NOT EXISTS "SourceLink_criticismId_idx" ON "SourceLink"("criticismId");

DO $$ BEGIN
  ALTER TABLE "SourceLink" ADD CONSTRAINT "SourceLink_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SourceLink" ADD CONSTRAINT "SourceLink_edgeId_fkey"
    FOREIGN KEY ("edgeId") REFERENCES "Edge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SourceLink" ADD CONSTRAINT "SourceLink_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SourceLink" ADD CONSTRAINT "SourceLink_criticismId_fkey"
    FOREIGN KEY ("criticismId") REFERENCES "Criticism"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Source_credibilityScore_idx" ON "Source"("credibilityScore");

-- ─────────────────────────────────────────────────────────────────────────────
-- BFS TRAVERSAL FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION graph_bfs(
    start_id  TEXT,
    max_depth INTEGER DEFAULT 2
)
RETURNS TABLE (
    node_id          TEXT,
    depth            INTEGER,
    via_edge_id      TEXT,
    path             TEXT[],
    cumulative_score DOUBLE PRECISION
) AS $$
WITH RECURSIVE traversal AS (
    SELECT
        start_id::TEXT                AS node_id,
        NULL::TEXT                    AS via_edge_id,
        0                             AS depth,
        ARRAY[start_id::TEXT]         AS path,
        0.0::DOUBLE PRECISION         AS cumulative_score
    UNION ALL
    SELECT
        CASE WHEN e."fromId" = t.node_id THEN e."toId" ELSE e."fromId" END,
        e."id",
        t.depth + 1,
        t.path || CASE WHEN e."fromId" = t.node_id THEN e."toId" ELSE e."fromId" END,
        t.cumulative_score + e."confidenceScore"
    FROM traversal t
    JOIN "Edge" e
        ON (e."fromId" = t.node_id OR e."toId" = t.node_id)
        AND e."status" = 'published'
    WHERE
        t.depth < max_depth
        AND NOT (
            CASE WHEN e."fromId" = t.node_id THEN e."toId" ELSE e."fromId" END
            = ANY(t.path)
        )
)
SELECT DISTINCT ON (node_id)
    node_id, depth, via_edge_id, path, cumulative_score
FROM traversal
WHERE depth > 0
ORDER BY node_id, depth ASC, cumulative_score DESC
$$ LANGUAGE sql STABLE;
