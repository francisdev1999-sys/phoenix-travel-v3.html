export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { computeRabbitHoleFromDB } from '@/lib/retrieval/rabbit-hole';
import { nodes as staticNodes, edges as staticEdges } from '@/lib/graph';
import { computeRabbitHole } from '@/lib/rabbit-hole';

type Params = { params: Promise<{ nodeId: string }> };

/**
 * GET /api/rabbit-hole/[nodeId]
 *
 * Returns rabbit hole data for a node:
 *   - Direct connections ranked by composite score
 *   - Geographic clusters (nodes with coordinates within 1–2 hops)
 *   - Timeline clusters (nodes with temporal data within 1–2 hops)
 *   - Top 8 multi-hop path suggestions
 *
 * Primary path: DB-backed BFS via graph_bfs() SQL function with
 *   adjacency cache for hot nodes (1-hour TTL).
 *
 * Fallback: in-memory computation from static TypeScript graph
 *   (no DB required — supports zero-config deployments).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { nodeId } = await params;

  // Try DB-backed retrieval first
  try {
    const data = await computeRabbitHoleFromDB(nodeId);
    if (data) return NextResponse.json(data);
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  } catch (err) {
    console.warn('[rabbit-hole] DB unavailable, falling back to in-memory:', err);
  }

  // Fallback: in-memory computation from static graph
  const data = computeRabbitHole(nodeId, staticNodes, staticEdges);
  if (!data) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

  return NextResponse.json({ ...data, sources: [], sourceCountMap: {} });
}
