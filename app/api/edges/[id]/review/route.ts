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
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const edge = await prisma.proposedEdge.findUnique({ where: { id } });
  if (!edge) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { action, reviewNotes } = await req.json();
  if (!['approved', 'rejected', 'needs_revision'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const updated = await prisma.proposedEdge.update({
    where: { id },
    data: {
      status: action,
      reviewNotes: reviewNotes?.trim() || null,
      reviewedAt: new Date(),
      reviewedBy: session!.user!.id,
    },
    include: { submitter: { select: { id: true, name: true, image: true } } },
  });

  if (edge.submittedBy) {
    const submitterId = edge.submittedBy;
    const reviewerId  = session!.user!.id;
    if (action === 'approved') {
      void Promise.allSettled([
        applyTrustEvent(submitterId, 'approved_relationship', undefined, `Edge ${id} approved`, reviewerId),
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

  return NextResponse.json(updated);
}
