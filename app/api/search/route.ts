export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/search
 *
 * Three-tier search with Reciprocal Rank Fusion:
 *   Tier 1: tsvector full-text  (exact phrases, boolean operators)
 *   Tier 2: pg_trgm fuzzy       (typo tolerance, partial matches)
 *   Tier 3: pgvector semantic   (conceptual similarity — only when embedding provided)
 *
 * Query params:
 *   q          — search string (required)
 *   category   — category slug filter
 *   evidence   — evidence level filter (verified | strong_evidence | debated | speculative | mythological)
 *   limit      — results per page (default 20, max 100)
 *   cursor     — pagination cursor (nodeId of last result)
 *   embedding  — base64-encoded Float32Array of a query embedding (optional; enables semantic tier)
 */

const MAX_LIMIT   = 100;
const DEFAULT_LIMIT = 20;
const RRF_K = 60; // Reciprocal Rank Fusion constant

// Minimum similarity threshold for pg_trgm — below this is noise
const TRGM_THRESHOLD = 0.15;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const q          = (searchParams.get('q') ?? '').trim();
  const category   = searchParams.get('category') ?? undefined;
  const evidence   = searchParams.get('evidence')  ?? undefined;
  const limitParam = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit      = Math.min(Math.max(1, limitParam), MAX_LIMIT);
  const cursor     = searchParams.get('cursor') ?? undefined;
  const embParam   = searchParams.get('embedding') ?? undefined;

  if (!q) {
    return NextResponse.json({ error: 'q is required' }, { status: 400 });
  }

  try {
    // ── Tier 1: Full-text search (tsvector) ────────────────────────────────
    const exactResults = await prisma.$queryRaw<{ id: string; rank: number }[]>`
      SELECT n."id",
             ts_rank(n."search_vector",
                     websearch_to_tsquery('english', unaccent(${q}))) AS "rank"
      FROM   "Node" n
      WHERE  n."search_vector" @@ websearch_to_tsquery('english', unaccent(${q}))
        AND  n."status" = 'published'
        ${category ? prisma.$queryRaw`AND EXISTS (
            SELECT 1 FROM "Category" c WHERE c."id" = n."categoryId" AND c."slug" = ${category}
          )` : prisma.$queryRaw``}
        ${evidence ? prisma.$queryRaw`AND n."evidenceLevel" = ${evidence}` : prisma.$queryRaw``}
      ORDER  BY "rank" DESC
      LIMIT  50
    `;

    // ── Tier 2: Fuzzy search (pg_trgm) ────────────────────────────────────
    // Search on title and tags separately; union the results
    const fuzzyResults = await prisma.$queryRaw<{ id: string; sim: number }[]>`
      SELECT DISTINCT ON (n."id") n."id",
             GREATEST(
               similarity(n."title", ${q}),
               COALESCE((
                 SELECT MAX(similarity(t."tag", ${q}))
                 FROM   "NodeTag" t
                 WHERE  t."nodeId" = n."id"
               ), 0)
             ) AS "sim"
      FROM   "Node" n
      WHERE  n."status" = 'published'
        AND  (
          similarity(n."title", ${q}) > ${TRGM_THRESHOLD}
          OR EXISTS (
            SELECT 1 FROM "NodeTag" t
            WHERE t."nodeId" = n."id"
              AND similarity(t."tag", ${q}) > ${TRGM_THRESHOLD}
          )
        )
        ${category ? prisma.$queryRaw`AND EXISTS (
            SELECT 1 FROM "Category" c WHERE c."id" = n."categoryId" AND c."slug" = ${category}
          )` : prisma.$queryRaw``}
        ${evidence ? prisma.$queryRaw`AND n."evidenceLevel" = ${evidence}` : prisma.$queryRaw``}
      ORDER  BY n."id", "sim" DESC
      LIMIT  50
    `;

    // ── Tier 3: Semantic search (pgvector) ────────────────────────────────
    // Only runs when a pre-computed embedding is passed by the client.
    // The caller (UI) is responsible for generating the embedding via
    // POST /api/search/embed, then passing it here as base64 Float32Array.
    let semanticResults: { id: string; similarity: number }[] = [];

    if (embParam) {
      try {
        const buf  = Buffer.from(embParam, 'base64');
        const f32  = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        const vec  = `[${Array.from(f32).join(',')}]`;

        semanticResults = await prisma.$queryRaw<{ id: string; similarity: number }[]>`
          SELECT ne."nodeId" AS "id",
                 1 - (ne."embedding" <=> ${vec}::vector) AS "similarity"
          FROM   "NodeEmbedding" ne
          JOIN   "Node" n ON n."id" = ne."nodeId"
          WHERE  n."status" = 'published'
            ${category ? prisma.$queryRaw`AND EXISTS (
                SELECT 1 FROM "Category" c WHERE c."id" = n."categoryId" AND c."slug" = ${category}
              )` : prisma.$queryRaw``}
            ${evidence ? prisma.$queryRaw`AND n."evidenceLevel" = ${evidence}` : prisma.$queryRaw``}
          ORDER  BY ne."embedding" <=> ${vec}::vector
          LIMIT  50
        `;
      } catch {
        // Invalid embedding — skip semantic tier
      }
    }

    // ── Reciprocal Rank Fusion ─────────────────────────────────────────────
    const scores: Record<string, number> = {};

    const addRRF = (results: { id: string }[], weight: number) => {
      results.forEach((r, i) => {
        scores[r.id] = (scores[r.id] ?? 0) + weight * (1 / (RRF_K + i + 1));
      });
    };

    addRRF(exactResults,    1.5);  // exact match weighted highest
    addRRF(fuzzyResults,    1.0);
    addRRF(semanticResults, 1.2);  // semantic slightly above fuzzy

    const rankedIds = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    if (rankedIds.length === 0) {
      return NextResponse.json({ nodes: [], nextCursor: null, total: 0 });
    }

    // ── Cursor pagination on ranked IDs ───────────────────────────────────
    const cursorIdx = cursor ? rankedIds.indexOf(cursor) + 1 : 0;
    const pageIds   = rankedIds.slice(cursorIdx, cursorIdx + limit + 1);
    const hasNext   = pageIds.length > limit;
    const fetchIds  = pageIds.slice(0, limit);

    // ── Fetch full node data ───────────────────────────────────────────────
    const nodes = await prisma.node.findMany({
      where: { id: { in: fetchIds }, status: 'published' },
      include: {
        category: true,
        tags:     { orderBy: { tag: 'asc' } },
      },
    });

    // Re-sort to RRF order (Prisma findMany doesn't preserve IN order)
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const sorted  = fetchIds.map(id => nodeMap.get(id)).filter(Boolean);

    // Attach per-result scores for client-side debugging / display
    const withScores = sorted.map(n => ({
      ...n,
      _searchScore: scores[n!.id] ?? 0,
    }));

    return NextResponse.json({
      nodes:      withScores,
      nextCursor: hasNext ? fetchIds[fetchIds.length - 1] : null,
      total:      rankedIds.length,
    });
  } catch (err) {
    console.error('[search] error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
