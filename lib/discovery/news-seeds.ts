/**
 * News → discovery bridge.
 *
 * Turns freshly ingested NewsItem headlines (the hourly RSS feed already
 * filters to archive-relevant categories: UFO/UAP, government documents,
 * archaeology, conspiracies, science mysteries) into discovery seed queries,
 * so the archive autonomously grows toward what is happening in the world.
 *
 * Seeds are heuristic headline cleanups — the downstream discovery pipeline
 * (Wikipedia search → Claude extraction → relevance/novelty gates → learned
 * lane) is what decides whether anything actually gets published, so a noisy
 * seed costs at most one skipped search.
 */

import { prisma } from '@/lib/db';

/** Strip source suffixes and noise from an RSS headline to make a search seed. */
export function headlineToSeed(title: string): string | null {
  let t = title
    .replace(/\s+[-–—|]\s+[^-–—|]{2,40}$/, '') // trailing " - CNN" / " | The Guardian"
    .replace(/["“”'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length < 12) return null; // too short to name a real topic
  if (t.length > 90) t = t.slice(0, 90).trim();
  return t;
}

/**
 * Recent news headlines (fetched since `since`) as deduplicated seed queries,
 * newest first, capped at `limit`.
 */
export async function getNewsSeeds(limit: number, since: Date): Promise<string[]> {
  const items = await prisma.newsItem.findMany({
    where:   { fetchedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take:    limit * 3, // headroom for cleanup/dedupe drops
    select:  { title: true },
  });

  const seeds: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const seed = headlineToSeed(item.title);
    if (!seed) continue;
    const key = seed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    seeds.push(seed);
    if (seeds.length >= limit) break;
  }
  return seeds;
}
