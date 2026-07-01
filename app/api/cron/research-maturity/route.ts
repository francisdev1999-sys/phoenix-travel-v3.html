import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/research-maturity
 *
 * Recalculates ResearchMaturityScore for all published nodes.
 * Protected by CRON_SECRET. Suggested schedule: daily at 03:00 UTC.
 */
import { NextResponse } from 'next/server';
import { recalculateAllMaturity } from '@/lib/maturity/scorer';

async function handler() {
  const started = Date.now();
  const updated = await recalculateAllMaturity(200);
  return NextResponse.json({ updated, ms: Date.now() - started });
}

export const POST = withCronTracking('research-maturity', handler);
