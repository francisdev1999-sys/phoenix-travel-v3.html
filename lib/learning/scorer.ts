/**
 * Runtime scoring: load the active learned model and score a discovery
 * candidate. Used by the discovery engine's learned auto-approve lane.
 *
 * The model is cached per-process with a short TTL so the hot discovery loop
 * doesn't hit the DB per candidate.
 */

import { prisma } from '@/lib/db';
import { predict } from '@/lib/learning/model';
import { extractFeatures, type CandidateInput } from '@/lib/learning/features';
import { extractEdgeFeatures, type EdgeCandidateInput } from '@/lib/learning/edge-features';

export const LEARNING_KIND      = 'node_promotion';
export const EDGE_LEARNING_KIND = 'edge_promotion';

// A model may only be trusted to auto-approve once it has seen enough of both
// classes and validates well. Below this bar the learned lane is disabled and
// discovery falls back to the strict static gate.
export const MIN_EXAMPLES_FOR_AUTHORITY = 40;
export const MIN_ACCURACY_FOR_AUTHORITY = 0.72;
// Learned confidence a borderline candidate must clear to be auto-approved.
export const LEARNED_AUTO_APPROVE_THRESHOLD = 0.9;

export interface ActiveModel {
  id:            string;
  weights:       number[];
  bias:          number;
  exampleCount:  number;
  positiveCount: number;
  negativeCount: number;
  accuracy:      number | null;
}

const caches = new Map<string, { model: ActiveModel | null; at: number }>();
const TTL_MS = 5 * 60 * 1000;

export async function getActiveModel(force = false, kind: string = LEARNING_KIND): Promise<ActiveModel | null> {
  const now = Date.now();
  const cached = caches.get(kind);
  if (!force && cached && now - cached.at < TTL_MS) return cached.model;

  const row = await prisma.learningModel.findFirst({
    where:   { kind, active: true },
    orderBy: { version: 'desc' },
    select: {
      id: true, weights: true, bias: true,
      exampleCount: true, positiveCount: true, negativeCount: true, accuracy: true,
    },
  });

  caches.set(kind, { model: row, at: now });
  return row;
}

export function isModelMature(m: ActiveModel | null): m is ActiveModel {
  return !!m &&
    m.exampleCount >= MIN_EXAMPLES_FOR_AUTHORITY &&
    m.positiveCount > 0 && m.negativeCount > 0 &&
    (m.accuracy ?? 0) >= MIN_ACCURACY_FOR_AUTHORITY;
}

export interface ScoreResult {
  score:   number;      // learned probability of approval+survival
  modelId: string;
  mature:  boolean;     // whether the model is trusted to auto-approve
}

/** Score a node candidate with the active node model. Returns null if no model exists yet. */
export async function scoreCandidate(input: CandidateInput): Promise<ScoreResult | null> {
  const model = await getActiveModel();
  if (!model || model.weights.length === 0) return null;
  const score = predict({ weights: model.weights, bias: model.bias }, extractFeatures(input));
  return { score, modelId: model.id, mature: isModelMature(model) };
}

/** Score a connection candidate with the active edge model. Returns null if no model exists yet. */
export async function scoreEdgeCandidate(input: EdgeCandidateInput): Promise<ScoreResult | null> {
  const model = await getActiveModel(false, EDGE_LEARNING_KIND);
  if (!model || model.weights.length === 0) return null;
  const score = predict({ weights: model.weights, bias: model.bias }, extractEdgeFeatures(input));
  return { score, modelId: model.id, mature: isModelMature(model) };
}

/**
 * Hard safety guards for the learned EDGE lane. Speculative/contradictory
 * connections and mythological endpoints always require a human, no matter how
 * confident the model is.
 */
const EDGE_BLOCKED_TYPES = new Set(['speculative', 'contradictory', 'contradiction']);

export function passesLearnedEdgeSafetyGuards(c: EdgeCandidateInput): boolean {
  if (EDGE_BLOCKED_TYPES.has((c.relationshipType || '').toLowerCase())) return false;
  if ((c.fromEvidenceLevel || '').toLowerCase() === 'mythological') return false;
  if ((c.toEvidenceLevel || '').toLowerCase() === 'mythological') return false;
  if (c.explanationLen < 40) return false; // must carry a real explanation
  return true;
}

/**
 * Hard safety guards the learned auto-approve lane can NEVER bypass, even at
 * high confidence. The learned model can extend the strict gate into
 * speculative/debated territory it's confident about — but not into pure
 * mythology or empty stubs.
 */
// Minimum average source credibility the learned lane will auto-publish behind.
export const MIN_SOURCE_CREDIBILITY = 0.5;

export function passesLearnedSafetyGuards(c: CandidateInput): boolean {
  const ev = (c.evidenceLevel || '').toLowerCase();
  if (ev === 'mythological') return false;                 // never auto-publish pure myth
  if (c.claimCount < 1) return false;                      // must actually assert something
  if (c.sourceCount < 1) return false;                     // must cite at least one source
  if (c.sourceCredibility < MIN_SOURCE_CREDIBILITY) return false; // …and a credible one
  return true;
}
