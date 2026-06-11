export const dynamic = 'force-dynamic';
/**
 * GET /api/similarity/alternatives
 *
 * Returns pairs of published nodes that offer alternative explanations for
 * similar phenomena — high thematic overlap but drawn from different sources,
 * suggesting independent traditions or competing hypotheses.
 *
 * ADVISORY ONLY — never implies a graph edge should be created.
 *
 * Query params:
 *   limit  — max pairs to return (default 20, max 50)
 *   nodeId — filter to pairs involving a specific node
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DISCLAIMER =
  'ADVISORY ONLY. Alternative-explanation pairs share thematic characteristics but draw on different sources. ' +
  'This does NOT constitute evidence of a historical connection. No graph edge should be created from this data alone.';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limitParam = parseInt(searchParams.get('limit') ?? '20', 10);
  const limit      = Math.min(Math.max(1, limitParam), 50);
  const nodeId     = searchParams.get('nodeId') ?? undefined;

  const rows = await prisma.researchSimilarity.findMany({
    where: {
      thematicSimilarity:     { gte: 0.45 },
      sourceSimilarity:       { lte: 0.25 },
      researchPotentialScore: { gte: 0.40 },
      ...(nodeId ? { OR: [{ nodeAId: nodeId }, { nodeBId: nodeId }] } : {}),
    },
    orderBy: { researchPotentialScore: 'desc' },
    take: limit,
    select: {
      nodeAId:               true,
      nodeBId:               true,
      overallSimilarity:     true,
      thematicSimilarity:    true,
      sourceSimilarity:      true,
      entitySimilarity:      true,
      researchPotentialScore:true,
      breakdown:             true,
    },
  });

  if (rows.length === 0) {
    return NextResponse.json({ pairs: [], total: 0, disclaimer: DISCLAIMER });
  }

  const allIds = [...new Set(rows.flatMap(r => [r.nodeAId, r.nodeBId]))];
  const nodes  = await prisma.node.findMany({
    where: { id: { in: allIds }, status: 'published' },
    select: {
      id: true, title: true, icon: true,
      evidenceLevel: true, confidenceScore: true,
      description: true,
      category: { select: { name: true } },
    },
  });
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const pairs = rows.map(r => {
    const nA = nodeMap.get(r.nodeAId);
    const nB = nodeMap.get(r.nodeBId);

    const breakdown = r.breakdown as {
      thematic?: { rationale?: string };
      source?:   { rationale?: string };
    } | null;

    return {
      nodeAId:               r.nodeAId,
      nodeBId:               r.nodeBId,
      overallSimilarity:     r.overallSimilarity,
      thematicSimilarity:    r.thematicSimilarity,
      sourceDivergence:      1 - r.sourceSimilarity,
      researchPotential:     r.researchPotentialScore,
      thematicRationale:     breakdown?.thematic?.rationale ?? '',
      sourceRationale:       breakdown?.source?.rationale ?? '',
      nodeA: nA ? {
        id: nA.id, title: nA.title, icon: nA.icon,
        evidenceLevel: nA.evidenceLevel, category: nA.category.name,
        descriptionSnippet: nA.description.slice(0, 120),
      } : null,
      nodeB: nB ? {
        id: nB.id, title: nB.title, icon: nB.icon,
        evidenceLevel: nB.evidenceLevel, category: nB.category.name,
        descriptionSnippet: nB.description.slice(0, 120),
      } : null,
    };
  }).filter(p => p.nodeA && p.nodeB);

  return NextResponse.json({ pairs, total: pairs.length, disclaimer: DISCLAIMER });
}
