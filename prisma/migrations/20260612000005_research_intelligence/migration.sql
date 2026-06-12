-- DiscoveredSource: staging area for autonomously found sources
CREATE TABLE "DiscoveredSource" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "author" TEXT,
    "publicationYear" INTEGER,
    "journal" TEXT,
    "doi" TEXT,
    "abstract" TEXT,
    "domain" TEXT NOT NULL,
    "discoveryApi" TEXT NOT NULL,
    "discoveryQuery" TEXT,
    "rawMetadata" JSONB,
    "credibilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "credibilityClass" TEXT NOT NULL DEFAULT 'uncertain',
    "autoApprove" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "promotedSourceId" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveredSource_pkey" PRIMARY KEY ("id")
);

-- SourceDomainReputation: domain trust tracking
CREATE TABLE "SourceDomainReputation" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "country" TEXT,
    "institutionType" TEXT,
    "reputationScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "status" TEXT NOT NULL DEFAULT 'normal',
    "approvalCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceDomainReputation_pkey" PRIMARY KEY ("id")
);

-- DiscoveryRun: audit trail of every discovery run
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "targetNodeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "nodesChecked" INTEGER NOT NULL DEFAULT 0,
    "sourcesFound" INTEGER NOT NULL DEFAULT 0,
    "autoApproved" INTEGER NOT NULL DEFAULT 0,
    "pendingReview" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "aiCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- ResearchMaturityScore: cached maturity scores
CREATE TABLE "ResearchMaturityScore" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "sourceDiversity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "criticismCount" INTEGER NOT NULL DEFAULT 0,
    "openQuestions" INTEGER NOT NULL DEFAULT 0,
    "hasMainstream" BOOLEAN NOT NULL DEFAULT false,
    "edgeCount" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchMaturityScore_pkey" PRIMARY KEY ("id")
);

-- AiBudget: daily/monthly cost tracking
CREATE TABLE "AiBudget" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dailyLimitUsd" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "monthlyLimitUsd" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
    "emergencyStop" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiBudget_pkey" PRIMARY KEY ("id")
);

-- NewsItem: Intel Feed articles
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageUrl" TEXT,

    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "DiscoveredSource_nodeId_url_key" ON "DiscoveredSource"("nodeId", "url");
CREATE UNIQUE INDEX "SourceDomainReputation_domain_key" ON "SourceDomainReputation"("domain");
CREATE UNIQUE INDEX "ResearchMaturityScore_entityType_entityId_key" ON "ResearchMaturityScore"("entityType", "entityId");
CREATE UNIQUE INDEX "AiBudget_period_periodType_key" ON "AiBudget"("period", "periodType");
CREATE UNIQUE INDEX "NewsItem_url_key" ON "NewsItem"("url");

-- Indexes
CREATE INDEX "DiscoveredSource_nodeId_idx" ON "DiscoveredSource"("nodeId");
CREATE INDEX "DiscoveredSource_status_idx" ON "DiscoveredSource"("status");
CREATE INDEX "DiscoveredSource_credibilityScore_idx" ON "DiscoveredSource"("credibilityScore" DESC);
CREATE INDEX "DiscoveredSource_fetchedAt_idx" ON "DiscoveredSource"("fetchedAt" DESC);
CREATE INDEX "SourceDomainReputation_status_idx" ON "SourceDomainReputation"("status");
CREATE INDEX "SourceDomainReputation_reputationScore_idx" ON "SourceDomainReputation"("reputationScore" DESC);
CREATE INDEX "DiscoveryRun_status_idx" ON "DiscoveryRun"("status");
CREATE INDEX "DiscoveryRun_startedAt_idx" ON "DiscoveryRun"("startedAt" DESC);
CREATE INDEX "ResearchMaturityScore_entityType_score_idx" ON "ResearchMaturityScore"("entityType", "score" DESC);
CREATE INDEX "AiBudget_period_idx" ON "AiBudget"("period");
CREATE INDEX "NewsItem_publishedAt_idx" ON "NewsItem"("publishedAt" DESC);
CREATE INDEX "NewsItem_category_idx" ON "NewsItem"("category");
CREATE INDEX "NewsItem_fetchedAt_idx" ON "NewsItem"("fetchedAt");

-- Foreign key: DiscoveredSource → Node
ALTER TABLE "DiscoveredSource" ADD CONSTRAINT "DiscoveredSource_nodeId_fkey"
    FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
