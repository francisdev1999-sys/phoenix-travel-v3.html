-- Add AI audit columns to ProposedNode (idempotent)
ALTER TABLE "ProposedNode" ADD COLUMN IF NOT EXISTS "aiAuditResult" JSONB;
ALTER TABLE "ProposedNode" ADD COLUMN IF NOT EXISTS "aiAuditedAt"   TIMESTAMP(3);
