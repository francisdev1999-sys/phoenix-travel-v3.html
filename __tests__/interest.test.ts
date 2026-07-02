import { describe, it, expect, vi } from 'vitest';

// splitByEngagement is pure — mock the DB so the import chain is safe.
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { splitByEngagement } from '@/lib/learning/interest';

describe('splitByEngagement', () => {
  const nodes = [
    { id: 'hot',        ageDays: 30 }, // heavily engaged
    { id: 'warm',       ageDays: 30 }, // barely engaged → ambiguous, skipped
    { id: 'cold-old',   ageDays: 30 }, // no engagement, had its chance → negative
    { id: 'cold-young', ageDays: 2 },  // no engagement but brand new → skipped
  ];
  const scores = new Map([
    ['hot', 9],
    ['warm', 1],
  ]);

  it('labels engaged nodes positive and only old zero-engagement nodes negative', () => {
    const { positiveIds, negativeIds } = splitByEngagement(nodes, scores);
    expect(positiveIds).toEqual(['hot']);
    expect(negativeIds).toEqual(['cold-old']);
  });

  it('ambiguous nodes (light engagement or too new) are excluded from both classes', () => {
    const { positiveIds, negativeIds } = splitByEngagement(nodes, scores);
    const all = [...positiveIds, ...negativeIds];
    expect(all).not.toContain('warm');
    expect(all).not.toContain('cold-young');
  });

  it('respects custom thresholds', () => {
    const { positiveIds } = splitByEngagement(nodes, scores, { minScore: 1, minAgeDays: 7 });
    expect(positiveIds).toEqual(['hot', 'warm']);
  });
});
