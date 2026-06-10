import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import { scoreRisk, getRiskLevel, RiskLevel } from '@/lib/risk-profile';

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseInput = {
  submissionCount:      0,
  approvedCount:        0,
  rejectedCount:        0,
  accountAgeDays:       365,
  recentSubmissions24h: 0,
  recentEvents1h:       0,
  distinctPaths1h:      5,
  maxSamePathRepeats:   0,
  confirmedSpamCount:   0,
  reportCount:          0,
  role:                 'user',
  trustScore:           50,
  isBanned:             false,
};

// ── getRiskLevel ──────────────────────────────────────────────────────────────

describe('getRiskLevel', () => {
  const cases: [number, RiskLevel][] = [
    [0,   'low'],
    [20,  'low'],
    [21,  'watch'],
    [50,  'watch'],
    [51,  'suspicious'],
    [75,  'suspicious'],
    [76,  'high_risk'],
    [100, 'high_risk'],
  ];
  for (const [score, level] of cases) {
    it(`score ${score} → ${level}`, () => {
      expect(getRiskLevel(score)).toBe(level);
    });
  }
});

// ── scoreRisk — low-risk user ─────────────────────────────────────────────────

describe('scoreRisk: trusted veteran', () => {
  const result = scoreRisk({
    ...baseInput,
    accountAgeDays: 400,
    approvedCount:  25,
    trustScore:     85,
    role:           'reviewer',
  });

  it('has low risk level', () => {
    expect(result.riskLevel).toBe('low');
  });

  it('has zero spam and bot scores', () => {
    expect(result.spamScore).toBe(0);
    expect(result.botScore).toBe(0);
  });

  it('riskScore is 0 (clamped — negative raw value)', () => {
    expect(result.riskScore).toBe(0);
  });
});

// ── scoreRisk — banned user ───────────────────────────────────────────────────

describe('scoreRisk: banned user', () => {
  // Use a brand-new account so there's no age discount offsetting the ban penalty
  const result = scoreRisk({ ...baseInput, isBanned: true, accountAgeDays: 0 });

  it('gets +30 for being banned', () => {
    const banReason = result.reasons.find(r => r.reason.includes('banned'));
    expect(banReason?.delta).toBe(30);
  });

  it('reaches at least watch level', () => {
    expect(['watch', 'suspicious', 'high_risk']).toContain(result.riskLevel);
  });
});

// ── scoreRisk — high rejection rate ──────────────────────────────────────────

describe('scoreRisk: rejection rate signals', () => {
  it('>60% rejection rate adds spam signal', () => {
    const result = scoreRisk({ ...baseInput, submissionCount: 10, rejectedCount: 7 });
    expect(result.spamScore).toBeGreaterThan(0);
    const reason = result.reasons.find(r => r.reason.includes('60%'));
    expect(reason).toBeDefined();
  });

  it('>40% adds a smaller signal', () => {
    const result = scoreRisk({ ...baseInput, submissionCount: 10, rejectedCount: 5 });
    const reason = result.reasons.find(r => r.reason.includes('40%'));
    expect(reason?.delta).toBe(15);
  });

  it('>20% adds a small signal with no spam component', () => {
    const result = scoreRisk({ ...baseInput, submissionCount: 10, rejectedCount: 3 });
    const reason = result.reasons.find(r => r.reason.includes('20%'));
    expect(reason?.delta).toBe(8);
    expect(result.spamScore).toBe(0);
  });
});

// ── scoreRisk — bot signals ───────────────────────────────────────────────────

describe('scoreRisk: bot detection signals', () => {
  it('>300 events/h scores high bot', () => {
    // New account (+20) + 350 events/h (+35) + 25 submissions/24h (+25) → 80 → high_risk
    const result = scoreRisk({
      ...baseInput,
      recentEvents1h: 350,
      accountAgeDays: 0,
      recentSubmissions24h: 25,
    });
    expect(result.botScore).toBeGreaterThanOrEqual(35);
    expect(result.riskLevel).toBe('high_risk');
  });

  it('>150 events/h adds bot signal', () => {
    const result = scoreRisk({ ...baseInput, recentEvents1h: 200 });
    expect(result.botScore).toBeGreaterThanOrEqual(22);
  });

  it('same-path repeats > 80 triggers bot pattern reason', () => {
    const result = scoreRisk({ ...baseInput, maxSamePathRepeats: 100, recentEvents1h: 100 });
    const reason = result.reasons.find(r => r.reason.includes('bot pattern'));
    expect(reason).toBeDefined();
    expect(result.botScore).toBeGreaterThan(0);
  });

  it('high event count + low path diversity adds bot signal', () => {
    const result = scoreRisk({ ...baseInput, recentEvents1h: 50, distinctPaths1h: 1 });
    const reason = result.reasons.find(r => r.reason.includes('No browsing diversity'));
    expect(reason).toBeDefined();
  });
});

// ── scoreRisk — spam signals ──────────────────────────────────────────────────

describe('scoreRisk: spam signals', () => {
  it('confirmed spam submissions escalate spam score', () => {
    const one   = scoreRisk({ ...baseInput, confirmedSpamCount: 1 });
    const three = scoreRisk({ ...baseInput, confirmedSpamCount: 3 });
    expect(one.spamScore).toBe(10);
    // Math.min(30, count*10): 3 submissions → Math.min(30, 30) = 30
    expect(three.spamScore).toBe(30);
  });

  it('spam score is capped at 100', () => {
    const result = scoreRisk({ ...baseInput, confirmedSpamCount: 20 });
    expect(result.spamScore).toBeLessThanOrEqual(100);
  });

  it('>20 submissions in 24h raises spam score', () => {
    const result = scoreRisk({ ...baseInput, recentSubmissions24h: 25 });
    expect(result.spamScore).toBeGreaterThan(0);
  });
});

// ── scoreRisk — trusted role discount ────────────────────────────────────────

describe('scoreRisk: trusted role discount', () => {
  for (const role of ['owner', 'admin', 'reviewer']) {
    it(`role '${role}' gets -20 risk deduction`, () => {
      const result = scoreRisk({ ...baseInput, role });
      const reason = result.reasons.find(r => r.reason.includes(role));
      expect(reason?.delta).toBe(-20);
    });
  }

  it("role 'user' gets no trusted-role deduction", () => {
    const result = scoreRisk({ ...baseInput, role: 'user' });
    const reason = result.reasons.find(r => r.reason.includes('Trusted role'));
    expect(reason).toBeUndefined();
  });
});

// ── scoreRisk — output invariants ─────────────────────────────────────────────

describe('scoreRisk: output invariants', () => {
  it('riskScore is always in [0, 100]', () => {
    const extreme = scoreRisk({
      ...baseInput,
      isBanned: true, confirmedSpamCount: 10, reportCount: 10,
      recentEvents1h: 500, maxSamePathRepeats: 200, accountAgeDays: 0,
    });
    expect(extreme.riskScore).toBeGreaterThanOrEqual(0);
    expect(extreme.riskScore).toBeLessThanOrEqual(100);
  });

  it('spamScore and botScore are always in [0, 100]', () => {
    const extreme = scoreRisk({
      ...baseInput,
      confirmedSpamCount: 50, recentEvents1h: 999,
      maxSamePathRepeats: 999, distinctPaths1h: 1,
    });
    expect(extreme.spamScore).toBeGreaterThanOrEqual(0);
    expect(extreme.spamScore).toBeLessThanOrEqual(100);
    expect(extreme.botScore).toBeGreaterThanOrEqual(0);
    expect(extreme.botScore).toBeLessThanOrEqual(100);
  });

  it('reasons array is non-empty when risk is elevated', () => {
    const result = scoreRisk({ ...baseInput, isBanned: true });
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('reasons array may be empty for a clean low-risk user', () => {
    const result = scoreRisk({ ...baseInput, accountAgeDays: 1 });
    const negativeReasons = result.reasons.filter(r => r.delta > 0);
    // new account gets a risk penalty
    expect(negativeReasons.length).toBeGreaterThan(0);
  });
});
