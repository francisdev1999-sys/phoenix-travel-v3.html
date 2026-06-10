/**
 * Source Credibility Engine — node/edge quality derivation.
 *
 * Answers three questions for every node:
 *   1. How strong are the attached sources? (sourceQualityScore)
 *   2. Should this node be published? (publicationRecommendation)
 *   3. What specific issues need attention? (flags / reasons)
 *
 * Influences on node quality:
 *   - Weighted-average credibility of approved sources
 *   - Presence of a 'primary' source
 *   - Number of approved sources (diminishing returns above 5)
 *   - Pending / unapproved sources (reduce trust)
 *   - Contradicting sources (signal active debate — reduce score slightly)
 *
 * Edge confidence:
 *   - Weighted-average credibility of sources attached to the edge
 *   - Returns a multiplier [0.5, 1.0] applied to the existing edge confidence
 */

import { prisma } from '@/lib/db';
import { aggregateSourceCredibility, effectiveCredibility } from '@/lib/source-credibility';

export interface NodeSourceQuality {
  sourceCount:            number;  // total source links on node
  approvedCount:          number;  // links where source.status === 'approved'
  pendingCount:           number;
  strongCount:            number;  // approved sources with effective credibility >= 0.75
  hasPrimarySource:       boolean;
  hasContradictingSource: boolean;
  avgCredibility:         number;  // weighted avg across approved sources
  sourceQualityScore:     number;  // 0–1 composite score used in UI
  publicationRecommendation: 'ready' | 'needs_review' | 'not_ready';
  publicationReasons:     string[];
  reviewFlags:            string[];
}

export async function computeNodeSourceQuality(nodeId: string): Promise<NodeSourceQuality> {
  const links = await prisma.sourceLink.findMany({
    where:   { nodeId },
    include: { source: { select: { status: true, credibilityScore: true, credibilityOverride: true } } },
  });

  const approvedLinks   = links.filter(l => l.source.status === 'approved');
  const pendingLinks    = links.filter(l => l.source.status === 'pending');
  const hasPrimary      = links.some(l => l.linkType === 'primary');
  const hasContradicts  = links.some(l => l.linkType === 'contradicts');

  const strongCount = approvedLinks.filter(
    l => effectiveCredibility(l.source) >= 0.75,
  ).length;

  const avgCredibility = aggregateSourceCredibility(
    links.map(l => ({
      linkType:       l.linkType,
      relevanceScore: l.relevanceScore,
      source:         l.source,
    })),
  );

  // Composite quality score:
  //   60% weighted-average credibility
  //   25% source breadth (saturates at 5 sources)
  //   15% primary-source bonus
  const breadthScore  = Math.min(1, approvedLinks.length / 5);
  const primaryBonus  = hasPrimary ? 0.15 : 0;
  let score = avgCredibility * 0.60 + breadthScore * 0.25 + primaryBonus;

  // Penalties
  if (pendingLinks.length > 0)   score -= 0.05 * Math.min(3, pendingLinks.length);
  if (hasContradicts)             score -= 0.05;

  const sourceQualityScore = Math.max(0, Math.min(1, Math.round(score * 100) / 100));

  const publicationReasons: string[] = [];
  const reviewFlags:        string[] = [];

  if (approvedLinks.length === 0) {
    reviewFlags.push('no_approved_sources');
    publicationReasons.push('No approved sources — human review required before publishing.');
  }
  if (pendingLinks.length > 0) {
    reviewFlags.push('pending_sources');
    publicationReasons.push(`${pendingLinks.length} source${pendingLinks.length > 1 ? 's' : ''} awaiting approval.`);
  }
  if (approvedLinks.length > 0 && avgCredibility < 0.4) {
    reviewFlags.push('weak_sources');
    publicationReasons.push('Average source credibility is low — consider adding stronger sources.');
  }
  if (approvedLinks.length > 0 && !hasPrimary) {
    publicationReasons.push('No primary source identified.');
  }
  if (hasContradicts) {
    publicationReasons.push('Contradicting source(s) present — label content appropriately.');
  }

  let publicationRecommendation: NodeSourceQuality['publicationRecommendation'];
  if (sourceQualityScore >= 0.60 && approvedLinks.length >= 1 && reviewFlags.length === 0) {
    publicationRecommendation = 'ready';
  } else if (sourceQualityScore >= 0.35) {
    publicationRecommendation = 'needs_review';
  } else {
    publicationRecommendation = 'not_ready';
  }

  return {
    sourceCount:            links.length,
    approvedCount:          approvedLinks.length,
    pendingCount:           pendingLinks.length,
    strongCount,
    hasPrimarySource:       hasPrimary,
    hasContradictingSource: hasContradicts,
    avgCredibility,
    sourceQualityScore,
    publicationRecommendation,
    publicationReasons,
    reviewFlags,
  };
}

// Returns a confidence multiplier [0.5, 1.0] based on the credibility of
// sources attached to an edge. No sources → 0.7 (neutral-low).
export async function computeEdgeSourceConfidence(edgeId: string): Promise<number> {
  const links = await prisma.sourceLink.findMany({
    where:   { edgeId },
    include: { source: { select: { status: true, credibilityScore: true, credibilityOverride: true } } },
  });

  if (!links.length) return 0.7;

  const avg = aggregateSourceCredibility(
    links.map(l => ({
      linkType:       l.linkType,
      relevanceScore: l.relevanceScore,
      source:         l.source,
    })),
  );

  // Map avg credibility [0, 1] → multiplier [0.5, 1.0]
  return Math.round((0.5 + avg * 0.5) * 100) / 100;
}
