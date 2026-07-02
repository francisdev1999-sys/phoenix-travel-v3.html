/**
 * Builds labeled training examples for the node-promotion model from the
 * archive's own outcome history — no manual labeling required.
 *
 * Label = "did this discovered node earn and keep a place in the live archive?"
 *   positive (1): it was promoted AND its live node is still `published`
 *   negative (0): it was rejected/dismissed, OR promoted then archived/deleted
 *   (unresolved pending_review / freshly auto_approved items are skipped)
 */

import { prisma } from '@/lib/db';
import { extractFeatures, candidateFromDiscovered } from '@/lib/learning/features';
import type { TrainExample } from '@/lib/learning/model';

export interface Dataset {
  examples:      TrainExample[];
  positiveCount: number;
  negativeCount: number;
}

const NEGATIVE_STATUSES = new Set(['rejected', 'dismissed']);
const SURVIVING_STATUS  = 'published';

export async function buildNodePromotionDataset(limit = 5000): Promise<Dataset> {
  const rows = await prisma.discoveredNode.findMany({
    where: {
      OR: [
        { status: { in: [...NEGATIVE_STATUSES] } },
        { promotedNodeId: { not: null } },
      ],
    },
    orderBy: { discoveredAt: 'desc' },
    take: limit,
    select: {
      relevanceScore: true, qualityScore: true, noveltyScore: true, confidenceScore: true,
      evidenceLevel: true, claims: true, criticisms: true, tags: true, description: true,
      sourceUrl: true, status: true, promotedNodeId: true,
    },
  });

  // Resolve survival for all promoted candidates in one query.
  const promotedIds = rows.map(r => r.promotedNodeId).filter((id): id is string => !!id);
  const liveNodes = promotedIds.length
    ? await prisma.node.findMany({
        where:  { id: { in: promotedIds } },
        select: { id: true, status: true },
      })
    : [];
  const statusById = new Map(liveNodes.map(n => [n.id, n.status]));

  const examples: TrainExample[] = [];
  let positiveCount = 0;
  let negativeCount = 0;

  for (const r of rows) {
    let label: 0 | 1 | null = null;

    if (r.promotedNodeId) {
      const liveStatus = statusById.get(r.promotedNodeId);
      if (liveStatus === SURVIVING_STATUS) label = 1;
      else if (liveStatus === undefined || liveStatus === 'archived' || liveStatus === 'deleted') label = 0;
      // any other transient status → skip
    } else if (NEGATIVE_STATUSES.has(r.status)) {
      label = 0;
    }

    if (label === null) continue;

    examples.push({ x: extractFeatures(candidateFromDiscovered(r)), label });
    if (label === 1) positiveCount++; else negativeCount++;
  }

  return { examples, positiveCount, negativeCount };
}
