export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isOwnerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const statusFilter = req.nextUrl.searchParams.get('status') ?? 'banned';
  const page         = Math.max(1, Number(req.nextUrl.searchParams.get('page')  ?? 1));
  const limit        = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get('limit') ?? 50)));
  const skip         = (page - 1) * limit;

  // banned via User.isBanned
  const bannedUsers = await prisma.user.findMany({
    where:   { isBanned: true },
    orderBy: { updatedAt: 'desc' },
    take:    limit,
    skip,
    select: {
      id: true, name: true, email: true, image: true, role: true,
      createdAt: true, lastActiveAt: true, updatedAt: true,
      banReason: true, banExpiresAt: true,
      submissionCount: true, approvedCount: true, rejectedCount: true,
      moderationStatus: { select: { status: true, reason: true, changedBy: true, changedAt: true } },
      riskProfile:      { select: { riskScore: true, riskLevel: true } },
    },
  });

  // suspended/restricted via UserModerationStatus
  const moderatedUsers = statusFilter !== 'banned'
    ? await prisma.userModerationStatus.findMany({
        where:   { status: statusFilter },
        orderBy: { changedAt: 'desc' },
        take:    limit,
        include: {
          user: {
            select: {
              id: true, name: true, email: true, image: true, role: true,
              createdAt: true, lastActiveAt: true,
              submissionCount: true, approvedCount: true, rejectedCount: true,
              isBanned: true,
              riskProfile: { select: { riskScore: true, riskLevel: true } },
            },
          },
        },
      })
    : [];

  const banned = bannedUsers.map(u => ({
    id:              u.id,
    name:            u.name,
    email:           u.email,
    image:           u.image,
    role:            u.role,
    createdAt:       u.createdAt,
    lastActiveAt:    u.lastActiveAt,
    submissionCount: u.submissionCount,
    approvedCount:   u.approvedCount,
    rejectedCount:   u.rejectedCount,
    isBanned:        true,
    banReason:       u.banReason,
    banExpiresAt:    u.banExpiresAt,
    moderationStatus: u.moderationStatus?.status ?? 'banned',
    changedBy:        u.moderationStatus?.changedBy ?? null,
    changedAt:        u.moderationStatus?.changedAt ?? u.updatedAt,
    riskScore:        u.riskProfile?.riskScore ?? null,
    riskLevel:        u.riskProfile?.riskLevel ?? null,
    statusType:       'banned',
  }));

  const moderated = moderatedUsers.map(m => ({
    id:              m.user.id,
    name:            m.user.name,
    email:           m.user.email,
    image:           m.user.image,
    role:            m.user.role,
    createdAt:       m.user.createdAt,
    lastActiveAt:    m.user.lastActiveAt,
    submissionCount: m.user.submissionCount,
    approvedCount:   m.user.approvedCount,
    rejectedCount:   m.user.rejectedCount,
    isBanned:        m.user.isBanned,
    banReason:       m.reason,
    banExpiresAt:    null,
    moderationStatus: m.status,
    changedBy:        m.changedBy,
    changedAt:        m.changedAt,
    riskScore:        m.user.riskProfile?.riskScore ?? null,
    riskLevel:        m.user.riskProfile?.riskLevel ?? null,
    statusType:       m.status,
  }));

  const result = statusFilter === 'banned' ? banned : moderated;
  return NextResponse.json(result, {
    headers: { 'X-Total-Count': String(result.length), 'X-Page': String(page) },
  });
}
