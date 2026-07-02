import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/db', () => ({ prisma: {} }));

import { labelForAttempt, sourceHitRates, type NewsOutcome } from '@/lib/learning/news-relevance';
import { tagOverlap, extractNewsFeatures, NEWS_FEATURE_COUNT } from '@/lib/learning/news-features';

const now = new Date('2026-07-02T12:00:00Z');
const days = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe('labelForAttempt', () => {
  it('promoted attempt is positive regardless of age', () => {
    expect(labelForAttempt({ promotedNodeId: 'n1', status: 'auto_approved', discoveredAt: days(0.1) }, now)).toBe(1);
  });
  it('rejected/dismissed attempts are negative', () => {
    expect(labelForAttempt({ promotedNodeId: null, status: 'rejected', discoveredAt: days(1) }, now)).toBe(0);
    expect(labelForAttempt({ promotedNodeId: null, status: 'dismissed', discoveredAt: days(1) }, now)).toBe(0);
  });
  it('stale unpromoted attempt is negative; fresh pending is no-verdict; never-tried is no-verdict', () => {
    expect(labelForAttempt({ promotedNodeId: null, status: 'pending_review', discoveredAt: days(5) }, now)).toBe(0);
    expect(labelForAttempt({ promotedNodeId: null, status: 'pending_review', discoveredAt: days(1) }, now)).toBeNull();
    expect(labelForAttempt(undefined, now)).toBeNull();
  });
});

describe('sourceHitRates', () => {
  it('computes Laplace-smoothed per-source promotion rates', () => {
    const mk = (source: string, label: 0 | 1): NewsOutcome =>
      ({ item: { title: 't', description: null, category: 'ufo', source }, label });
    const rates = sourceHitRates([mk('a', 1), mk('a', 1), mk('a', 0), mk('b', 0)]);
    expect(rates.get('a')).toBeCloseTo(3 / 5, 6); // (2+1)/(3+2)
    expect(rates.get('b')).toBeCloseTo(1 / 3, 6); // (0+1)/(1+2)
  });
});

describe('news features', () => {
  it('tagOverlap counts meaningful title words found in archive tags', () => {
    const tags = new Set(['atlantis', 'pyramid']);
    expect(tagOverlap('Atlantis pyramid discovery report', tags)).toBeCloseTo(0.5, 6);
    expect(tagOverlap('a an of', tags)).toBe(0);
  });
  it('produces a fixed-length bounded vector with the right category one-hot', () => {
    const f = extractNewsFeatures({
      title: 'New excavation at ancient site', description: 'details here',
      category: 'archaeology', sourceHitRate: 0.8, archiveTags: new Set(['ancient']),
    });
    expect(f).toHaveLength(NEWS_FEATURE_COUNT);
    expect(f.every(v => v >= 0 && v <= 1)).toBe(true);
    expect(f[8]).toBe(1); // cat_archaeology
    expect(f[5]).toBe(0); // not cat_ufo
    expect(f[4]).toBeCloseTo(0.8, 6);
  });
});
