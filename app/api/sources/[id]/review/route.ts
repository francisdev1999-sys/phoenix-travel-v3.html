export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();

  if (!isAdminSession(session)) {
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
      status: action,
      reviewNotes: reviewNotes?.trim() || null,
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
    },
    include: {
      submitter: { select: { id: true, name: true, email: true, image: true } },
      links: true,
    },
  });

  return NextResponse.json(updated);
}
