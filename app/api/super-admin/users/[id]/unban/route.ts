export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isOwnerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const target = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, isBanned: true },
  });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { note } = await req.json().catch(() => ({ note: '' }));

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data:  { isBanned: false, banReason: null, banExpiresAt: null },
    }),
    prisma.userModerationStatus.upsert({
      where:  { userId: id },
      create: { userId: id, status: 'active', reason: note?.trim() || 'Unbanned', changedBy: session!.user!.id, changedAt: new Date() },
      update: { status: 'active', reason: note?.trim() || 'Unbanned', changedBy: session!.user!.id, changedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    userId:    session!.user!.id    ?? null,
    userEmail: session!.user!.email ?? null,
    action:    'unban',
    entityType: 'user',
    entityId:   id,
    detail:    { note: note?.trim() || null },
  });

  return NextResponse.json({ success: true, isBanned: false });
}
