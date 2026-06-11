export const dynamic = 'force-dynamic';
/**
 * PATCH /api/admin/beta/feedback/[id]
 * Update status and optional admin notes on a feedback item.
 * Body: { status: 'open'|'reviewing'|'resolved'|'dismissed', adminNotes?: string }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

const VALID_STATUSES = ['open', 'reviewing', 'resolved', 'dismissed'];

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session) || !session?.user?.id) {
    return NextResponse.json({ error: 'Admin only' }, { status: 401 });
  }

  const { status, adminNotes } = await req.json();

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updated = await prisma.betaFeedback.update({
    where: { id },
    data: {
      status,
      adminNotes: adminNotes?.trim() || undefined,
      resolvedAt: status === 'resolved' ? new Date() : undefined,
      resolvedBy: status === 'resolved' ? session.user.id : undefined,
    },
  });

  return NextResponse.json(updated);
}
