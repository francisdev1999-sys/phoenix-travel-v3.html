-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: governance_system
-- Adds: trust/activity/ban fields to User, UserPermission, UserTrustEvent,
--       UserActivityLog, Badge, UserBadge, Report, ModerationAction, PlatformMetric
-- ─────────────────────────────────────────────────────────────────────────────

-- Add new columns to User
ALTER TABLE "User"
  ADD COLUMN "lastActiveAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "trustScore"     DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "activityScore"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "rank"           TEXT NOT NULL DEFAULT 'New Seeker',
  ADD COLUMN "isBanned"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "banReason"      TEXT,
  ADD COLUMN "banExpiresAt"   TIMESTAMP(3),
  ADD COLUMN "warningCount"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "submissionCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "approvedCount"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "rejectedCount"  INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "User_trustScore_idx"   ON "User"("trustScore");
CREATE INDEX "User_isBanned_idx"     ON "User"("isBanned");
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- UserPermission (one row per user, upserted on first use)
CREATE TABLE "UserPermission" (
  "userId"                  TEXT    NOT NULL,
  "canApproveSources"       BOOLEAN NOT NULL DEFAULT false,
  "canApproveRelationships" BOOLEAN NOT NULL DEFAULT false,
  "canApproveNodes"         BOOLEAN NOT NULL DEFAULT false,
  "canPublishNodes"         BOOLEAN NOT NULL DEFAULT false,
  "canAssignRoles"          BOOLEAN NOT NULL DEFAULT false,
  "canBanUsers"             BOOLEAN NOT NULL DEFAULT false,
  "canRunAiReview"          BOOLEAN NOT NULL DEFAULT false,
  "canViewPlatformHealth"   BOOLEAN NOT NULL DEFAULT false,
  "canViewTraffic"          BOOLEAN NOT NULL DEFAULT false,
  "canViewCosts"            BOOLEAN NOT NULL DEFAULT false,
  "canViewSecurityLogs"     BOOLEAN NOT NULL DEFAULT false,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy"               TEXT,
  CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "UserPermission"
  ADD CONSTRAINT "UserPermission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserTrustEvent
CREATE TABLE "UserTrustEvent" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "delta"     DOUBLE PRECISION NOT NULL,
  "reason"    TEXT NOT NULL,
  "detail"    TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserTrustEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserTrustEvent_userId_idx"    ON "UserTrustEvent"("userId");
CREATE INDEX "UserTrustEvent_createdAt_idx" ON "UserTrustEvent"("createdAt");
ALTER TABLE "UserTrustEvent"
  ADD CONSTRAINT "UserTrustEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UserActivityLog
CREATE TABLE "UserActivityLog" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "detail"     JSONB,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserActivityLog_userId_idx"     ON "UserActivityLog"("userId");
CREATE INDEX "UserActivityLog_actionType_idx" ON "UserActivityLog"("actionType");
CREATE INDEX "UserActivityLog_createdAt_idx"  ON "UserActivityLog"("createdAt");
ALTER TABLE "UserActivityLog"
  ADD CONSTRAINT "UserActivityLog_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Badge catalog
CREATE TABLE "Badge" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "icon"        TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- UserBadge junction
CREATE TABLE "UserBadge" (
  "userId"    TEXT NOT NULL,
  "badgeId"   TEXT NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "awardedBy" TEXT,
  CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("userId", "badgeId")
);
CREATE INDEX "UserBadge_userId_idx"  ON "UserBadge"("userId");
CREATE INDEX "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");
ALTER TABLE "UserBadge"
  ADD CONSTRAINT "UserBadge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserBadge"
  ADD CONSTRAINT "UserBadge_badgeId_fkey"
  FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Report
CREATE TABLE "Report" (
  "id"             TEXT NOT NULL,
  "submittedBy"    TEXT NOT NULL,
  "reportedUserId" TEXT,
  "entityType"     TEXT NOT NULL,
  "entityId"       TEXT NOT NULL,
  "reason"         TEXT NOT NULL,
  "detail"         TEXT,
  "status"         TEXT NOT NULL DEFAULT 'open',
  "resolvedBy"     TEXT,
  "resolvedAt"     TIMESTAMP(3),
  "resolveNote"    TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Report_status_idx"              ON "Report"("status");
CREATE INDEX "Report_submittedBy_idx"         ON "Report"("submittedBy");
CREATE INDEX "Report_entityType_entityId_idx" ON "Report"("entityType", "entityId");
CREATE INDEX "Report_createdAt_idx"           ON "Report"("createdAt");
ALTER TABLE "Report"
  ADD CONSTRAINT "Report_submittedBy_fkey"
  FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report"
  ADD CONSTRAINT "Report_reportedUserId_fkey"
  FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ModerationAction
CREATE TABLE "ModerationAction" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "moderatorId" TEXT NOT NULL,
  "actionType"  TEXT NOT NULL,
  "reason"      TEXT NOT NULL,
  "detail"      JSONB,
  "expiresAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModerationAction_userId_idx"      ON "ModerationAction"("userId");
CREATE INDEX "ModerationAction_moderatorId_idx" ON "ModerationAction"("moderatorId");
CREATE INDEX "ModerationAction_actionType_idx"  ON "ModerationAction"("actionType");
CREATE INDEX "ModerationAction_createdAt_idx"   ON "ModerationAction"("createdAt");
ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModerationAction"
  ADD CONSTRAINT "ModerationAction_moderatorId_fkey"
  FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PlatformMetric
CREATE TABLE "PlatformMetric" (
  "id"          TEXT NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "metricName"  TEXT NOT NULL,
  "metricValue" DOUBLE PRECISION NOT NULL,
  "metricMeta"  JSONB,
  CONSTRAINT "PlatformMetric_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlatformMetric_date_metricName_key" ON "PlatformMetric"("date", "metricName");
CREATE INDEX "PlatformMetric_date_idx"       ON "PlatformMetric"("date");
CREATE INDEX "PlatformMetric_metricName_idx" ON "PlatformMetric"("metricName");

-- Seed badge catalog
INSERT INTO "Badge" ("id", "name", "description", "icon", "category") VALUES
  ('founding-member',      'Founding Member',               'Joined during the founding period of Nexus Archive',             '🏛️',  'membership'),
  ('streak-7',             '7 Day Streak',                  'Logged in for 7 consecutive days',                              '🔥',  'activity'),
  ('streak-30',            '30 Day Streak',                 'Logged in for 30 consecutive days',                             '⚡',  'activity'),
  ('streak-100',           '100 Day Veteran',               'Logged in for 100 consecutive days',                            '💎',  'activity'),
  ('one-year',             'One Year Member',               'Active member for over one year',                               '🎂',  'membership'),
  ('source-hunter',        'Source Hunter',                 'Submitted 5 or more approved sources',                          '🔍',  'contribution'),
  ('evidence-builder',     'Evidence Builder',              'Submitted 3 or more approved nodes',                            '📋',  'contribution'),
  ('graph-connector',      'Graph Connector',               'Had 5 or more relationships approved',                          '🕸️',  'contribution'),
  ('critical-thinker',     'Critical Thinker',              'Added substantive criticisms to 3 or more nodes',               '🧠',  'contribution'),
  ('reliable-contributor', 'Reliable Contributor',          'Maintained <10% rejection rate with 10+ submissions',           '✅',  'contribution'),
  ('trusted-researcher',   'Trusted Researcher',            'Reached trust score of 80 or above',                            '🛡️',  'contribution'),
  ('ancient-specialist',   'Ancient Civilizations Specialist', 'Contributed 5+ nodes in the ancient civilizations category', '🏺',  'specialty'),
  ('mythology-specialist', 'Mythology Specialist',          'Contributed 5+ nodes in the mythology category',                '📜',  'specialty'),
  ('uap-researcher',       'UAP Researcher',                'Contributed 5+ nodes in the UAP/UFO category',                  '🛸',  'specialty'),
  ('archaeology-contributor', 'Archaeology Contributor',    'Contributed 5+ nodes in the archaeology category',              '⛏️',  'specialty'),
  ('timeline-mapper',      'Timeline Mapper',               'Created 5+ chronological relationship connections',              '📅',  'specialty'),
  ('source-verifier',      'Source Verifier',               'Awarded the Source Verifier role',                               '🔬',  'authority'),
  ('reviewer',             'Reviewer',                      'Awarded the Reviewer role',                                      '⚖️',  'authority'),
  ('admin',                'Admin',                         'Awarded administrator status',                                   '🛡️',  'authority');
