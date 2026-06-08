export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getViewportNodes, getFocusedViewport } from '@/lib/retrieval/graph';

/**
 * GET /api/graph
 *
 * Returns graph data for the 3D visualization.
 *
 * Without ?focus: returns top 150 nodes by degree + edges between them.
 *   Suitable for the initial full-graph render.
 *
 * With ?focus=nodeId[&radius=2]: returns BFS subgraph around that node.
 *   Suitable for focused exploration (KnowledgeGraph "zoom in" feature).
 *
 * Response is cache-friendly — set Cache-Control at the CDN layer:
 *   s-maxage=3600, stale-while-revalidate=86400
 *
 * Falls back to static graph data when the database is unavailable.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const focus  = searchParams.get('focus') ?? undefined;
  const radius = Math.min(parseInt(searchParams.get('radius') ?? '2', 10), 3);

  try {
    const data = focus
      ? await getFocusedViewport(focus, radius)
      : await getViewportNodes(150);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (err) {
    console.error('[graph] DB error, falling back to static data:', err);

    // Graceful fallback to static TypeScript graph when DB is absent
    try {
      const { nodes, edges } = await import('@/lib/graph');
      const published = nodes.filter(n => !('status' in n) || (n as { status?: string }).status !== 'archived');
      return NextResponse.json({ nodes: published, edges });
    } catch {
      return NextResponse.json({ error: 'Graph unavailable' }, { status: 503 });
    }
  }
}
