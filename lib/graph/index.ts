import { nodes } from './nodes';
import { edges } from './edges';
import { GraphNode, GraphEdge, KnowledgeGraph, NodeCategory } from './types';

export * from './types';
export { nodes, edges };

export const graph: KnowledgeGraph = {
  nodes,
  edges,
  version: '1.0.0',
  generated: '2024',
};

// ── Lookup helpers ──────────────────────────────────────────────────

export const getNode = (id: string): GraphNode | undefined =>
  nodes.find(n => n.id === id);

export const getNodesByCategory = (category: NodeCategory): GraphNode[] =>
  nodes.filter(n => n.category === category);

export const getCategories = (): NodeCategory[] =>
  [...new Set(nodes.map(n => n.category))];

// Returns all edges involving a given node id
export const getEdgesForNode = (id: string): GraphEdge[] =>
  edges.filter(e => e.from === id || e.to === id);

// Returns neighbor node ids for a given node
export const getNeighborIds = (id: string): string[] => {
  const connected = new Set<string>();
  edges.forEach(e => {
    if (e.from === id) connected.add(e.to);
    if (e.to === id) connected.add(e.from);
  });
  return [...connected];
};

// Returns neighbor nodes for a given node id
export const getNeighbors = (id: string): GraphNode[] =>
  getNeighborIds(id)
    .map(nid => getNode(nid))
    .filter((n): n is GraphNode => n !== undefined);

// Returns the edge between two nodes if it exists
export const getEdge = (fromId: string, toId: string): GraphEdge | undefined =>
  edges.find(
    e => (e.from === fromId && e.to === toId) ||
         (e.from === toId && e.to === fromId)
  );

// Returns nodes sorted by number of connections (highest first)
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

// Breadth-first search returning exploration path from a starting node
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
      const neighbors = getNeighborIds(current.id)
        .filter(id => !visited.has(id));
      const sortedNeighbors = neighbors
        .map(id => ({ id, strength: getEdge(current.id, id)?.strength_score || 0 }))
        .sort((a, b) => b.strength - a.strength)
        .map(n => n.id);
      sortedNeighbors.forEach(id => queue.push({ id, d: current.d + 1 }));
    }
  }

  return path;
};

// Search nodes by text across title, description, and tags
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

// Validate graph health: orphan nodes, broken edges, duplicate ids
export const validateGraph = () => {
  const nodeIds = new Set(nodes.map(n => n.id));
  const issues: string[] = [];

  const seen = new Set<string>();
  nodes.forEach(n => {
    if (seen.has(n.id)) issues.push(`Duplicate node id: ${n.id}`);
    seen.add(n.id);
  });

  edges.forEach(e => {
    if (!nodeIds.has(e.from)) issues.push(`Edge ${e.id}: unknown from node "${e.from}"`);
    if (!nodeIds.has(e.to)) issues.push(`Edge ${e.id}: unknown to node "${e.to}"`);
  });

  nodes.forEach(n => {
    const neighborCount = getNeighborIds(n.id).length;
    if (neighborCount < 2) issues.push(`Node "${n.id}" has only ${neighborCount} connection(s)`);
  });

  return { valid: issues.length === 0, issues };
};

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  'Ancient Civilizations': '#a16207',
  'Egypt & Ancient Engineering': '#eab308',
  'Religious Texts & Mythology': '#f59e0b',
  'UFO / UAP': '#22c55e',
  'Human Origins': '#10b981',
  'Consciousness & Reality': '#6366f1',
  'Secret Societies & Esoteric': '#1e40af',
  'Global Mysteries': '#7c3aed',
  'Legends & Folklore': '#dc2626',
};
