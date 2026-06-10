/**
 * POST /api/admin/users/[id]/ban
 * Body: { ban: boolean, reason?: string, expiresAt?: string (ISO date) }
 * Requires canBanUsers permission or admin role.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminSession, isModSession, getUserPermissions } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role ?? 'user';
  const perms = await getUserPermissions(session.user.id, role);
  const canBan = isAdminSession(session) || isModSession(session) || perms.canBanUsers;

  if (!canBan) {
    return NextResponse.json({ error: 'Insufficient permissions to ban users' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const isBan: boolean = body?.ban ?? true;
  const reason: string = body?.reason ?? (isBan ? 'Policy violation' : 'Ban lifted');
  const expiresAt: string | undefined = body?.expiresAt;

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Cannot ban admins unless you are owner
  if (['owner', 'admin'].includes(target.role) && !isAdminSession(session)) {
    return NextResponse.json({ error: 'Cannot ban admin users' }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        isBanned:    isBan,
        banReason:   isBan ? reason : null,
        banExpiresAt: isBan && expiresAt ? new Date(expiresAt) : null,
        ...(isBan ? {} : { role: 'user' }), // Restore role on unban
      },
    }),
    prisma.moderationAction.create({
      data: {
        userId:      id,
        moderatorId: session.user.id,
        actionType:  isBan ? 'ban' : 'unban',
        reason,
        detail:      { expiresAt: expiresAt ?? null },
        expiresAt:   isBan && expiresAt ? new Date(expiresAt) : undefined,
      },
    }),
  ]);

  await logAudit({
    userId:     session.user.id,
    userEmail:  session.user.email ?? undefined,
    action:     isBan ? 'ban_user' : 'unban_user',
    entityType: 'user',
    entityId:   id,
    detail:     { reason, expiresAt },
  });

  return NextResponse.json({ success: true, isBanned: isBan });
}
