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

// The archive is human-history scale; guard "years covered" against junk year
// data (e.g. an out-of-range value the fix-invalid-dates cron hasn't cleared).
const MIN_PLAUSIBLE_YEAR = -12000;

export async function GET() {
  const [nodeCount, edgeCount, galaxyCount, oldest] = await Promise.all([
    prisma.node.count({ where: { status: 'published' } }),
    prisma.edge.count({ where: { status: 'published' } }),
    prisma.galaxy.count(),
    prisma.node.findFirst({
      where:   { status: 'published', year: { gte: MIN_PLAUSIBLE_YEAR } },
      orderBy: { year: 'asc' },
      select:  { year: true },
    }),
  ]);

  const currentYear = new Date().getFullYear();
  let yearsCovered = 10000; // sensible fallback when no dated nodes exist yet
  if (oldest?.year != null) {
    const span = currentYear - oldest.year;
    if (span > 0) yearsCovered = Math.max(1000, Math.round(span / 1000) * 1000);
  }

  return NextResponse.json({ nodeCount, edgeCount, galaxyCount, yearsCovered });
}
