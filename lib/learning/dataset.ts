/**
 * Builds labeled training examples for the promotion model from EVERYTHING the
 * Nexus Archive currently holds — no manual labeling:
 *
 *   positive (1): a live `published` node — it earned and kept a place in the
 *                 archive, with its real source backing + connection degree.
 *   negative (0): an `archived`/`deleted` node, a `rejected` user proposal, or a
 *                 `rejected`/`dismissed` discovery candidate.
 *
 * This lets the model learn what good archive content looks like from the graph
 * itself, so it matures far faster than learning from discovery outcomes alone.
 */

import { prisma } from '@/lib/db';
import {
  extractFeatures, candidateFromNode, candidateFromProposal, candidateFromDiscovered,
} from '@/lib/learning/features';
import type { TrainExample } from '@/lib/learning/model';

export interface Dataset {
  examples:      TrainExample[];
  positiveCount: number;
  negativeCount: number;
  sources:       { publishedNodes: number; archivedNodes: number; rejectedProposals: number; rejectedDiscovered: number };
}

export const NODE_SELECT = {
  confidenceScore: true, evidenceLevel: true, description: true, mainstreamView: true,
  _count: { select: { claims: true, criticisms: true, openQuestions: true, tags: true, edgesFrom: true, edgesTo: true } },
  // linked sources with their credibility → powers the sourceCred feature
  sourceLinks: { select: { source: { select: { credibilityScore: true } } } },
} as const;

// Keep the classes from becoming wildly imbalanced (a huge published archive vs
// a few rejections would otherwise train a trivial "approve everything" model).
const MAX_POSITIVE_PER_NEGATIVE = 3;
const HARD_CAP = 4000;

export async function buildNodePromotionDataset(): Promise<Dataset> {
  const [publishedNodes, archivedNodes, rejectedProposals, rejectedDiscovered] = await Promise.all([
    prisma.node.findMany({
      where: { status: 'published' },
      orderBy: { updatedAt: 'desc' },
      take: HARD_CAP,
      select: NODE_SELECT,
    }),
    prisma.node.findMany({
      where: { status: { in: ['archived', 'deleted'] } },
      take: HARD_CAP,
      select: NODE_SELECT,
    }),
    prisma.proposedNode.findMany({
      where: { status: 'rejected' },
      take: HARD_CAP,
      select: {
        confidence: true, evidenceLevel: true, description: true, mainstreamView: true,
        claims: true, criticisms: true, openQuestions: true, tags: true,
      },
    }),
    prisma.discoveredNode.findMany({
      where: { status: { in: ['rejected', 'dismissed'] } },
      take: HARD_CAP,
      select: {
        confidenceScore: true, evidenceLevel: true, description: true, mainstreamView: true,
        claims: true, criticisms: true, openQuestions: true, tags: true,
        sourceUrl: true, relatedNodeIds: true,
      },
    }),
  ]);

  const negatives: TrainExample[] = [
    ...archivedNodes.map(n => ({ x: extractFeatures(candidateFromNode(n)), label: 0 as const })),
    ...rejectedProposals.map(p => ({ x: extractFeatures(candidateFromProposal(p)), label: 0 as const })),
    ...rejectedDiscovered.map(d => ({ x: extractFeatures(candidateFromDiscovered(d)), label: 0 as const })),
  ];

  // Cap positives relative to negatives to keep the classes balanced.
  const positiveCap = Math.max(50, negatives.length * MAX_POSITIVE_PER_NEGATIVE);
  const positives: TrainExample[] = publishedNodes
    .slice(0, positiveCap)
    .map(n => ({ x: extractFeatures(candidateFromNode(n)), label: 1 as const }));

  return {
    examples:      [...positives, ...negatives],
    positiveCount: positives.length,
    negativeCount: negatives.length,
    sources: {
      publishedNodes:     positives.length,
      archivedNodes:      archivedNodes.length,
      rejectedProposals:  rejectedProposals.length,
      rejectedDiscovered: rejectedDiscovered.length,
    },
  };
}
