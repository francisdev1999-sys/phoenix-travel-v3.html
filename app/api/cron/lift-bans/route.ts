export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/lift-bans
 *
 * Lifts suspensions and bans whose banExpiresAt has passed.
 * Protected by CRON_SECRET (enforced in middleware).
 * Run via Railway cron: every 15 minutes.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

export async function POST() {
  const now = new Date();

  // Find all users with an expired ban/suspension
  const expired = await prisma.user.findMany({
    where: {
      banExpiresAt: { lte: now },
      OR: [{ isBanned: true }, { banExpiresAt: { not: null } }],
    },
    select: { id: true, isBanned: true },
  });

  if (expired.length === 0) {
    return NextResponse.json({ lifted: 0 });
  }

  const ids = expired.map(u => u.id);

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: { in: ids } },
      data:  { isBanned: false, banReason: null, banExpiresAt: null },
    }),
    prisma.userModerationStatus.updateMany({
      where:  { userId: { in: ids }, status: { in: ['banned', 'suspended'] } },
      data:   { status: 'active', reason: 'Suspension/ban expired automatically', changedAt: now },
    }),
  ]);

  await writeAuditLog({
    userId:    null,
    userEmail: null,
    action:    'unban',
    entityType: 'user',
    entityId:   'bulk',
    detail:    { reason: 'Expired', count: ids.length, userIds: ids },
  });

  return NextResponse.json({ lifted: ids.length, userIds: ids });
}
