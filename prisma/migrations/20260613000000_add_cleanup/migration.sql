-- CreateTable
CREATE TABLE "CleanupAuditRun" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT NOT NULL,
    "candidatesScanned" INTEGER NOT NULL DEFAULT 0,
    "candidatesSentToAI" INTEGER NOT NULL DEFAULT 0,
    "keepCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "archiveCandidateCount" INTEGER NOT NULL DEFAULT 0,
    "deleteCandidateCount" INTEGER NOT NULL DEFAULT 0,
    "blacklistCandidateCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportJson" JSONB,

    CONSTRAINT "CleanupAuditRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanupFinding" (
    "id" TEXT NOT NULL,
    "auditRunId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "relevanceScore" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "risksIfKept" JSONB NOT NULL,
    "risksIfDeleted" JSONB NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CleanupFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryBlacklist" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryWhitelist" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryWhitelist_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CleanupFinding" ADD CONSTRAINT "CleanupFinding_auditRunId_fkey" FOREIGN KEY ("auditRunId") REFERENCES "CleanupAuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
