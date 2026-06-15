export const dynamic = 'force-dynamic';
/**
 * POST /api/admin/cron/trigger
 *
 * Admin-accessible endpoint to manually trigger any scheduled cron job.
 * Auth: admin or owner (enforced by middleware on /api/admin/*).
 *
 * Calls cron handlers directly (no internal HTTP round-trip) so the
 * CRON_SECRET middleware check is bypassed — only the admin session gate
 * applies here, which is already enforced by the /api/admin/* middleware.
 */
import { NextRequest, NextResponse } from 'next/server';

import { POST as newsFeed }          from '@/app/api/cron/news-feed/route';
import { POST as nodeDiscovery }     from '@/app/api/cron/node-discovery/route';
import { POST as sourceDiscovery }   from '@/app/api/cron/source-discovery/route';
import { POST as autoRelationships } from '@/app/api/cron/auto-relationships/route';
import { POST as autoSimilarity }    from '@/app/api/cron/auto-similarity/route';
import { POST as autoAudit }         from '@/app/api/cron/auto-audit/route';
import { POST as researchMaturity }  from '@/app/api/cron/research-maturity/route';
import { POST as liftBans }          from '@/app/api/cron/lift-bans/route';
import { POST as trustPass }         from '@/app/api/cron/trust-pass/route';

const VALID_JOBS = [
  'news-feed',
  'node-discovery',
  'source-discovery',
  'auto-relationships',
  'auto-similarity',
  'auto-audit',
  'research-maturity',
  'lift-bans',
  'trust-pass',
] as const;

type Job = typeof VALID_JOBS[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CronHandler = (req?: any) => Promise<NextResponse>;

const HANDLERS: Record<Job, CronHandler> = {
  'news-feed':          newsFeed,
  'node-discovery':     nodeDiscovery,
  'source-discovery':   sourceDiscovery,
  'auto-relationships': autoRelationships,
  'auto-similarity':    autoSimilarity,
  'auto-audit':         autoAudit,
  'research-maturity':  researchMaturity,
  'lift-bans':          liftBans,
  'trust-pass':         trustPass,
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { job?: string };
  const job  = body.job as Job | undefined;

  if (!job || !VALID_JOBS.includes(job)) {
    return NextResponse.json(
      { error: `job must be one of: ${VALID_JOBS.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    const handler = HANDLERS[job];
    const response = await handler();
    const data = await response.json().catch(() => ({}));
    return NextResponse.json({ ok: response.ok, httpStatus: response.status, job, data });
  } catch (err) {
    return NextResponse.json(
      { error: `${job} threw: ${String(err)}` },
      { status: 500 },
    );
  }
}
