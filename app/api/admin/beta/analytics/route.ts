export const dynamic = 'force-dynamic';
/**
 * GET /api/admin/beta/analytics
 * Aggregate usage metrics for the beta program dashboard.
 * Optional: ?days=7 (default 30)
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 401 });
  }

  const days = Math.min(Number(req.nextUrl.searchParams.get('days') ?? 30), 90);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    eventCounts,
    feedbackCounts,
    inviteCounts,
    sourceSubmissions,
    pendingNodes,
    searchEvents,
  ] = await Promise.all([
    // Usage by event type
    prisma.usageEvent.groupBy({
      by: ['eventType'],
      _count: { _all: true },
      where: { createdAt: { gte: since } },
      orderBy: { _count: { eventType: 'desc' } },
    }),

    // Feedback by status
    prisma.betaFeedback.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),

    // Invite stats
    prisma.betaInvite.aggregate({
      _sum:   { usedCount: true, maxUses: true },
      _count: { _all: true },
    }),

    // Source submission quality (last N days)
    prisma.source.groupBy({
      by: ['status'],
      _count: { _all: true },
      where: { createdAt: { gte: since } },
    }),

    // Moderation workload — pending nodes + edges
    Promise.all([
      prisma.proposedNode.count({ where: { status: 'pending' } }),
      prisma.proposedEdge.count({ where: { status: 'pending' } }),
    ]),

    // Search events with result counts for success rate
    prisma.usageEvent.findMany({
      where: { eventType: { in: ['search', 'search_click'] }, createdAt: { gte: since } },
      select: { eventType: true, meta: true },
      take: 1000,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Search success rate: percentage of searches that led to a click
  const totalSearches  = searchEvents.filter(e => e.eventType === 'search').length;
  const successClicks  = searchEvents.filter(e => e.eventType === 'search_click').length;
  const searchSuccessRate = totalSearches > 0 ? Math.round((successClicks / totalSearches) * 100) : null;

  // Zero-result searches
  const zeroResultSearches = searchEvents.filter(e => {
    if (e.eventType !== 'search') return false;
    const m = e.meta as { resultCount?: number } | null;
    return m?.resultCount === 0;
  }).length;

  const [pendingNodeCount, pendingEdgeCount] = pendingNodes;

  const byEventType: Record<string, number> = {};
  for (const row of eventCounts) {
    byEventType[row.eventType] = row._count._all;
  }

  const feedbackByStatus: Record<string, number> = {};
  for (const row of feedbackCounts) {
    feedbackByStatus[row.status] = row._count._all;
  }

  const sourceByStatus: Record<string, number> = {};
  for (const row of sourceSubmissions) {
    sourceByStatus[row.status] = row._count._all;
  }

  const totalSources  = Object.values(sourceByStatus).reduce((a, b) => a + b, 0);
  const approvedCount = sourceByStatus['approved'] ?? 0;
  const rejectedCount = sourceByStatus['rejected'] ?? 0;
  const sourceApprovalRate = totalSources > 0 ? Math.round((approvedCount / totalSources) * 100) : null;
  const sourceRejectionRate = totalSources > 0 ? Math.round((rejectedCount / totalSources) * 100) : null;

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    usage: {
      byEventType,
      totalEvents: Object.values(byEventType).reduce((a, b) => a + b, 0),
      graph:     byEventType['graph_view']    ?? 0,
      timeline:  byEventType['timeline_view'] ?? 0,
      globe:     byEventType['globe_view']    ?? 0,
      sources:   byEventType['source_view']   ?? 0,
      nodeViews: byEventType['node_view']     ?? 0,
      universe:  byEventType['universe_view'] ?? 0,
      evidence:  byEventType['evidence_view'] ?? 0,
      rabbitHole: byEventType['rabbit_hole']  ?? 0,
    },
    search: {
      total:        totalSearches,
      clicks:       successClicks,
      successRate:  searchSuccessRate,
      zeroResults:  zeroResultSearches,
    },
    feedback: {
      byStatus:  feedbackByStatus,
      total:     Object.values(feedbackByStatus).reduce((a, b) => a + b, 0),
      open:      feedbackByStatus['open']      ?? 0,
      reviewing: feedbackByStatus['reviewing'] ?? 0,
    },
    invites: {
      total:    inviteCounts._count._all,
      maxUses:  inviteCounts._sum.maxUses  ?? 0,
      usedSlots: inviteCounts._sum.usedCount ?? 0,
    },
    moderation: {
      pendingNodes: pendingNodeCount,
      pendingEdges: pendingEdgeCount,
      totalPending: pendingNodeCount + pendingEdgeCount,
    },
    sourceQuality: {
      byStatus: sourceByStatus,
      total:    totalSources,
      approvalRate:  sourceApprovalRate,
      rejectionRate: sourceRejectionRate,
    },
  });
}
