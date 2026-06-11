export const dynamic = 'force-dynamic';
/**
 * GET /api/clusters/[slug]/graph
 *
 * Returns the node+edge subgraph for one cluster.
 * Used by ResearchGraph when entered from a ClusterView.
 * Max 150 nodes, edges limited to published only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      nodes: {
        where: { status: 'published' },
        select: {
          id: true, title: true, evidenceLevel: true,
          confidenceScore: true, icon: true, color: true,
          category: { select: { name: true, color: true } },
        },
        orderBy: { confidenceScore: 'desc' },
        take: 150,
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  const nodeIds = new Set(category.nodes.map(n => n.id));

  // Only edges where BOTH ends are in this cluster
  const edges = await prisma.edge.findMany({
    where: {
      status: 'published',
      fromId: { in: [...nodeIds] },
      toId:   { in: [...nodeIds] },
    },
    select: {
      id: true, fromId: true, toId: true,
      relationshipType: true, strengthScore: true,
      confidenceScore: true, explanation: true,
    },
  });

  return NextResponse.json({
    nodes: category.nodes,
    edges,
    clusterSlug: slug,
    clusterName: category.name,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
