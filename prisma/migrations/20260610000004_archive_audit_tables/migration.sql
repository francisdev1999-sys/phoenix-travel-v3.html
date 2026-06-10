-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "ArchiveAuditRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggeredBy" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "ArchiveAuditRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveAuditFinding" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "nodeId" TEXT,
    "edgeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "beforeState" JSONB NOT NULL DEFAULT '{}',
    "afterState" JSONB NOT NULL DEFAULT '{}',
    "reasoning" TEXT NOT NULL,
    "autoFixable" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "applyError" TEXT,

    CONSTRAINT "ArchiveAuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchiveAuditRun_status_idx" ON "ArchiveAuditRun"("status");

-- CreateIndex
CREATE INDEX "ArchiveAuditRun_startedAt_idx" ON "ArchiveAuditRun"("startedAt" DESC);

-- CreateIndex
CREATE INDEX "ArchiveAuditFinding_runId_status_idx" ON "ArchiveAuditFinding"("runId", "status");

-- CreateIndex
CREATE INDEX "ArchiveAuditFinding_type_severity_idx" ON "ArchiveAuditFinding"("type", "severity");

-- CreateIndex
CREATE INDEX "ArchiveAuditFinding_nodeId_idx" ON "ArchiveAuditFinding"("nodeId");

-- AddForeignKey
ALTER TABLE "ArchiveAuditFinding" ADD CONSTRAINT "ArchiveAuditFinding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ArchiveAuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
