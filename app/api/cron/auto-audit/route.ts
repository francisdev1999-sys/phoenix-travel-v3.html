import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/auto-audit
 *
 * Automatically runs a quick AI cleanup audit of nodes when no audit has run
 * in the past 24 hours. Calls the shared runNodeCleanupAudit() directly — the
 * old version fetched the /api/super-admin analyze route over HTTP with a cron
 * token, but that route is session-based, so the internal (cookieless) call
 * always 401/403'd and the audit never actually ran. Direct call closes the loop.
 *
 * Protected by CRON_SECRET. Suggested schedule: daily at 04:00 UTC.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runNodeRules } from '@/lib/cleanup/rules';
import { checkApiKey, checkGeminiKey } from '@/lib/cleanup/analyzer';
import { runNodeCleanupAudit } from '@/lib/cleanup/run-audit';

const CRON_SECRET    = process.env.CRON_SECRET;
const AUDIT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Skip if no AI key configured (avoid creating failed runs)
  if (!checkApiKey() && !checkGeminiKey()) {
    return NextResponse.json({ skipped: true, reason: 'no AI key configured' });
  }

  // Skip if a run already completed in the last 24 hours
  const recent = await prisma.cleanupAuditRun.findFirst({
    where: {
      status:      { in: ['completed', 'running'] },
      startedAt:   { gte: new Date(Date.now() - AUDIT_INTERVAL) },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (recent) {
    return NextResponse.json({ skipped: true, reason: `recent run exists: ${recent.id}` });
  }

  // Run a quick rule-scan to see if there are candidates worth auditing
  const candidates = await runNodeRules();
  if (candidates.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'no flagged candidates' });
  }

  // Run the audit directly (no HTTP hop, no session required).
  const result = await runNodeCleanupAudit({
    mode:        'quick',
    dryRun:      false,
    triggeredBy: 'auto-audit-cron',
  });

  if (result.kind === 'no_ai_key') {
    return NextResponse.json({ skipped: true, reason: 'no AI key configured' });
  }
  if (result.kind === 'completed' && result.allFailed) {
    return NextResponse.json(
      { error: `All ${result.candidateCount} analyses failed: ${result.errors[0]}`, run: result.run },
      { status: 502 },
    );
  }

  return NextResponse.json({
    triggered:  true,
    candidates: candidates.length,
    run:        result.kind === 'completed' ? result.run : result,
  });
}

export const POST = withCronTracking('auto-audit', handler);
