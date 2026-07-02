/**
 * Feature extraction for the edge/connection-quality learning model.
 *
 * Signals must be computable for BOTH a live published Edge (positives — the
 * connections the archive kept) and a RelationshipSuggestion (candidates /
 * rejected negatives), so the model learns what a strong connection looks like
 * from the existing graph itself.
 *
 * The vector is FIXED and named; order must never change (weights are positional).
 * All values are ~0..1 scaled.
 */

export const EDGE_FEATURE_NAMES = [
  'confidence',      // edge/suggestion confidence score
  'explanationLen',  // normalized explanation/reason length
  'fromDegree',      // normalized graph degree of the from-node
  'toDegree',        // normalized graph degree of the to-node
  'fromEvidence',    // from-node evidence level on a 0..1 ladder
  'toEvidence',      // to-node evidence level on a 0..1 ladder
  'sameCategory',    // 0/1 — endpoints share a category
  'rt_thematic',
  'rt_historical',
  'rt_textual',
  'rt_geographical',
  'rt_other',
] as const;

export type EdgeFeatureName = typeof EDGE_FEATURE_NAMES[number];
export const EDGE_FEATURE_COUNT = EDGE_FEATURE_NAMES.length;

export interface EdgeCandidateInput {
  confidence:       number;
  explanationLen:   number;
  fromDegree:       number;
  toDegree:         number;
  fromEvidenceLevel: string;
  toEvidenceLevel:   string;
  sameCategory:     boolean;
  relationshipType: string;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

// Evidence ladder — mirrors the platform's ordering of verifiability.
export function evidenceLadder(level: string): number {
  switch ((level || '').toLowerCase()) {
    case 'verified':        return 1;
    case 'strong_evidence': return 0.75;
    case 'debated':         return 0.5;
    case 'speculative':     return 0.25;
    case 'mythological':    return 0;
    default:                return 0.25;
  }
}

export function extractEdgeFeatures(c: EdgeCandidateInput): number[] {
  const rt = (c.relationshipType || '').toLowerCase();
  const known = ['thematic', 'historical', 'textual', 'geographical'];
  return [
    clamp01(c.confidence),
    clamp01(c.explanationLen / 400),
    clamp01(c.fromDegree / 8),
    clamp01(c.toDegree / 8),
    evidenceLadder(c.fromEvidenceLevel),
    evidenceLadder(c.toEvidenceLevel),
    c.sameCategory ? 1 : 0,
    rt === 'thematic' ? 1 : 0,
    rt === 'historical' || rt === 'factual' ? 1 : 0,
    rt === 'textual' || rt === 'source_relationship' ? 1 : 0,
    rt === 'geographical' ? 1 : 0,
    known.includes(rt) || rt === 'factual' || rt === 'source_relationship' ? 0 : 1,
  ];
}

// Shared endpoint shape loaded by dataset/scoring queries.
export interface EndpointSlice {
  evidenceLevel: string;
  categoryId:    string | null;
  _count: { edgesFrom: number; edgesTo: number };
}

export function edgeCandidateFromParts(opts: {
  confidence:       number;
  explanation:      string | null;
  relationshipType: string;
  from:             EndpointSlice;
  to:               EndpointSlice;
}): EdgeCandidateInput {
  return {
    confidence:        opts.confidence,
    explanationLen:    (opts.explanation ?? '').length,
    fromDegree:        opts.from._count.edgesFrom + opts.from._count.edgesTo,
    toDegree:          opts.to._count.edgesFrom + opts.to._count.edgesTo,
    fromEvidenceLevel: opts.from.evidenceLevel,
    toEvidenceLevel:   opts.to.evidenceLevel,
    sameCategory:      !!opts.from.categoryId && opts.from.categoryId === opts.to.categoryId,
    relationshipType:  opts.relationshipType,
  };
}
