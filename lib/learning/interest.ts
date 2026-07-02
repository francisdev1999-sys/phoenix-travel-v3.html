/**
 * The user-interest neuron — the archive learning its AUDIENCE.
 *
 * Signal: anonymous engagement events (node_view / node_dive / connection_hop,
 * written by lib/engagement.ts into UsageEvent with meta.nodeId).
 *
 * Label: "do visitors engage with topics like this?"
 *   positive (1): a published node with meaningful recent engagement
 *   negative (0): a published node that has had its fair chance (old enough)
 *                 but drew no engagement at all
 *
 * Features: the SAME intrinsic+graph vector the promotion neuron uses — so the
 * learned weights read directly as "what pulls users in" (e.g. speculative
 * topics +, heavy sourcing −, high connectivity +…).
 */

import { prisma } from '@/lib/db';
import { extractFeatures, candidateFromNode, FEATURE_NAMES, FEATURE_COUNT } from '@/lib/learning/features';
import { NODE_SELECT } from '@/lib/learning/dataset';
import { INTEREST_LEARNING_KIND } from '@/lib/learning/scorer';
import {
  fitAndSave, MIN_EXAMPLES_TO_TRAIN, type LearningPassResult,
} from '@/lib/learning/trainer';
import type { TrainExample } from '@/lib/learning/model';

export const ENGAGEMENT_WINDOW_DAYS = 30;
// A node must have been visible this long before "no engagement" counts against it.
export const MIN_AGE_DAYS_FOR_NEGATIVE = 7;
// Weighted engagement score needed to count as a positive example.
export const MIN_SCORE_FOR_POSITIVE = 2;

const EVENT_WEIGHTS: Record<string, number> = {
  node_view:      1,
  node_dive:      2, // an active choice — worth more than a passive view
  connection_hop: 2, // following the graph — the behaviour we most want to learn
};

/** Weighted engagement score per nodeId over the window. */
export async function getEngagementScores(days = ENGAGEMENT_WINDOW_DAYS): Promise<Map<string, number>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<{ nodeId: string; eventType: string; n: bigint }[]>`
    SELECT meta->>'nodeId' AS "nodeId", "eventType", count(*) AS n
    FROM "UsageEvent"
    WHERE "createdAt" >= ${since}
      AND "eventType" IN ('node_view', 'node_dive', 'connection_hop')
      AND meta->>'nodeId' IS NOT NULL
    GROUP BY meta->>'nodeId', "eventType"
  `;
  const scores = new Map<string, number>();
  for (const r of rows) {
    const w = EVENT_WEIGHTS[r.eventType] ?? 1;
    scores.set(r.nodeId, (scores.get(r.nodeId) ?? 0) + Number(r.n) * w);
  }
  return scores;
}

/**
 * Pure label split (unit-tested): engaged nodes are positives; only
 * sufficiently old zero-engagement nodes become negatives.
 */
export function splitByEngagement(
  nodes: { id: string; ageDays: number }[],
  scores: Map<string, number>,
  opts = { minScore: MIN_SCORE_FOR_POSITIVE, minAgeDays: MIN_AGE_DAYS_FOR_NEGATIVE },
): { positiveIds: string[]; negativeIds: string[] } {
  const positiveIds: string[] = [];
  const negativeIds: string[] = [];
  for (const n of nodes) {
    const score = scores.get(n.id) ?? 0;
    if (score >= opts.minScore) positiveIds.push(n.id);
    else if (score === 0 && n.ageDays >= opts.minAgeDays) negativeIds.push(n.id);
    // lightly-engaged or too-new nodes are ambiguous → skipped
  }
  return { positiveIds, negativeIds };
}

export interface InterestDataset {
  examples:      TrainExample[];
  positiveCount: number;
  negativeCount: number;
  engagedNodes:  number;
}

const MAX_PER_CLASS = 2000;

export async function buildInterestDataset(): Promise<InterestDataset> {
  const [nodes, scores] = await Promise.all([
    prisma.node.findMany({
      where:  { status: 'published' },
      take:   4000,
      select: { id: true, createdAt: true, ...NODE_SELECT },
    }),
    getEngagementScores(),
  ]);

  const now = Date.now();
  const { positiveIds, negativeIds } = splitByEngagement(
    nodes.map(n => ({ id: n.id, ageDays: (now - n.createdAt.getTime()) / 86_400_000 })),
    scores,
  );

  const byId = new Map(nodes.map(n => [n.id, n]));
  // Balance: never let one class exceed 3× the other.
  const posCap = Math.min(positiveIds.length, Math.max(20, negativeIds.length * 3), MAX_PER_CLASS);
  const negCap = Math.min(negativeIds.length, Math.max(20, positiveIds.length * 3), MAX_PER_CLASS);

  const examples: TrainExample[] = [
    ...positiveIds.slice(0, posCap).map(id => ({ x: extractFeatures(candidateFromNode(byId.get(id)!)), label: 1 as const })),
    ...negativeIds.slice(0, negCap).map(id => ({ x: extractFeatures(candidateFromNode(byId.get(id)!)), label: 0 as const })),
  ];

  return {
    examples,
    positiveCount: Math.min(positiveIds.length, posCap),
    negativeCount: Math.min(negativeIds.length, negCap),
    engagedNodes:  scores.size,
  };
}

/** Nightly pass for the user-interest model. */
export async function runInterestLearningPass(): Promise<LearningPassResult> {
  const { examples, positiveCount, negativeCount, engagedNodes } = await buildInterestDataset();

  if (examples.length < MIN_EXAMPLES_TO_TRAIN || positiveCount === 0 || negativeCount === 0) {
    return {
      trained: false,
      reason: `insufficient engagement data (examples=${examples.length}, +${positiveCount}/-${negativeCount}, ${engagedNodes} nodes with any engagement)`,
      exampleCount: examples.length,
      positiveCount, negativeCount,
    };
  }

  const fit = await fitAndSave(INTEREST_LEARNING_KIND, [...FEATURE_NAMES], FEATURE_COUNT, examples, positiveCount, negativeCount);
  return { trained: true, ...fit };
}
