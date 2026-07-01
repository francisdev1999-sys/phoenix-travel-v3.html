import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/auto-similarity
 *
 * Enqueues similarity-node jobs for recently published or updated nodes
 * that don't yet have an up-to-date ResearchSimilarity record.
 *
 * Protected by CRON_SECRET. Suggested schedule: every 6 hours.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueue } from '@/lib/jobs/queue';

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE  = 20; // nodes to enqueue per run

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days

  // Find recently published nodes with no or stale similarity record
  const nodes = await prisma.node.findMany({
    where: {
      status:    'published',
      updatedAt: { gte: since },
    },
    select: { id: true },
    take:   BATCH_SIZE,
    orderBy: { updatedAt: 'desc' },
  });

  if (nodes.length === 0) {
    return NextResponse.json({ enqueued: 0, reason: 'no recent nodes' });
  }

  const results = await Promise.allSettled(
    nodes.map(n => enqueue('similarity-node', { nodeId: n.id }, 45)),
  );
  const enqueued = results.filter(r => r.status === 'fulfilled').length;

  return NextResponse.json({ enqueued, total: nodes.length });
}

export const POST = withCronTracking('auto-similarity', handler);
