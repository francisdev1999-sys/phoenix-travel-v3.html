export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isOwnerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const limit = Math.min(100, Number(req.nextUrl.searchParams.get('limit') ?? 50));
  const d30ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where:   { lastActiveAt: { gte: d30ago } },
    orderBy: { activityScore: 'desc' },
    take:    limit,
    select: {
      id: true, name: true, email: true, image: true, role: true,
      createdAt: true, lastActiveAt: true,
      trustScore: true, activityScore: true,
      submissionCount: true, approvedCount: true, rejectedCount: true,
      isBanned: true,
      moderationStatus: { select: { status: true } },
      _count: {
        select: {
          nodeExplorations: true,
          connectionDiscoveries: true,
          activityEvents: true,
        },
      },
    },
  });

  // Fetch submission counts per user from proposal tables
  const userIds = users.map(u => u.id);
  const [nodeSubs, edgeSubs, sourceSubs] = await Promise.all([
    prisma.proposedNode.groupBy({
      by: ['submittedBy'],
      where: { submittedBy: { in: userIds } },
      _count: { id: true },
    }),
    prisma.proposedEdge.groupBy({
      by: ['submittedBy'],
      where: { submittedBy: { in: userIds } },
      _count: { id: true },
    }),
    prisma.source.groupBy({
      by: ['submittedBy'],
      where: { submittedBy: { in: userIds } },
      _count: { id: true },
    }),
  ]);

  const nodeMap   = Object.fromEntries(nodeSubs.map(r => [r.submittedBy, r._count.id]));
  const edgeMap   = Object.fromEntries(edgeSubs.map(r => [r.submittedBy, r._count.id]));
  const sourceMap = Object.fromEntries(sourceSubs.map(r => [r.submittedBy ?? '', r._count.id]));

  const result = users.map(u => ({
    id:               u.id,
    name:             u.name,
    email:            u.email,
    image:            u.image,
    role:             u.role,
    createdAt:        u.createdAt,
    lastActiveAt:     u.lastActiveAt,
    trustScore:       u.trustScore,
    activityScore:    u.activityScore,
    submissionCount:  u.submissionCount,
    approvedCount:    u.approvedCount,
    rejectedCount:    u.rejectedCount,
    isBanned:         u.isBanned,
    moderationStatus: u.moderationStatus?.status ?? 'active',
    pagesViewed:      u._count.nodeExplorations,
    connections:      u._count.connectionDiscoveries,
    totalEvents:      u._count.activityEvents,
    nodeSubmissions:  nodeMap[u.id]   ?? 0,
    edgeSubmissions:  edgeMap[u.id]   ?? 0,
    sourceSubmissions: sourceMap[u.id] ?? 0,
  }));

  return NextResponse.json(result);
}
