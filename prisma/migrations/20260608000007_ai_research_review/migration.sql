-- AI Deep Research Review table

CREATE TABLE "AiResearchReview" (
  "id"            TEXT            NOT NULL,
  "nodeId"        TEXT            NOT NULL,
  "model"         TEXT            NOT NULL,
  "promptVersion" TEXT            NOT NULL,
  "reviewJson"    JSONB           NOT NULL,
  "inputTokens"   INTEGER         NOT NULL DEFAULT 0,
  "outputTokens"  INTEGER         NOT NULL DEFAULT 0,
  "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy"     TEXT,

  CONSTRAINT "AiResearchReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiResearchReview_nodeId_idx"    ON "AiResearchReview"("nodeId");
CREATE INDEX "AiResearchReview_createdAt_idx" ON "AiResearchReview"("createdAt");
CREATE INDEX "AiResearchReview_createdBy_idx" ON "AiResearchReview"("createdBy");

ALTER TABLE "AiResearchReview"
  ADD CONSTRAINT "AiResearchReview_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiResearchReview"
  ADD CONSTRAINT "AiResearchReview_createdBy_fkey"
  FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
