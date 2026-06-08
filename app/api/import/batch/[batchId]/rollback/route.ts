/**
 * POST /api/import/batch/:batchId/rollback
 *
 * Atomically removes all nodes, edges, and sources created by this batch,
 * then marks the batch as 'rolledback'.
 *
 * Guards:
 * - Cannot roll back an already-rolledback batch.
 * - Cannot roll back if any node in the batch is published, unless force=true.
 *
 * Admin-only.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ batchId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { batchId } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: {
      nodes: { select: { id: true, status: true } },
      edges: { select: { id: true } },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  if (batch.status === 'rolledback') {
    return NextResponse.json({ error: 'Batch has already been rolled back' }, { status: 409 });
  }

  const { force } = (await req.json().catch(() => ({} as Record<string, unknown>))) as Record<string, unknown>;

  // Guard: don't silently wipe published nodes
  const publishedNodes = batch.nodes.filter(n => n.status === 'published');
  if (publishedNodes.length > 0 && force !== true) {
    return NextResponse.json(
      {
        error: `${publishedNodes.length} node(s) in this batch have been published. ` +
               `Pass force=true to roll back and unpublish them, or publish-rollback them individually first.`,
        publishedNodes: publishedNodes.map(n => n.id),
      },
      { status: 409 },
    );
  }

  const batchNodeIds = batch.nodes.map(n => n.id);
  const batchEdgeIds = batch.edges.map(e => e.id);

  await prisma.$transaction(async (tx) => {
    if (batchNodeIds.length > 0) {
      // Delete child rows first (FK cascades would handle most, but be explicit)
      await tx.nodeEmbedding.deleteMany({ where: { nodeId: { in: batchNodeIds } } });
      await tx.adjacencyCache.deleteMany({ where: { nodeId: { in: batchNodeIds } } });
      await tx.nodeVersion.deleteMany(  { where: { nodeId: { in: batchNodeIds } } });
      await tx.openQuestion.deleteMany( { where: { nodeId: { in: batchNodeIds } } });
      await tx.claim.deleteMany(        { where: { nodeId: { in: batchNodeIds } } });
      await tx.criticism.deleteMany(    { where: { nodeId: { in: batchNodeIds } } });
      await tx.nodeTag.deleteMany(      { where: { nodeId: { in: batchNodeIds } } });
      await tx.sourceLink.deleteMany(   { where: { nodeId: { in: batchNodeIds } } });
    }

    if (batchEdgeIds.length > 0) {
      await tx.sourceLink.deleteMany({ where: { edgeId: { in: batchEdgeIds } } });
      await tx.edge.deleteMany(      { where: { id:     { in: batchEdgeIds } } });
    }

    if (batchNodeIds.length > 0) {
      await tx.node.deleteMany({ where: { id: { in: batchNodeIds } } });
    }

    await tx.importBatch.update({
      where: { id: batchId },
      data:  {
        status:       'rolledback',
        rolledBackAt: new Date(),
        rolledBackBy: session!.user!.id ?? null,
      },
    });
  });

  await writeAuditLog({
    userId:     session!.user!.id    ?? null,
    userEmail:  session!.user!.email ?? null,
    action:     'rollback',
    entityType: 'batch',
    entityId:   batchId,
    detail: {
      nodesDeleted: batchNodeIds.length,
      edgesDeleted: batchEdgeIds.length,
      force:        force === true,
    },
  });

  return NextResponse.json({
    message:         `Batch ${batchId} rolled back successfully.`,
    nodesDeleted:    batchNodeIds.length,
    edgesDeleted:    batchEdgeIds.length,
  });
}
