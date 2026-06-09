import { nodes } from './nodes';
import type { NodeCategory } from './types';
import type { SourceRecord } from '@/lib/source-types';

const CATEGORY_SOURCE_TYPE: Record<NodeCategory, string> = {
  'Ancient Civilizations':       'Archaeological Report',
  'Egypt & Ancient Engineering': 'Archaeological Report',
  'Religious Texts & Mythology': 'Religious Text',
  'UFO / UAP':                   'News Investigation',
  'Human Origins':               'Archaeological Report',
  'Consciousness & Reality':     'Historical Text',
  'Secret Societies & Esoteric': 'Historical Text',
  'Global Mysteries':            'Historical Text',
  'Legends & Folklore':          'Folklore Collection',
};

const STATIC_DATE = '2024-01-01T00:00:00.000Z';

export function getNodeStaticSources(): SourceRecord[] {
  return nodes.map(node => ({
    id: `node:${node.id}`,
    title: node.title,
    sourceType: CATEGORY_SOURCE_TYPE[node.category] ?? 'Historical Text',
    author: null,
    publicationYear: node.year != null ? Math.abs(node.year) : null,
    publisher: 'Nexus Archive — Knowledge Graph',
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    url: null,
    doi: null,
    isbn: null,
    abstract: node.description,
    notes: `Category: ${node.category} · Evidence Level: ${node.evidence_level} · Confidence: ${Math.round(node.confidence_score * 100)}%`,
    language: 'en',
    credibilityScore: node.confidence_score,
    credibilityFactors: null,
    status: 'approved',
    reviewNotes: null,
    reviewedAt: null,
    submittedBy: null,
    reviewedBy: null,
    createdAt: STATIC_DATE,
    updatedAt: STATIC_DATE,
    links: [],
    submitter: null,
  }));
}

export function filterNodeSources(
  sources: SourceRecord[],
  opts: { q?: string; type?: string; status?: string },
): SourceRecord[] {
  return sources.filter(s => {
    if (opts.status && s.status !== opts.status) return false;
    if (opts.type   && s.sourceType !== opts.type) return false;
    if (opts.q) {
      const needle = opts.q.toLowerCase();
      const haystack = `${s.title} ${s.abstract ?? ''} ${s.notes ?? ''}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}
