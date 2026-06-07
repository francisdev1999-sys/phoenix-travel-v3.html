import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { nodes as staticNodes, edges as staticEdges } from '@/lib/graph';
import { computeRabbitHole } from '@/lib/rabbit-hole';

type Params = { params: Promise<{ nodeId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { nodeId } = await params;

  const data = computeRabbitHole(nodeId, staticNodes, staticEdges);
  if (!data) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

  // Fetch approved sources linked to this node from the DB
  const sourceLinks = await prisma.sourceLink.findMany({
    where: {
      targetType: 'node',
      targetId: nodeId,
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

  // Also count approved sources linked to connected node IDs
  const connectedIds = data.connections.map(c => c.node.id);
  const neighborSourceCounts = await prisma.sourceLink.groupBy({
    by: ['targetId'],
    where: {
      targetType: 'node',
      targetId: { in: connectedIds },
      source: { status: 'approved' },
    },
    _count: { id: true },
  });

  const sourceCountMap = Object.fromEntries(
    neighborSourceCounts.map(r => [r.targetId, r._count.id]),
  );

  return NextResponse.json({ ...data, sources, sourceCountMap });
}
