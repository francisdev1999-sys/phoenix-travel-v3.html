import { describe, it, expect, vi } from 'vitest';

// headlineToSeed is pure — mock the DB module so importing the file is safe.
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { headlineToSeed } from '@/lib/discovery/news-seeds';

describe('headlineToSeed', () => {
  it('strips a trailing source suffix', () => {
    expect(headlineToSeed('Pentagon confirms new UAP reporting office - CNN'))
      .toBe('Pentagon confirms new UAP reporting office');
    expect(headlineToSeed('Ancient city found beneath lake | The Guardian'))
      .toBe('Ancient city found beneath lake');
  });

  it('removes quote characters and collapses whitespace', () => {
    expect(headlineToSeed('“Lost   civilization”  evidence \'debated\' by researchers'))
      .toBe('Lost civilization evidence debated by researchers');
  });

  it('rejects headlines too short to name a topic', () => {
    expect(headlineToSeed('UFO news')).toBeNull();
    expect(headlineToSeed('   ')).toBeNull();
  });

  it('caps very long headlines at 90 chars', () => {
    const long = 'A'.repeat(200);
    const seed = headlineToSeed(long);
    expect(seed).not.toBeNull();
    expect(seed!.length).toBeLessThanOrEqual(90);
  });

  it('keeps a clean headline unchanged', () => {
    expect(headlineToSeed('Göbekli Tepe excavation reveals new enclosure'))
      .toBe('Göbekli Tepe excavation reveals new enclosure');
  });
});
