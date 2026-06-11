/**
 * Trust Score Engine
 *
 * Measures contribution quality, not activity volume.
 * Range: 0–100. Default for new users: 50.
 *
 * Trust events are appended (never deleted) for full auditability.
 * The User.trustScore column is the current aggregate, updated in-place.
 *
 * Time-decay model:
 *   Positive events: half-life 180 days (good history persists)
 *   Negative events: half-life 60 days  (allows redemption over time)
 */

import { prisma } from '@/lib/db';

// ── Time-decay constants ──────────────────────────────────────────────────────

export const POSITIVE_HALF_LIFE_DAYS = 180;
export const NEGATIVE_HALF_LIFE_DAYS = 60;
export const BASE_TRUST = 50; // starting score for all new users

/**
 * Compute a time-weighted trust score from event history.
 *
 * Pure function — safe for tests and client-side display logic.
 * Older events contribute less; negative events decay faster than positive
 * ones, giving users a recovery path after a bad period.
 */
export function computeTimeWeightedScore(
  events: ReadonlyArray<{ delta: number; createdAt: Date | string }>,
  now: Date = new Date(),
): number {
  let score = BASE_TRUST;
  for (const ev of events) {
    const ageDays  = (now.getTime() - new Date(ev.createdAt).getTime()) / 86_400_000;
    const halfLife = ev.delta >= 0 ? POSITIVE_HALF_LIFE_DAYS : NEGATIVE_HALF_LIFE_DAYS;
    const weight   = Math.exp((-Math.LN2 * ageDays) / halfLife);
    score += ev.delta * weight;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Recalculate a user's trust score from their full event history with
 * time-weighting applied, then persist the result.
 * Called by the monthly trust-pass cron after awarding bonuses.
 */
export async function recomputeTrustScore(userId: string): Promise<number> {
  const events = await prisma.userTrustEvent.findMany({
    where:   { userId },
    select:  { delta: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const score = computeTimeWeightedScore(events);
  await prisma.user.update({ where: { id: userId }, data: { trustScore: score } });
  return score;
}

// ── Trust event reasons ───────────────────────────────────────────────────────

export type TrustReason =
  | 'approved_node'
  | 'approved_source'
  | 'approved_relationship'
  | 'rejected_content'
  | 'fake_source'
  | 'spam_submission'
  | 'moderator_warning'
  | 'misinformation_flag'
  | 'reviewer_endorsement'
  | 'account_age_bonus'
  | 'low_rejection_rate_bonus'
  | 'high_credibility_sources'
  | 'admin_adjustment';

export const TRUST_DELTAS: Record<TrustReason, number> = {
  approved_node:             +5,
  approved_source:           +3,
  approved_relationship:     +2,
  rejected_content:          -3,
  fake_source:               -10,
  spam_submission:           -8,
  moderator_warning:         -15,
  misinformation_flag:       -20,
  reviewer_endorsement:      +10,
  account_age_bonus:         +1,    // per quarter, max 8
  low_rejection_rate_bonus:  +0.5,  // monthly, if <10% rejection with 10+ submissions
  high_credibility_sources:  +2,    // monthly, avg credibility > 0.8
  admin_adjustment:          0,     // delta supplied by caller
};

// ── Core functions ────────────────────────────────────────────────────────────

export async function applyTrustEvent(
  userId:    string,
  reason:    TrustReason,
  delta?:    number,          // override for 'admin_adjustment'
  detail?:   string,
  createdBy: string = 'system',
): Promise<number> {
  const effectiveDelta = reason === 'admin_adjustment'
    ? (delta ?? 0)
    : TRUST_DELTAS[reason];

  // Append event
  await prisma.userTrustEvent.create({
    data: { userId, delta: effectiveDelta, reason, detail, createdBy },
  });

  // Update User.trustScore (clamped 0–100)
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { trustScore: true },
  });
  const current   = user?.trustScore ?? 50;
  const newScore  = Math.min(100, Math.max(0, current + effectiveDelta));

  await prisma.user.update({
    where: { id: userId },
    data:  { trustScore: newScore },
  });

  return newScore;
}

export async function getTrustEvents(userId: string, limit = 50) {
  return prisma.userTrustEvent.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  });
}

/**
 * Monthly batch pass — awards low-rejection-rate bonus and account-age bonus.
 * Run via cron or manual trigger from the admin panel.
 */
export async function runMonthlyTrustPass(): Promise<{ processed: number }> {
  const users = await prisma.user.findMany({
    where:  { isBanned: false },
    select: { id: true, submissionCount: true, rejectedCount: true, createdAt: true, trustScore: true },
  });

  let processed = 0;
  const now = new Date();

  for (const u of users) {
    // Low rejection rate bonus
    if (u.submissionCount >= 10) {
      const rate = u.rejectedCount / u.submissionCount;
      if (rate < 0.1) {
        await applyTrustEvent(u.id, 'low_rejection_rate_bonus');
        processed++;
      }
    }

    // Account age quarterly bonus (check via DB events — skip if awarded in last 90 days)
    const ageMs   = now.getTime() - new Date(u.createdAt).getTime();
    const quarters = Math.floor(ageMs / (90 * 24 * 60 * 60 * 1000));
    const ageEvents = await prisma.userTrustEvent.count({
      where: { userId: u.id, reason: 'account_age_bonus' },
    });
    if (quarters > ageEvents && ageEvents < 8) {
      await applyTrustEvent(u.id, 'account_age_bonus');
      processed++;
    }
  }

  return { processed };
}

// Re-export pure display helpers (no DB) for convenience
export { trustLevel, trustColor } from '@/lib/trust-utils';
