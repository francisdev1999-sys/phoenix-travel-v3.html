/**
 * GET  /api/admin/users/[id]/permissions — fetch effective permissions
 * POST /api/admin/users/[id]/permissions — update permission flags
 * Only owner can grant admin-level permissions.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  isAdminSession, isSuperAdminSession,
  getUserPermissions, setUserPermissions,
  ALL_PERMISSIONS,
} from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const ADMIN_LEVEL_PERMISSIONS = [
  'canAssignRoles', 'canBanUsers', 'canViewPlatformHealth',
  'canViewTraffic', 'canViewCosts', 'canViewSecurityLogs',
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id }, select: { id: true, role: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const permissions = await getUserPermissions(id, user.role);
  return NextResponse.json({ userId: id, role: user.role, permissions });
}

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
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  // Validate keys
  const invalidKeys = Object.keys(body).filter(k => !ALL_PERMISSIONS.includes(k as never));
  if (invalidKeys.length > 0) {
    return NextResponse.json(
      { error: `Unknown permission flags: ${invalidKeys.join(', ')}` },
      { status: 400 },
    );
  }

  // Admin-level permissions require owner
  const adminFlags = Object.keys(body).filter(k => ADMIN_LEVEL_PERMISSIONS.includes(k));
  if (adminFlags.length > 0 && !isSuperAdminSession(session)) {
    return NextResponse.json(
      { error: 'Only the owner can grant admin-level permissions.' },
      { status: 403 },
    );
  }

  await setUserPermissions(id, body, session.user.id);

  await logAudit({
    userId:     session.user.id,
    userEmail:  session.user.email ?? undefined,
    action:     'permission_change',
    entityType: 'user',
    entityId:   id,
    detail:     { flags: body },
  });

  return NextResponse.json({ success: true });
}
