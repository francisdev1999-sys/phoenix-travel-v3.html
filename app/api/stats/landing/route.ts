export const dynamic = 'force-dynamic';
/**
 * GET /api/stats/landing
 *
 * Public, live headline stats for the landing hero — published node count,
 * published connection count, galaxy count, and the temporal span the archive
 * covers. Computed straight from the DB so the numbers track autonomous growth
 * in real time instead of drifting from hardcoded values.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cachedJson } from '@/lib/cache/api-cache';

// The archive is human-history scale; guard "years covered" against junk year
// data (e.g. an out-of-range value the fix-invalid-dates cron hasn't cleared).
const MIN_PLAUSIBLE_YEAR = -12000;

export async function GET() {
  // Single DB round trip, cached in-process — this endpoint is hit by every
  // landing-page visitor and must never queue behind pipeline work.
  const stats = await cachedJson('stats:landing', 60_000, async () => {
    const [row] = await prisma.$queryRaw<{
      nodecount: bigint; edgecount: bigint; galaxycount: bigint; oldestyear: number | null;
    }[]>`
      SELECT
        (SELECT count(*) FROM "Node"  WHERE "status" = 'published')                                        AS nodecount,
        (SELECT count(*) FROM "Edge"  WHERE "status" = 'published')                                        AS edgecount,
        (SELECT count(*) FROM "Galaxy")                                                                    AS galaxycount,
        (SELECT min("year") FROM "Node" WHERE "status" = 'published' AND "year" >= ${MIN_PLAUSIBLE_YEAR}) AS oldestyear
    `;

    const currentYear = new Date().getFullYear();
    let yearsCovered = 10000; // sensible fallback when no dated nodes exist yet
    if (row?.oldestyear != null) {
      const span = currentYear - Number(row.oldestyear);
      if (span > 0) yearsCovered = Math.max(1000, Math.round(span / 1000) * 1000);
    }

    return {
      nodeCount:   Number(row?.nodecount ?? 0),
      edgeCount:   Number(row?.edgecount ?? 0),
      galaxyCount: Number(row?.galaxycount ?? 0),
      yearsCovered,
    };
  });

  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
