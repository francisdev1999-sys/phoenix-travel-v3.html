/**
 * GET /api/user/profile — public-ish profile: trust, rank, badges, activity.
 * Returns own profile if no ?userId param. Others' profiles show limited data.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { trustLevel } from '@/lib/trust-score';
import { evaluateBadges, refreshUserRank, logActivity } from '@/lib/rank-system';

export async function GET(req: NextRequest) {
  const session  = await auth();
  const targetId = req.nextUrl.searchParams.get('userId') ?? session?.user?.id;
  if (!targetId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const isSelf = session?.user?.id === targetId;

  const user = await prisma.user.findUnique({
    where:  { id: targetId },
    select: {
      id: true, name: true, email: isSelf, image: true, role: true,
      trustScore: true, activityScore: true, rank: true, createdAt: true,
      lastActiveAt: true, warningCount: isSelf, isBanned: isSelf,
      submissionCount: true, approvedCount: true, rejectedCount: true,
      earnedBadges: {
        include: { badge: true },
        orderBy: { awardedAt: 'asc' },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Auto-check badges and refresh rank on own profile load
  if (isSelf) {
    await Promise.all([evaluateBadges(targetId), refreshUserRank(targetId)]);
    // Log activity
    await logActivity(targetId, 'login').catch(() => {});
  }

  return NextResponse.json({
    id:          user.id,
    name:        user.name,
    image:       user.image,
    role:        user.role,
    rank:        user.rank,
    trustScore:  Math.round(user.trustScore),
    trustLevel:  trustLevel(user.trustScore),
    activityScore: Math.round(user.activityScore),
    memberSince: user.createdAt,
    lastActive:  user.lastActiveAt,
    stats: {
      submissions: user.submissionCount,
      approved:    user.approvedCount,
      rejected:    user.rejectedCount,
    },
    badges: user.earnedBadges.map(b => ({
      id:          b.badgeId,
      name:        b.badge.name,
      description: b.badge.description,
      icon:        b.badge.icon,
      category:    b.badge.category,
      awardedAt:   b.awardedAt,
    })),
    // Own profile extras
    ...(isSelf ? {
      email:        (user as { email?: string | null }).email,
      warningCount: (user as { warningCount?: number }).warningCount,
      isBanned:     (user as { isBanned?: boolean }).isBanned,
    } : {}),
  });
}
