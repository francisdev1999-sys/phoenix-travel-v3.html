import { describe, it, expect, vi } from 'vitest';

// Mock DB — pure functions tested here never call prisma
vi.mock('@/lib/db', () => ({ prisma: {} }));

import {
  computeTimeWeightedScore,
  BASE_TRUST,
  POSITIVE_HALF_LIFE_DAYS,
  NEGATIVE_HALF_LIFE_DAYS,
  TRUST_DELTAS,
} from '@/lib/trust-score';

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

// ── computeTimeWeightedScore ──────────────────────────────────────────────────

describe('computeTimeWeightedScore', () => {
  it('returns BASE_TRUST for a user with no events', () => {
    expect(computeTimeWeightedScore([])).toBe(BASE_TRUST);
  });

  it('applies full weight to an event from today', () => {
    const ev = { delta: 10, createdAt: daysAgo(0) };
    const score = computeTimeWeightedScore([ev]);
    // weight ≈ 1.0 → score ≈ 60
    expect(score).toBe(60);
  });

  it('reduces negative event impact for old events', () => {
    const recentBad = computeTimeWeightedScore([{ delta: -20, createdAt: daysAgo(0) }]);
    const oldBad    = computeTimeWeightedScore([{ delta: -20, createdAt: daysAgo(NEGATIVE_HALF_LIFE_DAYS) }]);

    // Old bad event should penalise roughly half as much (weight ≈ 0.5)
    const recentPenalty = BASE_TRUST - recentBad;
    const oldPenalty    = BASE_TRUST - oldBad;
    expect(oldPenalty).toBeLessThan(recentPenalty);
    expect(oldPenalty).toBeCloseTo(recentPenalty / 2, 0);
  });

  it('reduces positive event impact for old events at the positive half-life', () => {
    const recent = computeTimeWeightedScore([{ delta: 20, createdAt: daysAgo(0) }]);
    const old    = computeTimeWeightedScore([{ delta: 20, createdAt: daysAgo(POSITIVE_HALF_LIFE_DAYS) }]);

    const recentGain = recent - BASE_TRUST;
    const oldGain    = old    - BASE_TRUST;
    expect(oldGain).toBeLessThan(recentGain);
    expect(oldGain).toBeCloseTo(recentGain / 2, 0);
  });

  it('allows redemption: sustained recent good behaviour overcomes old bad events', () => {
    const badPast = { delta: TRUST_DELTAS.misinformation_flag, createdAt: daysAgo(365) }; // -20, 1 year ago
    const goodNow = [
      { delta: TRUST_DELTAS.approved_node, createdAt: daysAgo(5) },  // +5
      { delta: TRUST_DELTAS.approved_node, createdAt: daysAgo(4) },
      { delta: TRUST_DELTAS.approved_node, createdAt: daysAgo(3) },
      { delta: TRUST_DELTAS.approved_node, createdAt: daysAgo(2) },
      { delta: TRUST_DELTAS.reviewer_endorsement, createdAt: daysAgo(1) }, // +10
    ];

    const onlyBad   = computeTimeWeightedScore([badPast]);
    const recovered = computeTimeWeightedScore([badPast, ...goodNow]);
    expect(recovered).toBeGreaterThan(onlyBad);
    expect(recovered).toBeGreaterThan(BASE_TRUST); // positive territory restored
  });

  it('clamps to 0 when penalties are enormous', () => {
    const manyBad = Array.from({ length: 20 }, () => ({
      delta: -20,
      createdAt: daysAgo(0),
    }));
    expect(computeTimeWeightedScore(manyBad)).toBe(0);
  });

  it('clamps to 100 when bonuses exceed the ceiling', () => {
    const manyGood = Array.from({ length: 20 }, () => ({
      delta: +20,
      createdAt: daysAgo(0),
    }));
    expect(computeTimeWeightedScore(manyGood)).toBe(100);
  });

  it('accepts createdAt as a string (Prisma JSON serialisation)', () => {
    const ev = { delta: 5, createdAt: new Date().toISOString() };
    const score = computeTimeWeightedScore([ev]);
    expect(score).toBe(55);
  });

  it('is deterministic for the same input', () => {
    const now = new Date('2026-06-01T00:00:00Z');
    const events = [
      { delta: 5,  createdAt: new Date('2026-03-01T00:00:00Z') },
      { delta: -8, createdAt: new Date('2026-01-01T00:00:00Z') },
      { delta: 3,  createdAt: new Date('2026-05-01T00:00:00Z') },
    ];
    expect(computeTimeWeightedScore(events, now)).toBe(computeTimeWeightedScore(events, now));
  });
});

// ── TRUST_DELTAS sanity ───────────────────────────────────────────────────────

describe('TRUST_DELTAS', () => {
  it('all positive reasons have positive deltas', () => {
    const positiveReasons = [
      'approved_node', 'approved_source', 'approved_relationship',
      'reviewer_endorsement', 'account_age_bonus', 'low_rejection_rate_bonus',
      'high_credibility_sources',
    ];
    for (const r of positiveReasons) {
      expect(TRUST_DELTAS[r as keyof typeof TRUST_DELTAS]).toBeGreaterThan(0);
    }
  });

  it('all penalty reasons have negative deltas', () => {
    const penaltyReasons = [
      'rejected_content', 'fake_source', 'spam_submission',
      'moderator_warning', 'misinformation_flag',
    ];
    for (const r of penaltyReasons) {
      expect(TRUST_DELTAS[r as keyof typeof TRUST_DELTAS]).toBeLessThan(0);
    }
  });

  it('admin_adjustment is 0 (delta must be supplied by caller)', () => {
    expect(TRUST_DELTAS.admin_adjustment).toBe(0);
  });

  it('misinformation penalty is the harshest', () => {
    const penalties = [
      TRUST_DELTAS.rejected_content,
      TRUST_DELTAS.fake_source,
      TRUST_DELTAS.spam_submission,
      TRUST_DELTAS.moderator_warning,
      TRUST_DELTAS.misinformation_flag,
    ];
    expect(TRUST_DELTAS.misinformation_flag).toBe(Math.min(...penalties));
  });
});
