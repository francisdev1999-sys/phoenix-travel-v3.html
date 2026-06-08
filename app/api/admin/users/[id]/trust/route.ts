/**
 * GET  /api/admin/users/[id]/trust — trust event history
 * POST /api/admin/users/[id]/trust — apply manual trust adjustment
 * Body: { delta: number, reason: string }
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { applyTrustEvent } from '@/lib/trust-score';
import { refreshUserRank } from '@/lib/rank-system';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const [user, events] = await Promise.all([
    prisma.user.findUnique({
      where:  { id },
      select: { id: true, name: true, email: true, trustScore: true, rank: true },
    }),
    prisma.userTrustEvent.findMany({
      where:   { userId: id },
      orderBy: { createdAt: 'desc' },
      take:    100,
    }),
  ]);

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  return NextResponse.json({ user, events });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session) || !session) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const delta:  number = Number(body?.delta ?? 0);
  const detail: string = body?.reason ?? 'Manual admin adjustment';

  if (isNaN(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta must be a non-zero number' }, { status: 400 });
  }
  if (Math.abs(delta) > 50) {
    return NextResponse.json({ error: 'delta cannot exceed ±50 per action' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const newScore = await applyTrustEvent(id, 'admin_adjustment', delta, detail, session.user.id);
  await refreshUserRank(id);

  return NextResponse.json({ success: true, newScore });
}
