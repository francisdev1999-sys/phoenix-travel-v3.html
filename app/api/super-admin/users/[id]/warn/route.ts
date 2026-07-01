export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Super-admin only' }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { reason } = await req.json();
  if (!reason?.trim()) return NextResponse.json({ error: 'Reason required' }, { status: 400 });

  await prisma.$transaction([
    prisma.userModerationStatus.upsert({
      where:  { userId: id },
      create: { userId: id, status: 'watched', reason: reason.trim(), changedBy: session!.user!.id, changedAt: new Date() },
      update: { status: 'watched', reason: reason.trim(), changedBy: session!.user!.id, changedAt: new Date() },
    }),
    prisma.user.update({
      where: { id },
      data:  { lastActiveAt: undefined },
    }),
  ]);

  await writeAuditLog({
    userId:    session!.user!.id    ?? null,
    userEmail: session!.user!.email ?? null,
    action:    'warn',
    entityType: 'user',
    entityId:   id,
    detail:    { reason: reason.trim(), moderatorId: session!.user!.id },
  });

  return NextResponse.json({ success: true, status: 'watched', reason: reason.trim() });
}
