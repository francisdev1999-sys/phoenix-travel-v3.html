/**
 * Believer–Skeptic stance helpers (pure, unit-tested).
 * value: 0 = full skeptic … 100 = full believer.
 */

export const STANCE_BUCKETS = 5;

export interface StanceDistribution {
  buckets: number[]; // length STANCE_BUCKETS, percentages 0..100
  count:   number;
  average: number | null;
}

/** Bucket raw stance values into a percentage histogram. */
export function bucketize(values: number[]): StanceDistribution {
  const buckets = new Array(STANCE_BUCKETS).fill(0);
  if (values.length === 0) return { buckets, count: 0, average: null };

  for (const v of values) {
    const clamped = Math.min(100, Math.max(0, v));
    const idx = Math.min(STANCE_BUCKETS - 1, Math.floor(clamped / (100 / STANCE_BUCKETS)));
    buckets[idx]++;
  }
  const count = values.length;
  const average = values.reduce((a, b) => a + b, 0) / count;
  return {
    buckets: buckets.map(b => Math.round((b / count) * 100)),
    count,
    average,
  };
}
