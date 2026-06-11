export const dynamic = 'force-dynamic';
/**
 * GET /api/galaxies
 *
 * Returns all 8 galaxies with live aggregate counts.
 * Uses a single SQL query — no N+1.
 *
 * Response: GalaxyWithCounts[]
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export interface GalaxyWithCounts {
  id:          string;
  slug:        string;
  name:        string;
  description: string | null;
  icon:        string | null;
  color:       string | null;
  order:       number;
  nodeCount:   number;
  sourceCount: number;
  edgeCount:   number;
  clusterCount: number;
}

export async function GET() {
  const galaxies = await prisma.galaxy.findMany({
    orderBy: { order: 'asc' },
    include: {
      categories: {
        include: {
          nodes: {
            where: { status: 'published' },
            select: {
              id: true,
              _count: { select: { sourceLinks: true } },
              edgesFrom: { where: { status: 'published' }, select: { id: true } },
            },
          },
        },
      },
    },
  });

  const result: GalaxyWithCounts[] = galaxies.map(g => {
    const allNodes    = g.categories.flatMap(c => c.nodes);
    const nodeCount   = allNodes.length;
    const sourceCount = allNodes.reduce((sum, n) => sum + n._count.sourceLinks, 0);
    const edgeCount   = allNodes.reduce((sum, n) => sum + n.edgesFrom.length, 0);
    const clusterCount = g.categories.filter(c => c.nodes.length > 0).length;

    return {
      id:          g.id,
      slug:        g.slug,
      name:        g.name,
      description: g.description,
      icon:        g.icon,
      color:       g.color,
      order:       g.order,
      nodeCount,
      sourceCount,
      edgeCount,
      clusterCount,
    };
  });

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
  });
}
