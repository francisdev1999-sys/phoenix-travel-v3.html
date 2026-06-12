/**
 * Research Maturity Score — measures how thoroughly a node, cluster, galaxy,
 * or the whole archive has been researched.
 *
 * Score 0–100 based on:
 *  - Source count & diversity (30%)
 *  - Claims + criticisms (25%)
 *  - Open questions present (10%)
 *  - Mainstream view documented (10%)
 *  - Edge / relationship count (15%)
 *  - Average edge confidence (10%)
 */

import { prisma } from '@/lib/db';

function clamp(v: number, lo = 0, hi = 1): number { return Math.max(lo, Math.min(hi, v)); }

async function scoreNode(nodeId: string): Promise<number> {
  const [node, sourceLinks, claims, criticisms, openQs, edges, approved] = await Promise.all([
    prisma.node.findUnique({
      where:  { id: nodeId },
      select: { mainstreamView: true },
    }),
    prisma.sourceLink.count({ where: { targetId: nodeId, source: { status: 'approved' } } }),
    prisma.claim.count({ where: { nodeId } }),
    prisma.criticism.count({ where: { nodeId } }),
    prisma.openQuestion.count({ where: { nodeId } }),
    prisma.edge.findMany({
      where:  { OR: [{ fromId: nodeId }, { toId: nodeId }], status: 'published' },
      select: { confidenceScore: true },
    }),
    prisma.discoveredSource.count({ where: { nodeId, status: { in: ['auto_approved', 'approved'] } } }),
  ]);

  if (!node) return 0;

  const totalSources = sourceLinks + approved;
  const srcScore     = clamp(totalSources / 8);                       // saturates at 8 sources

  // Source diversity: unique approved domains / total sources
  const domainRows = await prisma.discoveredSource.findMany({
    where:  { nodeId, status: { in: ['auto_approved', 'approved'] } },
    select: { domain: true },
  });
  const uniqueDomains  = new Set(domainRows.map(r => r.domain)).size;
  const srcDiversity   = totalSources > 0 ? clamp(uniqueDomains / totalSources) : 0;
  const srcFinalScore  = srcScore * 0.6 + srcDiversity * 0.4;

  const claimScore     = clamp(claims / 5);                           // saturates at 5
  const criticismScore = clamp(criticisms / 3);                       // saturates at 3
  const oqScore        = openQs > 0 ? 1.0 : 0.0;
  const msViewScore    = node.mainstreamView && node.mainstreamView.length > 50 ? 1.0 : 0.0;
  const edgeDensity    = clamp(edges.length / 6);                     // saturates at 6 edges
  const avgConf        = edges.length > 0
    ? edges.reduce((s, e) => s + e.confidenceScore, 0) / edges.length
    : 0;
  const edgeScore      = edgeDensity * 0.6 + avgConf * 0.4;

  return Math.round(
    (srcFinalScore   * 0.30 +
     claimScore      * 0.15 +
     criticismScore  * 0.10 +
     oqScore         * 0.10 +
     msViewScore     * 0.10 +
     edgeScore       * 0.15 +
     avgConf         * 0.10) * 100
  );
}

export async function recalculateNodeMaturity(nodeId: string): Promise<void> {
  const score = await scoreNode(nodeId);

  const [sourceLinks, claims, criticisms, openQs, approved, edges] = await Promise.all([
    prisma.sourceLink.count({ where: { targetId: nodeId, source: { status: 'approved' } } }),
    prisma.claim.count({ where: { nodeId } }),
    prisma.criticism.count({ where: { nodeId } }),
    prisma.openQuestion.count({ where: { nodeId } }),
    prisma.discoveredSource.count({ where: { nodeId, status: { in: ['auto_approved', 'approved'] } } }),
    prisma.edge.count({ where: { OR: [{ fromId: nodeId }, { toId: nodeId }], status: 'published' } }),
  ]);
  const node = await prisma.node.findUnique({ where: { id: nodeId }, select: { mainstreamView: true } });
  const domainRows = await prisma.discoveredSource.findMany({
    where: { nodeId, status: { in: ['auto_approved', 'approved'] } }, select: { domain: true },
  });
  const uniqueDomains = new Set(domainRows.map(r => r.domain)).size;
  const totalSources  = sourceLinks + approved;

  await prisma.researchMaturityScore.upsert({
    where:  { entityType_entityId: { entityType: 'node', entityId: nodeId } },
    create: {
      entityType: 'node', entityId: nodeId, score,
      sourceCount: totalSources, sourceDiversity: totalSources > 0 ? uniqueDomains / totalSources : 0,
      claimCount: claims, criticismCount: criticisms, openQuestions: openQs,
      hasMainstream: !!(node?.mainstreamView && node.mainstreamView.length > 50),
      edgeCount: edges,
    },
    update: {
      score, sourceCount: totalSources,
      sourceDiversity: totalSources > 0 ? uniqueDomains / totalSources : 0,
      claimCount: claims, criticismCount: criticisms, openQuestions: openQs,
      hasMainstream: !!(node?.mainstreamView && node.mainstreamView.length > 50),
      edgeCount: edges, calculatedAt: new Date(),
    },
  });
}

export async function recalculateAllMaturity(limit = 200): Promise<number> {
  const nodes = await prisma.node.findMany({
    where:   { status: 'published' },
    select:  { id: true },
    take:    limit,
    orderBy: { publishedAt: 'desc' },
  });

  let updated = 0;
  const CHUNK = 10;
  for (let i = 0; i < nodes.length; i += CHUNK) {
    await Promise.all(nodes.slice(i, i + CHUNK).map(n => recalculateNodeMaturity(n.id)));
    updated += Math.min(CHUNK, nodes.length - i);
  }
  return updated;
}

export async function getMaturityStats() {
  const all = await prisma.researchMaturityScore.findMany({
    where:   { entityType: 'node' },
    select:  { score: true, entityId: true },
    orderBy: { score: 'desc' },
  });

  const total = all.length;
  if (total === 0) return { total: 0, avg: 0, high: 0, medium: 0, low: 0, top5: [] };

  const avg    = Math.round(all.reduce((s, r) => s + r.score, 0) / total);
  const high   = all.filter(r => r.score >= 67).length;
  const medium = all.filter(r => r.score >= 34 && r.score < 67).length;
  const low    = all.filter(r => r.score < 34).length;

  const top5nodeIds = all.slice(0, 5).map(r => r.entityId);
  const top5nodes   = await prisma.node.findMany({
    where:  { id: { in: top5nodeIds } },
    select: { id: true, title: true },
  });
  const top5 = all.slice(0, 5).map(r => ({
    nodeId: r.entityId,
    score:  r.score,
    title:  top5nodes.find(n => n.id === r.entityId)?.title ?? r.entityId,
  }));

  return { total, avg, high, medium, low, top5 };
}
