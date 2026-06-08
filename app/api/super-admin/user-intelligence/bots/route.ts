export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isOwnerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const threshold = Number(req.nextUrl.searchParams.get('threshold') ?? 20);
  const page      = Math.max(1, Number(req.nextUrl.searchParams.get('page')  ?? 1));
  const limit     = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get('limit') ?? 50)));
  const skip      = (page - 1) * limit;
  const h1ago     = new Date(Date.now() - 60 * 60 * 1000);

  // Users with elevated bot scores
  const highBotProfiles = await prisma.userRiskProfile.findMany({
    where:   { botScore: { gte: threshold } },
    orderBy: { botScore: 'desc' },
    take:    limit,
    skip,
    include: {
      user: {
        select: {
          id: true, name: true, email: true, image: true, role: true,
          createdAt: true, lastActiveAt: true, isBanned: true,
          moderationStatus: { select: { status: true } },
        },
      },
    },
  });

  // Also detect by raw activity: users with >80 events in last hour
  const activeUserIds = new Set(highBotProfiles.map(p => p.userId));
  const highVelocityUsers = await prisma.userActivityEvent.groupBy({
    by:      ['userId'],
    where:   { createdAt: { gte: h1ago } },
    _count:  { id: true },
    having:  { id: { _count: { gte: 80 } } },
    orderBy: { _count: { id: 'desc' } },
    take:    50,
  });

  const newBotUserIds = highVelocityUsers
    .map(r => r.userId)
    .filter(id => !activeUserIds.has(id));

  let extraUsers: {
    id: string; name: string | null; email: string | null; image: string | null;
    role: string; createdAt: Date; lastActiveAt: Date | null; isBanned: boolean;
    moderationStatus: { status: string } | null;
  }[] = [];
  if (newBotUserIds.length > 0) {
    extraUsers = await prisma.user.findMany({
      where:  { id: { in: newBotUserIds } },
      select: {
        id: true, name: true, email: true, image: true, role: true,
        createdAt: true, lastActiveAt: true, isBanned: true,
        moderationStatus: { select: { status: true } },
      },
    });
  }

  const eventCountMap = Object.fromEntries(highVelocityUsers.map(r => [r.userId, r._count.id]));

  const fromProfiles = highBotProfiles.map(p => ({
    ...p.user,
    moderationStatus:  p.user.moderationStatus?.status ?? 'active',
    botScore:          p.botScore,
    riskScore:         p.riskScore,
    riskLevel:         p.riskLevel,
    reasons:           p.reasons,
    recentEvents1h:    eventCountMap[p.userId] ?? null,
    detectionSource:   'risk_profile' as const,
  }));

  const fromVelocity = extraUsers.map(u => ({
    ...u,
    moderationStatus: u.moderationStatus?.status ?? 'active',
    botScore:         null,
    riskScore:        null,
    riskLevel:        'unscored',
    reasons:          [],
    recentEvents1h:   eventCountMap[u.id],
    detectionSource:  'velocity' as const,
  }));

  const result = [...fromProfiles, ...fromVelocity];
  return NextResponse.json(result, {
    headers: { 'X-Total-Count': String(result.length), 'X-Page': String(page) },
  });
}
