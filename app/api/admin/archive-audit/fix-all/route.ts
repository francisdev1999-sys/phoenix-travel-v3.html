export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { applyFix } from '@/lib/audit/auto-fix';
import type { AuditFinding } from '@/lib/audit/types';

/**
 * POST /api/admin/archive-audit/fix-all
 *
 * Batch-applies all auto-fixable pending findings across ALL runs (or a
 * specific run if runId is passed in the body).
 *
 * Only fixes findings where autoFixable=true and status='pending'.
 * Never touches AI-quality or category_mismatch findings (not auto-fixable).
 * Returns { applied, skipped, failed, errors }.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!isAdminSession(session) || !session) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({})) as { runId?: string };
    const reviewerEmail = session.user?.email ?? session.user?.id ?? 'unknown';
    const now = new Date();

    const findings = await prisma.archiveAuditFinding.findMany({
      where: {
        autoFixable: true,
        status: 'pending',
        ...(body.runId ? { runId: body.runId } : {}),
      },
      take: 500,
    });

    let applied = 0, skipped = 0, failed = 0;
    const errors: string[] = [];

    for (const finding of findings) {
      const typedFinding: AuditFinding = {
        id:          finding.id,
        runId:       finding.runId,
        type:        finding.type        as AuditFinding['type'],
        severity:    finding.severity    as AuditFinding['severity'],
        status:      finding.status      as AuditFinding['status'],
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

      await prisma.archiveAuditFinding.update({
        where: { id: finding.id },
        data: {
          status:     result.success ? 'applied' : 'approved',
          reviewedBy: reviewerEmail,
          reviewedAt: now,
          appliedAt:  result.success ? now : null,
          applyError: result.error ?? null,
        },
      }).catch(() => {});

      if (result.success) applied++;
      else if (result.error?.includes('No auto-fix')) skipped++;
      else {
        failed++;
        if (result.error) errors.push(result.error);
      }
    }

    return NextResponse.json({
      applied,
      skipped,
      failed,
      total: findings.length,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    console.error('[POST /api/admin/archive-audit/fix-all]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
