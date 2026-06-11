export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/search/quick?q=...
 *
 * Fast multi-entity search for the Command Palette.
 * Returns grouped results: nodes (top 5), clusters (top 4), galaxies (all matching).
 * No rate-limiting — queries are cheap (ILIKE + limit) and debounced client-side.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ nodes: [], clusters: [], galaxies: [] });
  }

  const pattern = `%${q}%`;

  const [nodes, clusters, galaxies] = await Promise.all([
    // Nodes: full-text-style search on title + description + tags
    prisma.$queryRaw<{
      id: string; title: string; evidenceLevel: string; color: string | null;
      icon: string | null; categoryName: string; categoryColor: string | null;
    }[]>`
      SELECT
        n."id", n."title", n."evidenceLevel", n."color", n."icon",
        c."name"  AS "categoryName",
        c."color" AS "categoryColor"
      FROM "Node" n
      JOIN "Category" c ON c."id" = n."categoryId"
      WHERE n."status" = 'published'
        AND (
          n."title"       ILIKE ${pattern}
          OR n."description" ILIKE ${pattern}
          OR EXISTS (
            SELECT 1 FROM "NodeTag" t
            WHERE t."nodeId" = n."id" AND t."tag" ILIKE ${pattern}
          )
        )
      ORDER BY
        CASE WHEN n."title" ILIKE ${pattern} THEN 0 ELSE 1 END,
        n."title"
      LIMIT 6
    `,

    // Clusters (categories)
    prisma.category.findMany({
      where: {
        OR: [
          { name:        { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, slug: true, name: true, color: true,
        galaxy: { select: { slug: true, name: true } },
        _count: { select: { nodes: { where: { status: 'published' } } } },
      },
      take: 5,
      orderBy: { name: 'asc' },
    }),

    // Galaxies
    prisma.galaxy.findMany({
      where: {
        OR: [
          { name:        { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, slug: true, name: true, color: true, icon: true,
      },
      take: 4,
      orderBy: { order: 'asc' },
    }),
  ]);

  return NextResponse.json({ nodes, clusters, galaxies });
}
