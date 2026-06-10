import { SOURCE_TYPE_BASE_CREDIBILITY, SOURCE_TYPE_COLORS as ST_COLORS, resolveSourceType } from './taxonomy/source-types';

// Base credibility by source type — delegates to taxonomy definition
const BASE: Record<string, number> = SOURCE_TYPE_BASE_CREDIBILITY as Record<string, number>;

// Weight applied to each link classification when aggregating per-node credibility.
// 'primary' is the most authoritative; 'contradicts' is half-weighted to avoid
// contradicting sources dominating (they signal debate, not weakness).
export const LINK_TYPE_WEIGHT: Record<string, number> = {
  primary:     1.5,
  supports:    1.0,
  context:     0.7,
  references:  0.6,
  contradicts: 0.5,
};

interface SourceInput {
  sourceType: string;
  doi?: string | null;
  isbn?: string | null;
  url?: string | null;
  author?: string | null;
  publicationYear?: number | null;
  journal?: string | null;
  publisher?: string | null;
}

export function computeCredibility(src: SourceInput): {
  score: number;
  factors: Record<string, number>;
} {
  const factors: Record<string, number> = {};
  const resolvedType = resolveSourceType(src.sourceType);
  const base = BASE[resolvedType] ?? 0.5;
  factors.base_source_type = base;
  let score = base;

  if (src.doi?.trim()) {
    factors.doi_present = 0.06;
    score += 0.06;
  }
  if (src.isbn?.trim()) {
    factors.isbn_present = 0.04;
    score += 0.04;
  }
  if (src.url?.trim()) {
    factors.url_present = 0.02;
    score += 0.02;
  }
  if (src.author?.trim()) {
    factors.author_named = 0.03;
    score += 0.03;
  }
  if (src.journal?.trim()) {
    factors.peer_reviewed_journal = 0.05;
    score += 0.05;
  }
  if (src.publisher?.trim()) {
    factors.known_publisher = 0.02;
    score += 0.02;
  }
  if (src.publicationYear != null) {
    const year = src.publicationYear;
    const now = new Date().getFullYear();
    if (year > now) {
      factors.future_date_penalty = -0.15;
      score -= 0.15;
    } else if (year >= now - 10) {
      factors.recent_publication = 0.01;
      score += 0.01;
    }
  }

  return { score: Math.max(0, Math.min(1, Math.round(score * 100) / 100)), factors };
}

// Returns the effective credibility: admin override takes precedence over auto-computed.
export function effectiveCredibility(source: {
  credibilityScore:   number;
  credibilityOverride?: number | null;
}): number {
  return source.credibilityOverride ?? source.credibilityScore;
}

// Aggregated credibility score for a set of approved source links attached to a node/edge.
// Each link is weighted by LINK_TYPE_WEIGHT and optionally by its relevanceScore.
export function aggregateSourceCredibility(
  links: Array<{
    linkType:      string;
    relevanceScore: number;
    source: { credibilityScore: number; credibilityOverride?: number | null; status: string };
  }>,
): number {
  const approved = links.filter(l => l.source.status === 'approved');
  if (!approved.length) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const l of approved) {
    const cred   = effectiveCredibility(l.source);
    const weight = (LINK_TYPE_WEIGHT[l.linkType] ?? 1.0) * l.relevanceScore;
    weightedSum += cred * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}

// Re-export from taxonomy so all consumers get updated colors
export const SOURCE_TYPE_COLORS: Record<string, string> = ST_COLORS as Record<string, string>;

export const STATUS_COLORS: Record<string, string> = {
  pending:        '#eab308',
  approved:       '#22c55e',
  rejected:       '#ef4444',
  needs_revision: '#f59e0b',
};

export const CREDIBILITY_LABEL = (score: number) =>
  score >= 0.75 ? 'High' : score >= 0.5 ? 'Medium' : 'Low';

export const CREDIBILITY_COLOR = (score: number) =>
  score >= 0.75 ? 'text-emerald-400' : score >= 0.5 ? 'text-amber-400' : 'text-red-400';

export const CREDIBILITY_BAR_COLOR = (score: number) =>
  score >= 0.75 ? 'bg-emerald-500' : score >= 0.5 ? 'bg-amber-500' : 'bg-red-500';
