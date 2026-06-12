export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getBudgetStatus } from '@/lib/budget/tracker';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10), 100);

  const [runs, discoveredCounts, budget] = await Promise.all([
    prisma.discoveryRun.findMany({ orderBy: { startedAt: 'desc' }, take: limit }),
    prisma.discoveredSource.groupBy({ by: ['status'], _count: { _all: true } }),
    getBudgetStatus(),
  ]);

  const counts = Object.fromEntries(discoveredCounts.map(r => [r.status, r._count._all]));

  return NextResponse.json({ runs, counts, budget });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { emergencyStop?: boolean; dailyLimit?: number; monthlyLimit?: number };

  if (body.emergencyStop !== undefined) {
    const today = new Date().toISOString().slice(0, 10);
    await prisma.aiBudget.upsert({
      where:  { period_periodType: { period: today, periodType: 'daily' } },
      update: { emergencyStop: body.emergencyStop },
      create: { period: today, periodType: 'daily', emergencyStop: body.emergencyStop },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'No action' }, { status: 400 });
}
