-- Tier 0: DB-level CHECK constraints for data integrity
-- These enforce the same enum/bounds rules applied at the API layer,
-- so that direct DB writes, seed scripts, and future ingestion paths
-- cannot introduce structurally invalid data.

-- ── Node: evidence level ─────────────────────────────────────────────────────
ALTER TABLE "Node"
  ADD CONSTRAINT "node_evidence_level_check"
  CHECK ("evidenceLevel" IN (
    'verified', 'strong_evidence', 'debated', 'speculative', 'mythological'
  ));

-- ── Node: confidence score bounds ────────────────────────────────────────────
ALTER TABLE "Node"
  ADD CONSTRAINT "node_confidence_score_bounds"
  CHECK ("confidenceScore" >= 0 AND "confidenceScore" <= 1);

-- ── Node: coordinate bounds ──────────────────────────────────────────────────
ALTER TABLE "Node"
  ADD CONSTRAINT "node_lat_bounds"
  CHECK ("lat" IS NULL OR ("lat" >= -90 AND "lat" <= 90));

ALTER TABLE "Node"
  ADD CONSTRAINT "node_lon_bounds"
  CHECK ("lon" IS NULL OR ("lon" >= -180 AND "lon" <= 180));

-- ── Node: date ordering ──────────────────────────────────────────────────────
ALTER TABLE "Node"
  ADD CONSTRAINT "node_date_ordering"
  CHECK (
    "dateStart" IS NULL
    OR "dateEnd" IS NULL
    OR "dateStart" <= "dateEnd"
  );

-- ── Edge: relationship type ──────────────────────────────────────────────────
ALTER TABLE "Edge"
  ADD CONSTRAINT "edge_relationship_type_check"
  CHECK ("relationshipType" IN (
    'historical', 'geographical', 'textual', 'thematic', 'influence', 'contradictory'
  ));

-- ── Edge: confidence score bounds ────────────────────────────────────────────
ALTER TABLE "Edge"
  ADD CONSTRAINT "edge_confidence_score_bounds"
  CHECK ("confidenceScore" >= 0 AND "confidenceScore" <= 1);

-- ── Edge: strength score bounds ──────────────────────────────────────────────
ALTER TABLE "Edge"
  ADD CONSTRAINT "edge_strength_score_bounds"
  CHECK ("strengthScore" >= 0 AND "strengthScore" <= 1);

-- ── Edge: no self-links ──────────────────────────────────────────────────────
ALTER TABLE "Edge"
  ADD CONSTRAINT "edge_no_self_link"
  CHECK ("fromId" <> "toId");
