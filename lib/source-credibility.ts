import { SourceType } from './source-types';

// Base credibility by source type
const BASE: Record<string, number> = {
  'Academic Paper':       0.82,
  'Archaeological Report': 0.80,
  'Government Document':  0.75,
  'Museum Archive':       0.74,
  'Historical Text':      0.70,
  'Religious Text':       0.58,
  'Book':                 0.62,
  'News Investigation':   0.52,
  'Folklore Collection':  0.38,
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
  const base = BASE[src.sourceType] ?? 0.5;
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

export const SOURCE_TYPE_COLORS: Record<string, string> = {
  'Academic Paper':        '#6366f1',
  'Archaeological Report': '#a16207',
  'Government Document':   '#22c55e',
  'Historical Text':       '#f59e0b',
  'Religious Text':        '#dc2626',
  'Museum Archive':        '#06b6d4',
  'Book':                  '#8b5cf6',
  'News Investigation':    '#ec4899',
  'Folklore Collection':   '#64748b',
};

export const STATUS_COLORS: Record<string, string> = {
  pending:        '#eab308',
  approved:       '#22c55e',
  rejected:       '#ef4444',
  needs_revision: '#f59e0b',
};

export const CREDIBILITY_LABEL = (score: number) =>
  score >= 0.75 ? 'High' : score >= 0.5 ? 'Medium' : 'Low';
