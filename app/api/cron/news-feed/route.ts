export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/news-feed
 *
 * Fetches RSS feeds focused on UFO, government documents, conspiracies,
 * missing persons, and science mysteries. Stores new items; prunes items
 * older than 30 days. Protected by CRON_SECRET (enforced in middleware).
 * Run hourly via Railway cron.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchAllFeeds } from '@/lib/news/rss-fetcher';

const MAX_AGE_DAYS = 30;

export async function POST() {
  const started = Date.now();

  // ── 1. Fetch all feeds in parallel ───────────────────────────────────────
  const items = await fetchAllFeeds();

  // ── 2. Upsert new items (skip duplicates by URL) ──────────────────────────
  let inserted = 0;
  const CHUNK = 50;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const ops = chunk.map(item =>
      prisma.newsItem.upsert({
        where:  { url: item.url },
        update: {},   // don't overwrite existing items
        create: {
          title:       item.title,
          description: item.description || null,
          url:         item.url,
          source:      item.source,
          sourceUrl:   item.siteUrl,
          category:    item.category,
          publishedAt: item.publishedAt,
          imageUrl:    item.imageUrl,
        },
      })
    );
    const results = await Promise.allSettled(ops);
    for (const r of results) {
      if (r.status === 'fulfilled') inserted++;
    }
  }

  // ── 3. Prune items older than 30 days ─────────────────────────────────────
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  const { count: pruned } = await prisma.newsItem.deleteMany({
    where: { publishedAt: { lt: cutoff } },
  });

  return NextResponse.json({
    fetched:  items.length,
    inserted,
    pruned,
    ms: Date.now() - started,
  });
}
