/**
 * PATCH /api/admin/moderation/reports/[id]
 * Resolve or dismiss a report.
 * Body: { status: 'resolved' | 'dismissed' | 'investigating', resolveNote?: string }
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isModSession, isAdminSession } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session || (!isAdminSession(session) && !isModSession(session))) {
    return NextResponse.json({ error: 'Moderator access required' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { status, resolveNote } = body ?? {};

  const VALID_STATUSES = ['resolved', 'dismissed', 'investigating'];
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  await prisma.report.update({
    where: { id },
    data: {
      status,
      resolvedBy:  status !== 'investigating' ? session.user.id : undefined,
      resolvedAt:  status !== 'investigating' ? new Date() : undefined,
      resolveNote: resolveNote ?? null,
    },
  });

  await logAudit({
    userId:     session.user.id,
    userEmail:  session.user.email ?? undefined,
    action:     `report_${status}`,
    entityType: 'report',
    entityId:   id,
    detail:     { resolveNote },
  });

  return NextResponse.json({ success: true, status });
}
