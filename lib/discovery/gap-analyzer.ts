/**
 * Graph-gap analyzer — computes what the live graph structurally NEEDS and
 * turns it into targeted discovery seeds, so autonomous growth heals the
 * topology (orphans, thin clusters, missing bridges) instead of only adding
 * random bulk.
 *
 * Healing mechanism: node-engine attaches a discovered node to existing nodes
 * whose titles match words of the seed query (relatedNodeIds → thematic edge
 * on promotion). A seed built from an under-connected node's title therefore
 * makes whatever gets discovered link BACK to that node, raising its degree.
 */

import { prisma } from '@/lib/db';

export interface GapNode {
  id:       string;
  title:    string;
  degree:   number;
  tags:     string[];
  category: string | null;
}

export interface GapReport {
  totalNodes:      number;
  totalEdges:      number;
  orphans:         number; // degree 0
  nearOrphans:     number; // degree 1–2
  weakCategoryPairs: { a: string; b: string }[];
}

export interface GapAnalysis {
  seeds:  string[];
  report: GapReport;
}

// ── Pure helpers (unit-tested) ────────────────────────────────────────────────

export function computeDegrees(
  nodeIds: string[],
  edges: { fromId: string; toId: string }[],
): Map<string, number> {
  const deg = new Map<string, number>(nodeIds.map(id => [id, 0]));
  for (const e of edges) {
    if (deg.has(e.fromId)) deg.set(e.fromId, (deg.get(e.fromId) ?? 0) + 1);
    if (deg.has(e.toId))   deg.set(e.toId,   (deg.get(e.toId) ?? 0) + 1);
  }
  return deg;
}

/**
 * Seed for an under-connected node: its title plus a couple of tags for
 * search breadth. The title words are what make the discovered node link back.
 */
export function gapNodeToSeed(node: { title: string; tags: string[] }): string {
  const extra = node.tags.slice(0, 2).join(' ');
  return `${node.title} ${extra}`.replace(/\s+/g, ' ').trim().slice(0, 90);
}

/** Seed aimed at bridging two categories that share no edges. */
export function categoryPairToSeed(
  aTopNode: string, bTopNode: string,
): string {
  return `${aTopNode} ${bTopNode}`.replace(/\s+/g, ' ').trim().slice(0, 90);
}

// ── Analyzer ──────────────────────────────────────────────────────────────────

const NEAR_ORPHAN_MAX_DEGREE = 2;
const MIN_NODES_PER_CATEGORY = 3; // category must be substantial to be worth bridging
const MAX_WEAK_PAIRS         = 2; // bridge seeds are speculative — keep them rare

export async function analyzeGraphGaps(maxSeeds = 8): Promise<GapAnalysis> {
  const [nodes, edges] = await Promise.all([
    prisma.node.findMany({
      where:  { status: 'published' },
      select: {
        id: true, title: true, categoryId: true,
        tags: { select: { tag: true }, take: 3 },
      },
    }),
    prisma.edge.findMany({
      where:  { status: 'published' },
      select: { fromId: true, toId: true },
    }),
  ]);

  const degrees = computeDegrees(nodes.map(n => n.id), edges);

  const enriched: GapNode[] = nodes.map(n => ({
    id:       n.id,
    title:    n.title,
    degree:   degrees.get(n.id) ?? 0,
    tags:     n.tags.map(t => t.tag),
    category: n.categoryId,
  }));

  const orphans     = enriched.filter(n => n.degree === 0);
  const nearOrphans = enriched.filter(n => n.degree >= 1 && n.degree <= NEAR_ORPHAN_MAX_DEGREE);

  // Weakly-linked category pairs: both substantial, zero edges between them.
  const nodesByCategory = new Map<string, GapNode[]>();
  for (const n of enriched) {
    if (!n.category) continue;
    const list = nodesByCategory.get(n.category) ?? [];
    list.push(n);
    nodesByCategory.set(n.category, list);
  }
  const catOf = new Map(enriched.map(n => [n.id, n.category]));
  const interEdges = new Set<string>();
  for (const e of edges) {
    const a = catOf.get(e.fromId), b = catOf.get(e.toId);
    if (a && b && a !== b) interEdges.add([a, b].sort().join('|'));
  }
  const bigCats = [...nodesByCategory.entries()].filter(([, list]) => list.length >= MIN_NODES_PER_CATEGORY);
  const weakPairs: { a: string; b: string; seed: string }[] = [];
  for (let i = 0; i < bigCats.length && weakPairs.length < MAX_WEAK_PAIRS; i++) {
    for (let j = i + 1; j < bigCats.length && weakPairs.length < MAX_WEAK_PAIRS; j++) {
      const [catA, listA] = bigCats[i];
      const [catB, listB] = bigCats[j];
      if (interEdges.has([catA, catB].sort().join('|'))) continue;
      const topA = [...listA].sort((x, y) => y.degree - x.degree)[0];
      const topB = [...listB].sort((x, y) => y.degree - x.degree)[0];
      weakPairs.push({ a: catA, b: catB, seed: categoryPairToSeed(topA.title, topB.title) });
    }
  }

  // Priority: orphans first (worst gaps), then near-orphans (least-connected
  // first), then bridge seeds.
  const seeds: string[] = [];
  const push = (s: string) => { if (seeds.length < maxSeeds && !seeds.includes(s)) seeds.push(s); };
  for (const n of orphans) push(gapNodeToSeed(n));
  for (const n of [...nearOrphans].sort((a, b) => a.degree - b.degree)) push(gapNodeToSeed(n));
  for (const p of weakPairs) push(p.seed);

  return {
    seeds,
    report: {
      totalNodes:  nodes.length,
      totalEdges:  edges.length,
      orphans:     orphans.length,
      nearOrphans: nearOrphans.length,
      weakCategoryPairs: weakPairs.map(({ a, b }) => ({ a, b })),
    },
  };
}
