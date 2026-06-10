export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { applyFix } from '@/lib/audit/auto-fix';
import type { AuditFinding } from '@/lib/audit/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as { action: 'approve' | 'deny' };

  if (body.action !== 'approve' && body.action !== 'deny') {
    return NextResponse.json({ error: 'action must be approve or deny' }, { status: 400 });
  }

  const finding = await prisma.archiveAuditFinding.findUnique({ where: { id } });
  if (!finding) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (finding.status !== 'pending') {
    return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });
  }

  if (body.action === 'deny') {
    await prisma.archiveAuditFinding.update({
      where: { id },
      data: { status: 'denied', reviewedBy: session?.user?.email ?? 'admin', reviewedAt: new Date() },
    });
    return NextResponse.json({ status: 'denied' });
  }

  // Approve: update status then try to apply the fix
  await prisma.archiveAuditFinding.update({
    where: { id },
    data: { status: 'approved', reviewedBy: session?.user?.email ?? 'admin', reviewedAt: new Date() },
  });

  if (finding.autoFixable) {
    const result = await applyFix(finding as unknown as AuditFinding);
    if (result.success) {
      await prisma.archiveAuditFinding.update({
        where: { id },
        data: { status: 'applied', appliedAt: new Date() },
      });
      return NextResponse.json({ status: 'applied' });
    } else {
      await prisma.archiveAuditFinding.update({
        where: { id },
        data: { applyError: result.error },
      });
      return NextResponse.json({ status: 'approved', applyError: result.error });
    }
  }

  return NextResponse.json({ status: 'approved' });
}
