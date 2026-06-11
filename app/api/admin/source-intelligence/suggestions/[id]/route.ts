export const dynamic = 'force-dynamic';
/**
 * PATCH /api/admin/source-intelligence/suggestions/[id]
 * Apply or dismiss a PotentialNodeSuggestion or ContradictionSuggestion.
 *
 * Body: { action: 'approve' | 'dismiss', type: 'potential_node' | 'contradiction' }
 *
 * 'approve' on potential_node: creates a DRAFT node (never published automatically)
 * 'approve' on contradiction:  marks for human editorial review (status='approved')
 * 'dismiss': marks status='dismissed'
 *
 * AI RULE: This route NEVER publishes nodes. Approved potential_nodes become DRAFT
 * records requiring separate human publish action.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session) || !session?.user?.id) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { action, type } = await req.json() as { action: string; type: string };

  if (!['approve', 'dismiss'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  if (!['potential_node', 'contradiction'].includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  }

  const reviewedBy = session.user.id;
  const reviewedAt = new Date();
  const newStatus  = action === 'approve' ? 'approved' : 'dismissed';

  if (type === 'potential_node') {
    const suggestion = await prisma.potentialNodeSuggestion.findUnique({ where: { id } });
    if (!suggestion) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (suggestion.status !== 'pending') {
      return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });
    }

    let appliedNodeId: string | null = null;

    if (action === 'approve') {
      // Create a DRAFT node — never published automatically
      // AI RULE: status is 'draft', not 'published'
      const category = await prisma.category.findFirst({
        where: { name: { equals: suggestion.suggestedCategory, mode: 'insensitive' } },
      });

      if (category) {
        const slug = suggestion.suggestedTitle
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 80) + '-' + Date.now().toString(36);

        try {
          const node = await prisma.node.create({
            data: {
              id:             slug,
              title:          suggestion.suggestedTitle,
              categoryId:     category.id,
              description:    suggestion.suggestedDescription,
              evidenceLevel:  suggestion.suggestedEvidenceLevel,
              confidenceScore:suggestion.suggestedConfidence,
              status:         'draft',       // NEVER auto-published
              adminReviewStatus: 'ready_to_review',
              adminReviewNote:   `AI-suggested from source: ${suggestion.sourceId}. Requires human review before publishing.`,
              createdBy:      reviewedBy,
            },
          });

          // Add suggested tags
          if (suggestion.suggestedTags.length > 0) {
            await prisma.nodeTag.createMany({
              data: suggestion.suggestedTags.map(t => ({ nodeId: node.id, tag: t })),
              skipDuplicates: true,
            });
          }

          // Link source to the draft node
          await prisma.sourceLink.create({
            data: { sourceId: suggestion.sourceId, nodeId: node.id },
          }).catch(() => {/* best-effort — link may already exist */});

          appliedNodeId = node.id;
        } catch (err) {
          console.error('[source-intelligence] draft node creation failed:', err);
          return NextResponse.json({ error: 'Failed to create draft node' }, { status: 500 });
        }
      }
    }

    const updated = await prisma.potentialNodeSuggestion.update({
      where: { id },
      data:  { status: appliedNodeId ? 'applied' : newStatus, reviewedBy, reviewedAt, appliedNodeId },
    });

    return NextResponse.json({ updated, appliedNodeId });
  }

  // Contradiction suggestion
  if (type === 'contradiction') {
    const suggestion = await prisma.contradictionSuggestion.findUnique({ where: { id } });
    if (!suggestion) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (suggestion.status !== 'pending') {
      return NextResponse.json({ error: 'Already reviewed' }, { status: 409 });
    }

    const updated = await prisma.contradictionSuggestion.update({
      where: { id },
      data:  { status: newStatus, reviewedBy, reviewedAt },
    });

    return NextResponse.json({ updated });
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}
