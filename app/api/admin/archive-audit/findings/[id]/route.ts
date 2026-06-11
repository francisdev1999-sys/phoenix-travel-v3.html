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
  try {
    const session = await auth();
    if (!isAdminSession(session) || !session) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json() as { action?: string };
    const { action } = body;

    if (action !== 'approve' && action !== 'deny') {
      return NextResponse.json({ error: 'action must be "approve" or "deny"' }, { status: 400 });
    }

    const finding = await prisma.archiveAuditFinding.findUnique({ where: { id } });
    if (!finding) {
      return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
    }

    const reviewerEmail = session.user?.email ?? session.user?.id ?? 'unknown';
    const now = new Date();

    if (action === 'deny') {
      const updated = await prisma.archiveAuditFinding.update({
        where: { id },
        data: {
          status:     'denied',
          reviewedBy: reviewerEmail,
          reviewedAt: now,
        },
      });
      return NextResponse.json({ finding: updated });
    }

    // action === 'approve'
    if (finding.autoFixable) {
      // Cast to AuditFinding for applyFix
      const typedFinding: AuditFinding = {
        id:          finding.id,
        runId:       finding.runId,
        type:        finding.type as AuditFinding['type'],
        severity:    finding.severity as AuditFinding['severity'],
        status:      finding.status as AuditFinding['status'],
        nodeId:      finding.nodeId,
        edgeId:      finding.edgeId,
        title:       finding.title,
        description: finding.description,
        beforeState: finding.beforeState as Record<string, unknown>,
        afterState:  finding.afterState  as Record<string, unknown>,
        reasoning:   finding.reasoning,
        autoFixable: finding.autoFixable,
        reviewedBy:  finding.reviewedBy,
        reviewedAt:  finding.reviewedAt,
        appliedAt:   finding.appliedAt,
        applyError:  finding.applyError,
      };

      const result = await applyFix(typedFinding);

      const updated = await prisma.archiveAuditFinding.update({
        where: { id },
        data: {
          status:     result.success ? 'applied' : 'approved',
          reviewedBy: reviewerEmail,
          reviewedAt: now,
          appliedAt:  result.success ? now : null,
          applyError: result.error ?? null,
        },
      });
      return NextResponse.json({ finding: updated, applyResult: result });
    }

    // Non-auto-fixable: just approve
    const updated = await prisma.archiveAuditFinding.update({
      where: { id },
      data: {
        status:     'approved',
        reviewedBy: reviewerEmail,
        reviewedAt: now,
      },
    });
    return NextResponse.json({ finding: updated });
  } catch (err) {
    console.error('[PATCH /api/admin/archive-audit/findings/[id]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
