/**
 * DB-backed graph retrieval.
 *
 * Replaces the O(n) in-memory scans in lib/graph/index.ts for all runtime
 * queries. The static TypeScript files (lib/graph/nodes.ts, edges.ts) remain
 * as the seed source of truth but are no longer imported at request time.
 *
 * Retrieval stack per query:
 *   1. In-process LRU cache (60s TTL)
 *   2. PostgreSQL with indexed queries
 */

import { prisma } from '@/lib/db';
import { nodeCache, viewportCache, invalidateNode } from '@/lib/cache/node-cache';

// ── Types mirroring GraphNode / GraphEdge from lib/graph/types.ts ─────────────
// Re-exported so callers don't need to import from both places.

export type { GraphNode, GraphEdge, EvidenceLevel, RelationshipType } from '@/lib/graph/types';

// ── Prisma include shape used across all node queries ─────────────────────────

const NODE_INCLUDE = {
  category:      true,
  tags:          { orderBy: { tag: 'asc' as const } },
  claims:        { orderBy: { orderIndex: 'asc' as const } },
  criticisms:    { orderBy: { orderIndex: 'asc' as const } },
  openQuestions: { orderBy: { orderIndex: 'asc' as const } },
} as const;

// ── Shape returned by Prisma with NODE_INCLUDE ────────────────────────────────

type DBNode = Awaited<ReturnType<typeof prisma.node.findUnique>> & {
  category: { name: string; color: string | null };
  tags: { tag: string }[];
  claims: { id: string; text: string; orderIndex: number }[];
  criticisms: { id: string; text: string; orderIndex: number }[];
  openQuestions: { id: string; text: string; orderIndex: number }[];
};

// ── Single node lookup ────────────────────────────────────────────────────────

export async function getNodeFromDB(id: string): Promise<DBNode | null> {
  const cached = nodeCache.get(id);
  if (cached) return cached as DBNode;

  const node = await prisma.node.findUnique({
    where:   { id, status: 'published' },
    include: NODE_INCLUDE,
  }) as DBNode | null;

  if (node) nodeCache.set(id, node as object);
  return node;
}

// ── Direct neighbours (O(log n) via Edge indexes) ─────────────────────────────

export async function getNeighboursFromDB(nodeId: string) {
  const edges = await prisma.edge.findMany({
    where: {
      OR: [{ fromId: nodeId }, { toId: nodeId }],
      status: 'published',
    },
    orderBy: { confidenceScore: 'desc' },
  });

  const neighbourIds = edges.map(e => e.fromId === nodeId ? e.toId : e.fromId);
  const [neighbours] = await Promise.all([
    prisma.node.findMany({
      where:   { id: { in: neighbourIds }, status: 'published' },
      include: NODE_INCLUDE,
    }),
  ]);

  return edges.map(edge => {
    const neighbourId = edge.fromId === nodeId ? edge.toId : edge.fromId;
    const neighbour = neighbours.find(n => n.id === neighbourId);
    return neighbour ? { edge, neighbour: neighbour as unknown as DBNode } : null;
  }).filter(Boolean) as { edge: typeof edges[0]; neighbour: DBNode }[];
}

// ── Viewport: top N nodes by degree for initial graph render ──────────────────

export async function getViewportNodes(limit = 150) {
  const cacheKey = `viewport:top:${limit}`;
  const cached = viewportCache.get(cacheKey);
  if (cached) return cached as { nodes: object[]; edges: object[] };

  // Top nodes by edge count (degree)
  const topNodes = await prisma.$queryRaw<
    { id: string; title: string; categoryName: string; color: string | null;
      confidenceScore: number; evidenceLevel: string; icon: string | null; degree: number }[]
  >`
    SELECT
      n."id", n."title", c."name" AS "categoryName", c."color",
      n."confidenceScore", n."evidenceLevel", n."icon",
      COALESCE(ec."degree", 0)::int AS "degree"
    FROM "Node" n
    JOIN "Category" c ON c."id" = n."categoryId"
    LEFT JOIN (
      SELECT unnested."nodeId", COUNT(*)::int AS "degree"
      FROM (
        SELECT "fromId" AS "nodeId" FROM "Edge" WHERE "status" = 'published'
        UNION ALL
        SELECT "toId"   AS "nodeId" FROM "Edge" WHERE "status" = 'published'
      ) unnested
      GROUP BY unnested."nodeId"
    ) ec ON ec."nodeId" = n."id"
    WHERE n."status" = 'published'
    ORDER BY "degree" DESC
    LIMIT ${limit}
  `;

  const nodeIds = topNodes.map(n => n.id);

  const edges = await prisma.edge.findMany({
    where: {
      fromId: { in: nodeIds },
      toId:   { in: nodeIds },
      status: 'published',
    },
    select: {
      id: true, fromId: true, toId: true,
      relationshipType: true, confidenceScore: true, strengthScore: true,
    },
  });

  const result = { nodes: topNodes, edges };
  viewportCache.set(cacheKey, result as object);
  return result;
}

// ── Focused viewport: BFS subgraph around a specific node ────────────────────

export async function getFocusedViewport(nodeId: string, radius = 2) {
  const cacheKey = `viewport:focus:${nodeId}:${radius}`;
  const cached = viewportCache.get(cacheKey);
  if (cached) return cached as { nodes: object[]; edges: object[] };

  // Use the graph_bfs function defined in the migration
  const bfsResults = await prisma.$queryRaw<{ node_id: string }[]>`
    SELECT node_id FROM graph_bfs(${nodeId}, ${radius})
  `;

  const reachableIds = [nodeId, ...bfsResults.map(r => r.node_id)];

  const [nodes, edges] = await Promise.all([
    prisma.node.findMany({
      where:   { id: { in: reachableIds }, status: 'published' },
      include: { category: true, tags: true },
    }),
    prisma.edge.findMany({
      where: {
        fromId: { in: reachableIds },
        toId:   { in: reachableIds },
        status: 'published',
      },
    }),
  ]);

  const result = { nodes, edges };
  viewportCache.set(cacheKey, result as object);
  return result;
}

// ── Category list ─────────────────────────────────────────────────────────────

export async function getAllCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } });
}

// ── Node list by category with cursor pagination ──────────────────────────────

export async function getNodesByCategory(
  categorySlug: string,
  limit = 20,
  cursor?: string,
) {
  const nodes = await prisma.node.findMany({
    where: {
      category: { slug: categorySlug },
      status: 'published',
    },
    include: NODE_INCLUDE,
    orderBy: [{ confidenceScore: 'desc' }, { id: 'asc' }],
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
  });

  const hasNext = nodes.length > limit;
  return {
    nodes: nodes.slice(0, limit) as unknown as DBNode[],
    nextCursor: hasNext ? nodes[limit - 1]?.id : null,
  };
}

// ── Most connected nodes ──────────────────────────────────────────────────────

export async function getMostConnectedNodes(limit = 10) {
  return prisma.$queryRaw<{ id: string; title: string; degree: number }[]>`
    SELECT n."id", n."title", COUNT(e."id")::int AS "degree"
    FROM "Node" n
    JOIN "Edge" e ON (e."fromId" = n."id" OR e."toId" = n."id")
    WHERE n."status" = 'published' AND e."status" = 'published'
    GROUP BY n."id", n."title"
    ORDER BY "degree" DESC
    LIMIT ${limit}
  `;
}

// ── Research score (same formula as static version) ──────────────────────────

const EVIDENCE_SCORES: Record<string, number> = {
  verified:        1.0,
  strong_evidence: 0.8,
  debated:         0.5,
  speculative:     0.25,
  mythological:    0.1,
};

export async function computeResearchScoreFromDB(nodeId: string): Promise<number> {
  const node = await getNodeFromDB(nodeId);
  if (!node) return 0;

  const evidenceScore  = EVIDENCE_SCORES[node.evidenceLevel] ?? 0.5;
  const confidenceScore = node.confidenceScore;

  const [sourceData, edgeData] = await Promise.all([
    prisma.sourceLink.findMany({
      where: { nodeId, source: { status: 'approved' } },
      include: { source: { select: { credibilityScore: true } } },
    }),
    prisma.edge.findMany({
      where: { OR: [{ fromId: nodeId }, { toId: nodeId }], status: 'published' },
      select: { confidenceScore: true },
    }),
  ]);

  const sources = sourceData.map(sl => sl.source!);
  const sourceQuality = sources.length === 0
    ? 0
    : sources.reduce((s, src) => s + src.credibilityScore, 0) / sources.length;
  const sourceScore = Math.min(1, sources.length / 5) * (sources.length > 0 ? sourceQuality : 0);

  const degree = edgeData.length;
  const avgEdgeConf = degree === 0
    ? 0
    : edgeData.reduce((s, e) => s + e.confidenceScore, 0) / degree;
  const connectionScore = Math.min(1, degree / 8) * avgEdgeConf;

  return Math.round(
    (evidenceScore * 0.3 + confidenceScore * 0.3 + sourceScore * 0.2 + connectionScore * 0.2) * 100,
  );
}

// ── Write helpers ─────────────────────────────────────────────────────────────

/** Publish a node: set status, bump version, write NodeVersion snapshot. */
export async function publishNode(
  nodeId: string,
  changedBy?: string,
  changeNote?: string,
) {
  const current = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });

  const [updated] = await Promise.all([
    prisma.node.update({
      where: { id: nodeId },
      data:  { status: 'published', publishedAt: new Date() },
    }),
    prisma.nodeVersion.create({
      data: {
        nodeId,
        version:    current.version,
        snapshot:   current as object,
        changedBy,
        changeNote,
      },
    }),
  ]);

  invalidateNode(nodeId);
  return updated;
}
