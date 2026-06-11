import type { GraphNode, GraphEdge, EvidenceLevel, RelationshipType } from './graph/types';

// ── Scoring weights ─────────────────────────────────────────────────────────

export const EVIDENCE_WEIGHTS: Record<EvidenceLevel, number> = {
  verified:        1.00,
  strong_evidence: 0.85,
  debated:         0.65,
  speculative:     0.40,
  mythological:    0.25,
};

export const RELATIONSHIP_WEIGHTS: Record<RelationshipType, number> = {
  historical:              1.00,
  textual:                 0.90,
  geographical:            0.80,
  influence:               0.75,
  thematic:                0.60,
  contradictory:           0.50,
  alternative_explanation: 0.55,
  criticism:               0.50,
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  historical:              'Historical',
  textual:                 'Textual',
  geographical:            'Geographic',
  influence:               'Influence',
  thematic:                'Thematic',
  contradictory:           'Contradicts',
  alternative_explanation: 'Alternative Explanation',
  criticism:               'Criticism',
};

export const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  historical:              '#f59e0b',
  textual:                 '#6366f1',
  geographical:            '#22c55e',
  influence:               '#06b6d4',
  thematic:                '#a855f7',
  contradictory:           '#ef4444',
  alternative_explanation: '#f97316',
  criticism:               '#fb7185',
};

// ── Types ────────────────────────────────────────────────────────────────────

export interface RHScoreBreakdown {
  confidence:       number;  // edge.confidence_score × 0.35
  evidenceQuality:  number;  // avg evidence level weight × 0.30
  edgeStrength:     number;  // edge.strength_score × 0.20
  relationshipType: number;  // relationship weight × 0.15
  total:            number;
}

export interface RHConnection {
  node:           GraphNode;
  edge:           GraphEdge;
  score:          number;
  breakdown:      RHScoreBreakdown;
  direction:      'outgoing' | 'incoming';
}

export interface RHPathStep {
  node: GraphNode;
  edge: GraphEdge;
}

export interface RHPath {
  steps:      RHPathStep[];
  totalScore: number;
  label:      string;  // "NodeA → NodeB → NodeC"
}

export interface RHLocation {
  node:        GraphNode;
  coordinates: [number, number];
  hops:        number;
}

export interface RHTimeline {
  node:      GraphNode;
  dateStart: number | null;
  dateEnd:   number | null;
  year:      number | null;
}

export interface RabbitHoleData {
  node:        GraphNode;
  connections: RHConnection[];
  locations:   RHLocation[];
  timelines:   RHTimeline[];
  paths:       RHPath[];
}

// ── Core algorithm ───────────────────────────────────────────────────────────

function scoreConnection(
  edge: GraphEdge,
  fromNode: GraphNode,
  toNode: GraphNode,
): RHScoreBreakdown {
  const evWeight = (EVIDENCE_WEIGHTS[fromNode.evidence_level] + EVIDENCE_WEIGHTS[toNode.evidence_level]) / 2;
  const relWeight = RELATIONSHIP_WEIGHTS[edge.relationship_type];

  const confidence       = edge.confidence_score * 0.35;
  const evidenceQuality  = evWeight              * 0.30;
  const edgeStrength     = edge.strength_score   * 0.20;
  const relationshipType = relWeight             * 0.15;

  return {
    confidence,
    evidenceQuality,
    edgeStrength,
    relationshipType,
    total: Math.round((confidence + evidenceQuality + edgeStrength + relationshipType) * 100) / 100,
  };
}

export function computeRabbitHole(
  nodeId:   string,
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
): RabbitHoleData | null {
  const node = allNodes.find(n => n.id === nodeId);
  if (!node) return null;

  const nodeById = new Map(allNodes.map(n => [n.id, n]));

  // ── Direct connections ────────────────────────────────────────────────────
  const directEdges = allEdges.filter(e => e.from === nodeId || e.to === nodeId);

  const connections: RHConnection[] = directEdges
    .map(edge => {
      const otherId   = edge.from === nodeId ? edge.to : edge.from;
      const otherNode = nodeById.get(otherId);
      if (!otherNode) return null;
      const breakdown = scoreConnection(edge, node, otherNode);
      return {
        node:      otherNode,
        edge,
        score:     breakdown.total,
        breakdown,
        direction: (edge.from === nodeId ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
      };
    })
    .filter(Boolean) as RHConnection[];

  connections.sort((a, b) => b.score - a.score);

  // ── Locations (depth 1 + 2) ───────────────────────────────────────────────
  const locationsMap = new Map<string, RHLocation>();

  const addLocation = (n: GraphNode, hops: number) => {
    if (!n.coordinates || locationsMap.has(n.id)) return;
    locationsMap.set(n.id, {
      node:        n,
      coordinates: n.coordinates,
      hops,
    });
  };

  connections.forEach(c => {
    addLocation(c.node, 1);
    // depth-2
    allEdges
      .filter(e => (e.from === c.node.id || e.to === c.node.id) && e.from !== nodeId && e.to !== nodeId)
      .forEach(e2 => {
        const d2Id = e2.from === c.node.id ? e2.to : e2.from;
        const d2   = nodeById.get(d2Id);
        if (d2) addLocation(d2, 2);
      });
  });

  const locations = [...locationsMap.values()].sort((a, b) =>
    a.hops !== b.hops ? a.hops - b.hops : b.node.confidence_score - a.node.confidence_score,
  );

  // ── Timelines ─────────────────────────────────────────────────────────────
  const timelineSet = new Set<string>();
  const timelines: RHTimeline[] = [];

  const addTimeline = (n: GraphNode) => {
    if (timelineSet.has(n.id)) return;
    const dateStart = n.date_start ?? null;
    const dateEnd   = n.date_end   ?? null;
    const year      = n.year       ?? null;
    if (dateStart == null && dateEnd == null && year == null) return;
    timelineSet.add(n.id);
    timelines.push({ node: n, dateStart, dateEnd, year });
  };

  addTimeline(node);
  connections.forEach(c => addTimeline(c.node));

  timelines.sort((a, b) => {
    const aY = a.dateStart ?? a.year ?? 0;
    const bY = b.dateStart ?? b.year ?? 0;
    return aY - bY;
  });

  // ── Multi-hop path suggestions ────────────────────────────────────────────
  const paths: RHPath[] = [];
  const seen = new Set<string>();

  connections.slice(0, 10).forEach(c1 => {
    const depth2Edges = allEdges.filter(e =>
      (e.from === c1.node.id || e.to === c1.node.id) &&
      e.from !== nodeId &&
      e.to   !== nodeId,
    );

    depth2Edges.forEach(e2 => {
      const c2Id   = e2.from === c1.node.id ? e2.to : e2.from;
      const c2Node = nodeById.get(c2Id);
      if (!c2Node || c2Node.id === nodeId) return;

      const pathKey = `${c1.node.id}→${c2Node.id}`;
      if (seen.has(pathKey)) return;
      seen.add(pathKey);

      const step2Score = scoreConnection(e2, c1.node, c2Node);
      const totalScore = Math.round((c1.score * 0.6 + step2Score.total * 0.4) * 100) / 100;

      paths.push({
        steps:      [{ node: c1.node, edge: c1.edge }, { node: c2Node, edge: e2 }],
        totalScore,
        label:      `${node.title} → ${c1.node.title} → ${c2Node.title}`,
      });
    });
  });

  paths.sort((a, b) => b.totalScore - a.totalScore);

  return {
    node,
    connections,
    locations,
    timelines,
    paths: paths.slice(0, 8),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatYear(y: number): string {
  if (y === 0) return '1 CE';
  return y < 0 ? `${Math.abs(y).toLocaleString()} BCE` : `${y.toLocaleString()} CE`;
}

export function scoreTier(score: number): 'high' | 'medium' | 'low' {
  return score >= 0.65 ? 'high' : score >= 0.45 ? 'medium' : 'low';
}

export const TIER_COLORS = { high: '#22c55e', medium: '#eab308', low: '#94a3b8' };
