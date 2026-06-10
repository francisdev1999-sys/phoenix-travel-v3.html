-- ─────────────────────────────────────────────────────────────────────────────
-- Node AI Audit Migration
-- Nexus Archive — 2026-06-09
--
-- Adds two optional columns to ProposedNode for storing Claude Haiku quality
-- audit results. Both are nullable so existing rows are unaffected.
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "ProposedNode" ADD COLUMN IF NOT EXISTS "aiAuditResult" JSONB;
ALTER TABLE "ProposedNode" ADD COLUMN IF NOT EXISTS "aiAuditedAt"   TIMESTAMP(3);
