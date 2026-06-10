import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import { computeRank, RANKS } from '@/lib/rank-system';
import { trustLevel, trustColor } from '@/lib/trust-utils';

// ── computeRank ───────────────────────────────────────────────────────────────

describe('computeRank', () => {
  it('returns New Seeker for a brand-new user (all zeros)', () => {
    expect(computeRank(0, 0, 0)).toBe('New Seeker');
  });

  it('returns Active Seeker with some activity but no trust threshold', () => {
    expect(computeRank(20, 0, 0)).toBe('Active Seeker');
  });

  it('requires trust ≥21 for Archive Explorer', () => {
    expect(computeRank(50, 20, 0)).not.toBe('Archive Explorer');
    expect(computeRank(50, 21, 0)).toBe('Archive Explorer');
  });

  it('requires ≥1 approval for Source Contributor', () => {
    expect(computeRank(30, 30, 0)).not.toBe('Source Contributor');
    expect(computeRank(30, 30, 1)).toBe('Source Contributor');
  });

  it('returns Evidence Builder at the right thresholds', () => {
    expect(computeRank(40, 40, 3)).toBe('Evidence Builder');
  });

  it('returns Trusted Seeker at the right thresholds', () => {
    expect(computeRank(50, 60, 5)).toBe('Trusted Seeker');
  });

  it('returns Verified Contributor at the right thresholds', () => {
    expect(computeRank(60, 75, 10)).toBe('Verified Contributor');
  });

  it('returns Research Ally at the right thresholds', () => {
    expect(computeRank(70, 85, 20)).toBe('Research Ally');
  });

  it('returns Archive Fellow at the right thresholds', () => {
    expect(computeRank(80, 90, 30)).toBe('Archive Fellow');
  });

  it('never auto-awards Council Reviewer (manualOnly = true)', () => {
    // Even extreme values should not produce Council Reviewer via computeRank
    expect(computeRank(1000, 100, 9999)).toBe('Archive Fellow');
  });

  it('picks the highest rank the user qualifies for', () => {
    // User exceeds Trusted Seeker but not Verified Contributor (needs 10 approved)
    expect(computeRank(60, 75, 9)).toBe('Trusted Seeker');
    expect(computeRank(60, 75, 10)).toBe('Verified Contributor');
  });

  it('capped activity score still ranks correctly', () => {
    // Activity score cap is 1000 — should still resolve Archive Fellow
    expect(computeRank(1000, 90, 30)).toBe('Archive Fellow');
  });
});

// ── RANKS array invariants ─────────────────────────────────────────────────────

describe('RANKS invariants', () => {
  it('has exactly 10 rank definitions', () => {
    expect(RANKS).toHaveLength(10);
  });

  it('exactly one rank has manualOnly=true (Council Reviewer)', () => {
    const manualRanks = RANKS.filter(r => r.manualOnly);
    expect(manualRanks).toHaveLength(1);
    expect(manualRanks[0].name).toBe('Council Reviewer');
  });

  it('all non-manual ranks have non-negative thresholds', () => {
    for (const r of RANKS.filter(r => !r.manualOnly)) {
      expect(r.minActivity).toBeGreaterThanOrEqual(0);
      expect(r.minTrust).toBeGreaterThanOrEqual(0);
      expect(r.minApproved).toBeGreaterThanOrEqual(0);
    }
  });

  it('New Seeker has all-zero thresholds (default fallback)', () => {
    const newSeeker = RANKS.find(r => r.name === 'New Seeker');
    expect(newSeeker?.minActivity).toBe(0);
    expect(newSeeker?.minTrust).toBe(0);
    expect(newSeeker?.minApproved).toBe(0);
  });
});

// ── trustLevel ────────────────────────────────────────────────────────────────

describe('trustLevel', () => {
  const cases: [number, string][] = [
    [0,   'Restricted'],
    [20,  'Restricted'],
    [21,  'Standard'],
    [50,  'Standard'],
    [51,  'Trusted'],
    [75,  'Trusted'],
    [76,  'Verified Contributor'],
    [90,  'Verified Contributor'],
    [91,  'Expert Contributor Candidate'],
    [100, 'Expert Contributor Candidate'],
  ];
  for (const [score, label] of cases) {
    it(`score ${score} → "${label}"`, () => {
      expect(trustLevel(score)).toBe(label);
    });
  }
});

// ── trustColor ────────────────────────────────────────────────────────────────

describe('trustColor', () => {
  it('returns a valid Tailwind class for every boundary', () => {
    for (const score of [0, 20, 21, 50, 51, 75, 76, 90, 91, 100]) {
      const color = trustColor(score);
      expect(color).toMatch(/^text-\w+-\d+$/);
    }
  });

  it('low trust is red, high trust is purple', () => {
    expect(trustColor(10)).toContain('red');
    expect(trustColor(100)).toContain('purple');
  });
});
