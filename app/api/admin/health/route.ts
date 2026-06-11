export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // ── Database ping ─────────────────────────────────────────────────────────
  let dbOk = false;
  let latencyMs = 0;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - t0;
    dbOk = true;
  } catch {
    dbOk = false;
    latencyMs = -1;
  }

  // Short-circuit if DB is down — remaining queries will all fail
  if (!dbOk) {
    return NextResponse.json({
      status: 'unhealthy',
      checks: {
        database:          { ok: false, latencyMs: -1 },
        searchIndex:       { ok: false, indexedCount: 0, totalPublished: 0 },
        embeddingCoverage: { pct: 0 },
        pendingProposals:  { nodes: 0, edges: 0, sources: 0 },
        runningAudits:     { count: 0 },
      },
      generatedAt: new Date().toISOString(),
    });
  }

  // ── Parallel fast queries ──────────────────────────────────────────────────
  const [
    totalPublished,
    searchIndexed,
    embeddingCount,
    pendingNodes,
    pendingEdges,
    pendingSources,
    runningAudits,
  ] = await Promise.all([
    prisma.node.count({ where: { status: 'published' } }),
    prisma.$queryRaw<[{ cnt: bigint }]>`
      SELECT COUNT(*)::bigint AS cnt
      FROM   "Node"
      WHERE  status = 'published' AND search_vector IS NOT NULL
    `.then((r) => Number(r[0]?.cnt ?? 0)),
    prisma.nodeEmbedding.count(),
    prisma.proposedNode.count({ where: { status: 'pending' } }),
    prisma.proposedEdge.count({ where: { status: 'pending' } }),
    prisma.source.count({ where: { status: 'pending' } }),
    (prisma as any).archiveAuditRun
      ? (prisma as any).archiveAuditRun.count({ where: { status: 'running' } })
      : prisma.$queryRaw<[{ cnt: bigint }]>`
          SELECT COUNT(*)::bigint AS cnt FROM "ArchiveAuditRun" WHERE status = 'running'
        `.then((r: [{ cnt: bigint }]) => Number(r[0]?.cnt ?? 0)),
  ]);

  const searchPct =
    totalPublished > 0 ? (searchIndexed / totalPublished) * 100 : 100;
  const embeddingPct =
    totalPublished > 0
      ? Math.round((embeddingCount / totalPublished) * 100)
      : 100;

  const searchOk = searchPct >= 90;
  const status =
    !dbOk ? 'unhealthy' : searchOk ? 'healthy' : 'degraded';

  return NextResponse.json({
    status,
    checks: {
      database: { ok: dbOk, latencyMs },
      searchIndex: {
        ok: searchOk,
        indexedCount: searchIndexed,
        totalPublished,
      },
      embeddingCoverage: { pct: embeddingPct },
      pendingProposals: {
        nodes: pendingNodes,
        edges: pendingEdges,
        sources: pendingSources,
      },
      runningAudits: {
        count: typeof runningAudits === 'number' ? runningAudits : 0,
      },
    },
    generatedAt: new Date().toISOString(),
  });
}
