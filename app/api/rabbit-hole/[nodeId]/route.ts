import { NextRequest, NextResponse } from 'next/server';
import { computeRabbitHoleFromDB } from '@/lib/retrieval/rabbit-hole';
import { nodes as staticNodes, edges as staticEdges } from '@/lib/graph';
import { computeRabbitHole } from '@/lib/rabbit-hole';

type Params = { params: Promise<{ nodeId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { nodeId } = await params;

  try {
    const data = await computeRabbitHoleFromDB(nodeId);
    if (data) return NextResponse.json(data);
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  } catch (err) {
    console.warn('[rabbit-hole] DB unavailable, falling back to in-memory:', err);
  }

  const data = computeRabbitHole(nodeId, staticNodes, staticEdges);
  if (!data) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

  return NextResponse.json({ ...data, sources: [], sourceCountMap: {} });
}
