export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const [
    pendingSources,
    pendingNodes,
    pendingEdges,
    totalSources,
    totalNodes,
    totalEdges,
    approvedSources,
    approvedNodes,
    approvedEdges,
    rejectedSources,
    rejectedNodes,
    rejectedEdges,
  ] = await Promise.all([
    prisma.source.count({ where: { status: 'pending' } }),
    prisma.proposedNode.count({ where: { status: 'pending' } }),
    prisma.proposedEdge.count({ where: { status: 'pending' } }),
    prisma.source.count(),
    prisma.proposedNode.count(),
    prisma.proposedEdge.count(),
    prisma.source.count({ where: { status: 'approved' } }),
    prisma.proposedNode.count({ where: { status: 'approved' } }),
    prisma.proposedEdge.count({ where: { status: 'approved' } }),
    prisma.source.count({ where: { status: 'rejected' } }),
    prisma.proposedNode.count({ where: { status: 'rejected' } }),
    prisma.proposedEdge.count({ where: { status: 'rejected' } }),
  ]);

  return NextResponse.json({
    pending: { sources: pendingSources, nodes: pendingNodes, edges: pendingEdges },
    approved: { sources: approvedSources, nodes: approvedNodes, edges: approvedEdges },
    rejected: { sources: rejectedSources, nodes: rejectedNodes, edges: rejectedEdges },
    total: { sources: totalSources, nodes: totalNodes, edges: totalEdges },
  });
}
