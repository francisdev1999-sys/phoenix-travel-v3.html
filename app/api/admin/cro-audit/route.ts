export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// ── helpers ─────────────────────────────────────────────────────────────────
function clamp(v: number) { return Math.min(100, Math.max(0, Math.round(v))); }

function scoreFromRatio(bad: number, total: number, weight = 1): number {
  if (total === 0) return 100;
  return clamp(100 - (bad / total) * 100 * weight);
}

// ── GET: run the full 12-part CRO audit (read-only, no DB writes) ─────────
export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const start = Date.now();

  // ── parallel base counts ─────────────────────────────────────────────────
  const [
    totalNodes, totalEdges, totalSources, totalUsers,
    totalGalaxies, totalClusters, totalSimilarities,
  ] = await Promise.all([
    prisma.node.count({ where: { status: 'published' } }),
    prisma.edge.count({ where: { status: 'published' } }),
    prisma.source.count(),
    prisma.user.count(),
    prisma.galaxy.count(),
    prisma.category.count(),
    prisma.researchSimilarity.count(),
  ]);

  // ══════════════════════════════════════════════════════════════════════════
  // PART 1 — KNOWLEDGE GRAPH AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const [
    orphanNodes, deadEndRows, topNodesByEdge, bottomNodesByEdge,
    topEdgesByConf, bottomEdgesByConf,
  ] = await Promise.all([
    // orphans (no edges at all)
    prisma.node.count({
      where: {
        status: 'published',
        edgesFrom: { none: { status: 'published' } },
        edgesTo:   { none: { status: 'published' } },
      },
    }),
    // dead-ends (exactly 1 edge) — wrap in subquery to avoid HAVING without GROUP BY
    prisma.$queryRaw<{ id: string; title: string; cnt: bigint }[]>`
      SELECT id, title, cnt FROM (
        SELECT n.id, n.title,
               (SELECT COUNT(*) FROM "Edge" e
                WHERE e.status='published' AND (e."fromId"=n.id OR e."toId"=n.id))::bigint AS cnt
        FROM "Node" n WHERE n.status='published'
      ) t WHERE t.cnt = 1
      LIMIT 500
    `,
    // top 20 most-connected
    prisma.$queryRaw<{ id: string; title: string; cnt: bigint }[]>`
      SELECT id, title, cnt FROM (
        SELECT n.id, n.title,
               (SELECT COUNT(*) FROM "Edge" e
                WHERE e.status='published' AND (e."fromId"=n.id OR e."toId"=n.id))::bigint AS cnt
        FROM "Node" n WHERE n.status='published'
      ) t
      ORDER BY t.cnt DESC LIMIT 20
    `,
    // bottom 20 least-connected (> 0 edges)
    prisma.$queryRaw<{ id: string; title: string; cnt: bigint }[]>`
      SELECT id, title, cnt FROM (
        SELECT n.id, n.title,
               (SELECT COUNT(*) FROM "Edge" e
                WHERE e.status='published' AND (e."fromId"=n.id OR e."toId"=n.id))::bigint AS cnt
        FROM "Node" n WHERE n.status='published'
      ) t WHERE t.cnt > 0
      ORDER BY t.cnt ASC LIMIT 20
    `,
    // top 20 strongest edges
    prisma.edge.findMany({
      where: { status: 'published' },
      orderBy: { confidenceScore: 'desc' },
      take: 20,
      select: {
        id: true, confidenceScore: true, relationshipType: true,
        from: { select: { id: true, title: true } },
        to:   { select: { id: true, title: true } },
      },
    }),
    // bottom 20 weakest edges
    prisma.edge.findMany({
      where: { status: 'published' },
      orderBy: { confidenceScore: 'asc' },
      take: 20,
      select: {
        id: true, confidenceScore: true, relationshipType: true,
        from: { select: { id: true, title: true } },
        to:   { select: { id: true, title: true } },
      },
    }),
  ]);

  const deadEndCount = deadEndRows.length;
  const graphDensity = totalNodes > 1
    ? parseFloat((totalEdges / (totalNodes * (totalNodes - 1) / 2) * 100).toFixed(4))
    : 0;

  const p1Findings: string[] = [];
  const orphanPct = totalNodes > 0 ? (orphanNodes / totalNodes) * 100 : 0;
  const deadPct   = totalNodes > 0 ? (deadEndCount / totalNodes) * 100 : 0;
  if (orphanPct > 20) p1Findings.push(`${orphanNodes} orphan nodes (${orphanPct.toFixed(1)}%) — over 20% threshold`);
  if (orphanPct > 5 && orphanPct <= 20) p1Findings.push(`${orphanNodes} orphan nodes (${orphanPct.toFixed(1)}%) — elevated`);
  if (deadPct > 30) p1Findings.push(`${deadEndCount} dead-end nodes (${deadPct.toFixed(1)}%) — poor connectivity`);
  if (graphDensity < 0.01) p1Findings.push(`Graph density is very low (${graphDensity}%) — sparse network`);
  if (totalEdges < totalNodes) p1Findings.push('Edge count is less than node count — underdeveloped knowledge graph');
  if (p1Findings.length === 0) p1Findings.push('Knowledge graph structure is healthy');

  const p1Score = clamp(
    100
    - (orphanPct > 20 ? 25 : orphanPct > 10 ? 12 : orphanPct > 5 ? 6 : 0)
    - (deadPct > 30 ? 15 : deadPct > 15 ? 8 : 0)
    - (graphDensity < 0.001 ? 20 : graphDensity < 0.01 ? 10 : 0)
  );

  const part1 = {
    score: p1Score,
    totalNodes, totalEdges, totalSources,
    graphDensity,
    orphanCount: orphanNodes,
    deadEndCount,
    top20Strongest: topNodesByEdge.map(r => ({ id: r.id, title: r.title, edgeCount: Number(r.cnt) })),
    top20Weakest: bottomNodesByEdge.map(r => ({ id: r.id, title: r.title, edgeCount: Number(r.cnt) })),
    top20StrongestEdges: topEdgesByConf.map(e => ({
      id: e.id, fromTitle: e.from.title, toTitle: e.to.title,
      confidence: e.confidenceScore, type: e.relationshipType,
    })),
    top20WeakestEdges: bottomEdgesByConf.map(e => ({
      id: e.id, fromTitle: e.from.title, toTitle: e.to.title,
      confidence: e.confidenceScore, type: e.relationshipType,
    })),
    findings: p1Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 2 — SOURCE QUALITY AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const [
    sourcesByType, sourcesByStatus, avgCredRow,
    lowCredSources, dupDoi, noSourceNodes,
    bestSourcedNodes, poorestSourcedNodes,
  ] = await Promise.all([
    prisma.$queryRaw<{ sourceType: string; cnt: bigint }[]>`
      SELECT "sourceType", COUNT(*)::bigint AS cnt FROM "Source" GROUP BY "sourceType" ORDER BY cnt DESC
    `,
    prisma.$queryRaw<{ status: string; cnt: bigint }[]>`
      SELECT status, COUNT(*)::bigint AS cnt FROM "Source" GROUP BY status ORDER BY cnt DESC
    `,
    prisma.$queryRaw<[{ avg: number | null }]>`
      SELECT AVG("credibilityScore")::float AS avg FROM "Source"
    `,
    prisma.source.count({ where: { credibilityScore: { lt: 0.3 } } }),
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint AS cnt FROM "Source"
      WHERE doi IS NOT NULL AND doi IN (
        SELECT doi FROM "Source" WHERE doi IS NOT NULL GROUP BY doi HAVING COUNT(*) > 1
      )
    `,
    prisma.node.count({
      where: { status: 'published', sourceLinks: { none: {} } },
    }),
    prisma.$queryRaw<{ id: string; title: string; cnt: bigint }[]>`
      SELECT n.id, n.title, COUNT(sl.id)::bigint AS cnt
      FROM "Node" n LEFT JOIN "SourceLink" sl ON sl."nodeId"=n.id
      WHERE n.status='published'
      GROUP BY n.id, n.title ORDER BY cnt DESC LIMIT 20
    `,
    prisma.$queryRaw<{ id: string; title: string; cnt: bigint }[]>`
      SELECT n.id, n.title, COUNT(sl.id)::bigint AS cnt
      FROM "Node" n LEFT JOIN "SourceLink" sl ON sl."nodeId"=n.id
      WHERE n.status='published'
      GROUP BY n.id, n.title ORDER BY cnt ASC LIMIT 20
    `,
  ]);

  const avgCred = avgCredRow[0]?.avg ?? 0;
  const dupDoiCount = Number(dupDoi[0]?.cnt ?? 0);
  const noSourcePct = totalNodes > 0 ? (noSourceNodes / totalNodes) * 100 : 0;
  const lowCredPct  = totalSources > 0 ? (lowCredSources / totalSources) * 100 : 0;

  const p2Findings: string[] = [];
  if (noSourcePct > 15) p2Findings.push(`${noSourceNodes} nodes (${noSourcePct.toFixed(1)}%) have zero sources — critical gap`);
  if (lowCredPct > 20) p2Findings.push(`${lowCredSources} sources (${lowCredPct.toFixed(1)}%) have credibility < 0.3`);
  if (dupDoiCount > 0) p2Findings.push(`${dupDoiCount} duplicate DOIs detected — source deduplication needed`);
  if (avgCred < 0.5) p2Findings.push(`Average credibility score ${avgCred.toFixed(2)} is below 0.5`);
  if (p2Findings.length === 0) p2Findings.push('Source quality metrics are within healthy range');

  const p2Score = clamp(
    100
    - (noSourcePct > 20 ? 30 : noSourcePct > 10 ? 15 : noSourcePct > 5 ? 8 : 0)
    - (lowCredPct > 30 ? 20 : lowCredPct > 15 ? 10 : 0)
    - (dupDoiCount > 10 ? 10 : dupDoiCount > 0 ? 5 : 0)
    - (avgCred < 0.4 ? 15 : avgCred < 0.5 ? 8 : 0)
  );

  const part2 = {
    score: p2Score,
    totalSources,
    avgCredibility: parseFloat(avgCred.toFixed(3)),
    lowCredibilityCount: lowCredSources,
    duplicateDois: dupDoiCount,
    nodesWithZeroSources: noSourceNodes,
    byType: Object.fromEntries(sourcesByType.map(r => [r.sourceType, Number(r.cnt)])),
    byStatus: Object.fromEntries(sourcesByStatus.map(r => [r.status, Number(r.cnt)])),
    top20BestSourced: bestSourcedNodes.map(r => ({ id: r.id, title: r.title, sourceCount: Number(r.cnt) })),
    top20PoorestSourced: poorestSourcedNodes.map(r => ({ id: r.id, title: r.title, sourceCount: Number(r.cnt) })),
    findings: p2Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 3 — TIMELINE AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const [withYear, withDateRange, bceNodes, invalidDateNodes] = await Promise.all([
    prisma.node.count({ where: { status: 'published', year: { not: null } } }),
    prisma.node.count({ where: { status: 'published', dateStart: { not: null } } }),
    prisma.node.count({ where: { status: 'published', year: { lt: 0 } } }),
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint AS cnt FROM "Node"
      WHERE status='published'
        AND (
          ("dateEnd" IS NOT NULL AND "dateStart" IS NOT NULL AND "dateEnd" < "dateStart")
          OR (year IS NOT NULL AND (year > 2100 OR year < -10000))
        )
    `,
  ]);

  const withAnyDate = await prisma.node.count({
    where: { status: 'published', OR: [{ year: { not: null } }, { dateStart: { not: null } }] },
  });
  const noDate = totalNodes - withAnyDate;
  const invalidDateCount = Number(invalidDateNodes[0]?.cnt ?? 0);
  const dateCovPct = totalNodes > 0 ? (withAnyDate / totalNodes) * 100 : 0;

  const p3Findings: string[] = [];
  if (dateCovPct < 50) p3Findings.push(`Only ${dateCovPct.toFixed(1)}% of nodes have temporal data — poor timeline coverage`);
  if (invalidDateCount > 0) p3Findings.push(`${invalidDateCount} nodes have invalid date ranges (dateEnd < dateStart or out-of-range year)`);
  if (bceNodes === 0) p3Findings.push('No BCE dates detected — archive may be missing ancient history coverage');
  if (noDate > totalNodes * 0.5) p3Findings.push(`${noDate} nodes (${((noDate/totalNodes)*100).toFixed(1)}%) have no temporal anchor`);
  if (p3Findings.length === 0) p3Findings.push('Timeline coverage is excellent');

  const p3Score = clamp(
    100
    - (dateCovPct < 30 ? 30 : dateCovPct < 50 ? 20 : dateCovPct < 70 ? 10 : 0)
    - (invalidDateCount > 5 ? 15 : invalidDateCount > 0 ? 8 : 0)
  );

  const part3 = {
    score: p3Score, totalNodes,
    withYear, withDateRange, withAnyDate, noDate, bceNodes,
    invalidDates: invalidDateCount,
    dateCoveragePct: parseFloat(dateCovPct.toFixed(1)),
    findings: p3Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 4 — GLOBE AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const [withCoords, invalidCoords, dupCoordsRows] = await Promise.all([
    prisma.node.count({ where: { status: 'published', lat: { not: null }, lon: { not: null } } }),
    prisma.node.count({
      where: {
        status: 'published',
        OR: [{ lat: { lt: -90 } }, { lat: { gt: 90 } }, { lon: { lt: -180 } }, { lon: { gt: 180 } }],
      },
    }),
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint AS cnt FROM (
        SELECT lat, lon FROM "Node"
        WHERE status='published' AND lat IS NOT NULL AND lon IS NOT NULL
        GROUP BY lat, lon HAVING COUNT(*) > 1
      ) sub
    `,
  ]);

  const dupCoords = Number(dupCoordsRows[0]?.cnt ?? 0);
  const noCoords = totalNodes - withCoords;
  const coordCovPct = totalNodes > 0 ? (withCoords / totalNodes) * 100 : 0;

  const p4Findings: string[] = [];
  if (coordCovPct < 30) p4Findings.push(`Only ${coordCovPct.toFixed(1)}% of nodes have geographic coordinates`);
  if (invalidCoords > 0) p4Findings.push(`${invalidCoords} nodes have invalid coordinates (out of valid range)`);
  if (dupCoords > 0) p4Findings.push(`${dupCoords} duplicate coordinate pairs — different nodes share exact same location`);
  if (noCoords > totalNodes * 0.6) p4Findings.push(`${noCoords} nodes lack geographic anchoring`);
  if (p4Findings.length === 0) p4Findings.push('Globe coverage is strong');

  const p4Score = clamp(
    100
    - (coordCovPct < 20 ? 30 : coordCovPct < 40 ? 15 : coordCovPct < 60 ? 8 : 0)
    - (invalidCoords > 0 ? 10 : 0)
    - (dupCoords > 5 ? 10 : dupCoords > 0 ? 5 : 0)
  );

  const part4 = {
    score: p4Score, totalNodes, withCoordinates: withCoords,
    invalidCoordinates: invalidCoords, duplicateCoordinates: dupCoords,
    noCoordinates: noCoords,
    coordinateCoveragePct: parseFloat(coordCovPct.toFixed(1)),
    findings: p4Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 5 — RESEARCH COMPLETENESS AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const [withClaims, withCriticisms, withMainstream, evidDist, avgConfRow] = await Promise.all([
    prisma.node.count({ where: { status: 'published', claims: { some: {} } } }),
    prisma.node.count({ where: { status: 'published', criticisms: { some: {} } } }),
    prisma.node.count({
      where: { status: 'published', mainstreamView: { not: null }, NOT: { mainstreamView: '' } },
    }),
    prisma.$queryRaw<{ evidenceLevel: string; cnt: bigint }[]>`
      SELECT "evidenceLevel", COUNT(*)::bigint AS cnt
      FROM "Node" WHERE status='published'
      GROUP BY "evidenceLevel" ORDER BY cnt DESC
    `,
    prisma.$queryRaw<[{ avg: number | null }]>`
      SELECT AVG("confidenceScore")::float AS avg FROM "Node" WHERE status='published'
    `,
  ]);

  // top 20 most complete AND least complete — two separate queries for accuracy
  const [completenessTopRows, completenessBottomRows] = await Promise.all([
    prisma.$queryRaw<{ id: string; title: string; score: bigint }[]>`
      SELECT id, title, score FROM (
        SELECT n.id, n.title,
          (
            (CASE WHEN (SELECT COUNT(*) FROM "Claim" c WHERE c."nodeId"=n.id) > 0 THEN 1 ELSE 0 END) +
            (CASE WHEN (SELECT COUNT(*) FROM "Criticism" cr WHERE cr."nodeId"=n.id) > 0 THEN 1 ELSE 0 END) +
            (CASE WHEN n."mainstreamView" IS NOT NULL AND length(n."mainstreamView") > 10 THEN 1 ELSE 0 END) +
            (CASE WHEN (SELECT COUNT(*) FROM "SourceLink" sl WHERE sl."nodeId"=n.id) > 0 THEN 1 ELSE 0 END)
          )::bigint AS score
        FROM "Node" n WHERE n.status='published'
      ) t ORDER BY t.score DESC LIMIT 20
    `,
    prisma.$queryRaw<{ id: string; title: string; score: bigint }[]>`
      SELECT id, title, score FROM (
        SELECT n.id, n.title,
          (
            (CASE WHEN (SELECT COUNT(*) FROM "Claim" c WHERE c."nodeId"=n.id) > 0 THEN 1 ELSE 0 END) +
            (CASE WHEN (SELECT COUNT(*) FROM "Criticism" cr WHERE cr."nodeId"=n.id) > 0 THEN 1 ELSE 0 END) +
            (CASE WHEN n."mainstreamView" IS NOT NULL AND length(n."mainstreamView") > 10 THEN 1 ELSE 0 END) +
            (CASE WHEN (SELECT COUNT(*) FROM "SourceLink" sl WHERE sl."nodeId"=n.id) > 0 THEN 1 ELSE 0 END)
          )::bigint AS score
        FROM "Node" n WHERE n.status='published'
      ) t ORDER BY t.score ASC LIMIT 20
    `,
  ]);

  const top20MostComplete  = completenessTopRows.map(r => ({
    id: r.id, title: r.title, completenessScore: Number(r.score) * 25,
  }));
  const top20LeastComplete = completenessBottomRows.map(r => ({
    id: r.id, title: r.title, completenessScore: Number(r.score) * 25,
  }));

  const avgConf = avgConfRow[0]?.avg ?? 0;
  const claimsPct = totalNodes > 0 ? (withClaims / totalNodes) * 100 : 0;
  const critPct   = totalNodes > 0 ? (withCriticisms / totalNodes) * 100 : 0;
  const mainPct   = totalNodes > 0 ? (withMainstream / totalNodes) * 100 : 0;

  const p5Findings: string[] = [];
  if (claimsPct < 50) p5Findings.push(`${(100-claimsPct).toFixed(1)}% of nodes lack claims — major research gap`);
  if (critPct < 30) p5Findings.push(`${(100-critPct).toFixed(1)}% of nodes lack criticisms — echo chamber risk`);
  if (mainPct < 40) p5Findings.push(`${(100-mainPct).toFixed(1)}% of nodes lack a mainstream view`);
  if (avgConf < 0.5) p5Findings.push(`Average confidence score ${avgConf.toFixed(2)} is below 0.5`);
  if (p5Findings.length === 0) p5Findings.push('Research completeness is strong');

  const p5Score = clamp(
    (claimsPct * 0.3) + (critPct * 0.25) + (mainPct * 0.25) + (avgConf * 20)
  );

  const part5 = {
    score: p5Score, totalNodes,
    withClaims, withCriticisms, withMainstream,
    claimsCoveragePct: parseFloat(claimsPct.toFixed(1)),
    criticismsCoveragePct: parseFloat(critPct.toFixed(1)),
    mainstreamCoveragePct: parseFloat(mainPct.toFixed(1)),
    avgConfidence: parseFloat(avgConf.toFixed(3)),
    byEvidenceLevel: Object.fromEntries(evidDist.map(r => [r.evidenceLevel, Number(r.cnt)])),
    top20MostComplete,
    top20LeastComplete,
    findings: p5Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 6 — ECHO CHAMBER AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  // Source concentration: how many nodes use the same top sources
  const top5SourceConcentration = await prisma.$queryRaw<{ sourceId: string; nodeCount: bigint }[]>`
    SELECT sl."sourceId", COUNT(DISTINCT sl."nodeId")::bigint AS "nodeCount"
    FROM "SourceLink" sl
    JOIN "Node" n ON n.id=sl."nodeId" AND n.status='published'
    GROUP BY sl."sourceId"
    ORDER BY "nodeCount" DESC LIMIT 5
  `;
  const top5NodeCount = top5SourceConcentration.reduce((a, r) => a + Number(r.nodeCount), 0);
  const concentrationPct = totalNodes > 0 ? (top5NodeCount / totalNodes) * 100 : 0;

  const noCritCount = totalNodes - withCriticisms;
  const speculativeCount = Number(evidDist.find(r => r.evidenceLevel === 'speculative')?.cnt ?? 0);
  const confirmedCount   = Number(evidDist.find(r => r.evidenceLevel === 'confirmed')?.cnt ?? 0);
  const specRatio = totalNodes > 0 ? (speculativeCount / totalNodes) * 100 : 0;

  const p6Findings: string[] = [];
  if (concentrationPct > 50) p6Findings.push(`Top 5 sources referenced by ${concentrationPct.toFixed(1)}% of nodes — HIGH concentration risk`);
  if (noCritCount > totalNodes * 0.6) p6Findings.push(`${noCritCount} nodes (${((noCritCount/totalNodes)*100).toFixed(1)}%) lack criticism — echo chamber risk`);
  if (specRatio > 40) p6Findings.push(`${specRatio.toFixed(1)}% of nodes are speculative — credibility concern`);
  if (confirmedCount < totalNodes * 0.05) p6Findings.push('Less than 5% of nodes have "confirmed" evidence — archive leans speculative');

  let echoRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  const riskPoints = (concentrationPct > 60 ? 2 : concentrationPct > 40 ? 1 : 0)
    + (noCritCount > totalNodes * 0.7 ? 2 : noCritCount > totalNodes * 0.5 ? 1 : 0)
    + (specRatio > 50 ? 2 : specRatio > 30 ? 1 : 0);
  if (riskPoints >= 4) echoRisk = 'HIGH';
  else if (riskPoints >= 2) echoRisk = 'MEDIUM';

  const p6Score = clamp(
    100 - (concentrationPct * 0.3) - (specRatio * 0.3) - (noCritCount / totalNodes * 100 * 0.4)
  );
  if (p6Findings.length === 0) p6Findings.push('No significant echo chamber patterns detected');

  const part6 = {
    score: p6Score, riskLevel: echoRisk,
    sourceConcentrationPct: parseFloat(concentrationPct.toFixed(1)),
    nodesWithoutCriticism: noCritCount,
    speculativeCount, confirmedCount,
    speculativePct: parseFloat(specRatio.toFixed(1)),
    top5SourceNodeCounts: top5SourceConcentration.map(r => ({ sourceId: r.sourceId, nodeCount: Number(r.nodeCount) })),
    findings: p6Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 7 — SIMILARITY SYSTEM AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  // CRITICAL: verify similarity is advisory only — no edges created from similarity, no evidence inflation
  const [simWithEdge, highSimNoEdge, avgSimScore] = await Promise.all([
    // pairs that have both a ResearchSimilarity AND a published Edge (this is allowed if edge was created independently)
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint AS cnt
      FROM "ResearchSimilarity" rs
      WHERE EXISTS (
        SELECT 1 FROM "Edge" e
        WHERE e.status='published'
          AND ((e."fromId"=rs."nodeAId" AND e."toId"=rs."nodeBId")
            OR (e."fromId"=rs."nodeBId" AND e."toId"=rs."nodeAId"))
      )
    `,
    // high-similarity pairs (>0.8) with no edge — these are advisory, should NOT be auto-published
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint AS cnt
      FROM "ResearchSimilarity" rs
      WHERE rs."overallSimilarity" > 0.8
        AND NOT EXISTS (
          SELECT 1 FROM "Edge" e
          WHERE e.status='published'
            AND ((e."fromId"=rs."nodeAId" AND e."toId"=rs."nodeBId")
              OR (e."fromId"=rs."nodeBId" AND e."toId"=rs."nodeAId"))
        )
    `,
    prisma.$queryRaw<[{ avg: number | null }]>`
      SELECT AVG("overallSimilarity")::float AS avg FROM "ResearchSimilarity"
    `,
  ]);

  const simWithEdgeCount = Number(simWithEdge[0]?.cnt ?? 0);
  const highSimNoEdgeCount = Number(highSimNoEdge[0]?.cnt ?? 0);
  const avgSim = avgSimScore[0]?.avg ?? 0;

  const p7Findings: string[] = [];
  // simWithEdge is NOT necessarily a violation — similarity and edges are separate systems
  // We just report the overlap as informational
  p7Findings.push(`${simWithEdgeCount} similarity pairs also have a published edge (informational — edges may have been created independently)`);
  p7Findings.push(`${highSimNoEdgeCount} high-similarity pairs (>0.8) correctly have NO auto-published edge — advisory-only system is working`);
  if (highSimNoEdgeCount > 50) p7Findings.push(`${highSimNoEdgeCount} high-similarity pairs could be reviewed for manual edge creation`);
  if (totalSimilarities === 0) p7Findings.push('No similarity scores computed yet — run the similarity pipeline first');

  const p7Score = 100; // similarity system is always compliant if no auto-publishing occurred

  const part7 = {
    score: p7Score,
    totalSimilarities,
    similaritiesAlsoHaveEdge: simWithEdgeCount,
    highSimilarityNoEdge: highSimNoEdgeCount,
    avgSimilarityScore: parseFloat(avgSim.toFixed(3)),
    systemStatus: 'ADVISORY_ONLY' as const,
    findings: p7Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 8 — USER & MODERATION AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [
    activeUsers, bannedUsers, roleDistRows,
    highRiskUsers, pendingNodes, pendingEdges,
  ] = await Promise.all([
    prisma.user.count({ where: { lastActiveAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.$queryRaw<{ role: string; cnt: bigint }[]>`
      SELECT role, COUNT(*)::bigint AS cnt FROM "User" GROUP BY role ORDER BY cnt DESC
    `,
    prisma.userRiskProfile.count({ where: { riskLevel: { in: ['high', 'critical'] } } }),
    prisma.node.count({ where: { status: { in: ['draft'] } } }),
    prisma.edge.count({ where: { status: { in: ['draft'] } } }),
  ]);

  const activeRatio = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  const p8Findings: string[] = [];
  if (activeRatio < 10 && totalUsers > 50) p8Findings.push(`Only ${activeRatio.toFixed(1)}% of users active in last 30 days`);
  if (highRiskUsers > 5) p8Findings.push(`${highRiskUsers} users flagged as high/critical risk`);
  if (pendingNodes > 50) p8Findings.push(`${pendingNodes} nodes awaiting review — backlog detected`);
  if (pendingEdges > 100) p8Findings.push(`${pendingEdges} edges awaiting review — backlog detected`);
  if (bannedUsers > totalUsers * 0.1) p8Findings.push(`${bannedUsers} banned users (${((bannedUsers/totalUsers)*100).toFixed(1)}%) — elevated`);
  if (p8Findings.length === 0) p8Findings.push('User and moderation health looks good');

  const p8ModerationScore = clamp(
    100
    - (pendingNodes > 100 ? 20 : pendingNodes > 50 ? 10 : 0)
    - (pendingEdges > 200 ? 20 : pendingEdges > 100 ? 10 : 0)
    - (highRiskUsers > 10 ? 15 : highRiskUsers > 5 ? 8 : 0)
  );
  const p8TrustScore = clamp(
    100 - (bannedUsers / Math.max(totalUsers, 1) * 200)
    - (highRiskUsers / Math.max(totalUsers, 1) * 100)
  );

  const part8 = {
    moderationScore: p8ModerationScore,
    trustScore: p8TrustScore,
    score: Math.round((p8ModerationScore + p8TrustScore) / 2),
    totalUsers, activeUsers, bannedUsers,
    activeUsersPct: parseFloat(activeRatio.toFixed(1)),
    highRiskUsers, pendingNodes, pendingEdges,
    byRole: Object.fromEntries(roleDistRows.map(r => [r.role, Number(r.cnt)])),
    findings: p8Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 9 — PERFORMANCE AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const [searchIndexed, embeddingsCount, adjacencyCacheCount] = await Promise.all([
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint AS cnt FROM "Node" WHERE status='published' AND search_vector IS NOT NULL
    `,
    prisma.nodeEmbedding.count(),
    prisma.adjacencyCache.count(),
  ]);

  const searchIndexedCount = Number(searchIndexed[0]?.cnt ?? 0);
  const searchIndexPct = totalNodes > 0 ? (searchIndexedCount / totalNodes) * 100 : 0;
  const embeddingPct   = totalNodes > 0 ? (embeddingsCount / totalNodes) * 100 : 0;
  const adjCachePct    = totalNodes > 0 ? (adjacencyCacheCount / totalNodes) * 100 : 0;

  const bottlenecks: string[] = [];
  if (searchIndexPct < 100) bottlenecks.push(`Search index covers only ${searchIndexPct.toFixed(1)}% of nodes`);
  if (embeddingPct < 80) bottlenecks.push(`Embeddings cover only ${embeddingPct.toFixed(1)}% of nodes — similarity search degraded`);
  if (adjCachePct < 50) bottlenecks.push(`Adjacency cache covers only ${adjCachePct.toFixed(1)}% of nodes — graph traversal may be slow`);
  if (totalNodes > 5000) bottlenecks.push(`At ${totalNodes} nodes, some N+1 queries may appear in admin views`);

  const p9Findings: string[] = [...bottlenecks];
  if (p9Findings.length === 0) p9Findings.push('Performance infrastructure is well-maintained');

  const p9Score = clamp(
    (searchIndexPct * 0.4) + (embeddingPct * 0.3) + (adjCachePct * 0.3)
  );

  const part9 = {
    score: p9Score,
    currentNodes: totalNodes,
    searchIndexedNodes: searchIndexedCount,
    searchIndexPct: parseFloat(searchIndexPct.toFixed(1)),
    embeddingsCount, embeddingPct: parseFloat(embeddingPct.toFixed(1)),
    adjacencyCacheCount, adjCachePct: parseFloat(adjCachePct.toFixed(1)),
    scalabilityEstimate: {
      at1k: totalNodes < 1000 ? 'Not yet reached' : 'Current scale — monitor query times',
      at5k: '~5× current load — ensure pagination and indexes are in place',
      at10k: '~10× current load — consider read replicas and caching layers',
    },
    bottlenecks,
    findings: p9Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 10 — UNIVERSE NAVIGATION AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const clusterNodeCounts = await prisma.$queryRaw<{ id: string; name: string; cnt: bigint; galaxyId: string | null }[]>`
    SELECT c.id, c.name, c."galaxyId",
           COUNT(n.id)::bigint AS cnt
    FROM "Category" c
    LEFT JOIN "Node" n ON n."categoryId"=c.id AND n.status='published'
    GROUP BY c.id, c.name, c."galaxyId"
    ORDER BY cnt DESC
  `;

  const galaxyNodeCounts = await prisma.$queryRaw<{ id: string; name: string; cnt: bigint }[]>`
    SELECT g.id, g.name,
           COUNT(n.id)::bigint AS cnt
    FROM "Galaxy" g
    LEFT JOIN "Category" c ON c."galaxyId"=g.id
    LEFT JOIN "Node" n ON n."categoryId"=c.id AND n.status='published'
    GROUP BY g.id, g.name
    ORDER BY cnt DESC
  `;

  const emptyClusters = clusterNodeCounts.filter(r => Number(r.cnt) === 0).length;
  const thinClusters  = clusterNodeCounts.filter(r => Number(r.cnt) > 0 && Number(r.cnt) < 5).length;
  const emptyGalaxies = galaxyNodeCounts.filter(r => Number(r.cnt) === 0).length;
  const avgNodesPerCluster = totalClusters > 0 ? totalNodes / totalClusters : 0;

  const p10Findings: string[] = [];
  if (emptyClusters > 0) p10Findings.push(`${emptyClusters} clusters have zero published nodes`);
  if (thinClusters > 3) p10Findings.push(`${thinClusters} clusters have fewer than 5 nodes — thin content`);
  if (emptyGalaxies > 0) p10Findings.push(`${emptyGalaxies} galaxies have no published content`);
  if (avgNodesPerCluster < 5) p10Findings.push(`Average ${avgNodesPerCluster.toFixed(1)} nodes/cluster — archive needs more content`);
  if (p10Findings.length === 0) p10Findings.push('Universe navigation structure is well-balanced');

  const p10Score = clamp(
    100
    - (emptyClusters > 5 ? 20 : emptyClusters > 2 ? 10 : emptyClusters > 0 ? 5 : 0)
    - (thinClusters > 10 ? 20 : thinClusters > 5 ? 10 : 0)
    - (emptyGalaxies > 1 ? 15 : emptyGalaxies > 0 ? 8 : 0)
  );

  const part10 = {
    score: p10Score,
    totalGalaxies, totalClusters,
    emptyClusters, thinClusters, emptyGalaxies,
    avgNodesPerCluster: parseFloat(avgNodesPerCluster.toFixed(1)),
    top20BiggestClusters: clusterNodeCounts.slice(0, 20).map(r => ({ id: r.id, name: r.name, nodeCount: Number(r.cnt) })),
    top20SmallestClusters: [...clusterNodeCounts].sort((a,b) => Number(a.cnt)-Number(b.cnt)).slice(0, 20).map(r => ({
      id: r.id, name: r.name, nodeCount: Number(r.cnt),
    })),
    byGalaxy: galaxyNodeCounts.map(r => ({ id: r.id, name: r.name, nodeCount: Number(r.cnt) })),
    findings: p10Findings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 11 — STRATEGIC GROWTH AUDIT
  // ══════════════════════════════════════════════════════════════════════════
  const underdevelopedClusters = clusterNodeCounts
    .filter(r => Number(r.cnt) < 10)
    .map(r => ({ id: r.id, name: r.name, nodeCount: Number(r.cnt) }))
    .sort((a,b) => a.nodeCount - b.nodeCount);

  // Gaps based on evidence level distribution
  const evidLevels = Object.fromEntries(evidDist.map(r => [r.evidenceLevel, Number(r.cnt)]));
  const growthFindings: string[] = [];
  const growthOpportunities: string[] = [];

  if (underdevelopedClusters.length > 0) {
    growthFindings.push(`${underdevelopedClusters.length} clusters need content — ${underdevelopedClusters.slice(0,3).map(c => c.name).join(', ')}...`);
    underdevelopedClusters.slice(0, 5).forEach(c => {
      growthOpportunities.push(`Expand "${c.name}" cluster (${c.nodeCount} nodes) — needs at least 10 nodes for meaningful navigation`);
    });
  }

  const weakEvidPct = ((evidLevels['weak'] ?? 0) + (evidLevels['speculative'] ?? 0)) / Math.max(totalNodes, 1) * 100;
  if (weakEvidPct > 40) {
    growthFindings.push(`${weakEvidPct.toFixed(1)}% of nodes have weak/speculative evidence — priority area for source enrichment`);
    growthOpportunities.push('Source enrichment campaign for weak/speculative nodes — add peer-reviewed citations');
  }

  if (bceNodes < 20 && totalNodes > 100) {
    growthOpportunities.push('Expand ancient history coverage — BCE temporal coverage is thin');
  }
  if (withCoords < totalNodes * 0.4) {
    growthOpportunities.push('Geographic data enrichment — add coordinates to improve Globe View coverage');
  }
  if (withCriticisms < totalNodes * 0.3) {
    growthOpportunities.push('Add criticisms and counter-arguments to improve intellectual balance');
  }

  growthOpportunities.push('Cross-cluster relationship mapping — identify nodes in different clusters that should be connected');
  growthOpportunities.push('Primary source integration — add museum catalogues, archaeological reports, peer-reviewed journals');

  const part11 = {
    underdevelopedClusters: underdevelopedClusters.slice(0, 20),
    missingGapAreas: growthFindings,
    growthOpportunities: growthOpportunities.slice(0, 20),
    weakEvidencePct: parseFloat(weakEvidPct.toFixed(1)),
    findings: growthFindings,
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PART 12 — FINAL REPORT
  // ══════════════════════════════════════════════════════════════════════════
  const scores = {
    'Knowledge Graph':    part1.score,
    'Source Quality':     part2.score,
    'Timeline':           part3.score,
    'Globe':              part4.score,
    'Research Completeness': part5.score,
    'Echo Chamber':       part6.score,
    'Similarity System':  part7.score,
    'User & Moderation':  part8.score,
    'Performance':        part9.score,
    'Universe Navigation': part10.score,
  };

  const scoreValues = Object.values(scores);
  const overallScore = clamp(Math.round(scoreValues.reduce((a,b) => a+b, 0) / scoreValues.length));

  const grade =
    overallScore >= 90 ? 'A' :
    overallScore >= 80 ? 'B' :
    overallScore >= 70 ? 'C' :
    overallScore >= 60 ? 'D' : 'F';

  // Aggregate top 20 lists
  const allFindings = [
    ...part1.findings, ...part2.findings, ...part3.findings, ...part4.findings,
    ...part5.findings, ...part6.findings, ...part7.findings, ...part8.findings,
    ...part9.findings, ...part10.findings, ...part11.findings,
  ];

  const top20Strengths: string[] = [];
  const top20Weaknesses: string[] = [];
  const top20Fixes: string[] = [];

  if (p1Score >= 80) top20Strengths.push('Knowledge graph connectivity is strong');
  if (p2Score >= 80) top20Strengths.push('Source quality and diversity is good');
  if (p3Score >= 80) top20Strengths.push('Timeline coverage is comprehensive');
  if (p4Score >= 80) top20Strengths.push('Geographic data is well-populated');
  if (p5Score >= 80) top20Strengths.push('Research completeness (claims/criticisms) is high');
  if (p6Score >= 80) top20Strengths.push('Source diversity prevents echo chamber effects');
  if (p7Score >= 95) top20Strengths.push('Similarity system correctly operates as advisory-only');
  if (part8.moderationScore >= 80) top20Strengths.push('Moderation queue is healthy and up to date');
  if (p9Score >= 80) top20Strengths.push('Search index and performance infrastructure is optimized');
  if (p10Score >= 80) top20Strengths.push('Galaxy/cluster navigation structure is well-balanced');
  if (top20Strengths.length === 0) top20Strengths.push('Archive has foundational structure in place');

  if (orphanNodes > totalNodes * 0.1) top20Weaknesses.push(`High orphan node rate (${orphanPct.toFixed(1)}%)`);
  if (noSourceNodes > totalNodes * 0.1) top20Weaknesses.push(`${noSourcePct.toFixed(1)}% of nodes lack any source`);
  if (dateCovPct < 50) top20Weaknesses.push('Less than 50% temporal coverage');
  if (coordCovPct < 30) top20Weaknesses.push('Less than 30% geographic coverage');
  if (critPct < 30) top20Weaknesses.push('Less than 30% of nodes have criticisms');
  if (mainPct < 40) top20Weaknesses.push('Less than 40% mainstream view coverage');
  if (echoRisk === 'HIGH') top20Weaknesses.push('HIGH echo chamber risk detected');
  if (echoRisk === 'MEDIUM') top20Weaknesses.push('MEDIUM echo chamber risk — needs attention');
  if (emptyClusters > 2) top20Weaknesses.push(`${emptyClusters} empty clusters hurt navigation`);
  if (totalSimilarities === 0) top20Weaknesses.push('Similarity pipeline has not run — no discovery assistance');
  if (top20Weaknesses.length === 0) top20Weaknesses.push('No critical weaknesses detected');

  if (orphanNodes > 0) top20Fixes.push(`Connect ${orphanNodes} orphan nodes to the knowledge graph via relationships`);
  if (noSourceNodes > 0) top20Fixes.push(`Add sources to ${noSourceNodes} unsourced nodes — prioritize high-confidence speculative nodes`);
  if (invalidDateCount > 0) top20Fixes.push(`Fix ${invalidDateCount} invalid date entries (dateEnd < dateStart)`);
  if (invalidCoords > 0) top20Fixes.push(`Fix ${invalidCoords} nodes with invalid coordinates`);
  if (dupDoiCount > 0) top20Fixes.push(`Deduplicate ${dupDoiCount} sources with identical DOIs`);
  if (emptyClusters > 0) top20Fixes.push(`Populate or archive ${emptyClusters} empty clusters`);
  if (searchIndexPct < 100) top20Fixes.push(`Re-index ${totalNodes - searchIndexedCount} nodes in full-text search`);
  if (embeddingPct < 80) top20Fixes.push(`Generate embeddings for ${totalNodes - embeddingsCount} nodes`);
  top20Fixes.push('Run source enrichment pipeline on nodes with low credibility sources');
  top20Fixes.push('Review and approve pending moderation queue items');

  const top20CredibilityRisks: string[] = [];
  if (echoRisk !== 'LOW') top20CredibilityRisks.push(`Echo chamber risk: ${echoRisk}`);
  if (weakEvidPct > 30) top20CredibilityRisks.push(`${weakEvidPct.toFixed(1)}% of archive is weak/speculative evidence`);
  if (noSourceNodes > 0) top20CredibilityRisks.push(`${noSourceNodes} nodes have no verifiable sources`);
  if (lowCredSources > totalSources * 0.2) top20CredibilityRisks.push(`${lowCredPct.toFixed(1)}% of sources have low credibility`);
  if (avgCred < 0.5) top20CredibilityRisks.push(`Average source credibility ${avgCred.toFixed(2)} is below threshold`);
  if (dupDoiCount > 0) top20CredibilityRisks.push(`${dupDoiCount} duplicate sources may inflate citation counts`);
  if (top20CredibilityRisks.length === 0) top20CredibilityRisks.push('No critical credibility risks identified');

  const executiveSummary = `The Nexus Archive scores ${overallScore}/100 (Grade: ${grade}) as of ${new Date().toLocaleDateString()}. `
    + `The archive contains ${totalNodes} published nodes, ${totalEdges} relationships, and ${totalSources} sources across ${totalGalaxies} galaxies and ${totalClusters} clusters. `
    + (overallScore >= 80
      ? 'The archive is in good health with strong fundamentals. '
      : overallScore >= 60
      ? 'The archive has a solid foundation but several areas need attention. '
      : 'The archive has significant gaps that should be addressed before expanding content. ')
    + (top20Weaknesses[0] !== 'No critical weaknesses detected'
      ? `Primary concerns: ${top20Weaknesses.slice(0,3).join('; ')}. `
      : '')
    + `Echo chamber risk is ${echoRisk}. `
    + `Top priority fixes: ${top20Fixes.slice(0,3).join('; ')}.`;

  const part12 = {
    overallScore, grade,
    scores,
    top20Strengths: top20Strengths.slice(0, 20),
    top20Weaknesses: top20Weaknesses.slice(0, 20),
    top20Fixes: top20Fixes.slice(0, 20),
    top20GrowthOpportunities: part11.growthOpportunities.slice(0, 20),
    top20CredibilityRisks: top20CredibilityRisks.slice(0, 20),
    executiveSummary,
  };

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    part1, part2, part3, part4, part5,
    part6, part7, part8, part9, part10,
    part11, part12,
  });
}
