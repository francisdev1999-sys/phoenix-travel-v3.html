export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { sendSuspensionNotification } from '@/lib/email';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true, name: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (target.role === 'owner') return NextResponse.json({ error: 'Cannot suspend the owner' }, { status: 403 });

  const { reason, durationDays } = await req.json();
  if (!reason?.trim()) return NextResponse.json({ error: 'Reason required' }, { status: 400 });

  let expiresAt: Date | null = null;
  if (durationDays !== undefined && durationDays !== null) {
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days < 1 || days > 3650) {
      return NextResponse.json({ error: 'durationDays must be an integer between 1 and 3650' }, { status: 400 });
    }
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

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

  if (target.email) {
    void sendSuspensionNotification(
      target.email, target.name ?? 'Researcher',
      reason.trim(), durationDays ?? null, expiresAt,
    );
  }

  return NextResponse.json({ success: true, status: 'suspended', reason: reason.trim(), expiresAt });
}
