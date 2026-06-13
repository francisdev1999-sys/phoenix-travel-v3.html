export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/auto-relationships
 *
 * Enqueues suggest-relationships jobs for recently published nodes
 * that have few or no pending relationship suggestions.
 *
 * Protected by CRON_SECRET. Suggested schedule: daily at 02:00 UTC.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueue } from '@/lib/jobs/queue';

const CRON_SECRET = process.env.CRON_SECRET;
const BATCH_SIZE  = 30;

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find nodes that have zero pending relationship suggestions
  const nodes = await prisma.node.findMany({
    where: {
      status: 'published',
      outgoingRelSuggestions: { none: { status: 'pending' } },
      incomingRelSuggestions: { none: { status: 'pending' } },
    },
    select:  { id: true },
    take:    BATCH_SIZE,
    orderBy: { publishedAt: 'desc' },
  });

  if (nodes.length === 0) {
    return NextResponse.json({ enqueued: 0, reason: 'all nodes have pending suggestions' });
  }

  const results = await Promise.allSettled(
    nodes.map(n => enqueue('suggest-relationships', { nodeId: n.id }, 40)),
  );
  const enqueued = results.filter(r => r.status === 'fulfilled').length;

  return NextResponse.json({ enqueued, total: nodes.length });
}
