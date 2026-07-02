/**
 * Labeled training examples for the edge/connection-quality model, drawn from
 * the archive's existing graph — no manual labeling:
 *
 *   positive (1): a live `published` Edge — a connection the archive kept.
 *   negative (0): an `archived` Edge, or a `rejected` RelationshipSuggestion.
 */

import { prisma } from '@/lib/db';
import { extractEdgeFeatures, edgeCandidateFromParts } from '@/lib/learning/edge-features';
import type { TrainExample } from '@/lib/learning/model';

export interface EdgeDataset {
  examples:      TrainExample[];
  positiveCount: number;
  negativeCount: number;
}

const ENDPOINT_SELECT = {
  select: {
    evidenceLevel: true, categoryId: true,
    _count: { select: { edgesFrom: true, edgesTo: true } },
  },
} as const;

const MAX_POSITIVE_PER_NEGATIVE = 3;
const HARD_CAP = 4000;

export async function buildEdgePromotionDataset(): Promise<EdgeDataset> {
  const [publishedEdges, archivedEdges, rejectedSuggestions] = await Promise.all([
    prisma.edge.findMany({
      where:   { status: 'published' },
      orderBy: { updatedAt: 'desc' },
      take:    HARD_CAP,
      select: {
        confidenceScore: true, explanation: true, relationshipType: true,
        from: ENDPOINT_SELECT, to: ENDPOINT_SELECT,
      },
    }),
    prisma.edge.findMany({
      where: { status: 'archived' },
      take:  HARD_CAP,
      select: {
        confidenceScore: true, explanation: true, relationshipType: true,
        from: ENDPOINT_SELECT, to: ENDPOINT_SELECT,
      },
    }),
    prisma.relationshipSuggestion.findMany({
      where: { status: 'rejected' },
      take:  HARD_CAP,
      select: {
        confidenceScore: true, reason: true, relationshipType: true,
        fromNode: ENDPOINT_SELECT, toNode: ENDPOINT_SELECT,
      },
    }),
  ]);

  const negatives: TrainExample[] = [
    ...archivedEdges.map(e => ({
      x: extractEdgeFeatures(edgeCandidateFromParts({
        confidence: e.confidenceScore, explanation: e.explanation,
        relationshipType: e.relationshipType, from: e.from, to: e.to,
      })),
      label: 0 as const,
    })),
    ...rejectedSuggestions.map(s => ({
      x: extractEdgeFeatures(edgeCandidateFromParts({
        confidence: s.confidenceScore, explanation: s.reason,
        relationshipType: s.relationshipType, from: s.fromNode, to: s.toNode,
      })),
      label: 0 as const,
    })),
  ];

  const positiveCap = Math.max(50, negatives.length * MAX_POSITIVE_PER_NEGATIVE);
  const positives: TrainExample[] = publishedEdges.slice(0, positiveCap).map(e => ({
    x: extractEdgeFeatures(edgeCandidateFromParts({
      confidence: e.confidenceScore, explanation: e.explanation,
      relationshipType: e.relationshipType, from: e.from, to: e.to,
    })),
    label: 1 as const,
  }));

  return {
    examples:      [...positives, ...negatives],
    positiveCount: positives.length,
    negativeCount: negatives.length,
  };
}
