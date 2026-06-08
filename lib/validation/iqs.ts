/**
 * Import Quality Score (IQS) — deterministic 0–100 score measuring structural
 * completeness of an imported node.
 *
 * This is NOT the same as researchScore (which measures academic credibility).
 * IQS measures whether the submission has all the fields the archive requires.
 *
 * Formula:
 *   IQS = (field_completeness × 30)
 *       + (source_quality     × 25)
 *       + (content_balance    × 20)
 *       + (evidence_coherence × 15)
 *       + (relationship_hint  × 10)
 *
 * Thresholds:
 *   80–100  ready_to_review   — auto-admit as draft
 *   60–79   review_required   — admit as draft, flag
 *   40–59   needs_enrichment  — admit as draft, flag prominently
 *   < 40    soft_rejected     — excluded unless force=true
 */

import { isValidScore } from './enums';

export type IQSTier =
  | 'ready_to_review'
  | 'review_required'
  | 'needs_enrichment'
  | 'soft_rejected';

export interface IQSResult {
  score: number;   // 0–100 integer
  tier: IQSTier;
  breakdown: {
    fieldCompleteness: number;   // 0–1
    sourceQuality:     number;   // 0–1
    contentBalance:    number;   // 0–1
    evidenceCoherence: number;   // 0–1
    relationshipHint:  number;   // 0–1
  };
}

// Expected confidence range per evidence level.
// If score is in range → coherence = 1.0; outside → penalized linearly.
const EVIDENCE_CONFIDENCE_RANGES: Record<string, [number, number]> = {
  verified:        [0.70, 1.00],
  strong_evidence: [0.50, 0.85],
  debated:         [0.30, 0.70],
  speculative:     [0.05, 0.50],
  mythological:    [0.01, 0.30],
};

// Required fields for full field_completeness score
const REQUIRED_FIELDS = [
  'id', 'title', 'category', 'description',
  'evidence_level', 'confidence_score',
  'mainstream_view', 'claims', 'criticisms',
  'open_questions', 'tags', 'sources',
] as const;

export function computeIQS(raw: unknown): IQSResult {
  const n = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  // ── field_completeness ────────────────────────────────────────────────────
  let present = 0;
  for (const f of REQUIRED_FIELDS) {
    const v = n[f];
    if (v == null) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    present++;
  }
  // Bonus 0.5 each for temporal field and coordinates (nice to have, not required)
  if (n.year != null || n.date_start != null) present += 0.5;
  if (n.coordinates != null) present += 0.5;

  const fieldCompleteness = Math.min(present / REQUIRED_FIELDS.length, 1);

  // ── source_quality ────────────────────────────────────────────────────────
  const sources = Array.isArray(n.sources)
    ? (n.sources as Record<string, unknown>[])
    : [];

  let sourceQuality = 0;
  if (sources.length > 0) {
    const avgCred = sources.reduce((sum, s) => {
      const cred = isValidScore(s.credibility_score) ? (s.credibility_score as number) : 0.5;
      return sum + cred;
    }, 0) / sources.length;
    sourceQuality = Math.min(sources.length / 3, 1) * avgCred;
  }

  // ── content_balance ───────────────────────────────────────────────────────
  const claims     = Array.isArray(n.claims)     ? n.claims     : [];
  const criticisms = Array.isArray(n.criticisms) ? n.criticisms : [];
  const mainView   = typeof n.mainstream_view === 'string' ? n.mainstream_view : '';

  const claimScore    = Math.min((claims as unknown[]).length / 3, 1);
  const criticismScore = Math.min((criticisms as unknown[]).length / 3, 1);
  const mainViewScore  = mainView.length >= 100 ? 1 : mainView.length / 100;

  const contentBalance = claimScore * 0.4 + criticismScore * 0.4 + mainViewScore * 0.2;

  // ── evidence_coherence ────────────────────────────────────────────────────
  const el = typeof n.evidence_level === 'string' ? n.evidence_level : '';
  const cs = isValidScore(n.confidence_score) ? (n.confidence_score as number) : 0.5;
  const range = EVIDENCE_CONFIDENCE_RANGES[el] ?? [0, 1];

  let evidenceCoherence: number;
  if (cs >= range[0] && cs <= range[1]) {
    evidenceCoherence = 1.0;
  } else {
    const distance = cs < range[0] ? range[0] - cs : cs - range[1];
    evidenceCoherence = Math.max(0, 1 - distance * 2);
  }

  // ── relationship_hint ─────────────────────────────────────────────────────
  // Nodes are often imported without edges (edges come separately or via
  // the static graph). Give a baseline of 0.3 so this component doesn't
  // dominate for fresh imports.
  const relationshipHint = 0.3;

  // ── Final score ───────────────────────────────────────────────────────────
  const raw_score =
    fieldCompleteness   * 30 +
    sourceQuality       * 25 +
    contentBalance      * 20 +
    evidenceCoherence   * 15 +
    relationshipHint    * 10;

  const score = Math.round(Math.min(100, Math.max(0, raw_score)));

  const tier: IQSTier =
    score >= 80 ? 'ready_to_review' :
    score >= 60 ? 'review_required' :
    score >= 40 ? 'needs_enrichment' :
                  'soft_rejected';

  return {
    score,
    tier,
    breakdown: {
      fieldCompleteness,
      sourceQuality,
      contentBalance,
      evidenceCoherence,
      relationshipHint,
    },
  };
}

export function iqsTierLabel(tier: IQSTier): string {
  switch (tier) {
    case 'ready_to_review':   return 'Ready to review (IQS ≥ 80)';
    case 'review_required':   return 'Review required (IQS 60–79)';
    case 'needs_enrichment':  return 'Needs enrichment (IQS 40–59)';
    case 'soft_rejected':     return 'Soft-rejected (IQS < 40) — use force=true to override';
  }
}
