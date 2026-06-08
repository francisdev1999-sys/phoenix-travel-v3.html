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
  if (target.role === 'owner') return NextResponse.json({ error: 'Cannot suspend the owner' }, { status: 403 });

  const { reason, durationDays } = await req.json();
  if (!reason?.trim()) return NextResponse.json({ error: 'Reason required' }, { status: 400 });

  const expiresAt = durationDays
    ? new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000)
    : null;

  await prisma.$transaction([
    prisma.userModerationStatus.upsert({
      where:  { userId: id },
      create: { userId: id, status: 'suspended', reason: reason.trim(), changedBy: session!.user!.id, changedAt: new Date() },
      update: { status: 'suspended', reason: reason.trim(), changedBy: session!.user!.id, changedAt: new Date() },
    }),
    // Don't set isBanned for suspension — it's temporary
    prisma.user.update({
      where: { id },
      data: expiresAt ? { banExpiresAt: expiresAt } : {},
    }),
  ]);

  await writeAuditLog({
    userId:    session!.user!.id    ?? null,
    userEmail: session!.user!.email ?? null,
    action:    'suspend',
    entityType: 'user',
    entityId:   id,
    detail:    { reason: reason.trim(), durationDays: durationDays ?? null, expiresAt },
  });

  return NextResponse.json({ success: true, status: 'suspended', reason: reason.trim(), expiresAt });
}
