import { NextRequest, NextResponse } from 'next/server';
import { getNodeFromDB, getNeighboursFromDB, computeResearchScoreFromDB } from '@/lib/retrieval/graph';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/nodes/[id]
 *
 * Returns a fully hydrated node from the database:
 * - Core fields (title, description, evidence, confidence, geo, temporal)
 * - Category name and color
 * - Claims, criticisms, open questions (ordered)
 * - Tags
 * - Approved sources (ordered by credibility score desc)
 * - Direct neighbours + edges (for the Connections tab)
 * - Research score
 *
 * Falls back gracefully when DB is unavailable (returns static data if possible).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const [node, neighbours, researchScore] = await Promise.all([
      getNodeFromDB(id),
      getNeighboursFromDB(id),
      computeResearchScoreFromDB(id),
    ]);

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Fetch approved sources linked to this node
    const sourceLinks = await prisma.sourceLink.findMany({
      where: {
        nodeId: id,
        source: { status: 'approved' },
      },
      include: {
        source: {
          include: {
            submitter: { select: { id: true, name: true, image: true } },
          },
        },
      },
      orderBy: { source: { credibilityScore: 'desc' } },
    });

    const sources = sourceLinks.map(sl => sl.source);

    return NextResponse.json({
      node: {
        ...node,
        tags:          node.tags.map((t: { tag: string }) => t.tag),
        claims:        node.claims.map((c: { text: string }) => c.text),
        criticisms:    node.criticisms.map((c: { text: string }) => c.text),
        openQuestions: node.openQuestions.map((q: { text: string }) => q.text),
      },
      sources,
      neighbours: neighbours.map(({ edge, neighbour }) => ({
        edge,
        neighbour: {
          ...neighbour,
          tags:       neighbour.tags.map((t: { tag: string }) => t.tag),
          claims:     neighbour.claims.map((c: { text: string }) => c.text),
          criticisms: neighbour.criticisms.map((c: { text: string }) => c.text),
        },
      })),
      researchScore,
    });
  } catch (err) {
    console.error(`[nodes/${id}] error:`, err);
    return NextResponse.json({ error: 'Failed to fetch node' }, { status: 500 });
  }
}
