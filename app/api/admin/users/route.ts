/**
 * GET /api/admin/users
 * Lists all users with trust, activity, rank, badge counts.
 * Admin-only.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const page    = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const limit   = Math.min(100, Math.max(10, Number(searchParams.get('limit') ?? 50)));
  const search  = searchParams.get('search')  ?? '';
  const role    = searchParams.get('role')    ?? '';
  const banned  = searchParams.get('banned')  ?? '';
  const sortBy  = (searchParams.get('sortBy') ?? 'createdAt') as string;
  const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role)   where.role    = role;
  if (banned === 'true')  where.isBanned = true;
  if (banned === 'false') where.isBanned = false;

  const orderBy: Record<string, string> = {};
  if (['createdAt', 'trustScore', 'activityScore', 'approvedCount', 'lastActiveAt'].includes(sortBy)) {
    orderBy[sortBy] = sortDir;
  } else {
    orderBy.createdAt = 'desc';
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, name: true, email: true, image: true, role: true,
        trustScore: true, activityScore: true, rank: true,
        isBanned: true, banExpiresAt: true, warningCount: true,
        submissionCount: true, approvedCount: true, rejectedCount: true,
        createdAt: true, lastActiveAt: true,
        _count: { select: { earnedBadges: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
