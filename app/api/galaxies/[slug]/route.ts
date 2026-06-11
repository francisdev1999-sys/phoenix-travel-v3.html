export const dynamic = 'force-dynamic';
/**
 * GET /api/galaxies/[slug]
 *
 * Returns one galaxy with all its clusters (categories) and their node counts.
 * This is the data for ClusterList inside GalaxyView.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { NODE_CATEGORY_COLORS, NODE_CATEGORY_ICONS } from '@/lib/taxonomy/node-categories';

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const galaxy = await prisma.galaxy.findUnique({
    where: { slug },
    include: {
      categories: {
        include: {
          nodes: {
            where: { status: 'published' },
            select: {
              id: true,
              evidenceLevel: true,
              _count: { select: { sourceLinks: true } },
            },
          },
        },
      },
    },
  });

  if (!galaxy) {
    return NextResponse.json({ error: 'Galaxy not found' }, { status: 404 });
  }

  const clusters = galaxy.categories
    .filter(c => c.nodes.length > 0)
    .map(c => {
      const nodeCount   = c.nodes.length;
      const sourceCount = c.nodes.reduce((s, n) => s + n._count.sourceLinks, 0);

      // Evidence level distribution
      const evidenceDist = c.nodes.reduce<Record<string, number>>((acc, n) => {
        acc[n.evidenceLevel] = (acc[n.evidenceLevel] ?? 0) + 1;
        return acc;
      }, {});

      return {
        id:           c.id,
        slug:         c.slug,
        name:         c.name,
        color:        c.color ?? NODE_CATEGORY_COLORS[c.name as keyof typeof NODE_CATEGORY_COLORS] ?? '#7c3aed',
        icon:         NODE_CATEGORY_ICONS[c.name as keyof typeof NODE_CATEGORY_ICONS] ?? 'Folder',
        nodeCount,
        sourceCount,
        evidenceDist,
      };
    })
    .sort((a, b) => b.nodeCount - a.nodeCount);

  return NextResponse.json({
    galaxy: {
      id:          galaxy.id,
      slug:        galaxy.slug,
      name:        galaxy.name,
      description: galaxy.description,
      icon:        galaxy.icon,
      color:       galaxy.color,
    },
    clusters,
    totals: {
      nodeCount:   clusters.reduce((s, c) => s + c.nodeCount, 0),
      sourceCount: clusters.reduce((s, c) => s + c.sourceCount, 0),
      clusterCount: clusters.length,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
