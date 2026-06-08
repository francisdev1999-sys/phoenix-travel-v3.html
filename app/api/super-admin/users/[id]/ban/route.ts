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

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.role === 'owner') return NextResponse.json({ error: 'Cannot ban the owner' }, { status: 403 });

  const { reason, expiresAt: rawExpiry } = await req.json();
  if (!reason?.trim()) return NextResponse.json({ error: 'Reason required' }, { status: 400 });

  const expiresAt = rawExpiry ? new Date(rawExpiry) : null;

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data:  { isBanned: true, banReason: reason.trim(), banExpiresAt: expiresAt },
    }),
    prisma.userModerationStatus.upsert({
      where:  { userId: id },
      create: { userId: id, status: 'banned', reason: reason.trim(), changedBy: session!.user!.id, changedAt: new Date() },
      update: { status: 'banned', reason: reason.trim(), changedBy: session!.user!.id, changedAt: new Date() },
    }),
  ]);

  await writeAuditLog({
    userId:    session!.user!.id    ?? null,
    userEmail: session!.user!.email ?? null,
    action:    'ban',
    entityType: 'user',
    entityId:   id,
    detail:    { reason: reason.trim(), expiresAt },
  });

  return NextResponse.json({ success: true, isBanned: true, reason: reason.trim(), expiresAt });
}
