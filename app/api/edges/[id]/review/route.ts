import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
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

  return NextResponse.json(updated);
}
