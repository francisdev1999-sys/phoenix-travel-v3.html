export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeAndSaveRiskProfile } from '@/lib/risk-profile';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const refresh = req.nextUrl.searchParams.get('refresh') === 'true';
  const page    = Math.max(1, Number(req.nextUrl.searchParams.get('page')  ?? 1));
  const limit   = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get('limit') ?? 50)));
  const skip    = (page - 1) * limit;

  if (refresh) {
    const staleAt = new Date(Date.now() - 30 * 60 * 1000);
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

  const riskWhere = { riskLevel: { in: ['watch', 'suspicious', 'high_risk'] as string[] } };

  const [total, profiles] = await Promise.all([
    prisma.userRiskProfile.count({ where: riskWhere }),
    prisma.userRiskProfile.findMany({
      where: riskWhere,
      orderBy: { riskScore: 'desc' },
      take:    limit,
      skip,
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
    }),
  ]);

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

  return NextResponse.json(result, {
    headers: {
      'X-Total-Count': String(total),
      'X-Total-Pages': String(Math.ceil(total / limit)),
      'X-Page':        String(page),
    },
  });
}
