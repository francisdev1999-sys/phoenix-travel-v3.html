export const dynamic = 'force-dynamic';
/**
 * POST /api/admin/cron/trigger
 *
 * Admin-accessible endpoint to manually trigger any scheduled cron job.
 * Auth: admin or owner (enforced by middleware on /api/admin/*).
 * Internally calls the target cron route with the CRON_SECRET header so the
 * middleware allows it in production.
 *
 * Body: { job: string }
 */
import { NextRequest, NextResponse } from 'next/server';

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

export async function POST(req: NextRequest) {
  const body  = await req.json().catch(() => ({})) as { job?: string };
  const job   = body.job as Job | undefined;

  if (!job || !VALID_JOBS.includes(job)) {
    return NextResponse.json(
      { error: `job must be one of: ${VALID_JOBS.join(', ')}` },
      { status: 400 },
    );
  }

  const baseUrl = (
    process.env.NEXTAUTH_URL ??
    process.env.AUTH_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '');

  const cronSecret = process.env.CRON_SECRET ?? '';

  try {
    const r = await fetch(`${baseUrl}/api/cron/${job}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${cronSecret}` },
    });

    const data = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: r.ok, httpStatus: r.status, job, data });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to call cron/${job}: ${String(err)}` },
      { status: 502 },
    );
  }
}
