export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const now    = new Date();
  const h24ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const h1ago  = new Date(now.getTime() -      60 * 60 * 1000);
  const d7ago  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000);

  const [
    newSignups24h,
    newAccountSubmissions24h,
    highRiskProfiles,
    bannedCount,
    suspendedCount,
    watchCount,
    totalUsers,
    recentEvents1h,
    ipHashClusters,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: h24ago } } }),
    prisma.proposedNode.count({
      where: {
        createdAt: { gte: h24ago },
        submitter: { createdAt: { gte: d7ago } },
      },
    }),
    prisma.userRiskProfile.count({ where: { riskLevel: { in: ['suspicious', 'high_risk'] } } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.userModerationStatus.count({ where: { status: 'suspended' } }),
    prisma.userModerationStatus.count({ where: { status: 'watched' } }),
    prisma.user.count(),
    prisma.userActivityEvent.count({ where: { createdAt: { gte: h1ago } } }),
    prisma.userActivityEvent.groupBy({
      by:      ['ipHash'],
      where:   { createdAt: { gte: h24ago }, ipHash: { not: null } },
      _count:  { userId: true },
      having:  { userId: { _count: { gt: 3 } } },
    }),
  ]);

  const alerts: { type: string; message: string; severity: 'info' | 'warning' | 'critical' }[] = [];

  if (newSignups24h > 20) {
    alerts.push({ type: 'signup_spike', severity: 'warning',
      message: `${newSignups24h} new accounts created in the last 24 hours — possible signup spike.` });
  }

  if (newAccountSubmissions24h > 15) {
    alerts.push({ type: 'new_account_spam', severity: 'warning',
      message: `${newAccountSubmissions24h} submissions from accounts < 7 days old in the last 24 h.` });
  }

  if (highRiskProfiles > 0) {
    alerts.push({ type: 'high_risk_users', severity: highRiskProfiles >= 5 ? 'critical' : 'warning',
      message: `${highRiskProfiles} user(s) currently rated suspicious or high-risk.` });
  }

  if (ipHashClusters.length > 0) {
    alerts.push({ type: 'ip_cluster', severity: 'critical',
      message: `${ipHashClusters.length} IP hash(es) linked to more than 3 accounts in the last 24 h — possible multi-account abuse.` });
  }

  if (recentEvents1h > 5000) {
    alerts.push({ type: 'traffic_spike', severity: 'warning',
      message: `${recentEvents1h} activity events in the last hour — unusually high traffic.` });
  }

  return NextResponse.json({
    alerts,
    summary: {
      totalUsers,
      newSignups24h,
      bannedCount,
      suspendedCount,
      watchCount,
      highRiskCount: highRiskProfiles,
      recentEvents1h,
    },
  });
}
