export const dynamic = 'force-dynamic';
/**
 * GET /api/stats/changes?since=<ms epoch>
 *
 * "New since your last visit" — how much the archive grew since a timestamp.
 * Anonymous return-loop fuel for the landing banner. Cached per hour-bucket so
 * repeat visitors in the same window share one DB round trip.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cachedJson } from '@/lib/cache/api-cache';

const MAX_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000; // cap silly timestamps

export async function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get('since'));
  if (!Number.isFinite(raw) || raw <= 0) {
    return NextResponse.json({ error: 'since (ms epoch) required' }, { status: 400 });
  }
  const since = new Date(Math.max(raw, Date.now() - MAX_LOOKBACK_MS));

  // Bucket the cache key to the hour so every visitor with a similar last-visit
  // shares the cached counts.
  const bucket = Math.floor(since.getTime() / 3_600_000);
  const payload = await cachedJson(`changes:${bucket}`, 10 * 60 * 1000, async () => {
    const [newNodes, newConnections] = await Promise.all([
      prisma.node.count({ where: { status: 'published', publishedAt: { gte: since } } }),
      prisma.edge.count({ where: { status: 'published', createdAt: { gte: since } } }),
    ]);
    return { newNodes, newConnections };
  });

  return NextResponse.json(payload);
}
