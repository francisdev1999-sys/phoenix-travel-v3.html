/**
 * Nexus Archive — Source Type Taxonomy
 *
 * Single source of truth for all 19 research source types.
 * Values stored in DB as these exact strings (Source.sourceType).
 * Do not rename without a migration.
 */

export const SOURCE_TYPE_VALUES = [
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

export type SourceTypeValue = typeof SOURCE_TYPE_VALUES[number];

// ── Credibility base scores (0–1) ─────────────────────────────────────────────

export const SOURCE_TYPE_BASE_CREDIBILITY: Record<SourceTypeValue, number> = {
  'Academic Paper':        0.82,
  'Archaeological Report': 0.80,
  'Government Document':   0.76,
  'Declassified Document': 0.78,
  'FOIA Release':          0.80,
  'Court Record':          0.82,
  'Museum Archive':        0.74,
  'Historical Text':       0.68,
  'Religious Text':        0.55,
  'Book':                  0.60,
  'News Investigation':    0.50,
  'Research Report':       0.65,
  'Scientific Dataset':    0.72,
  'Interview':             0.45,
  'Witness Testimony':     0.38,
  'Photograph':            0.42,
  'Video Evidence':        0.40,
  'Website':               0.30,
  'Other':                 0.35,
};

// ── Quality tiers (★ rating) ──────────────────────────────────────────────────

export type QualityTier = 5 | 4 | 3 | 2 | 1;

export const SOURCE_TYPE_QUALITY_TIER: Record<SourceTypeValue, QualityTier> = {
  'Academic Paper':        5,
  'Court Record':          5,
  'FOIA Release':          5,
  'Archaeological Report': 5,
  'Declassified Document': 4,
  'Government Document':   4,
  'Scientific Dataset':    4,
  'Museum Archive':        4,
  'Research Report':       4,
  'Historical Text':       3,
  'Religious Text':        3,
  'Book':                  3,
  'Interview':             3,
  'News Investigation':    2,
  'Photograph':            2,
  'Video Evidence':        2,
  'Witness Testimony':     2,
  'Website':               1,
  'Other':                 1,
};

// ── Colors (hex) ─────────────────────────────────────────────────────────────

export const SOURCE_TYPE_COLORS: Record<SourceTypeValue, string> = {
  'Academic Paper':        '#6366f1',
  'Archaeological Report': '#a16207',
  'Government Document':   '#0284c7',
  'Declassified Document': '#0369a1',
  'FOIA Release':          '#0891b2',
  'Court Record':          '#15803d',
  'Museum Archive':        '#06b6d4',
  'Historical Text':       '#f59e0b',
  'Religious Text':        '#dc2626',
  'Book':                  '#8b5cf6',
  'News Investigation':    '#ec4899',
  'Research Report':       '#7c3aed',
  'Scientific Dataset':    '#10b981',
  'Interview':             '#64748b',
  'Witness Testimony':     '#475569',
  'Photograph':            '#84cc16',
  'Video Evidence':        '#22c55e',
  'Website':               '#94a3b8',
  'Other':                 '#64748b',
};

// ── Descriptions ─────────────────────────────────────────────────────────────

export const SOURCE_TYPE_DESCRIPTIONS: Record<SourceTypeValue, string> = {
  'Academic Paper':        'Peer-reviewed research published in a scholarly journal.',
  'Archaeological Report': 'Field reports, site analyses, or excavation findings from archaeologists.',
  'Government Document':   'Official government publications, records, or communications.',
  'Declassified Document': 'Previously classified government material released for public access.',
  'FOIA Release':          'Documents obtained through Freedom of Information Act requests.',
  'Court Record':          'Legal filings, court decisions, testimony, or judicial records.',
  'Museum Archive':        'Catalogued materials held by a museum, library, or cultural institution.',
  'Historical Text':       'Primary historical documents, manuscripts, or period-appropriate records.',
  'Religious Text':        'Sacred scriptures, theological writings, or religious documents.',
  'Book':                  'Published non-fiction books (academic, investigative, or reference).',
  'News Investigation':    'Investigative journalism or long-form reporting from a news organisation.',
  'Research Report':       'Research or policy reports from think tanks, NGOs, or institutions.',
  'Scientific Dataset':    'Raw or processed scientific data from an empirical study or survey.',
  'Interview':             'Recorded or transcribed interview with a subject-matter expert or witness.',
  'Witness Testimony':     'First-hand account from a direct witness to an event.',
  'Photograph':            'Photographic evidence relevant to the subject being researched.',
  'Video Evidence':        'Video footage directly documenting an event or phenomenon.',
  'Website':               'Online publication, database, or resource (not primary source).',
  'Other':                 'Source type not covered by the above categories.',
};

// ── Conditional fields per source type ───────────────────────────────────────

export interface ConditionalFields {
  showJournal?:      boolean;
  showVolumeIssue?:  boolean;
  showDoi?:          boolean;
  showIsbn?:         boolean;
  showPublisher?:    boolean;
  showEdition?:      boolean;
  showAgency?:       boolean;
  showDocNumber?:    boolean;
  showCourt?:        boolean;
  showCaseNumber?:   boolean;
  showJurisdiction?: boolean;
  showInterviewee?:  boolean;
  showInterviewer?:  boolean;
  showInterviewDate?:boolean;
  showVideoUrl?:     boolean;
  showRecordingDate?:boolean;
  showPhotographer?: boolean;
  showDateTaken?:    boolean;
  showPhotoLocation?:boolean;
}

export const SOURCE_TYPE_FIELDS: Record<SourceTypeValue, ConditionalFields> = {
  'Academic Paper':        { showJournal: true, showVolumeIssue: true, showDoi: true },
  'Archaeological Report': { showDoi: true, showPublisher: true },
  'Government Document':   { showAgency: true, showDocNumber: true },
  'Declassified Document': { showAgency: true, showDocNumber: true },
  'FOIA Release':          { showAgency: true, showDocNumber: true },
  'Court Record':          { showCourt: true, showCaseNumber: true, showJurisdiction: true },
  'Museum Archive':        { showPublisher: true },
  'Historical Text':       { showDoi: true },
  'Religious Text':        {},
  'Book':                  { showIsbn: true, showPublisher: true, showEdition: true },
  'News Investigation':    {},
  'Research Report':       { showPublisher: true, showDoi: true },
  'Scientific Dataset':    { showDoi: true, showPublisher: true },
  'Interview':             { showInterviewee: true, showInterviewer: true, showInterviewDate: true },
  'Witness Testimony':     {},
  'Photograph':            { showPhotographer: true, showDateTaken: true, showPhotoLocation: true },
  'Video Evidence':        { showVideoUrl: true, showRecordingDate: true },
  'Website':               {},
  'Other':                 {},
};

// ── Migration map: old string → new ──────────────────────────────────────────

export const SOURCE_TYPE_MIGRATION_MAP: Record<string, SourceTypeValue> = {
  'Folklore Collection': 'Historical Text',
};

/** Resolve any stale source type string to a valid current value. */
export function resolveSourceType(raw: string): SourceTypeValue {
  if ((SOURCE_TYPE_VALUES as readonly string[]).includes(raw)) {
    return raw as SourceTypeValue;
  }
  return SOURCE_TYPE_MIGRATION_MAP[raw] ?? 'Other';
}

// ── Quality tier display ──────────────────────────────────────────────────────

export const QUALITY_TIER_GROUPS: Record<QualityTier, SourceTypeValue[]> = {
  5: ['Academic Paper', 'Archaeological Report', 'FOIA Release', 'Court Record'],
  4: ['Government Document', 'Declassified Document', 'Scientific Dataset', 'Museum Archive', 'Research Report'],
  3: ['Historical Text', 'Book', 'Interview'],
  2: ['News Investigation', 'Photograph', 'Video Evidence', 'Witness Testimony'],
  1: ['Website', 'Other', 'Religious Text'],
};

export const QUALITY_TIER_LABELS: Record<QualityTier, string> = {
  5: 'Primary / Institutional',
  4: 'Verified Secondary',
  3: 'Cited Secondary',
  2: 'Supplemental',
  1: 'Low Credibility',
};
