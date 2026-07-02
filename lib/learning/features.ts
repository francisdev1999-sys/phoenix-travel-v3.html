/**
 * Feature extraction for the node-promotion learning model.
 *
 * A candidate (a DiscoveredNode) is turned into a FIXED, named numeric vector.
 * Keeping the order/length stable is what lets model weights stay meaningful
 * across nightly retrains (warm-start). All features are roughly 0..1 scaled so
 * a single learning rate behaves well and the learned weights are comparable.
 */

// Order matters and must never be reordered — weights are positional.
export const FEATURE_NAMES = [
  'relevance',
  'quality',
  'novelty',
  'confidence',
  'claims',        // normalized claim count
  'criticisms',    // normalized criticism count
  'hasSource',     // 0/1
  'descLength',    // normalized description length
  'tags',          // normalized tag count
  'ev_verified',
  'ev_strong',
  'ev_debated',
  'ev_speculative',
  'ev_mythological',
] as const;

export type FeatureName = typeof FEATURE_NAMES[number];
export const FEATURE_COUNT = FEATURE_NAMES.length;

export interface CandidateInput {
  relevanceScore:  number;
  qualityScore:    number;
  noveltyScore:    number;
  confidenceScore: number;
  evidenceLevel:   string;
  claimCount:      number;
  criticismCount:  number;
  tagCount:        number;
  descriptionLen:  number;
  hasSource:       boolean;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Produce the fixed-length feature vector for a candidate. */
export function extractFeatures(c: CandidateInput): number[] {
  const ev = (c.evidenceLevel || '').toLowerCase();
  return [
    clamp01(c.relevanceScore),
    clamp01(c.qualityScore),
    clamp01(c.noveltyScore),
    clamp01(c.confidenceScore),
    clamp01(c.claimCount / 6),
    clamp01(c.criticismCount / 4),
    c.hasSource ? 1 : 0,
    clamp01(c.descriptionLen / 1200),
    clamp01(c.tagCount / 8),
    ev === 'verified' ? 1 : 0,
    ev === 'strong_evidence' ? 1 : 0,
    ev === 'debated' ? 1 : 0,
    ev === 'speculative' ? 1 : 0,
    ev === 'mythological' ? 1 : 0,
  ];
}

/** Convenience: build a CandidateInput from a DiscoveredNode-shaped row. */
export function candidateFromDiscovered(d: {
  relevanceScore:  number;
  qualityScore:    number;
  noveltyScore:    number;
  confidenceScore: number;
  evidenceLevel:   string;
  claims:          unknown;
  criticisms:      unknown;
  tags:            unknown;
  description:     string | null;
  sourceUrl:       string | null;
}): CandidateInput {
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  return {
    relevanceScore:  d.relevanceScore,
    qualityScore:    d.qualityScore,
    noveltyScore:    d.noveltyScore,
    confidenceScore: d.confidenceScore,
    evidenceLevel:   d.evidenceLevel,
    claimCount:      len(d.claims),
    criticismCount:  len(d.criticisms),
    tagCount:        len(d.tags),
    descriptionLen:  (d.description ?? '').length,
    hasSource:       !!d.sourceUrl,
  };
}
