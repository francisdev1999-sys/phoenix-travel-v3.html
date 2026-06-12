import { nodes as rawNodes } from './nodes';
import { expandedNodes } from './nodes-expanded';
import { edges } from './edges';
import { NODE_SOURCES } from './sources';
import {
  GraphNode, GraphEdge, KnowledgeGraph, NodeCategory,
  EvidenceLevel, GraphDiagnostics, ClusterReport,
} from './types';

export * from './types';
export { edges };

// Nodes enriched with curated static sources
export const nodes: GraphNode[] = [...rawNodes, ...expandedNodes].map(n => ({
  ...n,
  sources: NODE_SOURCES[n.id] ?? [],
}));

export const graph: KnowledgeGraph = {
  nodes,
  edges,
  version: '2.0.0',
  generated: '2026',
};

// ── Lookup helpers ──────────────────────────────────────────────────

export const getNode = (id: string): GraphNode | undefined =>
  nodes.find(n => n.id === id);

export const getNodesByCategory = (category: NodeCategory): GraphNode[] =>
  nodes.filter(n => n.category === category);

export const getCategories = (): NodeCategory[] =>
  [...new Set(nodes.map(n => n.category))];

export const getEdgesForNode = (id: string): GraphEdge[] =>
  edges.filter(e => e.from === id || e.to === id);

export const getNeighborIds = (id: string): string[] => {
  const connected = new Set<string>();
  edges.forEach(e => {
    if (e.from === id) connected.add(e.to);
    if (e.to === id) connected.add(e.from);
  });
  return [...connected];
};

export const getNeighbors = (id: string): GraphNode[] =>
  getNeighborIds(id)
    .map(nid => getNode(nid))
    .filter((n): n is GraphNode => n !== undefined);

export const getEdge = (fromId: string, toId: string): GraphEdge | undefined =>
  edges.find(
    e => (e.from === fromId && e.to === toId) ||
         (e.from === toId && e.to === fromId)
  );

export const getMostConnected = (limit = 10): GraphNode[] => {
  const counts: Record<string, number> = {};
  edges.forEach(e => {
    counts[e.from] = (counts[e.from] || 0) + 1;
    counts[e.to] = (counts[e.to] || 0) + 1;
  });
  return nodes
    .filter(n => counts[n.id])
    .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
    .slice(0, limit);
};

export const getNodeDegree = (id: string): number => getNeighborIds(id).length;

// ── Research score ──────────────────────────────────────────────────

const EVIDENCE_SCORES: Record<EvidenceLevel, number> = {
  verified: 1.0,
  strong_evidence: 0.8,
  debated: 0.5,
  speculative: 0.25,
  mythological: 0.1,
};

export const computeResearchScore = (node: GraphNode): number => {
  const evidenceScore = EVIDENCE_SCORES[node.evidence_level] ?? 0.5;
  const confidenceScore = node.confidence_score;

  const sources = node.sources ?? [];
  const sourceQuality = sources.length === 0
    ? 0
    : sources.reduce((s, src) => s + src.credibility_score, 0) / sources.length;
  const sourceScore = Math.min(1, sources.length / 5) * (sources.length > 0 ? sourceQuality : 0);

  const edgesForNode = getEdgesForNode(node.id);
  const degree = edgesForNode.length;
  const avgEdgeConf = degree === 0
    ? 0
    : edgesForNode.reduce((s, e) => s + e.confidence_score, 0) / degree;
  const connectionScore = Math.min(1, degree / 8) * avgEdgeConf;

  return Math.round(
    (evidenceScore * 0.3 + confidenceScore * 0.3 + sourceScore * 0.2 + connectionScore * 0.2) * 100
  );
};

// ── Discovery helpers ───────────────────────────────────────────────

export const getRelatedEdges = (nodeId: string): { edge: GraphEdge; neighbor: GraphNode }[] =>
  getEdgesForNode(nodeId)
    .map(edge => {
      const neighborId = edge.from === nodeId ? edge.to : edge.from;
      const neighbor = getNode(neighborId);
      return neighbor ? { edge, neighbor } : null;
    })
    .filter((x): x is { edge: GraphEdge; neighbor: GraphNode } => x !== null)
    .sort((a, b) => b.edge.confidence_score - a.edge.confidence_score);

export const getRelatedByCategory = (nodeId: string): GraphNode[] => {
  const node = getNode(nodeId);
  if (!node) return [];
  return nodes
    .filter(n => n.id !== nodeId && n.category === node.category)
    .slice(0, 5);
};

export const getTimelineNeighbors = (nodeId: string): GraphNode[] => {
  const node = getNode(nodeId);
  if (!node || node.year === undefined) return [];
  const range = 2000;
  return nodes
    .filter(n => n.id !== nodeId && n.year !== undefined &&
      Math.abs(n.year - node.year!) < range)
    .sort((a, b) => Math.abs(a.year! - node.year!) - Math.abs(b.year! - node.year!))
    .slice(0, 5);
};

export const getGeographicNeighbors = (nodeId: string): GraphNode[] => {
  const node = getNode(nodeId);
  if (!node || !node.coordinates) return [];
  const [lat, lon] = node.coordinates;
  const dist = (a: [number, number], b: [number, number]) =>
    Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
  return nodes
    .filter(n => n.id !== nodeId && n.coordinates)
    .sort((a, b) =>
      dist(a.coordinates!, [lat, lon]) - dist(b.coordinates!, [lat, lon])
    )
    .slice(0, 5);
};

// ── BFS rabbit hole path ────────────────────────────────────────────

export const getRabbitHolePath = (startId: string, depth = 5): GraphNode[] => {
  const visited = new Set<string>();
  const queue: { id: string; d: number }[] = [{ id: startId, d: 0 }];
  const path: GraphNode[] = [];

  while (queue.length > 0 && path.length < depth) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const node = getNode(current.id);
    if (node) path.push(node);

    if (current.d < depth) {
      const neighbors = getNeighborIds(current.id).filter(id => !visited.has(id));
      neighbors
        .map(id => ({ id, strength: getEdge(current.id, id)?.strength_score ?? 0 }))
        .sort((a, b) => b.strength - a.strength)
        .forEach(n => queue.push({ id: n.id, d: current.d + 1 }));
    }
  }

  return path;
};

// ── Search ──────────────────────────────────────────────────────────

export const searchNodes = (query: string): GraphNode[] => {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return nodes.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.description.toLowerCase().includes(q) ||
    n.tags.some(t => t.toLowerCase().includes(q)) ||
    n.category.toLowerCase().includes(q)
  );
};

// ── Graph quality diagnostics ───────────────────────────────────────

export const getOrphanNodes = (): GraphNode[] =>
  nodes.filter(n => getNodeDegree(n.id) < 2);

export const getGhostNodeIds = (): string[] => {
  const nodeIds = new Set(nodes.map(n => n.id));
  const ghosts = new Set<string>();
  edges.forEach(e => {
    if (!nodeIds.has(e.from)) ghosts.add(e.from);
    if (!nodeIds.has(e.to)) ghosts.add(e.to);
  });
  return [...ghosts];
};

export const getDuplicateIds = (): string[] => {
  const seen = new Set<string>();
  const dupes: string[] = [];
  nodes.forEach(n => {
    if (seen.has(n.id)) dupes.push(n.id);
    seen.add(n.id);
  });
  return dupes;
};

export const getLowConfidenceEdges = (threshold = 0.4): GraphEdge[] =>
  edges.filter(e => e.confidence_score < threshold)
       .sort((a, b) => a.confidence_score - b.confidence_score);

export const getClusterReport = (): ClusterReport[] => {
  const categories = getCategories();
  return categories.map(category => {
    const catNodes = nodes.filter(n => n.category === category);
    const catIds = new Set(catNodes.map(n => n.id));
    const internalEdges = edges.filter(e => catIds.has(e.from) && catIds.has(e.to));
    const possible = (catNodes.length * (catNodes.length - 1)) / 2;
    const avgConf = internalEdges.length > 0
      ? internalEdges.reduce((s, e) => s + e.confidence_score, 0) / internalEdges.length
      : 0;
    return {
      category,
      node_count: catNodes.length,
      internal_edges: internalEdges.length,
      avg_confidence: Math.round(avgConf * 100) / 100,
      density: possible > 0 ? Math.round((internalEdges.length / possible) * 100) / 100 : 0,
    };
  });
};

export const runDiagnostics = (): GraphDiagnostics => {
  const nodeIds = new Set(nodes.map(n => n.id));
  const avgConf = edges.length > 0
    ? edges.reduce((s, e) => s + e.confidence_score, 0) / edges.length
    : 0;
  const avgDeg = nodes.length > 0
    ? nodes.reduce((s, n) => s + getNodeDegree(n.id), 0) / nodes.length
    : 0;

  const scores = nodes.map(n => computeResearchScore(n));
  const researchDist = {
    low: scores.filter(s => s < 34).length,
    medium: scores.filter(s => s >= 34 && s < 67).length,
    high: scores.filter(s => s >= 67).length,
  };

  return {
    node_count: nodes.length,
    edge_count: edges.length,
    avg_confidence: Math.round(avgConf * 100) / 100,
    avg_degree: Math.round(avgDeg * 10) / 10,
    orphan_nodes: getOrphanNodes(),
    ghost_node_ids: getGhostNodeIds(),
    low_confidence_edges: getLowConfidenceEdges(),
    duplicate_ids: getDuplicateIds(),
    cluster_report: getClusterReport(),
    research_score_distribution: researchDist,
  };
};

export const validateGraph = () => {
  const diag = runDiagnostics();
  const issues: string[] = [];
  diag.duplicate_ids.forEach(id => issues.push(`Duplicate node id: ${id}`));
  diag.ghost_node_ids.forEach(id => issues.push(`Ghost reference: "${id}" in edges but not in nodes`));
  diag.orphan_nodes.forEach(n => issues.push(`Node "${n.id}" has only ${getNodeDegree(n.id)} connection(s)`));
  diag.low_confidence_edges.forEach(e =>
    issues.push(`Low-confidence edge ${e.id} (${e.from} → ${e.to}): ${e.confidence_score}`)
  );
  nodes.forEach(n => {
    if (!n.sources?.length) issues.push(`Node "${n.id}" has no sources — add entries to NODE_SOURCES`);
  });
  return { valid: issues.length === 0, issues, diagnostics: diag };
};

// Re-exported from taxonomy — all consumers should import from lib/taxonomy/node-categories
export { NODE_CATEGORY_COLORS as CATEGORY_COLORS } from '@/lib/taxonomy/node-categories';

export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  verified: 'Verified',
  strong_evidence: 'Strong Evidence',
  debated: 'Debated',
  speculative: 'Speculative',
  mythological: 'Mythological',
};

export const EVIDENCE_COLORS: Record<EvidenceLevel, string> = {
  verified: '#22c55e',
  strong_evidence: '#06b6d4',
  debated: '#eab308',
  speculative: '#f59e0b',
  mythological: '#ef4444',
};
