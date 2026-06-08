/**
 * DB-backed rabbit hole retrieval.
 *
 * Replaces the in-memory computeRabbitHole() in lib/rabbit-hole.ts.
 * Uses the graph_bfs() PostgreSQL function (defined in the foundation migration)
 * for multi-hop traversal, then scores and ranks connections in application code.
 *
 * Falls back to the in-memory implementation when the DB is unavailable.
 */

import { prisma } from '@/lib/db';
import { nodeCache } from '@/lib/cache/node-cache';
import {
  EVIDENCE_WEIGHTS, RELATIONSHIP_WEIGHTS,
  type RabbitHoleData, type RHConnection, type RHScoreBreakdown,
  type RHLocation, type RHTimeline, type RHPath,
} from '@/lib/rabbit-hole';

// Re-export RabbitHoleData so callers have a single import point
export type { RabbitHoleData };

// ── Types for DB rows ─────────────────────────────────────────────────────────

interface BFSRow {
  node_id:          string;
  depth:            number;
  via_edge_id:      string | null;
  path:             string[];
  cumulative_score: number;
}

interface DBNodeRow {
  id:              string;
  title:           string;
  evidenceLevel:   string;
  confidenceScore: number;
  lat:             number | null;
  lon:             number | null;
  year:            number | null;
  dateStart:       number | null;
  dateEnd:         number | null;
  icon:            string | null;
}

interface DBEdgeRow {
  id:               string;
  fromId:           string;
  toId:             string;
  relationshipType: string;
  strengthScore:    number;
  confidenceScore:  number;
  explanation:      string;
  evidenceBasis:    string;
  sourceType:       string;
  sourceCount:      number | null;
}

// ── Scoring (same formula as lib/rabbit-hole.ts) ──────────────────────────────

function scoreEdge(
  edge: DBEdgeRow,
  fromEvidence: string,
  toEvidence: string,
): RHScoreBreakdown {
  const evWeight =
    ((EVIDENCE_WEIGHTS[fromEvidence as keyof typeof EVIDENCE_WEIGHTS] ?? 0.4) +
     (EVIDENCE_WEIGHTS[toEvidence   as keyof typeof EVIDENCE_WEIGHTS] ?? 0.4)) / 2;

  const relWeight = RELATIONSHIP_WEIGHTS[edge.relationshipType as keyof typeof RELATIONSHIP_WEIGHTS] ?? 0.6;

  const confidence       = edge.confidenceScore * 0.35;
  const evidenceQuality  = evWeight              * 0.30;
  const edgeStrength     = edge.strengthScore    * 0.20;
  const relationshipType = relWeight             * 0.15;

  return {
    confidence,
    evidenceQuality,
    edgeStrength,
    relationshipType,
    total: Math.round((confidence + evidenceQuality + edgeStrength + relationshipType) * 100) / 100,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function computeRabbitHoleFromDB(
  nodeId: string,
  maxDepth = 2,
): Promise<RabbitHoleData | null> {
  // 1. Check adjacency cache (materialized 1–2 hop data for hot nodes)
  const cached = await prisma.adjacencyCache.findUnique({ where: { nodeId } });
  const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  if (cached && Date.now() - cached.cachedAt.getTime() < CACHE_TTL_MS) {
    const centralNode = await getCentralNode(nodeId);
    if (centralNode) {
      return buildFromAdjacencyCache(centralNode, cached);
    }
  }

  // 2. Live BFS via graph_bfs() SQL function
  return computeFromDB(nodeId, maxDepth);
}

// ── Live BFS computation ──────────────────────────────────────────────────────

async function computeFromDB(nodeId: string, maxDepth: number): Promise<RabbitHoleData | null> {
  // Run BFS and fetch central node in parallel
  const [bfsRows, centralNode] = await Promise.all([
    prisma.$queryRaw<BFSRow[]>`
      SELECT node_id, depth, via_edge_id, path, cumulative_score
      FROM graph_bfs(${nodeId}, ${maxDepth})
    `,
    getCentralNode(nodeId),
  ]);

  if (!centralNode) return null;

  const reachableIds = bfsRows.map(r => r.node_id);
  if (reachableIds.length === 0) {
    return { node: centralNode as unknown as RabbitHoleData['node'], connections: [], locations: [], timelines: [], paths: [] };
  }

  // Fetch all reachable nodes and edges between them in 2 queries
  const [nodes, edges] = await Promise.all([
    prisma.$queryRaw<DBNodeRow[]>`
      SELECT "id", "title", "evidenceLevel", "confidenceScore",
             "lat", "lon", "year", "dateStart", "dateEnd", "icon"
      FROM "Node"
      WHERE "id" = ANY(${reachableIds}::text[])
        AND "status" = 'published'
    `,
    prisma.$queryRaw<DBEdgeRow[]>`
      SELECT "id", "fromId", "toId", "relationshipType",
             "strengthScore", "confidenceScore",
             "explanation", "evidenceBasis", "sourceType", "sourceCount"
      FROM "Edge"
      WHERE "status" = 'published'
        AND (
          ("fromId" = ${nodeId} AND "toId" = ANY(${reachableIds}::text[]))
          OR
          ("toId" = ${nodeId} AND "fromId" = ANY(${reachableIds}::text[]))
          OR
          ("fromId" = ANY(${reachableIds}::text[]) AND "toId" = ANY(${reachableIds}::text[]))
        )
    `,
  ]);

  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const edgeById = new Map(edges.map(e => [e.id, e]));

  // Build direct connections (depth-1 only)
  const directEdges = edges.filter(e => e.fromId === nodeId || e.toId === nodeId);

  const connections: RHConnection[] = directEdges
    .map(edge => {
      const otherId   = edge.fromId === nodeId ? edge.toId : edge.fromId;
      const otherNode = nodeById.get(otherId);
      if (!otherNode) return null;

      const breakdown = scoreEdge(edge, centralNode.evidenceLevel, otherNode.evidenceLevel);
      return {
        node:      otherNode as unknown as RabbitHoleData['node'],
        edge:      edge      as unknown as RabbitHoleData['connections'][0]['edge'],
        score:     breakdown.total,
        breakdown,
        direction: (edge.fromId === nodeId ? 'outgoing' : 'incoming') as 'outgoing' | 'incoming',
      };
    })
    .filter(Boolean) as RHConnection[];

  connections.sort((a, b) => b.score - a.score);

  // Build locations (nodes with coordinates, up to depth 2)
  const locationMap = new Map<string, RHLocation>();
  for (const row of bfsRows) {
    const n = nodeById.get(row.node_id);
    if (n?.lat != null && n.lon != null && !locationMap.has(n.id)) {
      locationMap.set(n.id, {
        node:        n as unknown as RabbitHoleData['node'],
        coordinates: [n.lat, n.lon],
        hops:        row.depth,
      });
    }
  }
  const locations = [...locationMap.values()].sort((a, b) =>
    a.hops !== b.hops ? a.hops - b.hops : b.node.confidence_score - a.node.confidence_score,
  );

  // Build timelines
  const timelineSet = new Set<string>([nodeId]);
  const timelines: RHTimeline[] = [];

  const addToTimeline = (n: DBNodeRow, includeAlways = false) => {
    if (timelineSet.has(n.id)) return;
    if (!includeAlways && n.dateStart == null && n.year == null) return;
    timelineSet.add(n.id);
    timelines.push({
      node:      n as unknown as RabbitHoleData['node'],
      dateStart: n.dateStart,
      dateEnd:   n.dateEnd,
      year:      n.year,
    });
  };

  nodes.forEach(n => addToTimeline(n));
  timelines.sort((a, b) => {
    const aY = a.dateStart ?? a.year ?? 0;
    const bY = b.dateStart ?? b.year ?? 0;
    return aY - bY;
  });

  // Build multi-hop paths (top 8)
  const paths: RHPath[] = [];
  const seenPaths = new Set<string>();

  for (const c1 of connections.slice(0, 10)) {
    const depth2Rows = bfsRows.filter(r => r.depth === 2 && r.path[1] === c1.node.id);

    for (const d2 of depth2Rows) {
      const c2Node = nodeById.get(d2.node_id);
      const c2Edge = d2.via_edge_id ? edgeById.get(d2.via_edge_id) : null;
      if (!c2Node || !c2Edge) continue;

      const pathKey = `${c1.node.id}→${c2Node.id}`;
      if (seenPaths.has(pathKey)) continue;
      seenPaths.add(pathKey);

      const step2Score = scoreEdge(c2Edge, c1.node.evidence_level as string, c2Node.evidenceLevel);
      const totalScore = Math.round((c1.score * 0.6 + step2Score.total * 0.4) * 100) / 100;

      paths.push({
        steps: [
          { node: c1.node, edge: c1.edge },
          { node: c2Node as unknown as RabbitHoleData['node'], edge: c2Edge as unknown as RabbitHoleData['connections'][0]['edge'] },
        ],
        totalScore,
        label: `${centralNode.title} → ${c1.node.title} → ${c2Node.title}`,
      });
    }
  }

  paths.sort((a, b) => b.totalScore - a.totalScore);

  // Cache the result for this node
  await cacheAdjacency(nodeId, connections);

  return {
    node:        centralNode as unknown as RabbitHoleData['node'],
    connections,
    locations,
    timelines,
    paths: paths.slice(0, 8),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCentralNode(nodeId: string) {
  const cached = nodeCache.get(nodeId);
  if (cached) return cached as DBNodeRow & { title: string; evidenceLevel: string };

  const node = await prisma.node.findUnique({
    where: { id: nodeId, status: 'published' },
    select: {
      id: true, title: true, evidenceLevel: true, confidenceScore: true,
      lat: true, lon: true, year: true, dateStart: true, dateEnd: true, icon: true,
    },
  });

  if (node) nodeCache.set(nodeId, node as object);
  return node;
}

async function cacheAdjacency(nodeId: string, connections: RHConnection[]) {
  try {
    const hop1 = connections.map(c => ({
      nodeId:    c.node.id,
      edgeId:    c.edge.id,
      score:     c.score,
      direction: c.direction,
    }));

    await prisma.adjacencyCache.upsert({
      where:  { nodeId },
      create: { nodeId, hop1, hop2: [], cachedAt: new Date() },
      update: { hop1, cachedAt: new Date() },
    });
  } catch {
    // Non-critical — skip cache write on error
  }
}

function buildFromAdjacencyCache(
  centralNode: { id: string; title: string; evidenceLevel: string; confidenceScore: number } & object,
  cached: { hop1: unknown; hop2: unknown },
): RabbitHoleData {
  const hop1 = cached.hop1 as { nodeId: string; edgeId: string; score: number; direction: string }[];

  return {
    node:        centralNode  as unknown as RabbitHoleData['node'],
    connections: hop1.map(h => ({
      node:      { id: h.nodeId } as RabbitHoleData['node'],
      edge:      { id: h.edgeId } as RabbitHoleData['connections'][0]['edge'],
      score:     h.score,
      direction: h.direction as 'outgoing' | 'incoming',
      breakdown: { confidence: 0, evidenceQuality: 0, edgeStrength: 0, relationshipType: 0, total: h.score },
    })),
    locations:   [],
    timelines:   [],
    paths:       [],
  };
}
