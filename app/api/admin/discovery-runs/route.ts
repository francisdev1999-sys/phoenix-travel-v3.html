export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getBudgetStatus } from '@/lib/budget/tracker';
import { runDiscovery } from '@/lib/discovery/engine';
import { seedDomainReputations } from '@/lib/discovery/credibility';

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

  const body = await req.json().catch(() => ({})) as {
    action?: string;
    nodeId?: string;
    maxNodes?: number;
    emergencyStop?: boolean;
  };

  // ── Trigger a discovery run ─────────────────────────────────────────────
  if (body.action === 'trigger' || (!body.action && body.emergencyStop === undefined)) {
    await seedDomainReputations();

    const run = await prisma.discoveryRun.create({
      data: {
        mode:         body.nodeId ? 'node' : 'manual',
        targetNodeId: body.nodeId ?? null,
        status:       'running',
      },
    });

    try {
      const result = await runDiscovery({
        nodeId:   body.nodeId,
        maxNodes: body.maxNodes ?? 20,
        runId:    run.id,
      });

      await prisma.discoveryRun.update({
        where: { id: run.id },
        data: {
          status: 'complete',
          nodesChecked:  result.nodesChecked,
          sourcesFound:  result.sourcesFound,
          autoApproved:  result.autoApproved,
          pendingReview: result.pendingReview,
          skipped:       result.skipped,
          completedAt:   new Date(),
        },
      });

      return NextResponse.json({ runId: run.id, ...result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await prisma.discoveryRun.update({
        where: { id: run.id },
        data: { status: 'failed', errorMessage: msg, completedAt: new Date() },
      }).catch(() => {});
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  // ── Emergency stop toggle ───────────────────────────────────────────────
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
