import { nodes } from './nodes';
import type { NodeCategory } from './types';
import type { SourceRecord } from '@/lib/source-types';

const CATEGORY_SOURCE_TYPE: Record<NodeCategory, string> = {
  'Ancient Civilization':        'Archaeological Report',
  'Ancient Site':                'Archaeological Report',
  'Artifact':                    'Museum Archive',
  'Lost Knowledge':              'Historical Text',
  'Ancient Technology':          'Archaeological Report',
  'Forbidden Archaeology':       'Archaeological Report',
  'Alternative History':         'Historical Text',
  'Religion':                    'Religious Text',
  'Mythology':                   'Folklore Collection',
  'Ancient Text':                'Historical Text',
  'UFO / UAP':                   'News Investigation',
  'Extraterrestrial Hypothesis': 'News Investigation',
  'Government Program':          'Government Document',
  'Government Secrecy':          'Government Document',
  'Intelligence Operation':      'Government Document',
  'Secret Project':              'Government Document',
  'Conspiracy Theory':           'Historical Text',
  'Historical Controversy':      'Historical Text',
  'Whistleblower':               'News Investigation',
  'Disease & Pandemic':          'Academic Paper',
  'Unexplained Phenomenon':      'News Investigation',
  'Symbolism':                   'Historical Text',
  'Esoterica':                   'Historical Text',
  'Historical Figure':           'Historical Text',
  'Organization':                'Historical Text',
  'Technology':                  'Academic Paper',
  'Modern Mystery':              'News Investigation',
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
