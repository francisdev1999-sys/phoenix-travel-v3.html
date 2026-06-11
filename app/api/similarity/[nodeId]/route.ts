export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadNode, loadPublishedEdges } from '@/lib/similarity/db-loader';
import { computeSimilarity, getTopSimilar } from '@/lib/similarity/engine';
import type { RankedSimilarity } from '@/lib/similarity/engine';
import type { GraphNode } from '@/lib/graph/types';

const DISCLAIMER =
  'Similarity scores are advisory only. They do not constitute evidence of any relationship between nodes.';

interface EnrichedResult extends RankedSimilarity {
  node: { id: string; title: string; icon: string | null; evidenceLevel: string; category: string } | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> },
) {
  const { nodeId } = await params;
  const limit = 10;

  // ── 1. Check ResearchSimilarity table (pre-computed) ─────────────────────────
  const cached = await prisma.researchSimilarity.findMany({
    where: {
      OR: [{ nodeAId: nodeId }, { nodeBId: nodeId }],
    },
    orderBy: { overallSimilarity: 'desc' },
    take: limit,
  });

  if (cached.length >= Math.min(limit, 3)) {
    // Enough pre-computed results — enrich with node metadata
    const peerIds = cached.map(r => (r.nodeAId === nodeId ? r.nodeBId : r.nodeAId));
    const peers = await prisma.node.findMany({
      where: { id: { in: peerIds }, status: 'published' },
      select: { id: true, title: true, icon: true, evidenceLevel: true, category: { select: { name: true } } },
    });
    const peerMap = new Map(peers.map(p => [p.id, p]));

    const results: EnrichedResult[] = cached.map(r => {
      const peerId = r.nodeAId === nodeId ? r.nodeBId : r.nodeAId;
      const peer   = peerMap.get(peerId) ?? null;
      return {
        nodeId:             peerId,
        overall:            r.overallSimilarity,
        research_potential: r.researchPotentialScore,
        dimensions:         r.breakdown as unknown as RankedSimilarity['dimensions'],
        critic:             r.criticAnalysis as unknown as RankedSimilarity['critic'],
        node: peer ? { id: peer.id, title: peer.title, icon: peer.icon, evidenceLevel: peer.evidenceLevel, category: peer.category.name } : null,
      };
    });

    return NextResponse.json({ nodeId, results, disclaimer: DISCLAIMER, source: 'cache' });
  }

  // ── 2. No cached results — compute live ──────────────────────────────────────
  const [targetNode, allNodes, edges] = await Promise.all([
    loadNode(nodeId),
    // Load all published nodes for comparison (lazy: only when cache miss)
    prisma.node.findMany({
      where: { status: 'published', NOT: { id: nodeId } },
      select: {
        id: true,
        title: true,
        description: true,
        mainstreamView: true,
        evidenceLevel: true,
        confidenceScore: true,
        icon: true,
        color: true,
        lat: true, lon: true,
        region: true, country: true,
        year: true, dateStart: true, dateEnd: true, datePrecision: true,
        category: { select: { name: true } },
        tags: { select: { tag: true } },
        claims: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
        criticisms: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
        openQuestions: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
        sourceLinks: {
          select: { source: { select: { id: true, title: true, sourceType: true, author: true, publicationYear: true, url: true, credibilityScore: true } } },
          take: 10,
        },
      },
    }),
    loadPublishedEdges(),
  ]);

  if (!targetNode) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  }

  // Convert peer rows to GraphNode
  const peerNodes: GraphNode[] = allNodes.map(n => ({
    id: n.id,
    title: n.title,
    category: n.category.name as GraphNode['category'],
    description: n.description,
    claims: n.claims.map(c => c.text),
    criticisms: n.criticisms.map(c => c.text),
    mainstream_view: n.mainstreamView ?? '',
    open_questions: n.openQuestions.map(q => q.text),
    tags: n.tags.map(t => t.tag),
    evidence_level: n.evidenceLevel as GraphNode['evidence_level'],
    confidence_score: n.confidenceScore,
    icon: n.icon ?? undefined,
    color: n.color ?? undefined,
    coordinates: n.lat != null && n.lon != null ? [n.lat, n.lon] as [number, number] : undefined,
    year: n.year ?? undefined,
    date_start: n.dateStart ?? undefined,
    date_end: n.dateEnd ?? undefined,
    region: n.region ?? undefined,
    country: n.country ?? undefined,
    sources: n.sourceLinks.filter(sl => sl.source).map(sl => ({
      id: sl.source!.id,
      title: sl.source!.title,
      source_type: sl.source!.sourceType as import('@/lib/graph/types').ResearchSourceType,
      author: sl.source!.author ?? undefined,
      publication_year: sl.source!.publicationYear ?? undefined,
      url: sl.source!.url ?? undefined,
      credibility_score: sl.source!.credibilityScore,
    })),
  }));

  const ranked = getTopSimilar(nodeId, [targetNode, ...peerNodes], edges, limit);

  // Store computed results asynchronously (fire-and-forget)
  void storeResults(nodeId, ranked);

  const peerMetaMap = new Map(allNodes.map(p => [p.id, p]));
  const results: EnrichedResult[] = ranked.map(r => {
    const peer = peerMetaMap.get(r.nodeId);
    return {
      ...r,
      node: peer ? { id: peer.id, title: peer.title, icon: peer.icon, evidenceLevel: peer.evidenceLevel, category: peer.category.name } : null,
    };
  });

  return NextResponse.json({ nodeId, results, disclaimer: DISCLAIMER, source: 'live' });
}

async function storeResults(nodeId: string, ranked: RankedSimilarity[]) {
  try {
    await Promise.all(
      ranked.map(r => {
        const [nA, nB] = nodeId < r.nodeId ? [nodeId, r.nodeId] : [r.nodeId, nodeId];
        return prisma.researchSimilarity.upsert({
          where:  { nodeAId_nodeBId: { nodeAId: nA, nodeBId: nB } },
          create: {
            nodeAId: nA, nodeBId: nB,
            overallSimilarity:     r.overall,
            thematicSimilarity:    r.dimensions.thematic.score,
            timelineSimilarity:    r.dimensions.timeline.score,
            geographicSimilarity:  r.dimensions.geographic.score,
            sourceSimilarity:      r.dimensions.source.score,
            evidenceSimilarity:    r.dimensions.evidence.score,
            entitySimilarity:      r.dimensions.entity.score,
            relationshipSimilarity:r.dimensions.relationship.score,
            researchPotentialScore:r.research_potential,
            confidence:            r.overall,
            explanation:           r.dimensions.thematic.rationale,
            criticAnalysis:        r.critic as object,
            breakdown:             r.dimensions as unknown as object,
          },
          update: {
            overallSimilarity:     r.overall,
            thematicSimilarity:    r.dimensions.thematic.score,
            timelineSimilarity:    r.dimensions.timeline.score,
            geographicSimilarity:  r.dimensions.geographic.score,
            sourceSimilarity:      r.dimensions.source.score,
            evidenceSimilarity:    r.dimensions.evidence.score,
            entitySimilarity:      r.dimensions.entity.score,
            relationshipSimilarity:r.dimensions.relationship.score,
            researchPotentialScore:r.research_potential,
            confidence:            r.overall,
            explanation:           r.dimensions.thematic.rationale,
            criticAnalysis:        r.critic as object,
            breakdown:             r.dimensions as unknown as object,
          },
        }).catch(() => {/* best-effort */});
      }),
    );
  } catch { /* best-effort */ }
}
