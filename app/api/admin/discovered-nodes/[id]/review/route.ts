export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { promoteDiscoveredNode } from '@/lib/discovery/node-promoter';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const body   = await req.json() as { action: 'approve' | 'reject'; reason?: string };

  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const discovered = await prisma.discoveredNode.findUnique({ where: { id } });
  if (!discovered) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // ── Reject ───────────────────────────────────────────────────────────────────
  if (body.action === 'reject') {
    // If previously auto-approved, archive the promoted node
    if (discovered.promotedNodeId) {
      await prisma.node.update({
        where: { id: discovered.promotedNodeId },
        data:  { status: 'archived' },
      }).catch(() => {});
    }

    await prisma.discoveredNode.update({
      where: { id },
      data:  {
        status:          'rejected',
        rejectionReason: body.reason ?? null,
        reviewedBy:      session!.user!.id,
        reviewedAt:      new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  }

  // ── Approve ──────────────────────────────────────────────────────────────────

  // Already has a promoted node (was auto-approved) — just mark as manually confirmed
  if (discovered.promotedNodeId) {
    // Re-publish if it was archived
    await prisma.node.update({
      where: { id: discovered.promotedNodeId },
      data:  { status: 'published', adminReviewStatus: 'ready_to_review' },
    }).catch(() => {});

    await prisma.discoveredNode.update({
      where: { id },
      data:  { status: 'approved', reviewedBy: session!.user!.id, reviewedAt: new Date() },
    });

    return NextResponse.json({ ok: true, nodeId: discovered.promotedNodeId });
  }

  // First-time promotion
  const nodeId = await promoteDiscoveredNode(discovered, session!.user!.id);

  await prisma.discoveredNode.update({
    where: { id },
    data:  { status: 'approved', promotedNodeId: nodeId, reviewedBy: session!.user!.id, reviewedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId:     session!.user!.id,
      action:     'node_approved',
      entityType: 'discovered_node',
      entityId:   id,
      detail:     { title: discovered.title, slug: nodeId, category: discovered.category },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, nodeId });
}
