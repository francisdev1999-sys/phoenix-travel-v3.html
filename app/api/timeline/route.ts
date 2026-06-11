export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { nodes as staticNodes } from '@/lib/graph';

export interface TimelineEntry {
  id:             string;
  year:           number;
  dateEnd?:       number;
  datePrecision?: string;
  title:          string;
  description:    string;
  category:       string;
  era:            string;
  evidenceLevel:  string;
  confidenceScore:number;
  sourceCount:    number;
  location?:      string;
  icon?:          string;
  tags:           string[];
  isLive:         boolean;
}

type Era = 'ancient' | 'classical' | 'medieval' | 'modern' | 'contemporary';

function getEra(year: number): Era {
  if (year < -500)  return 'ancient';
  if (year < 500)   return 'classical';
  if (year < 1500)  return 'medieval';
  if (year < 1950)  return 'modern';
  return 'contemporary';
}

/** Year range for a given era (used to build WHERE clauses) */
const ERA_RANGES: Record<Era, { gte?: number; lt?: number }> = {
  ancient:      {              lt: -500 },
  classical:    { gte: -500,   lt:  500 },
  medieval:     { gte:  500,   lt: 1500 },
  modern:       { gte: 1500,   lt: 1950 },
  contemporary: { gte: 1950             },
};

const VALID_ERAS = new Set<string>(['ancient', 'classical', 'medieval', 'modern', 'contemporary']);

const CREDIBLE = new Set(['verified', 'strong_evidence', 'debated']);

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // ── Parse query params ──────────────────────────────────────────────────
  const page      = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10) || 1);
  const limitRaw  = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit     = Math.min(Math.max(1, isNaN(limitRaw) ? DEFAULT_LIMIT : limitRaw), MAX_LIMIT);
  const eraParam  = searchParams.get('era') ?? undefined;
  const statsOnly = searchParams.get('stats') === 'true';

  const era: Era | undefined = eraParam && VALID_ERAS.has(eraParam)
    ? (eraParam as Era)
    : undefined;

  // ── Era year WHERE clause for the DB query ───────────────────────────────
  const eraYearWhere = era
    ? { year: { ...(ERA_RANGES[era].gte !== undefined ? { gte: ERA_RANGES[era].gte } : {}),
                ...(ERA_RANGES[era].lt  !== undefined ? { lt:  ERA_RANGES[era].lt  } : {}) } }
    : undefined;

  // ── 1. DB ────────────────────────────────────────────────────────────────
  let liveEntries: TimelineEntry[] = [];

  // Coverage counters (populated from DB when available)
  let totalPublished = 0;
  let withDates      = 0;
  let withoutDates   = 0;
  const byEra: Record<Era, number> = { ancient: 0, classical: 0, medieval: 0, modern: 0, contemporary: 0 };
  let nodesWithoutDates: { id: string; title: string; category: string }[] = [];

  try {
    // Total published node count
    totalPublished = await prisma.node.count({ where: { status: 'published' } });
    withDates      = await prisma.node.count({
      where: { status: 'published', OR: [{ year: { not: null } }, { dateStart: { not: null } }] },
    });
    withoutDates = totalPublished - withDates;

    // Per-era counts (use year field; null years fall into "no era")
    for (const e of Object.keys(ERA_RANGES) as Era[]) {
      const range = ERA_RANGES[e];
      byEra[e] = await prisma.node.count({
        where: {
          status: 'published',
          year: {
            ...(range.gte !== undefined ? { gte: range.gte } : {}),
            ...(range.lt  !== undefined ? { lt:  range.lt  } : {}),
          },
        },
      });
    }

    // Nodes without dates (only fetched when stats=true)
    if (statsOnly) {
      const missing = await prisma.node.findMany({
        where: { status: 'published', year: null, dateStart: null },
        select: { id: true, title: true, category: { select: { name: true } } },
        take: 100,
      });
      nodesWithoutDates = missing.map(n => ({
        id:       n.id,
        title:    n.title,
        category: n.category.name,
      }));
    }

    // ── Early return for stats-only ───────────────────────────────────────
    if (statsOnly) {
      const coveragePct = totalPublished > 0
        ? Math.round((withDates / totalPublished) * 1000) / 10
        : 0;
      return NextResponse.json({
        entries:    [],
        pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        coverage: {
          totalPublished,
          withDates,
          withoutDates,
          coveragePct,
          byEra,
          nodesWithoutDates,
        },
      });
    }

    // ── Main paginated DB query ───────────────────────────────────────────
    const baseWhere = {
      status: 'published' as const,
      OR: [{ year: { not: null } }, { dateStart: { not: null } }],
      ...(eraYearWhere ?? {}),
    };

    // Count total matching entries (for pagination metadata)
    const totalMatching = await prisma.node.count({ where: baseWhere });

    const skip = (page - 1) * limit;

    const dbNodes = await prisma.node.findMany({
      where: baseWhere,
      include: {
        category:    { select: { name: true } },
        tags:        { select: { tag: true } },
        sourceLinks: {
          where:  { source: { status: 'approved' }, nodeId: { not: null } },
          select: { id: true },
        },
      },
      orderBy: [
        { year:      'asc' },
        { dateStart: 'asc' },
      ],
      skip,
      take: limit,
    });

    const rawEntries = dbNodes
      // credibility gate: must have credible evidence OR at least 1 approved source
      .filter(n => CREDIBLE.has(n.evidenceLevel) || n.sourceLinks.length > 0)
      .map(n => {
        const year = (n.year ?? n.dateStart)!;
        const entry: TimelineEntry = {
          id:             n.id,
          year,
          dateEnd:        n.dateEnd   ?? undefined,
          datePrecision:  n.datePrecision ?? undefined,
          title:          n.title,
          description:    n.description.slice(0, 500),
          category:       n.category.name,
          era:            getEra(year),
          evidenceLevel:  n.evidenceLevel,
          confidenceScore:n.confidenceScore,
          sourceCount:    n.sourceLinks.length,
          location:       [n.region, n.country].filter(Boolean).join(', ') || undefined,
          icon:           n.icon ?? undefined,
          tags:           n.tags.map(t => t.tag),
          isLive:         true,
        };
        return entry;
      });

    // Apply in-app era filter for nodes that resolved year from dateStart
    liveEntries = era
      ? rawEntries.filter(e => getEra(e.year) === era)
      : rawEntries;

    const totalPages = Math.max(1, Math.ceil(totalMatching / limit));

    const coveragePct = totalPublished > 0
      ? Math.round((withDates / totalPublished) * 1000) / 10
      : 0;

    return NextResponse.json({
      entries: liveEntries,
      pagination: {
        page,
        limit,
        total:      totalMatching,
        totalPages,
        hasNext:    page < totalPages,
        hasPrev:    page > 1,
      },
      coverage: {
        totalPublished,
        withDates,
        withoutDates,
        coveragePct,
        byEra,
      },
    });
  } catch {
    // DB unavailable — fall through to static-only path
  }

  // ── 2. Static-only fallback (DB unavailable) ────────────────────────────
  const staticEntries: TimelineEntry[] = staticNodes
    .filter(n =>
      n.year != null &&
      CREDIBLE.has(n.evidence_level) &&
      (era ? getEra(n.year!) === era : true),
    )
    .map(n => ({
      id:             n.id,
      year:           n.year!,
      title:          n.title,
      description:    n.description.slice(0, 500),
      category:       n.category,
      era:            getEra(n.year!),
      evidenceLevel:  n.evidence_level,
      confidenceScore:n.confidence_score,
      sourceCount:    (n.sources ?? []).length,
      location:       n.region ?? n.country ?? undefined,
      icon:           n.icon ?? undefined,
      tags:           n.tags ?? [],
      isLive:         false,
    }))
    .sort((a, b) => a.year - b.year);

  const total      = staticEntries.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const skip       = (page - 1) * limit;
  const pageSlice  = staticEntries.slice(skip, skip + limit);

  // Coverage from static data
  const staticByEra: Record<Era, number> = { ancient: 0, classical: 0, medieval: 0, modern: 0, contemporary: 0 };
  for (const e of staticEntries) {
    staticByEra[e.era as Era] = (staticByEra[e.era as Era] ?? 0) + 1;
  }

  return NextResponse.json({
    entries: pageSlice,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    coverage: {
      totalPublished: staticEntries.length,
      withDates:      staticEntries.length,
      withoutDates:   0,
      coveragePct:    100,
      byEra:          staticByEra,
      ...(statsOnly ? { nodesWithoutDates: [] } : {}),
    },
  });
}
