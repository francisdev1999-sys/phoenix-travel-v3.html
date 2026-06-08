/**
 * POST /api/import/batch/:batchId/bulk-action
 *
 * Runs a bulk action over all nodes in an import batch.
 *
 * Actions:
 *   approve_iqs_80   — set adminReviewStatus='ready_to_review' on all nodes with IQS ≥ 80
 *   reject_iqs_40    — set adminReviewStatus='soft_rejected'   on all nodes with IQS < 40
 *   publish_approved — publish all nodes with adminReviewStatus='ready_to_review' (draft→published)
 *
 * Admin-only.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeIQS } from '@/lib/validation/iqs';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ batchId: string }> };

const VALID_ACTIONS = ['approve_iqs_80', 'reject_iqs_40', 'publish_approved'] as const;
type BulkAction = typeof VALID_ACTIONS[number];

export async function POST(req: NextRequest, { params }: Params) {
  const { batchId } = await params;
  const session = await auth();
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = body.action as string;

  if (!VALID_ACTIONS.includes(action as BulkAction)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: {
      nodes: {
        include: {
          tags:          { select: { tag: true } },
          claims:        { orderBy: { orderIndex: 'asc' } },
          criticisms:    { orderBy: { orderIndex: 'asc' } },
          openQuestions: { orderBy: { orderIndex: 'asc' } },
          sourceLinks:   { select: { sourceId: true } },
        },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  if (batch.status === 'rolledback') {
    return NextResponse.json({ error: 'Cannot act on a rolled-back batch' }, { status: 409 });
  }

  const now     = new Date();
  const userId  = session!.user!.id ?? null;
  const email   = session!.user!.email ?? null;
  let   affected = 0;

  if (action === 'approve_iqs_80') {
    const targets = batch.nodes.filter(node => {
      const raw = buildIQSInput(node);
      return computeIQS(raw).score >= 80;
    });

    for (const node of targets) {
      await prisma.node.update({
        where: { id: node.id },
        data:  { adminReviewStatus: 'ready_to_review' },
      });
      await writeAuditLog({ userId, userEmail: email, action: 'bulk_approve', entityType: 'node', entityId: node.id, detail: { batchId, iqsAction: 'approve_iqs_80' } });
    }
    affected = targets.length;

  } else if (action === 'reject_iqs_40') {
    const targets = batch.nodes.filter(node => {
      const raw = buildIQSInput(node);
      return computeIQS(raw).score < 40;
    });

    for (const node of targets) {
      await prisma.node.update({
        where: { id: node.id },
        data:  { adminReviewStatus: 'soft_rejected' },
      });
      await writeAuditLog({ userId, userEmail: email, action: 'bulk_reject', entityType: 'node', entityId: node.id, detail: { batchId, iqsAction: 'reject_iqs_40' } });
    }
    affected = targets.length;

  } else if (action === 'publish_approved') {
    // Only nodes with adminReviewStatus='ready_to_review' and status='draft'
    const targets = batch.nodes.filter(
      n => n.adminReviewStatus === 'ready_to_review' && n.status === 'draft',
    );

    for (const node of targets) {
      await prisma.$transaction(async (tx) => {
        await tx.node.update({
          where: { id: node.id },
          data:  { status: 'published', publishedAt: now, version: { increment: 1 } },
        });
        await tx.nodeVersion.create({
          data: {
            nodeId:     node.id,
            version:    node.version + 1,
            snapshot:   { id: node.id, title: node.title, status: 'published', publishedAt: now.toISOString(), bulkPublished: true },
            changedBy:  userId,
            changeNote: `Bulk published via batch ${batchId}`,
          },
        });
      });
      await writeAuditLog({ userId, userEmail: email, action: 'bulk_publish', entityType: 'node', entityId: node.id, detail: { batchId } });
    }
    affected = targets.length;
  }

  await writeAuditLog({ userId, userEmail: email, action: 'bulk_approve', entityType: 'batch', entityId: batchId, detail: { action, affected } });

  return NextResponse.json({ message: `Bulk action '${action}' applied.`, affected });
}

function buildIQSInput(node: {
  id: string; title: string; mainstreamView: string | null;
  evidenceLevel: string; confidenceScore: number; year: number | null;
  dateStart: number | null; lat: number | null; lon: number | null;
  tags: { tag: string }[]; claims: { text: string }[];
  criticisms: { text: string }[]; openQuestions: { text: string }[];
  sourceLinks: { sourceId: string }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  category?: any;
}) {
  return {
    id:               node.id,
    title:            node.title,
    category:         node.category?.name,
    description:      '',
    mainstream_view:  node.mainstreamView,
    evidence_level:   node.evidenceLevel,
    confidence_score: node.confidenceScore,
    tags:             node.tags.map(t => t.tag),
    claims:           node.claims.map(c => c.text),
    criticisms:       node.criticisms.map(c => c.text),
    open_questions:   node.openQuestions.map(q => q.text),
    sources:          node.sourceLinks.map(() => ({})),
    year:             node.year,
    date_start:       node.dateStart,
    coordinates:      node.lat != null ? [node.lat, node.lon] : null,
  };
}
