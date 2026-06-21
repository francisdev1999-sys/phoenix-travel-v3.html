export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { dequeue, completeJob, failJob, getQueueStats } from '@/lib/jobs/queue';
import { processJob } from '@/lib/jobs/process-job';

/**
 * POST /api/jobs/process
 *
 * Dequeues and processes a single pending ingestion job. Kept for on-demand
 * use (e.g. an admin "Process Queue" button). For scheduled draining of the
 * whole queue, see POST /api/cron/process-jobs, which is what the GitHub
 * Actions cron workflow actually calls.
 *
 * Protected by CRON_SECRET to prevent unauthorized triggering.
 *
 * GET /api/jobs/process — returns queue stats
 */

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

export async function GET(_req: NextRequest) {
  const stats = await getQueueStats().catch(() => ({}));
  return NextResponse.json({ queue: stats });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const job = await dequeue();
  if (!job) {
    return NextResponse.json({ processed: false, reason: 'queue empty' });
  }

  try {
    await processJob(job.type, job.payload as Record<string, string>);
    await completeJob(job.id);
    return NextResponse.json({ processed: true, jobId: job.id, type: job.type });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failJob(job.id, message);
    return NextResponse.json({ processed: false, jobId: job.id, error: message }, { status: 500 });
  }
}
