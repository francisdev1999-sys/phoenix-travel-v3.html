export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const page  = Math.max(1, Number(req.nextUrl.searchParams.get('page')  ?? 1));
  const limit = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get('limit') ?? 50)));
  const skip  = (page - 1) * limit;

  const [total, users] = await Promise.all([
    prisma.user.count({ where: { approvedCount: { gt: 0 } } }),
    prisma.user.findMany({
      where:   { approvedCount: { gt: 0 } },
      orderBy: { approvedCount: 'desc' },
      take:    limit,
      skip,
      select: {
        id: true, name: true, email: true, image: true, role: true,
        createdAt: true, lastActiveAt: true,
        trustScore: true, approvedCount: true,
        submissionCount: true, rejectedCount: true,
        isBanned: true,
      },
    }),
  ]);

  const userIds = users.map(u => u.id);

  // Approved counts per content type
  const [approvedNodes, approvedEdges, approvedSources, avgSourceQuality] = await Promise.all([
    prisma.proposedNode.groupBy({
      by: ['submittedBy'],
      where: { submittedBy: { in: userIds }, status: 'approved' },
      _count: { id: true },
    }),
    prisma.proposedEdge.groupBy({
      by: ['submittedBy'],
      where: { submittedBy: { in: userIds }, status: 'approved' },
      _count: { id: true },
    }),
    prisma.source.groupBy({
      by: ['submittedBy'],
      where: { submittedBy: { in: userIds }, status: 'approved' },
      _count: { id: true },
    }),
    prisma.source.groupBy({
      by: ['submittedBy'],
      where: { submittedBy: { in: userIds }, status: 'approved' },
      _avg: { credibilityScore: true },
    }),
  ]);

  const nodeMap    = Object.fromEntries(approvedNodes.map(r => [r.submittedBy, r._count.id]));
  const edgeMap    = Object.fromEntries(approvedEdges.map(r => [r.submittedBy, r._count.id]));
  const sourceMap  = Object.fromEntries(approvedSources.map(r => [r.submittedBy ?? '', r._count.id]));
  const qualityMap = Object.fromEntries(avgSourceQuality.map(r => [r.submittedBy ?? '', r._avg.credibilityScore ?? 0]));

  const result = users.map(u => {
    const approvalRate = u.submissionCount > 0
      ? Math.round((u.approvedCount / u.submissionCount) * 100)
      : 0;

    return {
      id:              u.id,
      name:            u.name,
      email:           u.email,
      image:           u.image,
      role:            u.role,
      createdAt:       u.createdAt,
      lastActiveAt:    u.lastActiveAt,
      trustScore:      u.trustScore,
      approvedCount:   u.approvedCount,
      submissionCount: u.submissionCount,
      rejectedCount:   u.rejectedCount,
      isBanned:        u.isBanned,
      approvedNodes:   nodeMap[u.id]    ?? 0,
      approvedEdges:   edgeMap[u.id]    ?? 0,
      approvedSources: sourceMap[u.id]  ?? 0,
      approvalRate,
      avgSourceQuality: qualityMap[u.id] ?? null,
    };
  });

  return NextResponse.json(result, {
    headers: {
      'X-Total-Count': String(total),
      'X-Total-Pages': String(Math.ceil(total / limit)),
      'X-Page':        String(page),
    },
  });
}
