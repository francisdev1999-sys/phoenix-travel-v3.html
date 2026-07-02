import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/node-discovery
 *
 * Broad autonomous discovery pass. Gap-driven: seeds derived from what the
 * graph structurally needs (orphans, near-orphans, unbridged category pairs)
 * run FIRST, then randomly sampled static seeds fill the remaining budget —
 * so growth heals the topology while still exploring broadly.
 */
import { NextRequest, NextResponse } from 'next/server';
import { runNodeDiscovery, DISCOVERY_SEEDS } from '@/lib/discovery/node-engine';
import { analyzeGraphGaps } from '@/lib/discovery/gap-analyzer';

const MAX_NODES     = 14;
const MAX_GAP_SEEDS = 8;

async function handler(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Gap analysis is best-effort — a failure must never block broad discovery.
    const gaps = await analyzeGraphGaps(MAX_GAP_SEEDS).catch(() => null);
    const gapSeeds = gaps?.seeds ?? [];

    const staticSample = [...DISCOVERY_SEEDS].sort(() => Math.random() - 0.5);
    const seeds = [...gapSeeds, ...staticSample.filter(s => !gapSeeds.includes(s))];

    const result = await runNodeDiscovery({ maxNodes: MAX_NODES, seeds });
    return NextResponse.json({
      ok: true,
      gapSeeds,
      gapReport: gaps?.report ?? null,
      ...result,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = withCronTracking('node-discovery', handler);
