/**
 * Cron run tracking + self-heal alerting.
 *
 * withCronTracking() wraps a cron route's POST handler so EVERY execution —
 * whether fired by the GitHub Actions schedule (POST /api/cron/<job>) or
 * manually from the admin panel (which imports the same POST) — records a
 * CronRun row with status, duration and error. This is what makes a silent
 * cron failure (like the auto-audit stall) visible instead of invisible.
 *
 * Tracking is strictly best-effort: any failure to write a CronRun row is
 * swallowed so it can never break or mask the underlying job.
 */

import type { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

// Number of consecutive failed runs before a job is considered "alerting".
export const ALERT_THRESHOLD = 3;

type CronHandler = (req: NextRequest) => Promise<NextResponse>;

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

function extractError(summary: unknown): string | null {
  if (summary && typeof summary === 'object' && 'error' in summary) {
    const e = (summary as { error?: unknown }).error;
    return typeof e === 'string' ? e : e != null ? String(e) : null;
  }
  return null;
}

function isSkipped(summary: unknown): boolean {
  return !!(summary && typeof summary === 'object' && 'skipped' in summary &&
    (summary as { skipped?: unknown }).skipped === true);
}

export function withCronTracking(job: string, handler: CronHandler): CronHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startedAt = new Date();

    // Open the run record up-front so an in-flight/crashed job is still visible.
    let runId: string | null = null;
    try {
      const run = await prisma.cronRun.create({ data: { job, status: 'running', startedAt } });
      runId = run.id;
    } catch {
      // tracking is best-effort — proceed with the job regardless
    }

    const finish = async (
      data: Prisma.CronRunUpdateInput,
    ): Promise<void> => {
      if (!runId) return;
      try {
        await prisma.cronRun.update({ where: { id: runId }, data });
      } catch {
        /* swallow */
      }
    };

    try {
      const res = await handler(req);
      const completedAt = new Date();
      const durationMs  = completedAt.getTime() - startedAt.getTime();

      let summary: unknown = null;
      try { summary = await res.clone().json(); } catch { /* non-JSON body */ }

      const ok      = res.ok;
      const skipped = ok && isSkipped(summary);
      const status  = !ok ? 'failed' : skipped ? 'skipped' : 'success';

      await finish({
        status,
        ok,
        completedAt,
        durationMs,
        result: toJson(summary),
        error:  ok ? null : extractError(summary) ?? `HTTP ${res.status}`,
      });

      return res;
    } catch (err) {
      const completedAt = new Date();
      const message = err instanceof Error ? err.message : String(err);
      await finish({
        status:      'failed',
        ok:          false,
        completedAt,
        durationMs:  completedAt.getTime() - startedAt.getTime(),
        error:       message,
      });
      throw err;
    }
  };
}
