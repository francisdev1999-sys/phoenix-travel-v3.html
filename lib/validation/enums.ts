/**
 * Runtime-checkable enum arrays shared across all API routes.
 * TypeScript types in lib/graph/types.ts are compile-time only;
 * these arrays are the single source of truth for server-side validation.
 */

export const EVIDENCE_LEVELS = [
  'verified',
  'strong_evidence',
  'debated',
  'speculative',
  'mythological',
] as const;

export const RELATIONSHIP_TYPES = [
  'historical',
  'geographical',
  'textual',
  'thematic',
  'influence',
  'contradictory',
  'speculative',
] as const;

export const SOURCE_TYPES = [
  'Academic Paper',
  'Archaeological Report',
  'Government Document',
  'Declassified Document',
  'FOIA Release',
  'Court Record',
  'Museum Archive',
  'Historical Text',
  'Religious Text',
  'Book',
  'News Investigation',
  'Research Report',
  'Scientific Dataset',
  'Interview',
  'Witness Testimony',
  'Photograph',
  'Video Evidence',
  'Website',
  'Other',
] as const;

export const NODE_CATEGORIES = [
  'Ancient Civilization',
  'Ancient Site',
  'Artifact',
  'Lost Knowledge',
  'Ancient Technology',
  'Forbidden Archaeology',
  'Alternative History',
  'Religion',
  'Mythology',
  'Ancient Text',
  'UFO / UAP',
  'Extraterrestrial Hypothesis',
  'Government Program',
  'Government Secrecy',
  'Intelligence Operation',
  'Secret Project',
  'Conspiracy Theory',
  'Historical Controversy',
  'Whistleblower',
  'Disease & Pandemic',
  'Unexplained Phenomenon',
  'Symbolism',
  'Esoterica',
  'Historical Figure',
  'Organization',
  'Technology',
  'Modern Mystery',
] as const;

// Edge source_type uses snake_case (GraphEdge.source_type), distinct from
// the human-readable ResearchSourceType used on nodes.
export const EDGE_SOURCE_TYPES = [
  'archaeological',
  'academic',
  'primary_text',
  'historical_record',
  'cultural_tradition',
  'scientific',
  'journalistic',
] as const;

// Source link classification — used in NodeSourceManager and API validation.
// 'primary' is the most authoritative; 'context' provides background only.
export const LINK_TYPES = [
  'primary',
  'supports',
  'context',
  'contradicts',
  'references',
] as const;

/** Returns true if v is a finite number in [0, 1]. */
export function isValidScore(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
}

/** Clamps a numeric value to [0, 1]; returns fallback for non-numeric input. */
export function clampScore(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}
