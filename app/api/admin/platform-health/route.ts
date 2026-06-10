/**
 * GET /api/admin/platform-health
 * Full platform analytics — super admin and canViewPlatformHealth only.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isSuperAdminSession, getUserPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role  = session.user.role ?? 'user';
  const perms = await getUserPermissions(session.user.id, role);

  if (!isSuperAdminSession(session) && !perms.canViewPlatformHealth) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const now    = new Date();
  const day    = new Date(now); day.setHours(0, 0, 0, 0);
  const week   = new Date(now); week.setDate(week.getDate() - 7);
  const month  = new Date(now); month.setDate(1); month.setHours(0, 0, 0, 0);

  const [
    totalUsers, activeDay, activeWeek, activeMonth,
    totalNodes, publishedNodes, draftNodes,
    totalEdges, publishedEdges,
    totalSources, pendingSources, approvedSources,
    pendingProposedNodes, pendingProposedEdges,
    openReports,
    pendingSuggestions,
    aiStats,
    topNodes,
    recentSignups,
    bannedUsers,
    modActions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: day } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: week } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: month } } }),
    prisma.node.count(),
    prisma.node.count({ where: { status: 'published' } }),
    prisma.node.count({ where: { status: 'draft' } }),
    prisma.edge.count(),
    prisma.edge.count({ where: { status: 'published' } }),
    prisma.source.count(),
    prisma.source.count({ where: { status: 'pending' } }),
    prisma.source.count({ where: { status: 'approved' } }),
    prisma.proposedNode.count({ where: { status: 'pending' } }),
    prisma.proposedEdge.count({ where: { status: 'pending' } }),
    prisma.report.count({ where: { status: 'open' } }),
    prisma.relationshipSuggestion.count({ where: { status: 'pending' } }),
    // AI cost this month
    prisma.aiResearchReview.aggregate({
      where:   { createdAt: { gte: month } },
      _count:  { id: true },
      _sum:    { estimatedCost: true, inputTokens: true, outputTokens: true },
    }),
    // Top 5 most-explored nodes (proxy: most source links)
    prisma.node.findMany({
      where:   { status: 'published' },
      orderBy: { sourceLinks: { _count: 'desc' } },
      take:    5,
      select:  { id: true, title: true, evidenceLevel: true, _count: { select: { sourceLinks: true } } },
    }),
    // Signups in last 7 days
    prisma.user.count({ where: { createdAt: { gte: week } } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.moderationAction.count({ where: { createdAt: { gte: month } } }),
  ]);

  // Role distribution
  const roleGroups = await prisma.user.groupBy({
    by:      ['role'],
    _count:  { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const canSeeCosts = isSuperAdminSession(session) || perms.canViewCosts;

  return NextResponse.json({
    users: {
      total: totalUsers, dau: activeDay, wau: activeWeek, mau: activeMonth,
      recentSignups, bannedUsers,
      byRole: roleGroups.map(r => ({ role: r.role, count: r._count.id })),
    },
    content: {
      nodes:        { total: totalNodes, published: publishedNodes, drafts: draftNodes },
      edges:        { total: totalEdges, published: publishedEdges },
      sources:      { total: totalSources, pending: pendingSources, approved: approvedSources },
    },
    queues: {
      pendingNodes:       pendingProposedNodes,
      pendingEdges:       pendingProposedEdges,
      pendingSuggestions,
      openReports,
    },
    moderation: { actionsThisMonth: modActions },
    ai: {
      reviewsThisMonth: aiStats._count.id,
      inputTokens:      aiStats._sum.inputTokens  ?? 0,
      outputTokens:     aiStats._sum.outputTokens ?? 0,
      ...(canSeeCosts ? { estimatedCostUsd: Math.round((aiStats._sum.estimatedCost ?? 0) * 10000) / 10000 } : {}),
    },
    topNodes,
    generatedAt: now.toISOString(),
  });
}
