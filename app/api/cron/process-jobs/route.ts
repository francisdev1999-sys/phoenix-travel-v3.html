import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/process-jobs
 *
 * Drains the IngestionJob queue (lib/jobs/queue.ts) in a bounded batch.
 * Nothing else in production ever dequeued this table — enqueue() (used by
 * auto-relationships, node-engine's auto-promotion, embedding requests, etc.)
 * was filling it, but with no worker pulling from it the jobs just piled up
 * and e.g. suggest-relationships never actually produced a
 * RelationshipSuggestion for an enqueued orphan node.
 *
 * Protected by CRON_SECRET. Suggested schedule: every 5 minutes.
 */
import { NextRequest, NextResponse } from 'next/server';
import { dequeue, completeJob, failJob } from '@/lib/jobs/queue';
import { processJob } from '@/lib/jobs/process-job';

const CRON_SECRET   = process.env.CRON_SECRET;
const MAX_JOBS       = 30;
const TIME_BUDGET_MS = 50_000;

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  let processed = 0;
  let failed    = 0;
  const failures: { jobId: string; type: string; error: string }[] = [];

  while (processed + failed < MAX_JOBS && Date.now() - start < TIME_BUDGET_MS) {
    const job = await dequeue();
    if (!job) break;

    try {
      await processJob(job.type, job.payload as Record<string, string>);
      await completeJob(job.id);
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await failJob(job.id, message);
      failed++;
      failures.push({ jobId: job.id, type: job.type, error: message });
    }
  }

  return NextResponse.json({ processed, failed, failures, ms: Date.now() - start });
}

export const POST = withCronTracking('process-jobs', handler);
