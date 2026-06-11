export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isOwnerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const threshold = Number(req.nextUrl.searchParams.get('threshold') ?? 15);
  const page      = Math.max(1, Number(req.nextUrl.searchParams.get('page')  ?? 1));
  const limit     = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get('limit') ?? 50)));
  const skip      = (page - 1) * limit;

  // Users with elevated spam scores
  const spamProfiles = await prisma.userRiskProfile.findMany({
    where:   { spamScore: { gte: threshold } },
    orderBy: { spamScore: 'desc' },
    take:    limit,
    skip,
    include: {
      user: {
        select: {
          id: true, name: true, email: true, image: true, role: true,
          createdAt: true, lastActiveAt: true,
          submissionCount: true, approvedCount: true, rejectedCount: true,
          isBanned: true,
          moderationStatus: { select: { status: true } },
        },
      },
    },
  });

  // Also catch users with > 50% rejection rate and at least 5 submissions but no risk profile
  const profileUserIds = new Set(spamProfiles.map(p => p.userId));
  const highRejectUsers = await prisma.user.findMany({
    where: {
      submissionCount: { gte: 5 },
      id: { notIn: Array.from(profileUserIds) },
    },
    select: {
      id: true, name: true, email: true, image: true, role: true,
      createdAt: true, lastActiveAt: true,
      submissionCount: true, approvedCount: true, rejectedCount: true,
      isBanned: true,
      moderationStatus: { select: { status: true } },
    },
  });

  const highRejectFiltered = highRejectUsers.filter(
    u => u.rejectedCount / u.submissionCount > 0.5,
  );

  const fromProfiles = spamProfiles.map(p => ({
    ...p.user,
    moderationStatus: p.user.moderationStatus?.status ?? 'active',
    spamScore:        p.spamScore,
    riskScore:        p.riskScore,
    riskLevel:        p.riskLevel,
    rejectionRate:    p.user.submissionCount > 0
      ? Math.round((p.user.rejectedCount / p.user.submissionCount) * 100)
      : 0,
    detectionSource: 'risk_profile' as const,
  }));

  const fromRejections = highRejectFiltered.map(u => ({
    ...u,
    moderationStatus: u.moderationStatus?.status ?? 'active',
    spamScore:        null,
    riskScore:        null,
    riskLevel:        'unscored',
    rejectionRate:    Math.round((u.rejectedCount / u.submissionCount) * 100),
    detectionSource:  'rejection_rate' as const,
  }));

  const result = [...fromProfiles, ...fromRejections];
  return NextResponse.json(result, {
    headers: { 'X-Total-Count': String(result.length), 'X-Page': String(page) },
  });
}
