import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/news-discovery
 *
 * The news→discovery bridge: turns RSS headlines ingested since the last
 * successful run into discovery seeds and runs a small node-discovery pass on
 * them. This is how the archive reacts to real-world events autonomously —
 * the same quality gates + learned lane decide what actually publishes.
 *
 * Deliberately small budget per run (it runs daily; the broad 5-day
 * node-discovery pass covers the long tail).
 *
 * Protected by CRON_SECRET. Suggested schedule: daily at 05:45 UTC.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runNodeDiscovery } from '@/lib/discovery/node-engine';
import { getNewsSeeds } from '@/lib/discovery/news-seeds';

const CRON_SECRET   = process.env.CRON_SECRET;
const MAX_NODES     = 4;   // small daily budget
const MAX_SEEDS     = 8;
const FALLBACK_MS   = 72 * 60 * 60 * 1000; // no prior run → look back 3 days

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Window = news fetched since the last successful run of THIS job, so each
  // headline is considered exactly once across daily runs.
  const lastSuccess = await prisma.cronRun.findFirst({
    where:   { job: 'news-discovery', status: 'success' },
    orderBy: { startedAt: 'desc' },
    select:  { startedAt: true },
  }).catch(() => null);
  const since = lastSuccess?.startedAt ?? new Date(Date.now() - FALLBACK_MS);

  const seeds = await getNewsSeeds(MAX_SEEDS, since);
  if (seeds.length === 0) {
    return NextResponse.json({ skipped: true, reason: `no fresh news since ${since.toISOString()}` });
  }

  const result = await runNodeDiscovery({ maxNodes: MAX_NODES, seeds });
  return NextResponse.json({ ok: true, seeds, ...result });
}

export const POST = withCronTracking('news-discovery', handler);
