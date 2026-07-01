import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/trust-pass
 *
 * Monthly trust bonus pass — awards low-rejection-rate and account-age bonuses.
 * Fixed version: uses a single grouped query instead of N per-user queries.
 * Protected by CRON_SECRET (enforced in middleware).
 * Run via Railway cron: 1st of each month at 00:00 UTC.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { applyTrustEvent, recomputeTrustScore } from '@/lib/trust-score';

async function handler() {
  const now = new Date();

  // Fetch all eligible users in one query
  const users = await prisma.user.findMany({
    where:  { isBanned: false },
    select: { id: true, submissionCount: true, rejectedCount: true, createdAt: true },
  });

  // Batch-fetch age event counts for all users in a single grouped query
  const ageEventCounts = await prisma.userTrustEvent.groupBy({
    by:      ['userId'],
    where:   { reason: 'account_age_bonus' },
    _count:  { _all: true },
  });
  const ageCountMap = new Map(ageEventCounts.map(r => [r.userId, r._count._all]));

  const bonusOps: Promise<number>[] = [];

  for (const u of users) {
    // Low rejection rate bonus
    if (u.submissionCount >= 10) {
      const rate = u.rejectedCount / u.submissionCount;
      if (rate < 0.1) {
        bonusOps.push(applyTrustEvent(u.id, 'low_rejection_rate_bonus'));
      }
    }

    // Account age quarterly bonus — max 8 (2 years)
    const ageMs    = now.getTime() - new Date(u.createdAt).getTime();
    const quarters = Math.floor(ageMs / (90 * 24 * 60 * 60 * 1000));
    const awarded  = ageCountMap.get(u.id) ?? 0;
    if (quarters > awarded && awarded < 8) {
      bonusOps.push(applyTrustEvent(u.id, 'account_age_bonus'));
    }
  }

  // Run all trust updates with controlled concurrency (50 at a time)
  const CHUNK = 50;
  let processed = 0;
  for (let i = 0; i < bonusOps.length; i += CHUNK) {
    await Promise.all(bonusOps.slice(i, i + CHUNK));
    processed += Math.min(CHUNK, bonusOps.length - i);
  }

  // Apply time-decay recompute for all non-banned users so old negative
  // events gradually fade and scores reflect sustained recent behaviour.
  const allUserIds = users.map(u => u.id);
  const RECOMPUTE_CHUNK = 20;
  let recomputed = 0;
  for (let i = 0; i < allUserIds.length; i += RECOMPUTE_CHUNK) {
    await Promise.all(allUserIds.slice(i, i + RECOMPUTE_CHUNK).map(id => recomputeTrustScore(id)));
    recomputed += Math.min(RECOMPUTE_CHUNK, allUserIds.length - i);
  }

  return NextResponse.json({ processed, recomputed, total: users.length, ranAt: now });
}

export const POST = withCronTracking('trust-pass', handler);
