export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { applyTrustEvent } from '@/lib/trust-score';
import { evaluateBadges, refreshUserRank } from '@/lib/rank-system';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();

  if (!isAdminSession(session) || !session) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { action, reviewNotes } = await req.json();
  const validActions = ['approved', 'rejected', 'needs_revision'];
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const updated = await prisma.source.update({
    where: { id },
    data: {
      status:     action,
      reviewNotes: reviewNotes?.trim() || null,
      reviewedAt:  new Date(),
      reviewedBy:  session.user.id,
    },
    include: {
      submitter: { select: { id: true, name: true, email: true, image: true } },
      links:     { select: { nodeId: true } },
    },
  });

  // Fire trust events and badge/rank refresh
  if (source.submittedBy) {
    const submitterId = source.submittedBy;
    const reviewerId  = session.user.id;
    if (action === 'approved') {
      void Promise.allSettled([
        applyTrustEvent(submitterId, 'approved_source', undefined, `Source ${id} approved`, reviewerId),
        prisma.user.update({ where: { id: submitterId }, data: { approvedCount: { increment: 1 } } }),
        evaluateBadges(submitterId),
        refreshUserRank(submitterId),
      ]);
    } else if (action === 'rejected') {
      void Promise.allSettled([
        applyTrustEvent(submitterId, 'rejected_content', undefined, reviewNotes?.trim() || undefined, reviewerId),
        prisma.user.update({ where: { id: submitterId }, data: { rejectedCount: { increment: 1 } } }),
        evaluateBadges(submitterId),
        refreshUserRank(submitterId),
      ]);
    }
  }

  // When a source is approved its credibility becomes active — the node quality
  // scores for every linked node are now stale. We re-compute them inline since
  // the set is small (one source rarely links to more than ~10 nodes).
  if (action === 'approved') {
    const linkedNodeIds = [
      ...new Set(updated.links.map(l => l.nodeId).filter(Boolean) as string[]),
    ];

    if (linkedNodeIds.length > 0) {
      // Fire and forget — quality computation failure must not break the review flow.
      Promise.allSettled(
        linkedNodeIds.map(nodeId =>
          fetch(
            `${process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? ''}/api/nodes/${nodeId}/source-quality`,
            { cache: 'no-store' },
          ).catch(() => null),
        ),
      );
    }
  }

  const { links: _links, ...rest } = updated;
  return NextResponse.json(rest);
}
