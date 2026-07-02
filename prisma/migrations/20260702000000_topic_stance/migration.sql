-- CreateTable
CREATE TABLE "TopicStance" (
    "id"        TEXT NOT NULL,
    "nodeId"    TEXT NOT NULL,
    "anonId"    TEXT NOT NULL,
    "value"     INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicStance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicStance_nodeId_anonId_key" ON "TopicStance"("nodeId", "anonId");

-- CreateIndex
CREATE INDEX "TopicStance_nodeId_idx" ON "TopicStance"("nodeId");
