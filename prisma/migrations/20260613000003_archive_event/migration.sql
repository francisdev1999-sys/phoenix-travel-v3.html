-- CreateTable
CREATE TABLE "ArchiveEvent" (
    "id"         TEXT NOT NULL,
    "eventType"  TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId"   TEXT NOT NULL,
    "actorEmail" TEXT,
    "metadata"   JSONB NOT NULL DEFAULT '{}',
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchiveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchiveEvent_entityType_entityId_idx" ON "ArchiveEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ArchiveEvent_eventType_createdAt_idx" ON "ArchiveEvent"("eventType", "createdAt");
