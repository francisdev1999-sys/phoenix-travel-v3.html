/**
 * Feature extraction for the news-relevance neuron — the model that learns
 * which intel-feed headlines actually produce archive-worthy topics.
 *
 * The vector is FIXED and named; order must never change (weights are
 * positional). All values ~0..1 scaled. Weights read directly as "what makes
 * a headline productive": ▲ archaeology category, ▲ overlap with the archive's
 * existing themes, ▼ a source that never pans out, …
 */

export const NEWS_FEATURE_NAMES = [
  'titleLength',    // normalized headline length
  'hasDescription', // 0/1
  'descLength',     // normalized description length
  'tagOverlap',     // fraction of title words that match existing archive tags
  'sourceHitRate',  // historical promotion rate of this RSS source (0..1)
  'cat_ufo',
  'cat_government',
  'cat_conspiracy',
  'cat_archaeology',
  'cat_science',
  'cat_missing',
  'cat_pandemic',
  'cat_esoterica',
] as const;

export const NEWS_FEATURE_COUNT = NEWS_FEATURE_NAMES.length;

export interface NewsCandidateInput {
  title:         string;
  description:   string | null;
  category:      string;
  sourceHitRate: number;      // computed from history at dataset-build/score time
  archiveTags:   Set<string>; // lowercased tag vocabulary of the archive
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Fraction of meaningful title words that appear in the archive's tag vocabulary. */
export function tagOverlap(title: string, archiveTags: Set<string>): number {
  const words = title.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
  if (words.length === 0) return 0;
  const hits = words.filter(w => archiveTags.has(w)).length;
  return hits / words.length;
}

export function extractNewsFeatures(c: NewsCandidateInput): number[] {
  const cat = (c.category || '').toLowerCase();
  return [
    clamp01(c.title.length / 120),
    c.description ? 1 : 0,
    clamp01((c.description ?? '').length / 500),
    clamp01(tagOverlap(c.title, c.archiveTags)),
    clamp01(c.sourceHitRate),
    cat === 'ufo' ? 1 : 0,
    cat === 'government' ? 1 : 0,
    cat === 'conspiracy' ? 1 : 0,
    cat === 'archaeology' ? 1 : 0,
    cat === 'science' ? 1 : 0,
    cat === 'missing' ? 1 : 0,
    cat === 'pandemic' ? 1 : 0,
    cat === 'esoterica' ? 1 : 0,
  ];
}
