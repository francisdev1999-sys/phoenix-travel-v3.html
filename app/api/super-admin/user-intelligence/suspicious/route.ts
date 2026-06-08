export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isOwnerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeAndSaveRiskProfile } from '@/lib/risk-profile';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const refresh = req.nextUrl.searchParams.get('refresh') === 'true';
  const limit   = Math.min(200, Number(req.nextUrl.searchParams.get('limit') ?? 100));

  // If refresh requested, recompute risk for all users without a recent profile
  if (refresh) {
    const staleAt = new Date(Date.now() - 30 * 60 * 1000); // older than 30 min
    const staleUsers = await prisma.user.findMany({
      where: {
        OR: [
          { riskProfile: null },
          { riskProfile: { lastCalculatedAt: { lt: staleAt } } },
        ],
      },
      select: { id: true },
      take: 200,
    });
    await Promise.allSettled(staleUsers.map(u => computeAndSaveRiskProfile(u.id)));
  }

  const profiles = await prisma.userRiskProfile.findMany({
    where:   { riskLevel: { in: ['watch', 'suspicious', 'high_risk'] } },
    orderBy: { riskScore: 'desc' },
    take:    limit,
    include: {
      user: {
        select: {
          id: true, name: true, email: true, image: true, role: true,
          createdAt: true, lastActiveAt: true,
          trustScore: true, submissionCount: true,
          approvedCount: true, rejectedCount: true, isBanned: true,
          moderationStatus: { select: { status: true } },
        },
      },
    },
  });

  const result = profiles.map(p => ({
    ...p.user,
    moderationStatus: p.user.moderationStatus?.status ?? 'active',
    riskScore:        p.riskScore,
    riskLevel:        p.riskLevel,
    spamScore:        p.spamScore,
    botScore:         p.botScore,
    reasons:          p.reasons,
    lastCalculatedAt: p.lastCalculatedAt,
  }));

  return NextResponse.json(result);
}
