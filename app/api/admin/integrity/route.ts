export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const BATCH = 200;
const MAX_IDS = 50;

const LOCATION_CATS = [
  'Ancient Civilizations',
  'Archaeological Sites',
  'Sacred Sites',
  'Underwater Mysteries',
  'Ancient Structures',
];

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface Finding {
  severity: Severity;
  type: string;
  count: number;
  affectedIds: string[];
  description: string;
}

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const findings: Finding[] = [];

  // ── Totals ──────────────────────────────────────────────────────────────────
  const [totalNodes, totalEdges, totalSources] = await Promise.all([
    prisma.node.count({ where: { status: 'published' } }),
    prisma.edge.count({ where: { status: 'published' } }),
    prisma.source.count(),
  ]);

  // ── 1. ORPHAN NODES (zero published edges) ──────────────────────────────────
  {
    const orphanIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: {
          status: 'published',
          edgesFrom: { none: { status: 'published' } },
          edgesTo:   { none: { status: 'published' } },
        },
        select: { id: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      orphanIds.push(...batch.map((n) => n.id));
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (orphanIds.length > 0) {
      findings.push({
        severity: 'HIGH',
        type: 'ORPHAN_NODES',
        count: orphanIds.length,
        affectedIds: orphanIds.slice(0, MAX_IDS),
        description: 'Published nodes with zero published edges.',
      });
    }
  }

  // ── 2. DEAD-END NODES (exactly one connection) ───────────────────────────────
  {
    const deadEndIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published' },
        select: {
          id: true,
          _count: { select: { edgesFrom: true, edgesTo: true } },
        },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      for (const n of batch) {
        if (n._count.edgesFrom + n._count.edgesTo === 1) {
          deadEndIds.push(n.id);
        }
      }
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (deadEndIds.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        type: 'DEAD_END_NODES',
        count: deadEndIds.length,
        affectedIds: deadEndIds.slice(0, MAX_IDS),
        description: 'Published nodes with only one connection.',
      });
    }
  }

  // ── 3. STALE EDGES (edge references unpublished node) ───────────────────────
  {
    const staleIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.edge.findMany({
        where: {
          status: 'published',
          OR: [
            { from: { status: { not: 'published' } } },
            { to:   { status: { not: 'published' } } },
          ],
        },
        select: { id: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      staleIds.push(...batch.map((e) => e.id));
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (staleIds.length > 0) {
      findings.push({
        severity: 'CRITICAL',
        type: 'STALE_EDGES',
        count: staleIds.length,
        affectedIds: staleIds.slice(0, MAX_IDS),
        description: 'Published edges where from or to node is not published.',
      });
    }
  }

  // ── 4. WEAK EDGES (confidenceScore < 0.25) ──────────────────────────────────
  {
    const weakIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.edge.findMany({
        where: { status: 'published', confidenceScore: { lt: 0.25 } },
        select: { id: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      weakIds.push(...batch.map((e) => e.id));
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (weakIds.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        type: 'WEAK_EDGES',
        count: weakIds.length,
        affectedIds: weakIds.slice(0, MAX_IDS),
        description: 'Published edges with confidenceScore < 0.25.',
      });
    }
  }

  // ── 5. DUPLICATE TITLES (pg_trgm similarity > 0.6) ──────────────────────────
  {
    type DupRow = { a: string; b: string };
    const dupRows = await prisma.$queryRaw<DupRow[]>`
      SELECT a.id AS a, b.id AS b
      FROM   "Node" a
      JOIN   "Node" b ON b.id > a.id
      WHERE  a.status = 'published'
        AND  b.status = 'published'
        AND  similarity(a.title, b.title) > 0.6
    `;
    if (dupRows.length > 0) {
      const affectedSet = new Set<string>();
      for (const row of dupRows) {
        affectedSet.add(row.a);
        affectedSet.add(row.b);
      }
      const affectedIds = Array.from(affectedSet);
      findings.push({
        severity: 'HIGH',
        type: 'DUPLICATE_TITLES',
        count: affectedIds.length,
        affectedIds: affectedIds.slice(0, MAX_IDS),
        description: 'Published nodes with near-duplicate titles (trigram similarity > 0.6).',
      });
    }
  }

  // ── 6. MISSING MAINSTREAM VIEW ───────────────────────────────────────────────
  {
    const missingIds: string[] = [];
    // null / empty
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: {
          status: 'published',
          OR: [{ mainstreamView: null }, { mainstreamView: '' }],
        },
        select: { id: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      missingIds.push(...batch.map((n) => n.id));
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    // short (non-null, < 20 chars)
    let skip2 = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published', mainstreamView: { not: null } },
        select: { id: true, mainstreamView: true },
        skip: skip2,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      for (const n of batch) {
        if (n.mainstreamView && n.mainstreamView.length < 20) missingIds.push(n.id);
      }
      if (batch.length < BATCH) break;
      skip2 += BATCH;
    }
    const unique = Array.from(new Set(missingIds));
    if (unique.length > 0) {
      findings.push({
        severity: 'HIGH',
        type: 'MISSING_MAINSTREAM',
        count: unique.length,
        affectedIds: unique.slice(0, MAX_IDS),
        description:
          'Published nodes with no mainstreamView or mainstreamView shorter than 20 characters.',
      });
    }
  }

  // ── 7. MISSING CRITICISMS ────────────────────────────────────────────────────
  {
    const missingIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published', criticisms: { none: {} } },
        select: { id: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      missingIds.push(...batch.map((n) => n.id));
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (missingIds.length > 0) {
      findings.push({
        severity: 'HIGH',
        type: 'MISSING_CRITICISMS',
        count: missingIds.length,
        affectedIds: missingIds.slice(0, MAX_IDS),
        description: 'Published nodes with zero linked Criticisms.',
      });
    }
  }

  // ── 8. MISSING CLAIMS ────────────────────────────────────────────────────────
  {
    const missingIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published', claims: { none: {} } },
        select: { id: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      missingIds.push(...batch.map((n) => n.id));
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (missingIds.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        type: 'MISSING_CLAIMS',
        count: missingIds.length,
        affectedIds: missingIds.slice(0, MAX_IDS),
        description: 'Published nodes with zero linked Claims.',
      });
    }
  }

  // ── 9. MISSING SOURCES (zero SourceLinks) ────────────────────────────────────
  {
    const missingIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published', sourceLinks: { none: {} } },
        select: { id: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      missingIds.push(...batch.map((n) => n.id));
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (missingIds.length > 0) {
      findings.push({
        severity: 'CRITICAL',
        type: 'MISSING_SOURCES',
        count: missingIds.length,
        affectedIds: missingIds.slice(0, MAX_IDS),
        description: 'Published nodes with zero approved SourceLinks.',
      });
    }
  }

  // ── 10. THIN DESCRIPTION (< 80 chars) ────────────────────────────────────────
  {
    const thinIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published' },
        select: { id: true, description: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      for (const n of batch) {
        if (n.description.length < 80) thinIds.push(n.id);
      }
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (thinIds.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        type: 'THIN_DESCRIPTION',
        count: thinIds.length,
        affectedIds: thinIds.slice(0, MAX_IDS),
        description: 'Published nodes with description shorter than 80 characters.',
      });
    }
  }

  // ── 11. MISSING CATEGORY (dangling FK) ───────────────────────────────────────
  {
    const missingIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published' },
        select: { id: true, category: { select: { id: true } } },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      for (const n of batch) {
        if (!n.category) missingIds.push(n.id);
      }
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (missingIds.length > 0) {
      findings.push({
        severity: 'HIGH',
        type: 'MISSING_CATEGORY',
        count: missingIds.length,
        affectedIds: missingIds.slice(0, MAX_IDS),
        description:
          'Published nodes where categoryId references a non-existent category.',
      });
    }
  }

  // ── 12. INVALID COORDINATES ──────────────────────────────────────────────────
  {
    const invalidIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: {
          status: 'published',
          OR: [
            { lat: { lt: -90 } },
            { lat: { gt: 90 } },
            { lon: { lt: -180 } },
            { lon: { gt: 180 } },
          ],
        },
        select: { id: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      invalidIds.push(...batch.map((n) => n.id));
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (invalidIds.length > 0) {
      findings.push({
        severity: 'HIGH',
        type: 'INVALID_COORDINATES',
        count: invalidIds.length,
        affectedIds: invalidIds.slice(0, MAX_IDS),
        description: 'Published nodes with lat outside [-90,90] or lon outside [-180,180].',
      });
    }
  }

  // ── 13. INVALID DATES ────────────────────────────────────────────────────────
  {
    const invalidIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published' },
        select: { id: true, dateStart: true, dateEnd: true, year: true },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      for (const n of batch) {
        let bad = false;
        if (n.dateStart !== null && n.dateEnd !== null && n.dateEnd < n.dateStart) bad = true;
        if (n.year !== null && (n.year > 2100 || n.year < -10000)) bad = true;
        if (bad) invalidIds.push(n.id);
      }
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (invalidIds.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        type: 'INVALID_DATES',
        count: invalidIds.length,
        affectedIds: invalidIds.slice(0, MAX_IDS),
        description:
          'Published nodes where dateEnd < dateStart, year > 2100, or year < -10000.',
      });
    }
  }

  // ── 14. DUPLICATE SOURCES (identical non-null DOI or URL) ───────────────────
  {
    const dupDoi = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Source"
      WHERE doi IS NOT NULL
        AND doi IN (
          SELECT doi FROM "Source" WHERE doi IS NOT NULL GROUP BY doi HAVING COUNT(*) > 1
        )
      LIMIT 500
    `;
    const dupUrl = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Source"
      WHERE url IS NOT NULL
        AND url IN (
          SELECT url FROM "Source" WHERE url IS NOT NULL GROUP BY url HAVING COUNT(*) > 1
        )
      LIMIT 500
    `;
    const allDupIds = Array.from(
      new Set([...dupDoi.map((r) => r.id), ...dupUrl.map((r) => r.id)]),
    );
    if (allDupIds.length > 0) {
      findings.push({
        severity: 'MEDIUM',
        type: 'DUPLICATE_SOURCES',
        count: allDupIds.length,
        affectedIds: allDupIds.slice(0, MAX_IDS),
        description: 'Source records with identical non-null DOI or URL.',
      });
    }
  }

  // ── 15. MISSING TAGS (< 2 tags) ──────────────────────────────────────────────
  {
    const missingIds: string[] = [];
    let skip = 0;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published' },
        select: { id: true, _count: { select: { tags: true } } },
        skip,
        take: BATCH,
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      for (const n of batch) {
        if (n._count.tags < 2) missingIds.push(n.id);
      }
      if (batch.length < BATCH) break;
      skip += BATCH;
    }
    if (missingIds.length > 0) {
      findings.push({
        severity: 'LOW',
        type: 'MISSING_TAGS',
        count: missingIds.length,
        affectedIds: missingIds.slice(0, MAX_IDS),
        description: 'Published nodes with fewer than 2 tags.',
      });
    }
  }

  // ── Coverage ─────────────────────────────────────────────────────────────────

  const [timelineCovered] = await Promise.all([
    prisma.node.count({
      where: {
        status: 'published',
        OR: [{ year: { not: null } }, { dateStart: { not: null } }],
      },
    }),
  ]);

  const locationCategories = await prisma.category.findMany({
    where: { name: { in: LOCATION_CATS } },
    select: { id: true },
  });
  const locationCatIds = locationCategories.map((c) => c.id);
  const globeCovered = locationCatIds.length > 0
    ? await prisma.node.count({
        where: { status: 'published', categoryId: { in: locationCatIds } },
      })
    : 0;

  const searchResult = await prisma.$queryRaw<[{ cnt: bigint }]>`
    SELECT COUNT(*)::bigint AS cnt
    FROM   "Node"
    WHERE  status = 'published' AND search_vector IS NOT NULL
  `;
  const searchIndexedCount = Number(searchResult[0]?.cnt ?? 0);

  // ── Summary & health score ────────────────────────────────────────────────────
  const countBySev = (sev: Severity) =>
    findings.filter((f) => f.severity === sev).length;

  const summary = {
    critical: findings.filter((f) => f.severity === 'CRITICAL').reduce((a, f) => a + f.count, 0),
    high:     findings.filter((f) => f.severity === 'HIGH').reduce((a, f) => a + f.count, 0),
    medium:   findings.filter((f) => f.severity === 'MEDIUM').reduce((a, f) => a + f.count, 0),
    low:      findings.filter((f) => f.severity === 'LOW').reduce((a, f) => a + f.count, 0),
    total:    findings.reduce((a, f) => a + f.count, 0),
  };

  const healthScore = Math.max(
    0,
    Math.floor(
      100 -
        (countBySev('CRITICAL') * 10 +
          countBySev('HIGH') * 4 +
          countBySev('MEDIUM') * 2 +
          countBySev('LOW') * 0.5),
    ),
  );

  return NextResponse.json({
    generatedAt:  new Date().toISOString(),
    totalNodes,
    totalEdges,
    totalSources,
    healthScore,
    findings,
    summary,
    coverage: {
      timeline: {
        eligible: totalNodes,
        covered:  timelineCovered,
        pct:      totalNodes > 0 ? Math.round((timelineCovered / totalNodes) * 100) : 0,
      },
      globe: {
        eligible: totalNodes,
        covered:  globeCovered,
        pct:      totalNodes > 0 ? Math.round((globeCovered / totalNodes) * 100) : 0,
      },
      search: {
        total:   totalNodes,
        indexed: searchIndexedCount,
        pct:     totalNodes > 0 ? Math.round((searchIndexedCount / totalNodes) * 100) : 0,
      },
    },
  });
}
