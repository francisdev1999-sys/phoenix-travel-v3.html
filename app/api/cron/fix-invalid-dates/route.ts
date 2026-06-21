export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/fix-invalid-dates
 *
 * Finds published nodes with invalid temporal data — either dateEnd < dateStart,
 * or an out-of-range year (year > 2100 or year < -2000000) — and clears the
 * offending field(s). This mirrors the exact condition the cro-audit uses to
 * count "invalid date entries" (see app/api/admin/cro-audit/route.ts PART 3),
 * so a clean run here is what brings that audit metric to zero.
 *
 * We never guess which value is wrong — swapping or "correcting" would be
 * fabricating a date. Clearing is non-destructive: a NodeVersion snapshot
 * is written first, so a human can restore the original values from
 * version history if they turn out to be recoverable from a source.
 *
 * Protected by CRON_SECRET. Idempotent — a clean archive is a no-op.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET;
const YEAR_MAX = 2100;
const YEAR_MIN = -2000000;

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const candidates = await prisma.node.findMany({
    where: {
      status: 'published',
      OR: [
        { dateStart: { not: null }, dateEnd: { not: null } },
        { year: { gt: YEAR_MAX } },
        { year: { lt: YEAR_MIN } },
      ],
    },
    select: { id: true, title: true, year: true, dateStart: true, dateEnd: true, version: true },
  });

  const invalid = candidates.filter(n =>
    (n.dateEnd != null && n.dateStart != null && n.dateEnd < n.dateStart) ||
    (n.year != null && (n.year > YEAR_MAX || n.year < YEAR_MIN)),
  );
  if (invalid.length === 0) {
    return NextResponse.json({ fixed: 0, reason: 'no invalid date ranges found' });
  }

  const fixed: string[] = [];
  for (const node of invalid) {
    const badRange = node.dateEnd != null && node.dateStart != null && node.dateEnd < node.dateStart;
    const badYear  = node.year != null && (node.year > YEAR_MAX || node.year < YEAR_MIN);

    const data: Record<string, unknown> = { version: { increment: 1 } };
    if (badRange) { data.dateStart = null; data.dateEnd = null; }
    if (badYear)  { data.year = null; }

    const noteParts: string[] = [];
    if (badRange) noteParts.push(`invalid date range (dateEnd ${node.dateEnd} < dateStart ${node.dateStart})`);
    if (badYear)  noteParts.push(`out-of-range year (${node.year})`);

    await prisma.$transaction([
      prisma.nodeVersion.create({
        data: {
          nodeId:     node.id,
          version:    node.version,
          snapshot:   { year: node.year, dateStart: node.dateStart, dateEnd: node.dateEnd },
          changeNote: `Auto-cleared ${noteParts.join(' and ')} by fix-invalid-dates cron`,
        },
      }),
      prisma.node.update({ where: { id: node.id }, data }),
      prisma.auditLog.create({
        data: {
          action:     'invalid_date_range_cleared',
          entityType: 'node',
          entityId:   node.id,
          detail:     {
            title: node.title,
            clearedYear:      badYear  ? node.year      : undefined,
            clearedDateStart: badRange ? node.dateStart  : undefined,
            clearedDateEnd:   badRange ? node.dateEnd    : undefined,
          },
        },
      }),
    ]);
    fixed.push(node.id);
  }

  return NextResponse.json({ fixed: fixed.length, nodeIds: fixed });
}
