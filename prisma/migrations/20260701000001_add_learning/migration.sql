-- CreateTable
CREATE TABLE "LearningModel" (
    "id"            TEXT NOT NULL,
    "kind"          TEXT NOT NULL DEFAULT 'node_promotion',
    "version"       INTEGER NOT NULL DEFAULT 1,
    "active"        BOOLEAN NOT NULL DEFAULT true,
    "features"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "weights"       DOUBLE PRECISION[] NOT NULL DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "bias"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "learningRate"  DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "exampleCount"  INTEGER NOT NULL DEFAULT 0,
    "positiveCount" INTEGER NOT NULL DEFAULT 0,
    "negativeCount" INTEGER NOT NULL DEFAULT 0,
    "accuracy"      DOUBLE PRECISION,
    "precision"     DOUBLE PRECISION,
    "recall"        DOUBLE PRECISION,
    "auc"           DOUBLE PRECISION,
    "trainedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningModel_kind_active_idx" ON "LearningModel"("kind", "active");

-- CreateIndex
CREATE INDEX "LearningModel_kind_version_idx" ON "LearningModel"("kind", "version");

-- CreateTable
CREATE TABLE "LearningPrediction" (
    "id"         TEXT NOT NULL,
    "kind"       TEXT NOT NULL DEFAULT 'node_promotion',
    "modelId"    TEXT,
    "entityType" TEXT NOT NULL DEFAULT 'discovered_node',
    "entityId"   TEXT NOT NULL,
    "score"      DOUBLE PRECISION NOT NULL,
    "decision"   TEXT NOT NULL,
    "outcome"    TEXT NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearningPrediction_kind_outcome_idx" ON "LearningPrediction"("kind", "outcome");

-- CreateIndex
CREATE INDEX "LearningPrediction_entityType_entityId_idx" ON "LearningPrediction"("entityType", "entityId");
