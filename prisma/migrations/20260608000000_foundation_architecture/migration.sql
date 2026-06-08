-- Foundation Architecture Migration
-- Adds: graph DB tables, taxonomy, vector embeddings, adjacency cache,
--       ingestion job queue, user progress junction tables, tsvector search,
--       pg_trgm fuzzy search, pgvector semantic search.

-- ─────────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─────────────────────────────────────────────────────────────────────────────
-- TAXONOMY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Category" (
    "id"          TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "color"       TEXT,
    "parentId"    TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

ALTER TABLE "Category"
    ADD CONSTRAINT "Category_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- NODE  (graduated from static TS bundle)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Node" (
    "id"              TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "categoryId"      TEXT NOT NULL,
    "description"     TEXT NOT NULL,
    "mainstreamView"  TEXT,
    "evidenceLevel"   TEXT NOT NULL DEFAULT 'speculative',
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "color"           TEXT,
    "icon"            TEXT,

    -- Geography
    "lat"             DOUBLE PRECISION,
    "lon"             DOUBLE PRECISION,
    "region"          TEXT,
    "country"         TEXT,

    -- Temporal
    "year"            INTEGER,
    "dateStart"       INTEGER,
    "dateEnd"         INTEGER,
    "datePrecision"   TEXT,

    -- Lifecycle
    "status"          TEXT NOT NULL DEFAULT 'draft',
    "version"         INTEGER NOT NULL DEFAULT 1,
    "publishedAt"     TIMESTAMP(3),
    "createdBy"       TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Full-text search vector (maintained by trigger below)
    "search_vector"   tsvector,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Node_categoryId_idx"        ON "Node"("categoryId");
CREATE INDEX "Node_status_idx"            ON "Node"("status");
CREATE INDEX "Node_evidenceLevel_idx"     ON "Node"("evidenceLevel");
CREATE INDEX "Node_confidenceScore_idx"   ON "Node"("confidenceScore");
CREATE INDEX "Node_geo_idx"               ON "Node"("lat", "lon");
CREATE INDEX "Node_year_idx"              ON "Node"("year");
CREATE INDEX "Node_dateRange_idx"         ON "Node"("dateStart", "dateEnd");
CREATE INDEX "Node_createdAt_idx"         ON "Node"("createdAt");

-- GIN index for full-text search
CREATE INDEX "Node_search_vector_idx" ON "Node" USING GIN("search_vector");

-- GIN index for trigram fuzzy search on title
CREATE INDEX "Node_title_trgm_idx" ON "Node" USING GIN("title" gin_trgm_ops);

-- Trigger: keep search_vector in sync with content changes
CREATE OR REPLACE FUNCTION node_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW."search_vector" :=
        setweight(to_tsvector('english', unaccent(coalesce(NEW."title", ''))),         'A') ||
        setweight(to_tsvector('english', unaccent(coalesce(NEW."evidenceLevel", ''))), 'B') ||
        setweight(to_tsvector('english', unaccent(coalesce(NEW."description", ''))),   'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Node_search_vector_trigger"
    BEFORE INSERT OR UPDATE OF "title", "evidenceLevel", "description"
    ON "Node"
    FOR EACH ROW EXECUTE FUNCTION node_search_vector_update();

ALTER TABLE "Node"
    ADD CONSTRAINT "Node_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- NODE TAGS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "NodeTag" (
    "nodeId" TEXT NOT NULL,
    "tag"    TEXT NOT NULL,

    CONSTRAINT "NodeTag_pkey" PRIMARY KEY ("nodeId", "tag")
);

CREATE INDEX "NodeTag_tag_idx" ON "NodeTag"("tag");

-- GIN index for trigram fuzzy search on tags
CREATE INDEX "NodeTag_tag_trgm_idx" ON "NodeTag" USING GIN("tag" gin_trgm_ops);

ALTER TABLE "NodeTag"
    ADD CONSTRAINT "NodeTag_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- EDGE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Edge" (
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

CREATE UNIQUE INDEX "Edge_fromId_toId_key"        ON "Edge"("fromId", "toId");
CREATE INDEX "Edge_fromId_idx"                    ON "Edge"("fromId");
CREATE INDEX "Edge_toId_idx"                      ON "Edge"("toId");
CREATE INDEX "Edge_relationshipType_idx"          ON "Edge"("relationshipType");
CREATE INDEX "Edge_confidenceScore_idx"           ON "Edge"("confidenceScore");
CREATE INDEX "Edge_status_idx"                    ON "Edge"("status");

ALTER TABLE "Edge"
    ADD CONSTRAINT "Edge_fromId_fkey"
    FOREIGN KEY ("fromId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Edge"
    ADD CONSTRAINT "Edge_toId_fkey"
    FOREIGN KEY ("toId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLAIMS / CRITICISMS / OPEN QUESTIONS  (first-class rows with stable IDs)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "Claim" (
    "id"         TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "text"       TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Claim_nodeId_idx" ON "Claim"("nodeId");

ALTER TABLE "Claim"
    ADD CONSTRAINT "Claim_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Criticism" (
    "id"         TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "text"       TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Criticism_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Criticism_nodeId_idx" ON "Criticism"("nodeId");

ALTER TABLE "Criticism"
    ADD CONSTRAINT "Criticism_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OpenQuestion" (
    "id"         TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "text"       TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OpenQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpenQuestion_nodeId_idx" ON "OpenQuestion"("nodeId");

ALTER TABLE "OpenQuestion"
    ADD CONSTRAINT "OpenQuestion_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- NODE VERSIONS  (full audit trail)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "NodeVersion" (
    "id"         TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "version"    INTEGER NOT NULL,
    "snapshot"   JSONB NOT NULL,
    "changedBy"  TEXT,
    "changeNote" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NodeVersion_nodeId_version_key" ON "NodeVersion"("nodeId", "version");
CREATE INDEX "NodeVersion_nodeId_idx" ON "NodeVersion"("nodeId");

ALTER TABLE "NodeVersion"
    ADD CONSTRAINT "NodeVersion_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- VECTOR EMBEDDINGS
-- ─────────────────────────────────────────────────────────────────────────────

-- Store as native vector(1536) type for pgvector ANN index support.
-- Prisma writes via Float[] + ::vector cast in raw SQL.

CREATE TABLE "NodeEmbedding" (
    "nodeId"    TEXT NOT NULL,
    "embedding" vector(1536),
    "model"     TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeEmbedding_pkey" PRIMARY KEY ("nodeId")
);

-- HNSW index for approximate nearest neighbor search (cosine similarity)
-- ef_construction=128, m=16 are good defaults for 1536-dim embeddings
CREATE INDEX "NodeEmbedding_embedding_hnsw_idx"
    ON "NodeEmbedding"
    USING hnsw ("embedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

ALTER TABLE "NodeEmbedding"
    ADD CONSTRAINT "NodeEmbedding_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SourceEmbedding" (
    "sourceId"  TEXT NOT NULL,
    "embedding" vector(1536),
    "model"     TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceEmbedding_pkey" PRIMARY KEY ("sourceId")
);

CREATE INDEX "SourceEmbedding_embedding_hnsw_idx"
    ON "SourceEmbedding"
    USING hnsw ("embedding" vector_cosine_ops)
    WITH (m = 16, ef_construction = 128);

ALTER TABLE "SourceEmbedding"
    ADD CONSTRAINT "SourceEmbedding_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- ADJACENCY CACHE  (materialized 1–2 hop neighborhoods)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "AdjacencyCache" (
    "nodeId"   TEXT NOT NULL,
    "hop1"     JSONB NOT NULL,
    "hop2"     JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdjacencyCache_pkey" PRIMARY KEY ("nodeId")
);

ALTER TABLE "AdjacencyCache"
    ADD CONSTRAINT "AdjacencyCache_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- INGESTION JOB QUEUE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "IngestionJob" (
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

-- Composite index on (status, priority DESC) for queue polling:
-- SELECT ... WHERE status = 'pending' ORDER BY priority DESC LIMIT N
CREATE INDEX "IngestionJob_status_priority_idx" ON "IngestionJob"("status", "priority" DESC);
CREATE INDEX "IngestionJob_type_status_idx"     ON "IngestionJob"("type", "status");
CREATE INDEX "IngestionJob_targetId_idx"        ON "IngestionJob"("targetId");

-- ─────────────────────────────────────────────────────────────────────────────
-- USER PROGRESS JUNCTION TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "NodeExploration" (
    "userId"     TEXT NOT NULL,
    "nodeId"     TEXT NOT NULL,
    "exploredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xpAwarded"  INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "NodeExploration_pkey" PRIMARY KEY ("userId", "nodeId")
);

CREATE INDEX "NodeExploration_userId_idx"     ON "NodeExploration"("userId");
CREATE INDEX "NodeExploration_nodeId_idx"     ON "NodeExploration"("nodeId");
CREATE INDEX "NodeExploration_exploredAt_idx" ON "NodeExploration"("exploredAt");

ALTER TABLE "NodeExploration"
    ADD CONSTRAINT "NodeExploration_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ConnectionDiscovery" (
    "userId"       TEXT NOT NULL,
    "fromNodeId"   TEXT NOT NULL,
    "toNodeId"     TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectionDiscovery_pkey" PRIMARY KEY ("userId", "fromNodeId", "toNodeId")
);

CREATE INDEX "ConnectionDiscovery_userId_idx"       ON "ConnectionDiscovery"("userId");
CREATE INDEX "ConnectionDiscovery_discoveredAt_idx" ON "ConnectionDiscovery"("discoveredAt");

ALTER TABLE "ConnectionDiscovery"
    ADD CONSTRAINT "ConnectionDiscovery_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserAchievement" (
    "userId"        TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xpAwarded"     INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId", "achievementId")
);

CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

ALTER TABLE "UserAchievement"
    ADD CONSTRAINT "UserAchievement_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCE LINK — add new FK columns alongside legacy string-target columns
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "SourceLink"
    ADD COLUMN IF NOT EXISTS "nodeId"      TEXT,
    ADD COLUMN IF NOT EXISTS "edgeId"      TEXT,
    ADD COLUMN IF NOT EXISTS "claimId"     TEXT,
    ADD COLUMN IF NOT EXISTS "criticismId" TEXT;

-- Make old columns nullable (they were NOT NULL implicitly; new rows may use FK path)
ALTER TABLE "SourceLink"
    ALTER COLUMN "targetType" DROP NOT NULL,
    ALTER COLUMN "targetId"   DROP NOT NULL;

CREATE INDEX "SourceLink_nodeId_idx"       ON "SourceLink"("nodeId");
CREATE INDEX "SourceLink_edgeId_idx"       ON "SourceLink"("edgeId");
CREATE INDEX "SourceLink_claimId_idx"      ON "SourceLink"("claimId");
CREATE INDEX "SourceLink_criticismId_idx"  ON "SourceLink"("criticismId");

ALTER TABLE "SourceLink"
    ADD CONSTRAINT "SourceLink_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SourceLink"
    ADD CONSTRAINT "SourceLink_edgeId_fkey"
    FOREIGN KEY ("edgeId") REFERENCES "Edge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SourceLink"
    ADD CONSTRAINT "SourceLink_claimId_fkey"
    FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SourceLink"
    ADD CONSTRAINT "SourceLink_criticismId_fkey"
    FOREIGN KEY ("criticismId") REFERENCES "Criticism"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- SOURCE — add credibilityScore index (needed for ingestion queue priority)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "Source_credibilityScore_idx" ON "Source"("credibilityScore");

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTION: BFS traversal via recursive CTE
-- Called by retrieval layer for rabbit hole and related node queries.
-- Returns all nodes reachable from start_id within max_depth hops,
-- along with the path taken and cumulative confidence score.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION graph_bfs(
    start_id  TEXT,
    max_depth INTEGER DEFAULT 2
)
RETURNS TABLE (
    node_id         TEXT,
    depth           INTEGER,
    via_edge_id     TEXT,
    path            TEXT[],
    cumulative_score DOUBLE PRECISION
) AS $$
WITH RECURSIVE traversal AS (
    -- Base: the start node
    SELECT
        start_id                         AS node_id,
        NULL::TEXT                       AS via_edge_id,
        0                                AS depth,
        ARRAY[start_id]                  AS path,
        0.0::DOUBLE PRECISION            AS cumulative_score

    UNION ALL

    -- Recursive: hop to neighbors through published edges
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
    node_id,
    depth,
    via_edge_id,
    path,
    cumulative_score
FROM traversal
WHERE depth > 0
ORDER BY node_id, depth ASC, cumulative_score DESC
$$ LANGUAGE sql STABLE;
