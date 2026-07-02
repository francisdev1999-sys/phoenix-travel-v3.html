/**
 * Feature extraction for the node-promotion learning model.
 *
 * Features are INTRINSIC + GRAPH signals that exist for BOTH an existing archive
 * node and a fresh discovery candidate, so the model can learn from everything
 * the Nexus Archive already contains — published nodes (what "good" looks like),
 * their source backing and connection degree, content richness, evidence level —
 * not just the discovery pipeline's own history.
 *
 * The vector is FIXED and named; order must never change (weights are positional).
 * All values are ~0..1 scaled.
 */

export const FEATURE_NAMES = [
  'confidence',
  'claims',        // normalized claim count
  'criticisms',    // normalized criticism count
  'tags',          // normalized tag count
  'descLength',    // normalized description length
  'sources',       // normalized cited-source count
  'sourceCred',    // avg credibility of cited sources (0..1)
  'connections',   // normalized graph degree (edges / proposed links)
  'hasMainstream', // 0/1 — carries a mainstream view (balance signal)
  'openQuestions', // normalized open-question count
  'ev_verified',
  'ev_strong',
  'ev_debated',
  'ev_speculative',
  'ev_mythological',
] as const;

export type FeatureName = typeof FEATURE_NAMES[number];
export const FEATURE_COUNT = FEATURE_NAMES.length;

// Wikipedia is the only source node-discovery cites; its credibility mirrors
// lib/discovery/node-promoter.ts (WIKIPEDIA_CREDIBILITY_SCORE).
export const WIKIPEDIA_CREDIBILITY = 0.65;

export interface CandidateInput {
  confidenceScore:   number;
  evidenceLevel:     string;
  claimCount:        number;
  criticismCount:    number;
  tagCount:          number;
  openQuestionCount: number;
  descriptionLen:    number;
  sourceCount:       number;
  sourceCredibility: number; // 0..1 average credibility of cited sources
  connectionCount:   number;
  hasMainstreamView: boolean;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export function extractFeatures(c: CandidateInput): number[] {
  const ev = (c.evidenceLevel || '').toLowerCase();
  return [
    clamp01(c.confidenceScore),
    clamp01(c.claimCount / 6),
    clamp01(c.criticismCount / 4),
    clamp01(c.tagCount / 8),
    clamp01(c.descriptionLen / 1200),
    clamp01(c.sourceCount / 5),
    clamp01(c.sourceCredibility),
    clamp01(c.connectionCount / 8),
    c.hasMainstreamView ? 1 : 0,
    clamp01(c.openQuestionCount / 4),
    ev === 'verified' ? 1 : 0,
    ev === 'strong_evidence' ? 1 : 0,
    ev === 'debated' ? 1 : 0,
    ev === 'speculative' ? 1 : 0,
    ev === 'mythological' ? 1 : 0,
  ];
}

const arrLen = (v: unknown) => (Array.isArray(v) ? v.length : 0);

/** From a DiscoveredNode-shaped row (discovery candidate). */
export function candidateFromDiscovered(d: {
  confidenceScore: number;
  evidenceLevel:   string;
  claims:          unknown;
  criticisms:      unknown;
  tags:            unknown;
  openQuestions:   unknown;
  description:     string | null;
  sourceUrl:       string | null;
  relatedNodeIds:  unknown;
  mainstreamView:  string | null;
}): CandidateInput {
  return {
    confidenceScore:   d.confidenceScore,
    evidenceLevel:     d.evidenceLevel,
    claimCount:        arrLen(d.claims),
    criticismCount:    arrLen(d.criticisms),
    tagCount:          arrLen(d.tags),
    openQuestionCount: arrLen(d.openQuestions),
    descriptionLen:    (d.description ?? '').length,
    sourceCount:       d.sourceUrl ? 1 : 0,
    sourceCredibility: d.sourceUrl ? WIKIPEDIA_CREDIBILITY : 0,
    connectionCount:   arrLen(d.relatedNodeIds),
    hasMainstreamView: !!d.mainstreamView,
  };
}

/** From a live archive Node with relation counts + linked-source credibility. */
export function candidateFromNode(n: {
  confidenceScore: number;
  evidenceLevel:   string;
  description:     string | null;
  mainstreamView:  string | null;
  _count: {
    claims: number; criticisms: number; openQuestions: number; tags: number;
    edgesFrom: number; edgesTo: number;
  };
  sourceLinks: { source: { credibilityScore: number } | null }[];
}): CandidateInput {
  const creds = n.sourceLinks.map(l => l.source?.credibilityScore).filter((c): c is number => typeof c === 'number');
  const avgCred = creds.length ? creds.reduce((a, b) => a + b, 0) / creds.length : 0;
  return {
    confidenceScore:   n.confidenceScore,
    evidenceLevel:     n.evidenceLevel,
    claimCount:        n._count.claims,
    criticismCount:    n._count.criticisms,
    tagCount:          n._count.tags,
    openQuestionCount: n._count.openQuestions,
    descriptionLen:    (n.description ?? '').length,
    sourceCount:       n.sourceLinks.length,
    sourceCredibility: avgCred,
    connectionCount:   n._count.edgesFrom + n._count.edgesTo,
    hasMainstreamView: !!n.mainstreamView,
  };
}

/** From a ProposedNode (user submission) row. */
export function candidateFromProposal(p: {
  confidence:     number;
  evidenceLevel:  string;
  claims:         unknown;
  criticisms:     unknown;
  tags:           unknown;
  openQuestions:  unknown;
  description:    string | null;
  mainstreamView: string | null;
}): CandidateInput {
  return {
    confidenceScore:   p.confidence,
    evidenceLevel:     p.evidenceLevel,
    claimCount:        arrLen(p.claims),
    criticismCount:    arrLen(p.criticisms),
    tagCount:          arrLen(p.tags),
    openQuestionCount: arrLen(p.openQuestions),
    descriptionLen:    (p.description ?? '').length,
    sourceCount:       0,
    sourceCredibility: 0,
    connectionCount:   0,
    hasMainstreamView: !!p.mainstreamView,
  };
}
