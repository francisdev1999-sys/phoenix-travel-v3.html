export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { nodes, edges } from '@/lib/graph';
import { getTopSimilar } from '@/lib/similarity/engine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  const limit = 10;

  const node = nodes.find(n => n.id === nodeId);
  if (!node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  }

  const results = getTopSimilar(nodeId, nodes, edges, limit);
  const enriched = results.map(r => ({
    ...r,
    node: nodes.find(n => n.id === r.nodeId) ?? null,
  }));

  return NextResponse.json({
    nodeId,
    results: enriched,
    disclaimer: 'Similarity scores are advisory only. They do not constitute evidence of any relationship between nodes.',
  });
}
