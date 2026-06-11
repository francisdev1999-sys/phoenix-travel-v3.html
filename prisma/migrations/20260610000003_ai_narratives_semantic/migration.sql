-- NodeNarrative: AI-generated exploration context, cached per node
-- Generated on demand when a user explores a node's rabbit-hole connections.
-- Never blocks reads — if absent, client receives null and renders without it.

CREATE TABLE IF NOT EXISTS "NodeNarrative" (
    "nodeId"        TEXT         NOT NULL,
    "narrative"     TEXT         NOT NULL,
    "model"         TEXT         NOT NULL,
    "promptVersion" TEXT         NOT NULL DEFAULT '1.0',
    "cachedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NodeNarrative_pkey" PRIMARY KEY ("nodeId")
);

ALTER TABLE "NodeNarrative"
    ADD CONSTRAINT "NodeNarrative_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
