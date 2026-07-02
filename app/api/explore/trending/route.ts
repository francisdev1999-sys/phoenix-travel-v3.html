export const dynamic = 'force-dynamic';
/**
 * GET /api/explore/trending
 *
 * Public feed-ranking signal: which topics are visitors engaging with right
 * now (weighted views/dives/hops over the last 7 days), plus — once the
 * user-interest neuron is trained — which topics it PREDICTS people will find
 * magnetic. The Explore feed boosts these to the top of the first batch.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cachedJson } from '@/lib/cache/api-cache';
import { getEngagementScores } from '@/lib/learning/interest';
import { getActiveModel, INTEREST_LEARNING_KIND } from '@/lib/learning/scorer';
import { predict } from '@/lib/learning/model';
import { extractFeatures, candidateFromNode } from '@/lib/learning/features';
import { NODE_SELECT } from '@/lib/learning/dataset';

export async function GET() {
  const payload = await cachedJson('explore:trending', 300_000, () => computeTrending());
  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}

async function computeTrending() {
  const [scores, model] = await Promise.all([
    getEngagementScores(7),
    getActiveModel(false, INTEREST_LEARNING_KIND),
  ]);

  // Trending: hard engagement data.
  const trending = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nodeId, score]) => ({ nodeId, score }));

  // Predicted: the interest neuron's picks (only when a model exists).
  let predicted: { nodeId: string; score: number }[] = [];
  if (model && model.weights.length > 0) {
    const nodes = await prisma.node.findMany({
      where:  { status: 'published' },
      take:   500,
      select: { id: true, ...NODE_SELECT },
    });
    predicted = nodes
      .map(n => ({
        nodeId: n.id,
        score:  predict({ weights: model.weights, bias: model.bias }, extractFeatures(candidateFromNode(n))),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  return { trending, predicted };
}
