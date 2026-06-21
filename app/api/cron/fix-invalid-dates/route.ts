export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/fix-invalid-dates
 *
 * Finds published nodes where dateEnd < dateStart and clears both fields.
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
      status:    'published',
      dateStart: { not: null },
      dateEnd:   { not: null },
    },
    select: { id: true, title: true, dateStart: true, dateEnd: true, version: true },
  });

  const invalid = candidates.filter(n => n.dateEnd! < n.dateStart!);
  if (invalid.length === 0) {
    return NextResponse.json({ fixed: 0, reason: 'no invalid date ranges found' });
  }

  const fixed: string[] = [];
  for (const node of invalid) {
    await prisma.$transaction([
      prisma.nodeVersion.create({
        data: {
          nodeId:     node.id,
          version:    node.version,
          snapshot:   { dateStart: node.dateStart, dateEnd: node.dateEnd },
          changeNote: `Auto-cleared invalid date range (dateEnd ${node.dateEnd} < dateStart ${node.dateStart}) by fix-invalid-dates cron`,
        },
      }),
      prisma.node.update({
        where: { id: node.id },
        data:  { dateStart: null, dateEnd: null, version: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          action:     'invalid_date_range_cleared',
          entityType: 'node',
          entityId:   node.id,
          detail:     { title: node.title, clearedDateStart: node.dateStart, clearedDateEnd: node.dateEnd },
        },
      }),
    ]);
    fixed.push(node.id);
  }

  return NextResponse.json({ fixed: fixed.length, nodeIds: fixed });
}
