/**
 * POST /api/nodes/:id/publish
 *
 * Moves a draft Node to status='published'.
 * Enqueues embed-node and rebuild-adjacency jobs.
 * Creates a NodeVersion snapshot recording the publish event.
 *
 * Admin-only. Idempotent: publishing an already-published node is a no-op.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enqueue } from '@/lib/jobs/queue';
import { writeAuditLog } from '@/lib/audit';
import { generateSuggestionsForNode } from '@/lib/suggestion-engine';
import { computeNodeSourceQuality } from '@/lib/source-quality';
import { generateAiSemanticSuggestions } from '@/lib/ai/semantic-suggestions';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const node = await prisma.node.findUnique({
    where:   { id },
    include: {
      tags:          true,
      claims:        { orderBy: { orderIndex: 'asc' } },
      criticisms:    { orderBy: { orderIndex: 'asc' } },
      openQuestions: { orderBy: { orderIndex: 'asc' } },
      category:      true,
    },
  });

  if (!node) {
    return NextResponse.json({ error: `Node '${id}' not found` }, { status: 404 });
  }

  if (node.status === 'published') {
    return NextResponse.json({
      message:   `Node '${id}' is already published.`,
      node:      { id: node.id, status: node.status, publishedAt: node.publishedAt },
      idempotent: true,
    });
  }

  if (node.status === 'archived') {
    return NextResponse.json(
      { error: `Node '${id}' is archived and cannot be published directly. Restore it to draft first.` },
      { status: 409 },
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Publish the node
    await tx.node.update({
      where: { id },
      data:  {
        status:      'published',
        publishedAt: now,
        version:     { increment: 1 },
      },
    });

    // Record publish event in version history
    await tx.nodeVersion.create({
      data: {
        nodeId:     id,
        version:    node.version + 1,
        snapshot:   {
          id:             node.id,
          title:          node.title,
          categoryId:     node.categoryId,
          categoryName:   node.category.name,
          description:    node.description,
          mainstreamView: node.mainstreamView,
          evidenceLevel:  node.evidenceLevel,
          confidenceScore: node.confidenceScore,
          tags:           node.tags.map(t => t.tag),
          claims:         node.claims.map(c => c.text),
          criticisms:     node.criticisms.map(c => c.text),
          openQuestions:  node.openQuestions.map(q => q.text),
          status:         'published',
          publishedAt:    now.toISOString(),
        },
        changedBy:  session!.user!.id ?? null,
        changeNote: 'Published',
      },
    });
  });

  await writeAuditLog({
    userId:    session!.user!.id    ?? null,
    userEmail: session!.user!.email ?? null,
    action:    'publish',
    entityType: 'node',
    entityId:   id,
    detail: { previousStatus: node.status },
  });

  // Source quality check — informational, never blocks the publish
  const sourceQuality = await computeNodeSourceQuality(id).catch(() => null);

  // Non-blocking background work — failures don't roll back the publish.
  // generateAiSemanticSuggestions reads the rule-based candidates that
  // generateSuggestionsForNode writes, so it must run after, not concurrently.
  await Promise.allSettled([
    enqueue('embed-node',        { nodeId: id }, 60),
    enqueue('rebuild-adjacency', { nodeId: id }, 60),
    generateSuggestionsForNode(id).then(() => generateAiSemanticSuggestions(id)),
  ]);

  return NextResponse.json({
    message:     `Node '${id}' published successfully.`,
    node:        { id, status: 'published', publishedAt: now },
    jobsEnqueued: ['embed-node', 'rebuild-adjacency'],
    sourceQuality: sourceQuality
      ? {
          recommendation: sourceQuality.publicationRecommendation,
          score:          sourceQuality.sourceQualityScore,
          approvedSources: sourceQuality.approvedCount,
          flags:          sourceQuality.reviewFlags,
          reasons:        sourceQuality.publicationReasons,
        }
      : null,
  });
}
