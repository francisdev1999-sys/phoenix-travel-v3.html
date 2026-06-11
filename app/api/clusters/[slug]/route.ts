export const dynamic = 'force-dynamic';
/**
 * GET /api/clusters/[slug]
 *
 * Returns one cluster (Category) with all its published nodes.
 * Maximum 100 nodes sorted by confidenceScore DESC.
 * This is the data source for ClusterView.
 *
 * Query params:
 *   ?sort=confidence (default) | evidence | title | recent
 *   ?limit=100 (max 100)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { NODE_CATEGORY_COLORS, NODE_CATEGORY_ICONS } from '@/lib/taxonomy/node-categories';

type Params = { params: Promise<{ slug: string }> };

const EVIDENCE_ORDER: Record<string, number> = {
  confirmed: 5, strong: 4, moderate: 3, weak: 2, speculative: 1,
};

export async function GET(req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const sortParam = req.nextUrl.searchParams.get('sort') ?? 'confidence';
  const limit     = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 100), 100);

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      galaxy: { select: { id: true, slug: true, name: true, color: true, icon: true } },
      nodes: {
        where: { status: 'published' },
        select: {
          id:             true,
          title:          true,
          description:    true,
          evidenceLevel:  true,
          confidenceScore: true,
          year:           true,
          region:         true,
          country:        true,
          icon:           true,
          color:          true,
          tags:           { select: { tag: true }, take: 5 },
          _count: { select: { sourceLinks: true, edgesFrom: true, edgesTo: true } },
        },
        orderBy: sortParam === 'recent' ? { createdAt: 'desc' }
                : sortParam === 'title'  ? { title: 'asc' }
                : { confidenceScore: 'desc' },
        take: limit,
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
  }

  let nodes = category.nodes.map(n => ({
    id:            n.id,
    title:         n.title,
    description:   n.description.slice(0, 200),
    evidenceLevel: n.evidenceLevel,
    confidence:    n.confidenceScore,
    year:          n.year,
    region:        n.region,
    country:       n.country,
    icon:          n.icon ?? NODE_CATEGORY_ICONS[category.name as keyof typeof NODE_CATEGORY_ICONS] ?? 'Dot',
    color:         n.color ?? NODE_CATEGORY_COLORS[category.name as keyof typeof NODE_CATEGORY_COLORS] ?? '#7c3aed',
    tags:          n.tags.map(t => t.tag),
    sourceCount:   n._count.sourceLinks,
    edgeCount:     n._count.edgesFrom + n._count.edgesTo,
  }));

  // Secondary sort by evidence level when primary is confidence
  if (sortParam === 'evidence') {
    nodes = nodes.sort((a, b) =>
      (EVIDENCE_ORDER[b.evidenceLevel] ?? 0) - (EVIDENCE_ORDER[a.evidenceLevel] ?? 0),
    );
  }

  return NextResponse.json({
    cluster: {
      id:          category.id,
      slug:        category.slug,
      name:        category.name,
      color:       category.color ?? NODE_CATEGORY_COLORS[category.name as keyof typeof NODE_CATEGORY_COLORS] ?? '#7c3aed',
      icon:        NODE_CATEGORY_ICONS[category.name as keyof typeof NODE_CATEGORY_ICONS] ?? 'Folder',
      galaxy:      category.galaxy,
    },
    nodes,
    total: nodes.length,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
