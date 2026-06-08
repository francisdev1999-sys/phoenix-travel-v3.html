export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { applyTrustEvent } from '@/lib/trust-score';
import { evaluateBadges, refreshUserRank } from '@/lib/rank-system';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const proposal = await prisma.proposedNode.findUnique({ where: { id } });
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { action, reviewNotes } = await req.json();
  if (!['approved', 'rejected', 'needs_revision'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
  if (reviewNotes && reviewNotes.length > 2000) {
    return NextResponse.json({ error: 'Review notes must be 2000 characters or fewer' }, { status: 400 });
  }

  // ── Non-approval: just update proposal status ────────────────────────────
  if (action !== 'approved') {
    const updated = await prisma.proposedNode.update({
      where: { id },
      data: {
        status: action,
        reviewNotes: reviewNotes?.trim() || null,
        reviewedAt: new Date(),
        reviewedBy: session!.user!.id,
      },
      include: { submitter: { select: { id: true, name: true, image: true } } },
    });
    await writeAuditLog({
      userId:     session!.user!.id    ?? null,
      userEmail:  session!.user!.email ?? null,
      action:     action === 'rejected' ? 'reject' : 'needs_revision',
      entityType: 'node',
      entityId:   id,
      detail:     { proposalId: id, reviewNotes: reviewNotes?.trim() || null },
    });

    if (action === 'rejected' && proposal.submittedBy) {
      const submitterId = proposal.submittedBy;
      const reviewerId  = session!.user!.id;
      void Promise.allSettled([
        applyTrustEvent(submitterId, 'rejected_content', undefined, reviewNotes?.trim() || undefined, reviewerId),
        prisma.user.update({ where: { id: submitterId }, data: { rejectedCount: { increment: 1 } } }),
        evaluateBadges(submitterId),
        refreshUserRank(submitterId),
      ]);
    }

    return NextResponse.json(updated);
  }

  // ── Approval: migrate ProposedNode → live Node ───────────────────────────

  // Derive the node ID (slug) from the proposal's nodeId field or generate from label
  const nodeId = (proposal.nodeId?.trim() || null)
    ?? proposal.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Guard: don't overwrite an existing published/draft node
  const existing = await prisma.node.findUnique({ where: { id: nodeId } });
  if (existing) {
    return NextResponse.json(
      { error: `Node '${nodeId}' already exists in the graph (status: ${existing.status}). Choose a different nodeId or archive the existing node first.` },
      { status: 409 },
    );
  }

  // Look up the Category record by name; upsert so new categories from proposals work
  const categorySlug = proposal.category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const category = await prisma.category.upsert({
    where: { slug: categorySlug },
    create: { slug: categorySlug, name: proposal.category },
    update: {},
  });

  // Parse JSON arrays stored on the proposal (Prisma returns them as unknown)
  const claims       = Array.isArray(proposal.claims)       ? (proposal.claims as string[])       : [];
  const criticisms   = Array.isArray(proposal.criticisms)   ? (proposal.criticisms as string[])   : [];
  const openQs       = Array.isArray(proposal.openQuestions) ? (proposal.openQuestions as string[]) : [];
  const tags         = Array.isArray(proposal.tags)         ? (proposal.tags as string[])         : [];

  // All writes in a single transaction so partial failure can't leave orphan records
  const [updatedProposal, newNode] = await prisma.$transaction(async (tx) => {
    // 1. Create the Node (enters as 'draft' — admin must explicitly publish)
    const node = await tx.node.create({
      data: {
        id:             nodeId,
        title:          proposal.label,
        categoryId:     category.id,
        description:    proposal.description,
        mainstreamView: proposal.mainstreamView ?? null,
        evidenceLevel:  proposal.evidenceLevel,
        confidenceScore: proposal.confidence,
        region:         proposal.region ?? null,
        country:        proposal.country ?? null,
        dateStart:      proposal.dateStart ?? null,
        dateEnd:        proposal.dateEnd ?? null,
        status:         'draft',
        createdBy:      proposal.submittedBy ?? null,
      },
    });

    // 2. Tags
    if (tags.length > 0) {
      await tx.nodeTag.createMany({
        data: tags.map(tag => ({ nodeId: node.id, tag: String(tag).toLowerCase().trim() })),
        skipDuplicates: true,
      });
    }

    // 3. Claims
    if (claims.length > 0) {
      await tx.claim.createMany({
        data: claims.map((text, i) => ({
          nodeId: node.id,
          text:   String(text).trim(),
          orderIndex: i,
        })),
      });
    }

    // 4. Criticisms
    if (criticisms.length > 0) {
      await tx.criticism.createMany({
        data: criticisms.map((text, i) => ({
          nodeId: node.id,
          text:   String(text).trim(),
          orderIndex: i,
        })),
      });
    }

    // 5. Open questions
    if (openQs.length > 0) {
      await tx.openQuestion.createMany({
        data: openQs.map((text, i) => ({
          nodeId: node.id,
          text:   String(text).trim(),
          orderIndex: i,
        })),
      });
    }

    // 6. Version snapshot (version 1)
    await tx.nodeVersion.create({
      data: {
        nodeId:     node.id,
        version:    1,
        snapshot:   {
          title:          node.title,
          categoryId:     node.categoryId,
          description:    node.description,
          mainstreamView: node.mainstreamView,
          evidenceLevel:  node.evidenceLevel,
          confidenceScore: node.confidenceScore,
          region:         node.region,
          country:        node.country,
          dateStart:      node.dateStart,
          dateEnd:        node.dateEnd,
          claims,
          criticisms,
          openQuestions:  openQs,
          tags,
        },
        changedBy:  session!.user!.id,
        changeNote: `Created from proposal ${id}`,
      },
    });

    // 7. Mark the proposal as approved
    const updated = await tx.proposedNode.update({
      where: { id },
      data: {
        status:      'approved',
        nodeId:      node.id,
        reviewNotes: reviewNotes?.trim() || null,
        reviewedAt:  new Date(),
        reviewedBy:  session!.user!.id,
      },
      include: { submitter: { select: { id: true, name: true, image: true } } },
    });

    return [updated, node];
  });

  await writeAuditLog({
    userId:     session!.user!.id    ?? null,
    userEmail:  session!.user!.email ?? null,
    action:     'approve',
    entityType: 'node',
    entityId:   newNode.id,
    detail:     { proposalId: id, reviewNotes: reviewNotes?.trim() || null },
  });

  if (updatedProposal.submitter?.id) {
    const submitterId = updatedProposal.submitter.id;
    const reviewerId  = session!.user!.id;
    void Promise.allSettled([
      applyTrustEvent(submitterId, 'approved_node', undefined, `Node ${newNode.id} approved`, reviewerId),
      prisma.user.update({ where: { id: submitterId }, data: { approvedCount: { increment: 1 } } }),
      evaluateBadges(submitterId),
      refreshUserRank(submitterId),
    ]);
  }

  return NextResponse.json({
    proposal: updatedProposal,
    node: {
      id:     newNode.id,
      status: newNode.status,
      title:  newNode.title,
    },
    message: `Node '${newNode.id}' created as draft. Use POST /api/nodes/${newNode.id}/publish to make it live.`,
  });
}
