/**
 * Nexus Archive — Node Category Taxonomy
 *
 * Single source of truth for all 28 research categories.
 * Values stored in DB as these exact strings (ProposedNode.category,
 * Category.name). Do not rename without a migration.
 */

export const NODE_CATEGORY_VALUES = [
  // ── Ancient World ───────────────────────────────────────────────
  'Ancient Civilization',
  'Ancient Site',
  'Artifact',
  'Lost Knowledge',
  'Ancient Technology',

  // ── Alternative Research ─────────────────────────────────────────
  'Forbidden Archaeology',
  'Alternative History',

  // ── Religion & Myth ─────────────────────────────────────────────
  'Religion',
  'Mythology',
  'Ancient Text',

  // ── UAP / Extraterrestrial ───────────────────────────────────────
  'UFO / UAP',
  'Extraterrestrial Hypothesis',

  // ── Government & Intelligence ────────────────────────────────────
  'Government Program',
  'Government Secrecy',
  'Intelligence Operation',
  'Secret Project',

  // ── Controversy ─────────────────────────────────────────────────
  'Conspiracy Theory',
  'Historical Controversy',

  // ── People ──────────────────────────────────────────────────────
  'Whistleblower',

  // ── Health & Biosecurity ────────────────────────────────────────
  'Disease & Pandemic',

  // ── Phenomena ───────────────────────────────────────────────────
  'Unexplained Phenomenon',

  // ── Esoteric ────────────────────────────────────────────────────
  'Symbolism',
  'Esoterica',

  // ── Entities ────────────────────────────────────────────────────
  'Historical Figure',
  'Organization',

  // ── Technology ──────────────────────────────────────────────────
  'Technology',

  // ── Catch-all ───────────────────────────────────────────────────
  'Modern Mystery',
] as const;

export type NodeCategoryValue = typeof NODE_CATEGORY_VALUES[number];

// ── Descriptions ─────────────────────────────────────────────────────────────

export const NODE_CATEGORY_DESCRIPTIONS: Record<NodeCategoryValue, string> = {
  'Ancient Civilization':         'Lost, pre-historical, or poorly-documented civilizations and cultures.',
  'Ancient Site':                 'Archaeological locations, temples, megalithic structures, and sacred sites.',
  'Artifact':                     'Physical objects of historical, archaeological, or anomalous significance.',
  'Lost Knowledge':               'Bodies of knowledge, techniques, or sciences believed lost or suppressed.',
  'Ancient Technology':           'Pre-modern engineering, construction methods, or technological achievements.',
  'Forbidden Archaeology':        'Archaeological findings that challenge or contradict mainstream timelines.',
  'Alternative History':          'Interpretations of historical events that diverge from academic consensus.',
  'Religion':                     'Religious systems, movements, beliefs, and institutions across history.',
  'Mythology':                    'Myths, legends, oral traditions, and folkloric narratives.',
  'Ancient Text':                 'Manuscripts, inscriptions, codices, and written records of historical significance.',
  'UFO / UAP':                    'Unidentified aerial/anomalous phenomena, sightings, incidents, and programs.',
  'Extraterrestrial Hypothesis':  'Theories and evidence relating to non-human intelligence and contact.',
  'Government Program':           'Official government initiatives, projects, and classified programs.',
  'Government Secrecy':           'Classified information, cover-ups, and state-sanctioned concealment.',
  'Intelligence Operation':       'Covert operations, psyops, surveillance programs, and intelligence activities.',
  'Secret Project':               'Black budget programs, unacknowledged special access programs (USAPs).',
  'Conspiracy Theory':            'Contested theories alleging coordinated hidden agendas or cover-ups.',
  'Historical Controversy':       'Disputed historical events, interpretations, or established narratives.',
  'Whistleblower':                'Individuals who disclosed classified or sensitive information.',
  'Disease & Pandemic':           'Disease outbreaks, pandemics, biological threats, and biosecurity events.',
  'Unexplained Phenomenon':       'Events, experiences, or observations that resist conventional explanation.',
  'Symbolism':                    'Symbols, sacred geometry, and encoded meaning in art, architecture, or texts.',
  'Esoterica':                    'Secret societies, occult traditions, mystery schools, and esoteric systems.',
  'Historical Figure':            'Individuals of historical, controversial, or investigative significance.',
  'Organization':                 'Groups, agencies, corporations, or institutions of research relevance.',
  'Technology':                   'Modern or emerging technologies with investigative relevance.',
  'Modern Mystery':               'Contemporary unexplained events, disappearances, or anomalous incidents.',
};

// ── Colors (hex) ─────────────────────────────────────────────────────────────

export const NODE_CATEGORY_COLORS: Record<NodeCategoryValue, string> = {
  'Ancient Civilization':        '#a16207',
  'Ancient Site':                '#ca8a04',
  'Artifact':                    '#d97706',
  'Lost Knowledge':              '#b45309',
  'Ancient Technology':          '#92400e',
  'Forbidden Archaeology':       '#c2410c',
  'Alternative History':         '#ea580c',
  'Religion':                    '#dc2626',
  'Mythology':                   '#b91c1c',
  'Ancient Text':                '#be123c',
  'UFO / UAP':                   '#16a34a',
  'Extraterrestrial Hypothesis': '#15803d',
  'Government Program':          '#0284c7',
  'Government Secrecy':          '#0369a1',
  'Intelligence Operation':      '#1d4ed8',
  'Secret Project':              '#1e40af',
  'Conspiracy Theory':           '#6d28d9',
  'Historical Controversy':      '#7c3aed',
  'Whistleblower':               '#9333ea',
  'Disease & Pandemic':          '#e11d48',
  'Unexplained Phenomenon':      '#06b6d4',
  'Symbolism':                   '#0891b2',
  'Esoterica':                   '#4f46e5',
  'Historical Figure':           '#64748b',
  'Organization':                '#475569',
  'Technology':                  '#334155',
  'Modern Mystery':              '#6366f1',
};

// ── Icons (lucide-react names) ────────────────────────────────────────────────

export const NODE_CATEGORY_ICONS: Record<NodeCategoryValue, string> = {
  'Ancient Civilization':        'Building',
  'Ancient Site':                'MapPin',
  'Artifact':                    'Diamond',
  'Lost Knowledge':              'BookOpen',
  'Ancient Technology':          'Wrench',
  'Forbidden Archaeology':       'Shovel',
  'Alternative History':         'History',
  'Religion':                    'Star',
  'Mythology':                   'Flame',
  'Ancient Text':                'Scroll',
  'UFO / UAP':                   'CircleDot',
  'Extraterrestrial Hypothesis': 'Satellite',
  'Government Program':          'Shield',
  'Government Secrecy':          'Lock',
  'Intelligence Operation':      'Eye',
  'Secret Project':              'FileX',
  'Conspiracy Theory':           'Network',
  'Historical Controversy':      'Scale',
  'Whistleblower':               'Megaphone',
  'Disease & Pandemic':          'AlertTriangle',
  'Unexplained Phenomenon':      'HelpCircle',
  'Symbolism':                   'Hexagon',
  'Esoterica':                   'Infinity',
  'Historical Figure':           'User',
  'Organization':                'Users',
  'Technology':                  'Cpu',
  'Modern Mystery':              'Search',
};

// ── Group display ─────────────────────────────────────────────────────────────

export const NODE_CATEGORY_GROUPS: Record<string, NodeCategoryValue[]> = {
  'Ancient World': [
    'Ancient Civilization', 'Ancient Site', 'Artifact', 'Lost Knowledge', 'Ancient Technology',
  ],
  'Alternative Research': [
    'Forbidden Archaeology', 'Alternative History',
  ],
  'Religion & Myth': [
    'Religion', 'Mythology', 'Ancient Text',
  ],
  'UAP / Extraterrestrial': [
    'UFO / UAP', 'Extraterrestrial Hypothesis',
  ],
  'Government & Intelligence': [
    'Government Program', 'Government Secrecy', 'Intelligence Operation', 'Secret Project',
  ],
  'Controversy': [
    'Conspiracy Theory', 'Historical Controversy', 'Whistleblower',
  ],
  'Phenomena': [
    'Disease & Pandemic', 'Unexplained Phenomenon',
  ],
  'Esoteric': [
    'Symbolism', 'Esoterica',
  ],
  'Entities': [
    'Historical Figure', 'Organization',
  ],
  'Other': [
    'Technology', 'Modern Mystery',
  ],
};

// ── Migration map: old category string → new ─────────────────────────────────
// Used in SQL migration AND as a JS fallback for any stale strings in the DB.

export const CATEGORY_MIGRATION_MAP: Record<string, NodeCategoryValue> = {
  // Official old categories (lib/validation/enums.ts)
  'Ancient Civilizations':      'Ancient Civilization',
  'Egypt & Ancient Engineering':'Ancient Site',
  'Religious Texts & Mythology':'Religion',
  'UFO / UAP':                  'UFO / UAP',
  'Human Origins':              'Forbidden Archaeology',
  'Consciousness & Reality':    'Unexplained Phenomenon',
  'Secret Societies & Esoteric':'Esoterica',
  'Global Mysteries':           'Modern Mystery',
  'Legends & Folklore':         'Mythology',
  // Unofficial ProposeNodeForm categories that were in production
  'Lost Technology':            'Ancient Technology',
  'Cosmic Events':              'Unexplained Phenomenon',
  'Hidden History':             'Alternative History',
  'Sacred Geometry':            'Symbolism',
  'Consciousness':              'Unexplained Phenomenon',
  'Interdimensional':           'Extraterrestrial Hypothesis',
  'Prophecy':                   'Religion',
};

/** Resolve any stale category string to a valid current value. */
export function resolveCategory(raw: string): NodeCategoryValue {
  if ((NODE_CATEGORY_VALUES as readonly string[]).includes(raw)) {
    return raw as NodeCategoryValue;
  }
  return CATEGORY_MIGRATION_MAP[raw] ?? 'Modern Mystery';
}
