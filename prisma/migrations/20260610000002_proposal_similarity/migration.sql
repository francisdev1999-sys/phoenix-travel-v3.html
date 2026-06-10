-- Advisory similarity metadata for user-submitted nodes.
-- NEVER creates graph edges. NEVER affects approval decisions.
ALTER TABLE "ProposedNode" ADD COLUMN IF NOT EXISTS "proposalSimilarity" JSONB;
