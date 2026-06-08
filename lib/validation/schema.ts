/**
 * Pure schema validation for imported nodes and edges.
 * No database calls — all rules are deterministic on the input alone.
 * Used by the batch import route and can be tested without a DB.
 */

import {
  EVIDENCE_LEVELS,
  RELATIONSHIP_TYPES,
  EDGE_SOURCE_TYPES,
  NODE_CATEGORIES,
  isValidScore,
} from './enums';

export interface ValidationIssue {
  code: string;
  field: string;
  message: string;
}

export interface NodeValidationResult {
  status: 'accepted' | 'rejected';
  errors: ValidationIssue[];   // hard-reject rules
  warnings: ValidationIssue[]; // soft flags (accepted but flagged)
}

export interface EdgeValidationResult {
  status: 'accepted' | 'rejected';
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// ── Node validation ───────────────────────────────────────────────────────────

export function validateNode(raw: unknown): NodeValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  function err(code: string, field: string, message: string) {
    errors.push({ code, field, message });
  }
  function warn(code: string, field: string, message: string) {
    warnings.push({ code, field, message });
  }

  if (!raw || typeof raw !== 'object') {
    return {
      status: 'rejected',
      errors: [{ code: 'V000', field: 'root', message: 'Input must be a non-null object' }],
      warnings: [],
    };
  }

  const n = raw as Record<string, unknown>;

  // ── Hard-reject rules ──────────────────────────────────────────────────────

  // V001: id — non-empty lowercase slug
  const id = typeof n.id === 'string' ? n.id.trim() : '';
  if (!id || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(id)) {
    err('V001', 'id',
      'id must be a non-empty lowercase slug: only a-z, 0-9, and hyphens; no leading/trailing hyphens');
  }

  // V002: title
  if (typeof n.title !== 'string' || !n.title.trim()) {
    err('V002', 'title', 'title is required and must be a non-empty string');
  }

  // V003: category
  if (!(NODE_CATEGORIES as readonly string[]).includes(n.category as string)) {
    err('V003', 'category',
      `category must be one of: ${NODE_CATEGORIES.join(' | ')}`);
  }

  // V004: description >= 50 chars
  if (typeof n.description !== 'string' || n.description.trim().length < 50) {
    err('V004', 'description', 'description must be at least 50 characters');
  }

  // V005: evidence_level
  if (!(EVIDENCE_LEVELS as readonly string[]).includes(n.evidence_level as string)) {
    err('V005', 'evidence_level',
      `evidence_level must be one of: ${EVIDENCE_LEVELS.join(' | ')}`);
  }

  // V006: confidence_score
  if (!isValidScore(n.confidence_score)) {
    err('V006', 'confidence_score',
      'confidence_score must be a finite number between 0 and 1 inclusive');
  }

  // V007: mainstream_view
  if (typeof n.mainstream_view !== 'string' || !n.mainstream_view.trim()) {
    err('V007', 'mainstream_view', 'mainstream_view is required');
  }

  // V008: claims — non-empty array
  if (!Array.isArray(n.claims) || n.claims.length === 0) {
    err('V008', 'claims', 'claims must be a non-empty array of strings');
  }

  // V009: criticisms — non-empty array
  if (!Array.isArray(n.criticisms) || n.criticisms.length === 0) {
    err('V009', 'criticisms', 'criticisms must be a non-empty array of strings');
  }

  // V010: coordinates (when present)
  if (n.coordinates != null) {
    const c = n.coordinates;
    if (
      !Array.isArray(c) ||
      c.length !== 2 ||
      typeof c[0] !== 'number' || typeof c[1] !== 'number' ||
      !isFinite(c[0]) || !isFinite(c[1]) ||
      c[0] < -90  || c[0] > 90 ||
      c[1] < -180 || c[1] > 180
    ) {
      err('V010', 'coordinates',
        'coordinates must be [lat, lon] with lat ∈ [-90, 90] and lon ∈ [-180, 180]');
    }
  }

  // V011: date ordering
  if (n.date_start != null && n.date_end != null) {
    const ds = Number(n.date_start);
    const de = Number(n.date_end);
    if (!isFinite(ds) || !isFinite(de) || ds > de) {
      err('V011', 'date_start/date_end', 'date_start must be <= date_end');
    }
  }

  // V012: embedded source credibility_score bounds
  if (Array.isArray(n.sources)) {
    (n.sources as unknown[]).forEach((s, i) => {
      const src = s as Record<string, unknown>;
      if (src.credibility_score != null && !isValidScore(src.credibility_score)) {
        err('V012', `sources[${i}].credibility_score`,
          'credibility_score must be a number between 0 and 1');
      }
    });
  }

  // Evidence/confidence hard-reject coherence
  const el = n.evidence_level as string;
  const cs = n.confidence_score as number;

  // V020: verified + confidence < 0.7
  if (el === 'verified' && isValidScore(cs) && cs < 0.7) {
    err('V020', 'confidence_score',
      'evidence_level=verified requires confidence_score >= 0.7');
  }

  // V023: verified + no sources
  if (el === 'verified' && (!Array.isArray(n.sources) || n.sources.length === 0)) {
    err('V023', 'sources',
      'evidence_level=verified requires at least one source');
  }

  // ── Warning rules ──────────────────────────────────────────────────────────

  // W001: no sources
  if (!Array.isArray(n.sources) || n.sources.length === 0) {
    warn('W001', 'sources', 'No sources provided — node cannot be verified without sources');
  }

  // W002: fewer than 2 claims
  if (Array.isArray(n.claims) && n.claims.length < 2) {
    warn('W002', 'claims', 'Fewer than 2 claims — consider expanding');
  }

  // W003: fewer than 2 criticisms
  if (Array.isArray(n.criticisms) && n.criticisms.length < 2) {
    warn('W003', 'criticisms', 'Fewer than 2 criticisms — consider expanding');
  }

  // W004: no open_questions
  if (!Array.isArray(n.open_questions) || (n.open_questions as unknown[]).length === 0) {
    warn('W004', 'open_questions', 'No open_questions provided');
  }

  // W005: fewer than 3 tags
  if (!Array.isArray(n.tags) || (n.tags as unknown[]).length < 3) {
    warn('W005', 'tags', 'Fewer than 3 tags — add more for discoverability');
  }

  // W006: year out of plausible range
  if (n.year != null) {
    const y = Number(n.year);
    if (!isFinite(y) || y < -100_000 || y > 2030) {
      warn('W006', 'year', 'year is outside expected range [-100000, 2030]');
    }
  }

  // W007: source URL not http/https
  if (Array.isArray(n.sources)) {
    (n.sources as unknown[]).forEach((s, i) => {
      const src = s as Record<string, unknown>;
      if (typeof src.url === 'string' && src.url && !/^https?:\/\//.test(src.url)) {
        warn('W007', `sources[${i}].url`, 'URL should start with https://');
      }
    });
  }

  // W008: Academic Paper without author
  if (Array.isArray(n.sources)) {
    (n.sources as unknown[]).forEach((s, i) => {
      const src = s as Record<string, unknown>;
      if (src.source_type === 'Academic Paper' && !src.author) {
        warn('W008', `sources[${i}].author`,
          'Academic Paper source should have an author');
      }
    });
  }

  // W009: Academic Paper / Book without publication_year
  if (Array.isArray(n.sources)) {
    (n.sources as unknown[]).forEach((s, i) => {
      const src = s as Record<string, unknown>;
      if (
        (src.source_type === 'Academic Paper' || src.source_type === 'Book') &&
        src.publication_year == null
      ) {
        warn('W009', `sources[${i}].publication_year`,
          `${src.source_type} source should include publication_year`);
      }
    });
  }

  // Evidence/confidence coherence warnings
  if (el === 'speculative' && isValidScore(cs) && cs > 0.5) {
    warn('V021', 'confidence_score',
      'evidence_level=speculative with confidence_score > 0.5 is inconsistent');
  }
  if (el === 'mythological' && isValidScore(cs) && cs > 0.3) {
    warn('V022', 'confidence_score',
      'evidence_level=mythological with confidence_score > 0.3 is inconsistent');
  }
  if (el === 'strong_evidence' && (!Array.isArray(n.sources) || n.sources.length === 0)) {
    warn('V024', 'sources',
      'evidence_level=strong_evidence without any sources is unusual');
  }

  return {
    status: errors.length > 0 ? 'rejected' : 'accepted',
    errors,
    warnings,
  };
}

// ── Edge validation ───────────────────────────────────────────────────────────

/**
 * @param raw              - raw edge object from import JSON
 * @param knownNodeIds     - set of node IDs that will exist after this batch
 *                           (union of accepted import nodes + existing DB nodes)
 */
export function validateEdge(
  raw: unknown,
  knownNodeIds: Set<string>,
): EdgeValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  function err(code: string, field: string, message: string) {
    errors.push({ code, field, message });
  }
  function warn(code: string, field: string, message: string) {
    warnings.push({ code, field, message });
  }

  if (!raw || typeof raw !== 'object') {
    return {
      status: 'rejected',
      errors: [{ code: 'EV000', field: 'root', message: 'Edge input must be a non-null object' }],
      warnings: [],
    };
  }

  const e = raw as Record<string, unknown>;

  // EV001: id
  const id = typeof e.id === 'string' ? e.id.trim() : '';
  if (!id || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(id)) {
    err('EV001', 'id', 'Edge id must be a non-empty lowercase slug');
  }

  // EV002: from node must exist in knownNodeIds
  const from = typeof e.from === 'string' ? e.from.trim() : '';
  if (!from) {
    err('EV002', 'from', 'from is required');
  } else if (!knownNodeIds.has(from)) {
    err('EV002', 'from',
      `from node '${from}' does not exist in the current import batch or the database`);
  }

  // EV003: to node must exist in knownNodeIds
  const to = typeof e.to === 'string' ? e.to.trim() : '';
  if (!to) {
    err('EV003', 'to', 'to is required');
  } else if (!knownNodeIds.has(to)) {
    err('EV003', 'to',
      `to node '${to}' does not exist in the current import batch or the database`);
  }

  // EV004: no self-links
  if (from && to && from === to) {
    err('EV004', 'from/to', 'Self-links are not allowed (from === to)');
  }

  // EV005: relationship_type
  if (!(RELATIONSHIP_TYPES as readonly string[]).includes(e.relationship_type as string)) {
    err('EV005', 'relationship_type',
      `relationship_type must be one of: ${RELATIONSHIP_TYPES.join(' | ')}`);
  }

  // EV006: confidence_score
  if (!isValidScore(e.confidence_score)) {
    err('EV006', 'confidence_score',
      'confidence_score must be a finite number between 0 and 1');
  }

  // EV007: strength_score
  if (!isValidScore(e.strength_score)) {
    err('EV007', 'strength_score',
      'strength_score must be a finite number between 0 and 1');
  }

  // EV008: source_type
  if (e.source_type != null &&
      !(EDGE_SOURCE_TYPES as readonly string[]).includes(e.source_type as string)) {
    err('EV008', 'source_type',
      `source_type must be one of: ${EDGE_SOURCE_TYPES.join(' | ')}`);
  }

  // EV009: explanation
  if (typeof e.explanation !== 'string' || !e.explanation.trim()) {
    err('EV009', 'explanation', 'explanation is required');
  }

  // Warnings
  if (isValidScore(e.strength_score) && (e.strength_score as number) < 0.1) {
    warn('EW001', 'strength_score',
      'strength_score < 0.1 — extremely weak relationship; consider whether this edge is meaningful');
  }

  return {
    status: errors.length > 0 ? 'rejected' : 'accepted',
    errors,
    warnings,
  };
}
