// Shared source types used across API + UI
// Definitions live in lib/taxonomy/source-types.ts — re-exported here for convenience.

export { SOURCE_TYPE_VALUES as SOURCE_TYPES, resolveSourceType } from './taxonomy/source-types';
export type { SourceTypeValue as SourceType } from './taxonomy/source-types';

export const LINK_TYPES = ['primary', 'supports', 'context', 'contradicts', 'references'] as const;
export type LinkType = typeof LINK_TYPES[number];

export const SOURCE_STATUS = ['pending', 'approved', 'rejected', 'needs_revision'] as const;
export type SourceStatus = typeof SOURCE_STATUS[number];

export const TARGET_TYPES = ['node', 'claim', 'edge'] as const;
export type TargetType = typeof TARGET_TYPES[number];

export interface SourceFormData {
  title: string;
  sourceType: string;
  author: string;
  publicationYear: string;
  // Common structured metadata
  publisher: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  url: string;
  doi: string;
  isbn: string;
  edition: string;
  // Government / official docs
  agency: string;
  documentNumber: string;
  // Court records
  court: string;
  caseNumber: string;
  jurisdiction: string;
  // Interviews
  interviewee: string;
  interviewer: string;
  interviewDate: string;
  // Video
  videoUrl: string;
  recordingDate: string;
  // Photographs
  photographer: string;
  dateTaken: string;
  photoLocation: string;
  // Free text
  abstract: string;
  notes: string;
  sourceTrustExplanation: string;
  language: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  sourceType: string;
  author?: string | null;
  publicationYear?: number | null;
  publisher?: string | null;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  url?: string | null;
  doi?: string | null;
  isbn?: string | null;
  abstract?: string | null;
  notes?: string | null;
  sourceTrustExplanation?: string | null;
  language: string;
  credibilityScore:    number;
  credibilityFactors?: Record<string, number> | null;
  credibilityOverride?: number | null;
  overriddenBy?:        string | null;
  overrideReason?:      string | null;
  status: string;
  reviewNotes?: string | null;
  reviewedAt?: string | null;
  submittedBy?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  links?: SourceLinkRecord[];
  submitter?: { id: string; name?: string | null; email?: string | null; image?: string | null } | null;
}

export interface SourceLinkRecord {
  id: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  claimIndex?: number | null;
  linkType: string;
  notes?: string | null;
  createdAt: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  exact: SourceRecord[];
  likely: SourceRecord[];
}
