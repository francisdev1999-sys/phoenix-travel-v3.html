/**
 * Rule-based relationship suggestion engine.
 *
 * Signals used (weighted sum → confidence score):
 *   tag overlap      30 %  – Jaccard similarity of node tags
 *   date proximity   20 %  – how close the nodes are in time
 *   source overlap   15 %  – shared research sources
 *   category match   15 %  – same knowledge-graph category
 *   geo proximity    10 %  – distance between coordinates
 *   evidence compat  10 %  – compatible evidence levels
 *
 * Guarantees:
 *   - Never publishes anything — all suggestions land in status='pending'
 *   - Every suggestion carries reason, evidenceBasis, confidence, risk, type
 *   - Skips pairs below MIN_SCORE threshold (0.25) — noise reduction
 *   - Skips pairs that already have an edge or pending suggestion
 *   - Caps at MAX_PER_NODE (15) per publish event — performance guard
 */

import { prisma } from '@/lib/db';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NodeSlice {
  id:             string;
  title:          string;
  categoryId:     string;
  evidenceLevel:  string;
  confidenceScore: number;
  lat:            number | null;
  lon:            number | null;
  dateStart:      number | null;
  dateEnd:        number | null;
  year:           number | null;
  tags:           { tag: string }[];
  sourceLinks:    { sourceId: string }[];
}

interface SignalBreakdown {
  tagScore:      number;
  categoryScore: number;
  dateScore:     number;
  geoScore:      number;
  sourceScore:   number;
  evidenceScore: number;
  total:         number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const W = { tag: 0.30, date: 0.20, source: 0.15, category: 0.15, geo: 0.10, evidence: 0.10 };
const MIN_SCORE     = 0.25;
const MAX_PER_NODE  = 15;
const MAX_POOL      = 500;

const EVIDENCE_RANK: Record<string, number> = {
  verified: 5, strong_evidence: 4, debated: 3, speculative: 2, mythological: 1,
};

// ── Signal calculators ────────────────────────────────────────────────────────

function jaccard(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 0;
  const sa = new Set(a), sb = new Set(b);
  const inter = [...sa].filter(x => sb.has(x)).length;
  return inter / (new Set([...a, ...b]).size || 1);
}

function dateScore(a: NodeSlice, b: NodeSlice): number {
  const ya = a.year ?? a.dateStart ?? a.dateEnd;
  const yb = b.year ?? b.dateStart ?? b.dateEnd;
  if (ya == null || yb == null) return 0;
  const d = Math.abs(ya - yb);
  if (d === 0)     return 1.0;
  if (d <= 50)     return 0.9;
  if (d <= 200)    return 0.7;
  if (d <= 500)    return 0.5;
  if (d <= 1000)   return 0.3;
  if (d <= 5000)   return 0.1;
  return 0;
}

function geoScore(a: NodeSlice, b: NodeSlice): number {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return 0;
  const R  = 6371;
  const dL = ((b.lat - a.lat) * Math.PI) / 180;
  const dO = ((b.lon - a.lon) * Math.PI) / 180;
  const s  = Math.sin(dL / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dO / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  if (km <= 10)   return 1.0;
  if (km <= 50)   return 0.9;
  if (km <= 200)  return 0.7;
  if (km <= 500)  return 0.5;
  if (km <= 1000) return 0.3;
  if (km <= 2000) return 0.1;
  return 0;
}

function sourceScore(a: NodeSlice, b: NodeSlice): number {
  const sa = new Set(a.sourceLinks.map(s => s.sourceId));
  const sb = new Set(b.sourceLinks.map(s => s.sourceId));
  const shared = [...sa].filter(id => sb.has(id)).length;
  if (!shared) return 0;
  return Math.min(1, shared / Math.max(sa.size, sb.size, 1));
}

function evidenceScore(a: NodeSlice, b: NodeSlice): number {
  const la = EVIDENCE_RANK[a.evidenceLevel] ?? 3;
  const lb = EVIDENCE_RANK[b.evidenceLevel] ?? 3;
  const d  = Math.abs(la - lb);
  if (d === 0) return 1.0;
  if (d === 1) return 0.7;
  if (d === 2) return 0.4;
  return 0.1;
}

function computeSignals(a: NodeSlice, b: NodeSlice): SignalBreakdown {
  const tagsA = a.tags.map(t => t.tag.toLowerCase());
  const tagsB = b.tags.map(t => t.tag.toLowerCase());

  const tagScore      = jaccard(tagsA, tagsB);
  const categoryScore = a.categoryId === b.categoryId ? 1.0 : 0.0;
  const ds            = dateScore(a, b);
  const gs            = geoScore(a, b);
  const ss            = sourceScore(a, b);
  const es            = evidenceScore(a, b);

  const total =
    tagScore      * W.tag      +
    categoryScore * W.category +
    ds            * W.date     +
    gs            * W.geo      +
    ss            * W.source   +
    es            * W.evidence;

  return { tagScore, categoryScore, dateScore: ds, geoScore: gs, sourceScore: ss, evidenceScore: es, total };
}

// ── Relationship type classifier ──────────────────────────────────────────────

function classifyType(a: NodeSlice, b: NodeSlice, sig: SignalBreakdown): string {
  const la = EVIDENCE_RANK[a.evidenceLevel] ?? 3;
  const lb = EVIDENCE_RANK[b.evidenceLevel] ?? 3;

  if (sig.tagScore > 0.3 && Math.abs(la - lb) >= 3) return 'contradiction';
  if (sig.sourceScore > 0.3)                         return 'source_relationship';
  if (sig.geoScore > 0.5 && a.lat != null)           return 'geographical';
  if (sig.dateScore > 0.5 && sig.evidenceScore > 0.5) return 'historical';
  if (sig.tagScore > 0.4 && sig.categoryScore > 0)   return 'thematic';
  if (sig.tagScore > 0.2)                             return 'textual';
  return 'speculative';
}

// Maps suggestion types to Edge.relationshipType values
export const SUGGESTION_TO_EDGE_TYPE: Record<string, string> = {
  factual:              'historical',
  source_relationship:  'textual',
  geographical:         'geographical',
  historical:           'historical',
  thematic:             'thematic',
  textual:              'textual',
  speculative:          'thematic',
  contradiction:        'contradictory',
};

function buildReason(a: NodeSlice, b: NodeSlice, sig: SignalBreakdown, type: string): string {
  const parts: string[] = [];
  const tagsA = new Set(a.tags.map(t => t.tag.toLowerCase()));
  const tagsB = new Set(b.tags.map(t => t.tag.toLowerCase()));
  const sharedTags = [...tagsA].filter(t => tagsB.has(t));
  if (sharedTags.length) parts.push(`Shared tags: ${sharedTags.slice(0, 3).join(', ')}`);
  if (sig.categoryScore)  parts.push('Same category');
  if (sig.dateScore > 0.5) parts.push('Overlapping time period');
  if (sig.geoScore > 0.5)  parts.push('Geographic proximity');
  const sharedSources = [...new Set(a.sourceLinks.map(s => s.sourceId))]
    .filter(id => b.sourceLinks.some(s => s.sourceId === id)).length;
  if (sharedSources) parts.push(`${sharedSources} shared source${sharedSources > 1 ? 's' : ''}`);

  const label: Record<string, string> = {
    contradiction:       'Potentially contradictory',
    source_relationship: 'Linked through shared sources',
    geographical:        'Geographically connected',
    historical:          'Historically connected',
    thematic:            'Thematically related',
    textual:             'Textually related',
    speculative:         'Speculatively connected',
  };
  return `${label[type] ?? 'Connected'}. ${parts.join('. ')}`.replace(/\. $/, '.');
}

function buildEvidenceBasis(a: NodeSlice, b: NodeSlice, sig: SignalBreakdown): string {
  return [
    `${a.title}: ${a.evidenceLevel} (${Math.round(a.confidenceScore * 100)}% confidence)`,
    `${b.title}: ${b.evidenceLevel} (${Math.round(b.confidenceScore * 100)}% confidence)`,
    sig.sourceScore > 0 ? 'Shared research sources detected.' : null,
    sig.dateScore   > 0 ? 'Temporal proximity confirmed.'     : null,
    sig.geoScore    > 0 ? 'Geographic coordinates within range.' : null,
    'System-generated — requires human review before publishing.',
  ].filter(Boolean).join(' ');
}

function toRiskLevel(score: number, type: string): string {
  if (type === 'contradiction')  return 'high';
  if (type === 'speculative')    return score < 0.4 ? 'high' : 'medium';
  if (score >= 0.65)             return 'low';
  if (score >= 0.40)             return 'medium';
  return 'high';
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateSuggestionsForNode(nodeId: string): Promise<number> {
  const newNode = await prisma.node.findUnique({
    where:   { id: nodeId },
    include: { tags: true, sourceLinks: { select: { sourceId: true } } },
  });
  if (!newNode) return 0;

  const pool = await prisma.node.findMany({
    where:   { status: 'published', id: { not: nodeId } },
    include: { tags: true, sourceLinks: { select: { sourceId: true } } },
    take:    MAX_POOL,
  });

  // Pre-fetch existing edges and suggestions to skip duplicates
  const [existingEdges, existingSuggestions] = await Promise.all([
    prisma.edge.findMany({
      where:  { OR: [{ fromId: nodeId }, { toId: nodeId }] },
      select: { fromId: true, toId: true },
    }),
    prisma.relationshipSuggestion.findMany({
      where:  { OR: [{ fromNodeId: nodeId }, { toNodeId: nodeId }] },
      select: { fromNodeId: true, toNodeId: true },
    }),
  ]);

  const skip = new Set([
    ...existingEdges.flatMap(e => [`${e.fromId}:${e.toId}`, `${e.toId}:${e.fromId}`]),
    ...existingSuggestions.flatMap(s => [`${s.fromNodeId}:${s.toNodeId}`, `${s.toNodeId}:${s.fromNodeId}`]),
  ]);

  const scored = pool
    .filter(c => !skip.has(`${nodeId}:${c.id}`) && !skip.has(`${c.id}:${nodeId}`))
    .map(c => {
      const sig  = computeSignals(newNode as NodeSlice, c as NodeSlice);
      const type = classifyType(newNode as NodeSlice, c as NodeSlice, sig);
      return { candidate: c, sig, type };
    })
    .filter(({ sig }) => sig.total >= MIN_SCORE)
    .sort((a, b) => b.sig.total - a.sig.total)
    .slice(0, MAX_PER_NODE);

  if (!scored.length) return 0;

  await prisma.relationshipSuggestion.createMany({
    skipDuplicates: true,
    data: scored.map(({ candidate, sig, type }) => ({
      fromNodeId:        nodeId,
      toNodeId:          candidate.id,
      relationshipType:  type,
      reason:            buildReason(newNode as NodeSlice, candidate as NodeSlice, sig, type),
      evidenceBasis:     buildEvidenceBasis(newNode as NodeSlice, candidate as NodeSlice, sig),
      confidenceScore:   Math.round(sig.total * 100) / 100,
      riskLevel:         toRiskLevel(sig.total, type),
      signalBreakdown:   sig as unknown as Record<string, number>,
      triggeredByNodeId: nodeId,
      generationMethod:  'rule_based',
    })),
  });

  return scored.length;
}
