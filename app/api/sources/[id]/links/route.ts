export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const links = await prisma.sourceLink.findMany({
    where: { sourceId: id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(links);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only approved sources can be linked; admin can link anything
  const isAdmin = isAdminSession(session);
  if (!isAdmin && source.status !== 'approved') {
    return NextResponse.json({ error: 'Only approved sources can be linked' }, { status: 409 });
  }

  const { targetType, targetId, claimIndex, linkType, notes } = await req.json();
  if (!targetType || !targetId || !linkType) {
    return NextResponse.json({ error: 'targetType, targetId, linkType are required' }, { status: 400 });
  }

  const link = await prisma.sourceLink.upsert({
    where: {
      legacy_source_link_unique: {
        sourceId: id,
        targetType,
        targetId,
        claimIndex: claimIndex ?? null,
      },
    },
    update: { linkType, notes: notes?.trim() || null },
    create: {
      sourceId: id,
      targetType,
      targetId,
      claimIndex: claimIndex ?? null,
      linkType,
      notes: notes?.trim() || null,
    },
  });

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isAdmin = isAdminSession(session);
  if (!isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { linkId } = await req.json();
  await prisma.sourceLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}
