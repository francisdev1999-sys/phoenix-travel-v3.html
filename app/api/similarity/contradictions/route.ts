export const dynamic = 'force-dynamic';
/**
 * GET /api/similarity/contradictions
 *
 * Returns pairs of published nodes that share thematic characteristics but
 * have conflicting evidence levels — meaning findings from one must not be
 * used to support the other.
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
  'ADVISORY ONLY. Contradictory nodes share structural characteristics but have conflicting evidence levels. ' +
  'This does NOT imply a verified contradiction exists. No graph edge should be created from this data alone.';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limitParam = parseInt(searchParams.get('limit') ?? '20', 10);
  const limit      = Math.min(Math.max(1, limitParam), 50);
  const nodeId     = searchParams.get('nodeId') ?? undefined;

  const rows = await prisma.researchSimilarity.findMany({
    where: {
      thematicSimilarity: { gte: 0.35 },
      evidenceSimilarity: { lte: 0.40 },
      overallSimilarity:  { gte: 0.30 },
      ...(nodeId ? { OR: [{ nodeAId: nodeId }, { nodeBId: nodeId }] } : {}),
    },
    orderBy: [{ overallSimilarity: 'desc' }, { evidenceSimilarity: 'asc' }],
    take: limit,
    select: {
      nodeAId:            true,
      nodeBId:            true,
      overallSimilarity:  true,
      thematicSimilarity: true,
      evidenceSimilarity: true,
      criticAnalysis:     true,
    },
  });

  if (rows.length === 0) {
    return NextResponse.json({ pairs: [], total: 0, disclaimer: DISCLAIMER });
  }

  // Enrich with node metadata
  const allIds = [...new Set(rows.flatMap(r => [r.nodeAId, r.nodeBId]))];
  const nodes  = await prisma.node.findMany({
    where: { id: { in: allIds }, status: 'published' },
    select: { id: true, title: true, icon: true, evidenceLevel: true, confidenceScore: true, category: { select: { name: true } } },
  });
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const pairs = rows.map(r => {
    const nA = nodeMap.get(r.nodeAId);
    const nB = nodeMap.get(r.nodeBId);
    const critic = r.criticAnalysis as { contradictions?: { type: string; detail: string; severity: string }[] } | null;
    const contradictions = critic?.contradictions ?? [];
    const severity = contradictions.some(c => c.severity === 'significant')
      ? 'significant'
      : contradictions.some(c => c.severity === 'moderate')
      ? 'moderate'
      : 'minor';

    return {
      nodeAId:           r.nodeAId,
      nodeBId:           r.nodeBId,
      overallSimilarity: r.overallSimilarity,
      evidenceConflict:  1 - r.evidenceSimilarity,
      severity,
      contradictions,
      nodeA: nA ? { id: nA.id, title: nA.title, icon: nA.icon, evidenceLevel: nA.evidenceLevel, category: nA.category.name } : null,
      nodeB: nB ? { id: nB.id, title: nB.title, icon: nB.icon, evidenceLevel: nB.evidenceLevel, category: nB.category.name } : null,
    };
  }).filter(p => p.nodeA && p.nodeB);

  return NextResponse.json({ pairs, total: pairs.length, disclaimer: DISCLAIMER });
}
