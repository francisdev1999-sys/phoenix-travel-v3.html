export { NODE_CATEGORY_COLORS as CATEGORY_COLORS } from '@/lib/taxonomy/node-categories';

import type { EvidenceLevel } from './types';

export const EVIDENCE_COLORS: Record<EvidenceLevel, string> = {
  verified:        '#22c55e',
  strong_evidence: '#06b6d4',
  debated:         '#eab308',
  speculative:     '#f59e0b',
  mythological:    '#ef4444',
};

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  verified:        'Verified',
  strong_evidence: 'Strong Evidence',
  debated:         'Debated',
  speculative:     'Speculative',
  mythological:    'Mythological',
};
