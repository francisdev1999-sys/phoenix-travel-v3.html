import { withCronTracking } from '@/lib/cron/tracker';
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

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Orphans (zero edges either direction) get first claim on the batch —
  // this is what the archive-health audit actually measures, and without
  // this a node with even one old unresolved suggestion was permanently
  // skipped below even though it never got connected.
  const orphans = await prisma.node.findMany({
    where: {
      status: 'published',
      edgesFrom: { none: {} },
      edgesTo:   { none: {} },
    },
    select:  { id: true },
    take:    BATCH_SIZE,
    orderBy: { publishedAt: 'desc' },
  });

  // Fill remaining quota with nodes that have zero pending relationship suggestions
  let nodes = orphans;
  if (nodes.length < BATCH_SIZE) {
    const fresh = await prisma.node.findMany({
      where: {
        status: 'published',
        id:     { notIn: nodes.map(n => n.id) },
        outgoingRelSuggestions: { none: { status: 'pending' } },
        incomingRelSuggestions: { none: { status: 'pending' } },
      },
      select:  { id: true },
      take:    BATCH_SIZE - nodes.length,
      orderBy: { publishedAt: 'desc' },
    });
    nodes = [...nodes, ...fresh];
  }

  if (nodes.length === 0) {
    return NextResponse.json({ enqueued: 0, reason: 'all nodes have pending suggestions' });
  }

  const results = await Promise.allSettled(
    nodes.map(n => enqueue('suggest-relationships', { nodeId: n.id }, 40)),
  );
  const enqueued = results.filter(r => r.status === 'fulfilled').length;

  return NextResponse.json({ enqueued, total: nodes.length });
}

export const POST = withCronTracking('auto-relationships', handler);
