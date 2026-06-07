// Shared source types used across API + UI

export const SOURCE_TYPES = [
  'Academic Paper',
  'Archaeological Report',
  'Government Document',
  'Historical Text',
  'Religious Text',
  'Museum Archive',
  'Book',
  'News Investigation',
  'Folklore Collection',
] as const;

export type SourceType = typeof SOURCE_TYPES[number];

export const LINK_TYPES = ['supports', 'contradicts', 'references'] as const;
export type LinkType = typeof LINK_TYPES[number];

export const SOURCE_STATUS = ['pending', 'approved', 'rejected', 'needs_revision'] as const;
export type SourceStatus = typeof SOURCE_STATUS[number];

export const TARGET_TYPES = ['node', 'claim', 'edge'] as const;
export type TargetType = typeof TARGET_TYPES[number];

export interface SourceFormData {
  title: string;
  sourceType: SourceType;
  author: string;
  publicationYear: string;
  publisher: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  url: string;
  doi: string;
  isbn: string;
  abstract: string;
  notes: string;
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
  language: string;
  credibilityScore: number;
  credibilityFactors?: Record<string, number> | null;
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
