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
  'Historical Text',
  'Religious Text',
  'Museum Archive',
  'Government Document',
  'News Investigation',
  'Folklore Collection',
  'Book',
] as const;

export const NODE_CATEGORIES = [
  'Ancient Civilizations',
  'Egypt & Ancient Engineering',
  'Religious Texts & Mythology',
  'UFO / UAP',
  'Human Origins',
  'Consciousness & Reality',
  'Secret Societies & Esoteric',
  'Global Mysteries',
  'Legends & Folklore',
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
