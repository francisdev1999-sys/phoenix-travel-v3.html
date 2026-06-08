/**
 * Lightweight PostgreSQL-backed job queue using the IngestionJob table.
 *
 * Provides: enqueue, dequeue (with advisory lock), complete, fail.
 * Workers call processNextJob() in a loop or via a cron endpoint.
 *
 * No external dependency — runs entirely on the existing PostgreSQL connection.
 */

import { prisma } from '@/lib/db';

export type JobType = 'embed-node' | 'embed-source' | 'rebuild-adjacency';

export interface JobPayload {
  'embed-node':          { nodeId: string };
  'embed-source':        { sourceId: string };
  'rebuild-adjacency':   { nodeId: string };
}

// ── Enqueue ───────────────────────────────────────────────────────────────────

export async function enqueue<T extends JobType>(
  type: T,
  payload: JobPayload[T],
  priority = 50,
): Promise<string> {
  const job = await prisma.ingestionJob.create({
    data: {
      type,
      targetId: JSON.stringify(payload), // store full payload as targetId string
      priority,
      status: 'pending',
    },
  });
  return job.id;
}

// ── Dequeue: claim the highest-priority pending job ───────────────────────────
// Uses a raw SQL SELECT FOR UPDATE SKIP LOCKED so concurrent workers
// don't pick up the same job.

export async function dequeue(): Promise<{ id: string; type: string; payload: object } | null> {
  const rows = await prisma.$queryRaw<{ id: string; type: string; targetId: string }[]>`
    UPDATE "IngestionJob"
    SET    "status" = 'processing', "attempts" = "attempts" + 1
    WHERE  "id" = (
      SELECT "id" FROM "IngestionJob"
      WHERE  "status" = 'pending'
      ORDER  BY "priority" DESC, "createdAt" ASC
      LIMIT  1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "type", "targetId"
  `;

  if (rows.length === 0) return null;

  const { id, type, targetId } = rows[0];
  let payload: object = {};
  try { payload = JSON.parse(targetId); } catch { /* targetId may be a plain string */ }

  return { id, type, payload };
}

// ── Complete / fail ───────────────────────────────────────────────────────────

export async function completeJob(jobId: string): Promise<void> {
  await prisma.ingestionJob.update({
    where: { id: jobId },
    data:  { status: 'done', processedAt: new Date() },
  });
}

export async function failJob(jobId: string, error: string): Promise<void> {
  await prisma.ingestionJob.update({
    where: { id: jobId },
    data:  { status: 'failed', lastError: error },
  });
}

// ── Retry failed jobs (called by admin or cron) ───────────────────────────────

export async function requeueFailed(maxAttempts = 3): Promise<number> {
  const result = await prisma.ingestionJob.updateMany({
    where: { status: 'failed', attempts: { lt: maxAttempts } },
    data:  { status: 'pending' },
  });
  return result.count;
}

// ── Queue stats ───────────────────────────────────────────────────────────────

export async function getQueueStats() {
  const rows = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
    SELECT "status", COUNT(*) AS "count"
    FROM   "IngestionJob"
    GROUP  BY "status"
  `;
  return Object.fromEntries(rows.map(r => [r.status, Number(r.count)]));
}
