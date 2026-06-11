/**
 * Exploration synthesis rule engine.
 *
 * Analyses a user's rabbit-hole session path purely from the data already
 * in the DB — no LLM calls, no external knowledge, zero hallucination risk.
 *
 * What it finds:
 *   themes           — tags shared across ≥2 explored nodes
 *   connections      — published edges between explored nodes
 *   contradictions   — contradiction-type edges within the path
 *   evidenceBreakdown— distribution of evidence levels
 *   categories       — which topic clusters dominated the path
 *   bridges          — unvisited nodes connected to ≥2 explored nodes
 *   pathType         — 'deep' (narrow focus) | 'broad' | 'mixed'
 *   connectivity     — how interconnected the path actually was
 *   qualityScore     — estimate of synthesis usefulness (0–100)
 */

import { prisma } from '@/lib/db';

// ── Output types ──────────────────────────────────────────────────────────────

export interface ThemeResult {
  tag:     string;
  count:   number;
  nodeIds: string[];
}

export interface ConnectionResult {
  id:               string;
  fromId:           string;
  fromTitle:        string;
  toId:             string;
  toTitle:          string;
  relationshipType: string;
  confidenceScore:  number;
  strengthScore:    number;
  explanation:      string;
}

export interface EvidenceBreakdown {
  verified:        number;
  strong_evidence: number;
  debated:         number;
  speculative:     number;
  mythological:    number;
  qualityScore:    number; // 0–100 weighted score
  dominantLevel:   string;
}

export interface CategoryCluster {
  name:    string;
  count:   number;
  nodeIds: string[];
}

export interface BridgeNode {
  id:              string;
  title:           string;
  category:        string;
  evidenceLevel:   string;
  connectionCount: number; // how many explored nodes connect here
}

export interface NodeSummary {
  id:             string;
  title:          string;
  category:       string;
  evidenceLevel:  string;
  confidenceScore: number;
  tags:           string[];
}

export interface SynthesisResult {
  nodeIds:              string[];
  nodeCount:            number;
  nodes:                NodeSummary[];
  themes:               ThemeResult[];
  connections:          ConnectionResult[];
  contradictions:       ConnectionResult[];
  evidenceBreakdown:    EvidenceBreakdown;
  categoryDistribution: CategoryCluster[];
  bridges:              BridgeNode[];
  connectivity:         number;
  pathType:             'deep' | 'broad' | 'mixed';
  qualityScore:         number;
  isMinimallyConnected: boolean;
  synthesizedAt:        string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EVIDENCE_WEIGHT: Record<string, number> = {
  verified:        5,
  strong_evidence: 4,
  debated:         3,
  speculative:     2,
  mythological:    1,
};

const MIN_CONNECTIVITY = 0.10; // below this → not enough links to synthesise well

// ── Main export ───────────────────────────────────────────────────────────────

export async function runSynthesis(rawNodeIds: string[]): Promise<SynthesisResult> {
  // Deduplicate while preserving order (first occurrence wins)
  const seen = new Set<string>();
  const nodeIds = rawNodeIds.filter(id => { if (seen.has(id)) return false; seen.add(id); return true; });

  if (nodeIds.length < 2) {
    return emptyResult(nodeIds);
  }

  // ── 1. Fetch explored nodes ──────────────────────────────────────────────
  const dbNodes = await prisma.node.findMany({
    where:   { id: { in: nodeIds } },
    include: { tags: true, category: true },
  });

  const nodeMap = new Map(dbNodes.map(n => [n.id, n]));

  // ── 2. Internal edges (edges between explored nodes) ────────────────────
  const internalEdges = await prisma.edge.findMany({
    where: {
      fromId: { in: nodeIds },
      toId:   { in: nodeIds },
      status: 'published',
    },
    include: {
      from: { select: { id: true, title: true } },
      to:   { select: { id: true, title: true } },
    },
    orderBy: { confidenceScore: 'desc' },
  });

  // ── 3. Neighbor edges (for bridge detection) ────────────────────────────
  const neighborEdges = await prisma.edge.findMany({
    where: {
      OR: [{ fromId: { in: nodeIds } }, { toId: { in: nodeIds } }],
      AND: [{ fromId: { notIn: nodeIds } }, { toId: { notIn: nodeIds } }].map(c => ({ NOT: { AND: [{ fromId: { in: nodeIds } }, { toId: { in: nodeIds } }] } })),
      status: 'published',
    },
    select: {
      fromId: true, toId: true,
      from: { select: { id: true, title: true, evidenceLevel: true, category: { select: { name: true } } } },
      to:   { select: { id: true, title: true, evidenceLevel: true, category: { select: { name: true } } } },
    },
  });

  // ── 4. Compute themes (shared tags) ─────────────────────────────────────
  const tagIndex = new Map<string, string[]>(); // tag → nodeIds that have it
  for (const node of dbNodes) {
    for (const t of node.tags) {
      const existing = tagIndex.get(t.tag) ?? [];
      existing.push(node.id);
      tagIndex.set(t.tag, existing);
    }
  }
  const themes: ThemeResult[] = [...tagIndex.entries()]
    .filter(([, ids]) => ids.length >= 2)
    .map(([tag, ids]) => ({ tag, count: ids.length, nodeIds: ids }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // ── 5. Connections and contradictions ───────────────────────────────────
  const connections: ConnectionResult[] = internalEdges.map(e => ({
    id:               e.id,
    fromId:           e.fromId,
    fromTitle:        e.from.title,
    toId:             e.toId,
    toTitle:          e.to.title,
    relationshipType: e.relationshipType,
    confidenceScore:  e.confidenceScore,
    strengthScore:    e.strengthScore,
    explanation:      e.explanation.slice(0, 200),
  }));

  const contradictions = connections.filter(c => c.relationshipType === 'contradictory');

  // ── 6. Evidence breakdown ────────────────────────────────────────────────
  const evidenceCounts: Record<string, number> = {
    verified: 0, strong_evidence: 0, debated: 0, speculative: 0, mythological: 0,
  };
  let weightSum = 0;
  for (const node of dbNodes) {
    const ev = node.evidenceLevel;
    evidenceCounts[ev] = (evidenceCounts[ev] ?? 0) + 1;
    weightSum += EVIDENCE_WEIGHT[ev] ?? 2;
  }
  const evidenceQualityScore = dbNodes.length > 0
    ? Math.round((weightSum / (dbNodes.length * 5)) * 100)
    : 50;

  const dominantLevel = (Object.entries(evidenceCounts) as [string, number][])
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'speculative';

  const evidenceBreakdown: EvidenceBreakdown = {
    verified:        evidenceCounts.verified        ?? 0,
    strong_evidence: evidenceCounts.strong_evidence ?? 0,
    debated:         evidenceCounts.debated         ?? 0,
    speculative:     evidenceCounts.speculative      ?? 0,
    mythological:    evidenceCounts.mythological    ?? 0,
    qualityScore:    evidenceQualityScore,
    dominantLevel,
  };

  // ── 7. Category distribution ─────────────────────────────────────────────
  const catIndex = new Map<string, { name: string; nodeIds: string[] }>();
  for (const node of dbNodes) {
    const name = node.category?.name ?? node.categoryId;
    const existing = catIndex.get(name) ?? { name, nodeIds: [] };
    existing.nodeIds.push(node.id);
    catIndex.set(name, existing);
  }
  const categoryDistribution: CategoryCluster[] = [...catIndex.values()]
    .map(c => ({ name: c.name, count: c.nodeIds.length, nodeIds: c.nodeIds }))
    .sort((a, b) => b.count - a.count);

  // ── 8. Path type ──────────────────────────────────────────────────────────
  const uniqueCategories = categoryDistribution.length;
  const topCategoryShare = nodeIds.length > 0
    ? (categoryDistribution[0]?.count ?? 0) / nodeIds.length
    : 0;
  const pathType: 'deep' | 'broad' | 'mixed' =
    topCategoryShare >= 0.70 ? 'deep'
    : uniqueCategories >= Math.ceil(nodeIds.length * 0.6) ? 'broad'
    : 'mixed';

  // ── 9. Bridge nodes (unvisited nodes connected to ≥2 explored) ──────────
  const bridgeCount = new Map<string, { node: { id: string; title: string; evidenceLevel: string; categoryName: string }; count: number }>();
  for (const e of neighborEdges) {
    const raw = nodeIds.includes(e.fromId) ? e.to : e.from;
    if (!raw || nodeIds.includes(raw.id)) continue;
    const neighbor = { id: raw.id, title: raw.title, evidenceLevel: raw.evidenceLevel, categoryName: raw.category?.name ?? '' };
    const existing = bridgeCount.get(neighbor.id) ?? { node: neighbor, count: 0 };
    existing.count += 1;
    bridgeCount.set(neighbor.id, existing);
  }
  const bridges: BridgeNode[] = [...bridgeCount.values()]
    .filter(b => b.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(b => ({
      id:              b.node.id,
      title:           b.node.title,
      category:        b.node.categoryName,
      evidenceLevel:   b.node.evidenceLevel,
      connectionCount: b.count,
    }));

  // ── 10. Connectivity score ────────────────────────────────────────────────
  const maxEdges     = (nodeIds.length * (nodeIds.length - 1)) / 2;
  const connectivity = maxEdges > 0 ? Math.min(1, internalEdges.length / maxEdges) : 0;
  const isMinimallyConnected = connectivity >= MIN_CONNECTIVITY || nodeIds.length < 5;

  // ── 11. Overall quality score ─────────────────────────────────────────────
  let quality = 40;
  quality += Math.min(connections.length * 5, 25);        // connection density
  quality += Math.min(themes.length * 5, 15);             // thematic convergence
  quality += contradictions.length > 0 ? 10 : 0;         // interesting tension
  quality += bridges.length > 0 ? 5 : 0;                 // discovery potential
  quality -= isMinimallyConnected ? 0 : 15;               // penalty if sparse
  quality -= dominantLevel === 'mythological' ? 5 : 0;   // lower quality for pure myth paths
  quality = Math.max(10, Math.min(100, quality));

  // ── 12. Node summaries ────────────────────────────────────────────────────
  const nodes: NodeSummary[] = nodeIds
    .map(id => {
      const n = nodeMap.get(id);
      if (!n) return null;
      return {
        id:             n.id,
        title:          n.title,
        category:       n.category?.name ?? n.categoryId,
        evidenceLevel:  n.evidenceLevel,
        confidenceScore: n.confidenceScore,
        tags:           n.tags.map(t => t.tag),
      };
    })
    .filter((n): n is NodeSummary => n !== null);

  return {
    nodeIds,
    nodeCount: nodeIds.length,
    nodes,
    themes,
    connections:          connections.slice(0, 8),
    contradictions,
    evidenceBreakdown,
    categoryDistribution,
    bridges,
    connectivity,
    pathType,
    qualityScore:         quality,
    isMinimallyConnected,
    synthesizedAt:        new Date().toISOString(),
  };
}

function emptyResult(nodeIds: string[]): SynthesisResult {
  return {
    nodeIds, nodeCount: nodeIds.length, nodes: [],
    themes: [], connections: [], contradictions: [],
    evidenceBreakdown: { verified: 0, strong_evidence: 0, debated: 0, speculative: 0, mythological: 0, qualityScore: 0, dominantLevel: 'speculative' },
    categoryDistribution: [], bridges: [],
    connectivity: 0, pathType: 'mixed', qualityScore: 0,
    isMinimallyConnected: false,
    synthesizedAt: new Date().toISOString(),
  };
}
