export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { loadNode, loadPublishedEdges } from '@/lib/similarity/db-loader';
import { computeSimilarity } from '@/lib/similarity/engine';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const aId = searchParams.get('a');
  const bId = searchParams.get('b');

  if (!aId || !bId) {
    return NextResponse.json({ error: 'Query params "a" and "b" are required' }, { status: 400 });
  }

  const [nodeA, nodeB, edges] = await Promise.all([
    loadNode(aId),
    loadNode(bId),
    loadPublishedEdges(),
  ]);

  if (!nodeA) return NextResponse.json({ error: `Node "${aId}" not found` }, { status: 404 });
  if (!nodeB) return NextResponse.json({ error: `Node "${bId}" not found` }, { status: 404 });

  const result = computeSimilarity(nodeA, nodeB, edges);

  return NextResponse.json({
    result,
    nodeA,
    nodeB,
    disclaimer:
      'ADVISORY ONLY. This comparison does not constitute evidence of any connection between these nodes. ' +
      'Similarity scores must not be used to create graph edges or elevate evidence levels.',
  });
}
