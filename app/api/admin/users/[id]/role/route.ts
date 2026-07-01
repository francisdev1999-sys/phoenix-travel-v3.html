/**
 * POST /api/admin/users/[id]/role
 * Sets a user's role. Only an existing owner can grant the owner or admin role
 * (or change the role of an existing owner/admin) — this is how a second,
 * co-equal owner is minted. All other roles can be assigned by any admin.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isAdminSession, isSuperAdminSession, ADMIN_ROLES } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { evaluateBadges, refreshUserRank } from '@/lib/rank-system';

const VALID_ROLES = [
  'owner', 'admin', 'moderation_admin', 'reviewer', 'source_verifier',
  'verified_contributor', 'contributor', 'user', 'banned',
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session) || !session) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const role: string = body?.role ?? '';

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Invalid role. Valid roles: ${VALID_ROLES.join(', ')}` },
      { status: 400 },
    );
  }

  // Only an existing owner can promote to owner or admin.
  if ((ADMIN_ROLES as string[]).includes(role) && !isSuperAdminSession(session)) {
    return NextResponse.json(
      { error: 'Only the owner can assign the owner or admin role.' },
      { status: 403 },
    );
  }

  if (id === session.user.id) {
    return NextResponse.json({ error: 'You cannot change your own role' }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Cannot demote another admin unless you are owner
  if ((ADMIN_ROLES as string[]).includes(target.role) && !isSuperAdminSession(session)) {
    return NextResponse.json(
      { error: 'Only the owner can change an admin\'s role.' },
      { status: 403 },
    );
  }

  await prisma.user.update({ where: { id }, data: { role } });

  await logAudit({
    userId:     session.user.id,
    userEmail:  session.user.email ?? undefined,
    action:     'role_change',
    entityType: 'user',
    entityId:   id,
    detail:     { previousRole: target.role, newRole: role },
  });

  // Re-evaluate badges and rank after role change
  await Promise.all([evaluateBadges(id), refreshUserRank(id)]);

  return NextResponse.json({ success: true, role });
}
