export const dynamic = 'force-dynamic';
/**
 * GET /api/admin/cron-health
 *
 * Per-job health summary for the autonomous pipeline, derived from CronRun
 * rows written by lib/cron/tracker.ts. Powers the health board in the admin
 * panel. Auth: admin or owner (enforced by /api/admin/* middleware).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ALERT_THRESHOLD } from '@/lib/cron/tracker';

// Canonical list of scheduled jobs — surfaced even if they have never run.
const KNOWN_JOBS = [
  'process-jobs', 'lift-bans', 'news-feed', 'node-discovery', 'source-discovery',
  'auto-similarity', 'auto-relationships', 'research-maturity', 'auto-audit',
  'fix-invalid-dates', 'learning-pass', 'news-discovery', 'trust-pass',
];

const HISTORY_PER_JOB = 20;
const STALE_MS = 1000 * 60 * 60 * 26; // a "running" row older than this is presumed crashed

interface JobHealth {
  job:                 string;
  lastStatus:          string | null;   // success | skipped | failed | running | null(never)
  lastStartedAt:       string | null;
  lastCompletedAt:     string | null;
  lastDurationMs:      number | null;
  lastError:           string | null;
  consecutiveFailures: number;
  alerting:            boolean;
  runs:                number;           // rows counted (up to HISTORY_PER_JOB)
  successRate:         number | null;    // over counted rows (success or skipped)
  presumedStuck:       boolean;          // last row still "running" and stale
}

export async function GET() {
  // Pull a bounded, recent window of runs and bucket them per job in memory.
  const rows = await prisma.cronRun.findMany({
    orderBy: { startedAt: 'desc' },
    take:    KNOWN_JOBS.length * HISTORY_PER_JOB * 2,
    select: {
      job: true, status: true, ok: true, startedAt: true,
      completedAt: true, durationMs: true, error: true,
    },
  });

  const byJob = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byJob.get(r.job) ?? [];
    if (list.length < HISTORY_PER_JOB) list.push(r);
    byJob.set(r.job, list);
  }

  const now = Date.now();
  const jobs: JobHealth[] = [...new Set([...KNOWN_JOBS, ...byJob.keys()])].map(job => {
    const history = byJob.get(job) ?? [];
    const last    = history[0] ?? null;

    // Count leading failures from the most recent run (skipped/success break the streak).
    let consecutiveFailures = 0;
    for (const r of history) {
      if (r.status === 'failed') consecutiveFailures++;
      else if (r.status === 'running') continue; // in-flight doesn't reset or extend
      else break;
    }

    const counted    = history.filter(r => r.status !== 'running');
    const successes  = counted.filter(r => r.status === 'success' || r.status === 'skipped').length;

    return {
      job,
      lastStatus:          last?.status ?? null,
      lastStartedAt:       last?.startedAt.toISOString() ?? null,
      lastCompletedAt:     last?.completedAt?.toISOString() ?? null,
      lastDurationMs:      last?.durationMs ?? null,
      lastError:           last?.error ?? null,
      consecutiveFailures,
      alerting:            consecutiveFailures >= ALERT_THRESHOLD,
      runs:                counted.length,
      successRate:         counted.length ? successes / counted.length : null,
      presumedStuck:       !!last && last.status === 'running' &&
                            now - last.startedAt.getTime() > STALE_MS,
    };
  });

  jobs.sort((a, b) => {
    // Alerting/stuck first, then most-recently-run.
    const sev = (j: JobHealth) => (j.alerting ? 2 : j.presumedStuck ? 1 : 0);
    if (sev(a) !== sev(b)) return sev(b) - sev(a);
    return (b.lastStartedAt ?? '').localeCompare(a.lastStartedAt ?? '');
  });

  return NextResponse.json({
    alertThreshold: ALERT_THRESHOLD,
    alertingCount:  jobs.filter(j => j.alerting).length,
    stuckCount:     jobs.filter(j => j.presumedStuck).length,
    jobs,
  });
}
