import type { NodeCategory, EvidenceLevel } from './types';

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  'Ancient Civilizations':          '#a16207',
  'Egypt & Ancient Engineering':    '#eab308',
  'Religious Texts & Mythology':    '#f59e0b',
  'UFO / UAP':                      '#22c55e',
  'Human Origins':                  '#10b981',
  'Consciousness & Reality':        '#6366f1',
  'Secret Societies & Esoteric':    '#1e40af',
  'Global Mysteries':               '#7c3aed',
  'Legends & Folklore':             '#dc2626',
};

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
