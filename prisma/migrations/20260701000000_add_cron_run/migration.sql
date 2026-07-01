-- CreateTable
CREATE TABLE "CronRun" (
    "id"          TEXT NOT NULL,
    "job"         TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'running',
    "ok"          BOOLEAN NOT NULL DEFAULT false,
    "startedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs"  INTEGER,
    "result"      JSONB,
    "error"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRun_job_startedAt_idx" ON "CronRun"("job", "startedAt");

-- CreateIndex
CREATE INDEX "CronRun_status_startedAt_idx" ON "CronRun"("status", "startedAt");
