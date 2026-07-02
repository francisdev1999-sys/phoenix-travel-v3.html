import { describe, it, expect } from 'vitest';

import { dailyIndex, currentDayNumber } from '@/lib/daily-mystery';
import { bucketize, STANCE_BUCKETS } from '@/lib/stance';

describe('dailyIndex', () => {
  it('is deterministic for the same day and total', () => {
    expect(dailyIndex(20_000, 137)).toBe(dailyIndex(20_000, 137));
  });

  it('always lands inside [0, total)', () => {
    for (let day = 20_000; day < 20_100; day++) {
      const idx = dailyIndex(day, 53);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(53);
      expect(Number.isInteger(idx)).toBe(true);
    }
  });

  it('jumps around the list rather than walking it in order', () => {
    const total = 101;
    const indices = new Set(
      Array.from({ length: 10 }, (_, i) => dailyIndex(20_000 + i, total)),
    );
    // Consecutive days should hit many distinct, non-sequential slots.
    expect(indices.size).toBeGreaterThan(5);
  });

  it('handles an empty archive without dividing by zero', () => {
    expect(dailyIndex(20_000, 0)).toBe(0);
  });

  it('currentDayNumber increments at UTC midnight', () => {
    const justBefore = Date.UTC(2026, 6, 1, 23, 59, 59);
    const justAfter  = Date.UTC(2026, 6, 2, 0, 0, 1);
    expect(currentDayNumber(justAfter)).toBe(currentDayNumber(justBefore) + 1);
  });
});

describe('bucketize', () => {
  it('returns an empty distribution for no votes', () => {
    const d = bucketize([]);
    expect(d.count).toBe(0);
    expect(d.average).toBeNull();
    expect(d.buckets).toEqual(new Array(STANCE_BUCKETS).fill(0));
  });

  it('places values in the correct buckets at the boundaries', () => {
    // 0–19 → 0, 20–39 → 1, 40–59 → 2, 60–79 → 3, 80–100 → 4 (100 folds into last)
    const d = bucketize([0, 19, 20, 39, 40, 59, 60, 79, 80, 100]);
    expect(d.count).toBe(10);
    expect(d.buckets).toEqual([20, 20, 20, 20, 20]);
  });

  it('clamps out-of-range values instead of crashing', () => {
    const d = bucketize([-50, 250]);
    expect(d.buckets[0]).toBe(50);
    expect(d.buckets[STANCE_BUCKETS - 1]).toBe(50);
  });

  it('reports percentages and the raw average', () => {
    const d = bucketize([100, 100, 100, 0]);
    expect(d.buckets[STANCE_BUCKETS - 1]).toBe(75);
    expect(d.buckets[0]).toBe(25);
    expect(d.average).toBe(75);
  });
});
