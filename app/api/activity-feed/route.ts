export const dynamic = 'force-dynamic';
/**
 * GET /api/activity-feed
 *
 * Public, read-only feed of recent autonomous-growth events — new published
 * nodes, new published connections, newly approved sources — for the
 * "growing right now" widget. Backed by ArchiveEvent, populated by
 * lib/orchestration/emit() at the moment each event actually happens (not a
 * batch cron), so this reflects growth in near-real-time.
 *
 * Only surfaces event types that represent live, public-facing content —
 * never drafts, proposals, or pending-review items.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cachedJson } from '@/lib/cache/api-cache';

const PAGE_SIZE = 20;
const FEED_EVENT_TYPES = ['node.published', 'edge.published', 'source.approved'];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const cursor = searchParams.get('cursor') ?? undefined;

  // First page is polled by every landing visitor — serve it from cache.
  if (!cursor) {
    const payload = await cachedJson('activity:first', 30_000, () => computeFeed(undefined));
    return NextResponse.json(payload);
  }
  return NextResponse.json(await computeFeed(cursor));
}

async function computeFeed(cursor: string | undefined) {

  const events = await prisma.archiveEvent.findMany({
    where:   { eventType: { in: FEED_EVENT_TYPES } },
    orderBy: { createdAt: 'desc' },
    take:    PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, eventType: true, entityType: true, entityId: true, metadata: true, createdAt: true },
  });

  const hasMore    = events.length > PAGE_SIZE;
  const page       = events.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  const items = page.map(e => ({
    id:        e.id,
    type:      e.eventType,
    entityId:  e.entityId,
    label:     buildLabel(e.eventType, e.metadata as Record<string, unknown>),
    createdAt: e.createdAt,
  }));

  return { items, nextCursor };
}

function buildLabel(eventType: string, metadata: Record<string, unknown>): string {
  switch (eventType) {
    case 'node.published':
      return `New research node: ${metadata.title ?? 'Untitled'}`;
    case 'edge.published': {
      const from = metadata.fromTitle as string | undefined;
      const to   = metadata.toTitle as string | undefined;
      return from && to ? `New connection: ${from} ↔ ${to}` : 'New connection discovered';
    }
    case 'source.approved':
      return `New source approved: ${metadata.title ?? 'Untitled'}`;
    default:
      return eventType;
  }
}
