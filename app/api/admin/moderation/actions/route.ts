/**
 * GET  /api/admin/moderation/actions?userId=... — history for a user
 * POST /api/admin/moderation/actions — warn a user
 * Body: { userId, actionType: 'warning'|'suspension', reason, expiresAt? }
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminSession, isModSession, getUserPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { applyTrustEvent } from '@/lib/trust-score';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session) && !isModSession(session)) {
    return NextResponse.json({ error: 'Moderator access required' }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const actions = await prisma.moderationAction.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: { moderator: { select: { name: true, email: true } } },
  });

  return NextResponse.json({ actions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role  = session.user.role ?? 'user';
  const perms = await getUserPermissions(session.user.id, role);

  if (!isAdminSession(session) && !isModSession(session) && !perms.canBanUsers) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { userId, actionType, reason, expiresAt } = body ?? {};

  const VALID_TYPES = ['warning', 'suspension'];
  if (!VALID_TYPES.includes(actionType)) {
    return NextResponse.json({ error: `actionType must be: ${VALID_TYPES.join(', ')}` }, { status: 400 });
  }
  if (!userId || !reason) {
    return NextResponse.json({ error: 'userId and reason are required' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId }, select: { id: true, warningCount: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.$transaction([
    prisma.moderationAction.create({
      data: {
        userId,
        moderatorId: session.user.id,
        actionType,
        reason,
        expiresAt:  expiresAt ? new Date(expiresAt) : undefined,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { warningCount: { increment: 1 } },
    }),
  ]);

  // Apply trust penalty for warnings
  await applyTrustEvent(userId, 'moderator_warning', undefined, reason, session.user.id);

  await logAudit({
    userId:     session.user.id,
    userEmail:  session.user.email ?? undefined,
    action:     `moderation_${actionType}`,
    entityType: 'user',
    entityId:   userId,
    detail:     { reason, expiresAt },
  });

  return NextResponse.json({ success: true });
}
