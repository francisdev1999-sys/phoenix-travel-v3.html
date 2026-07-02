import { describe, it, expect, vi } from 'vitest';

// The pure helpers never touch the DB — mock the module so importing is safe.
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { computeDegrees, gapNodeToSeed, categoryPairToSeed } from '@/lib/discovery/gap-analyzer';

describe('computeDegrees', () => {
  it('counts both directions and defaults to zero', () => {
    const deg = computeDegrees(
      ['a', 'b', 'c', 'orphan'],
      [
        { fromId: 'a', toId: 'b' },
        { fromId: 'b', toId: 'c' },
        { fromId: 'c', toId: 'a' },
      ],
    );
    expect(deg.get('a')).toBe(2);
    expect(deg.get('b')).toBe(2);
    expect(deg.get('c')).toBe(2);
    expect(deg.get('orphan')).toBe(0);
  });

  it('ignores edges pointing outside the node set', () => {
    const deg = computeDegrees(['a'], [{ fromId: 'a', toId: 'ghost' }]);
    expect(deg.get('a')).toBe(1);
    expect(deg.has('ghost')).toBe(false);
  });
});

describe('seed builders', () => {
  it('combines title with up to two tags, bounded to 90 chars', () => {
    expect(gapNodeToSeed({ title: 'Stoned Ape Theory', tags: ['psychedelics', 'evolution', 'ignored'] }))
      .toBe('Stoned Ape Theory psychedelics evolution');
    const long = gapNodeToSeed({ title: 'T'.repeat(120), tags: [] });
    expect(long.length).toBeLessThanOrEqual(90);
  });

  it('bridge seed joins the two top node titles', () => {
    expect(categoryPairToSeed('Roswell Incident', 'Great Pyramid of Giza'))
      .toBe('Roswell Incident Great Pyramid of Giza');
  });
});
