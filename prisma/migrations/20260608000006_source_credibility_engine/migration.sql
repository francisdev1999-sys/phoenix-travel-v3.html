-- Source credibility engine: override fields + per-link relevance score

-- Source: admin credibility override
ALTER TABLE "Source" ADD COLUMN "credibilityOverride" DOUBLE PRECISION;
ALTER TABLE "Source" ADD COLUMN "overriddenBy"        TEXT;
ALTER TABLE "Source" ADD COLUMN "overrideReason"      TEXT;

-- SourceLink: per-link relevance score
ALTER TABLE "SourceLink" ADD COLUMN "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
