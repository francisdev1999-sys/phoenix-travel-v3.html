/**
 * Shared job handlers for the IngestionJob queue (lib/jobs/queue.ts).
 * Used by both POST /api/jobs/process (single job, on-demand) and
 * POST /api/cron/process-jobs (bounded-batch drain, scheduled).
 */
import { prisma } from '@/lib/db';
import { invalidateNode } from '@/lib/cache/node-cache';
import { recalculateNodeMaturity } from '@/lib/maturity/scorer';
import { computeSimilarity } from '@/lib/similarity/engine';
import { loadPublishedNodes, loadPublishedEdges } from '@/lib/similarity/db-loader';

export async function processJob(type: string, payload: Record<string, string>) {
  switch (type) {
    case 'embed-node':            return embedNode(payload.nodeId);
    case 'embed-source':          return embedSource(payload.sourceId);
    case 'rebuild-adjacency':     return rebuildAdjacency(payload.nodeId);
    case 'similarity-node':       return computeNodeSimilarity(payload.nodeId);
    case 'enrich-source':         return enrichSource(payload.sourceId);
    case 'propagate-archive':     return propagateArchive(payload.nodeId);
    case 'suggest-relationships': return suggestRelationships(payload.nodeId);
    case 'update-maturity':       return updateMaturity(payload.entityType as 'node' | 'source', payload.entityId);
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function embedNode(nodeId: string) {
  const node = await prisma.node.findUnique({
    where:   { id: nodeId },
    include: {
      tags:       true,
      claims:     { orderBy: { orderIndex: 'asc' } },
      criticisms: { orderBy: { orderIndex: 'asc' } },
    },
  });

  if (!node) throw new Error(`Node not found: ${nodeId}`);

  const text = [
    node.title,
    node.description,
    node.mainstreamView,
    node.tags.map(t => t.tag).join(' '),
    node.claims.map(c => c.text).join(' '),
    node.criticisms.map(c => c.text).join(' '),
  ].filter(Boolean).join(' ').slice(0, 8000);

  const embedding = await generateEmbedding(text);
  if (embedding === null) {
    console.warn(`[embed-node] Skipped ${nodeId} — VOYAGE_API_KEY not configured`);
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO "NodeEmbedding" ("nodeId", "embedding", "model", "updatedAt")
    VALUES (${nodeId}, ${embedding}::vector, 'voyage-3', NOW())
    ON CONFLICT ("nodeId") DO UPDATE
    SET "embedding" = EXCLUDED."embedding",
        "model"     = EXCLUDED."model",
        "updatedAt" = NOW()
  `;

  invalidateNode(nodeId);
}

async function embedSource(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error(`Source not found: ${sourceId}`);

  const text = [source.title, source.author, source.abstract, source.notes]
    .filter(Boolean).join(' ').slice(0, 8000);

  const embedding = await generateEmbedding(text);
  if (embedding === null) {
    console.warn(`[embed-source] Skipped ${sourceId} — VOYAGE_API_KEY not configured`);
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO "SourceEmbedding" ("sourceId", "embedding", "model", "updatedAt")
    VALUES (${sourceId}, ${embedding}::vector, 'voyage-3', NOW())
    ON CONFLICT ("sourceId") DO UPDATE
    SET "embedding" = EXCLUDED."embedding",
        "model"     = EXCLUDED."model",
        "updatedAt" = NOW()
  `;
}

async function rebuildAdjacency(nodeId: string) {
  // Re-fetch direct connections and rewrite the adjacency cache
  const edges = await prisma.edge.findMany({
    where: {
      OR: [{ fromId: nodeId }, { toId: nodeId }],
      status: 'published',
    },
    select: { id: true, fromId: true, toId: true, confidenceScore: true, strengthScore: true },
  });

  const hop1 = edges.map(e => ({
    nodeId:    e.fromId === nodeId ? e.toId : e.fromId,
    edgeId:    e.id,
    score:     e.confidenceScore,
    direction: e.fromId === nodeId ? 'outgoing' : 'incoming',
  }));

  await prisma.adjacencyCache.upsert({
    where:  { nodeId },
    create: { nodeId, hop1, hop2: [], cachedAt: new Date() },
    update: { hop1, cachedAt: new Date() },
  });

  invalidateNode(nodeId);
}

async function computeNodeSimilarity(nodeId: string) {
  const node = await prisma.node.findUnique({
    where:  { id: nodeId, status: 'published' },
    select: { id: true },
  });
  if (!node) return; // skip if not published

  const [allNodes, allEdges] = await Promise.all([
    loadPublishedNodes(),
    loadPublishedEdges(),
  ]);

  const target = allNodes.find(n => n.id === nodeId);
  if (!target) return;

  // Compute similarity against at most 50 other nodes (most recently compared or all if small)
  const others = allNodes.filter(n => n.id !== nodeId).slice(0, 50);

  const upserts = await Promise.allSettled(
    others.map(async (other) => {
      const [a, b] = nodeId < other.id ? [target, other] : [other, target];
      const result = computeSimilarity(a, b, allEdges);

      await prisma.researchSimilarity.upsert({
        where:  { nodeAId_nodeBId: { nodeAId: a.id, nodeBId: b.id } },
        create: {
          nodeAId:               a.id,
          nodeBId:               b.id,
          overallSimilarity:     result.overall,
          thematicSimilarity:    result.dimensions.thematic.score,
          timelineSimilarity:    result.dimensions.timeline.score,
          geographicSimilarity:  result.dimensions.geographic.score,
          sourceSimilarity:      result.dimensions.source.score,
          evidenceSimilarity:    result.dimensions.evidence.score,
          entitySimilarity:      result.dimensions.entity.score,
          relationshipSimilarity: result.dimensions.relationship.score,
          researchPotentialScore: result.research_potential,
          confidence:            Math.min(...Object.values(result.dimensions).map(d => d.confidence)),
          explanation:           result.critic.disclaimer,
          criticAnalysis:        result.critic as unknown as object,
          breakdown:             result.dimensions as unknown as object,
        },
        update: {
          overallSimilarity:     result.overall,
          thematicSimilarity:    result.dimensions.thematic.score,
          timelineSimilarity:    result.dimensions.timeline.score,
          geographicSimilarity:  result.dimensions.geographic.score,
          sourceSimilarity:      result.dimensions.source.score,
          evidenceSimilarity:    result.dimensions.evidence.score,
          entitySimilarity:      result.dimensions.entity.score,
          relationshipSimilarity: result.dimensions.relationship.score,
          researchPotentialScore: result.research_potential,
          confidence:            Math.min(...Object.values(result.dimensions).map(d => d.confidence)),
          explanation:           result.critic.disclaimer,
          criticAnalysis:        result.critic as unknown as object,
          breakdown:             result.dimensions as unknown as object,
          updatedAt:             new Date(),
        },
      });
    }),
  );

  const errors = upserts.filter(r => r.status === 'rejected').length;
  if (errors > 0) {
    console.warn(`[similarity-node] ${errors}/${others.length} pairs failed for ${nodeId}`);
  }
}

async function enrichSource(sourceId: string) {
  const source = await prisma.source.findUnique({
    where:  { id: sourceId },
    select: { id: true, url: true, doi: true, abstract: true, credibilityScore: true },
  });
  if (!source) return;

  // If the source already has an abstract or no URL, skip enrichment
  if (source.abstract || (!source.url && !source.doi)) return;

  // Attempt to fetch Open Graph / meta description from URL as a lightweight enrichment
  if (source.url) {
    try {
      const res = await fetch(source.url, {
        headers: { 'User-Agent': 'NexusArchive/1.0 (archive enrichment bot)' },
        signal:  AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const html    = await res.text();
        const ogDesc  = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1];
        const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1];
        const abstract = (ogDesc ?? metaDesc ?? '').trim().slice(0, 2000);
        if (abstract.length > 30) {
          await prisma.source.update({
            where: { id: sourceId },
            data:  { abstract },
          });
        }
      }
    } catch {
      // Best-effort — enrich failure is non-fatal
    }
  }
}

async function propagateArchive(nodeId: string) {
  const node = await prisma.node.findUnique({
    where:  { id: nodeId },
    select: { id: true, status: true },
  });
  if (!node || node.status !== 'archived') return;

  // Archive edges whose BOTH endpoints are now archived or deleted
  const edges = await prisma.edge.findMany({
    where: {
      OR: [{ fromId: nodeId }, { toId: nodeId }],
      status: { not: 'archived' },
    },
    select: {
      id:     true,
      fromId: true,
      toId:   true,
    },
  });

  const idsToArchive: string[] = [];
  for (const edge of edges) {
    const otherId    = edge.fromId === nodeId ? edge.toId : edge.fromId;
    const otherNode  = await prisma.node.findUnique({
      where:  { id: otherId },
      select: { status: true },
    });
    // Archive edge only when the other endpoint is also archived
    if (otherNode && otherNode.status === 'archived') {
      idsToArchive.push(edge.id);
    }
  }

  if (idsToArchive.length > 0) {
    await prisma.edge.updateMany({
      where: { id: { in: idsToArchive } },
      data:  { status: 'archived' },
    });
    console.info(`[propagate-archive] Archived ${idsToArchive.length} edges for node ${nodeId}`);
  }
}

// Max candidates to generate per invocation to stay within Railway timeout budget
const REL_SUGGEST_LIMIT = 10;

async function suggestRelationships(nodeId: string) {
  const node = await prisma.node.findUnique({
    where:  { id: nodeId, status: 'published' },
    select: { id: true, title: true, categoryId: true, evidenceLevel: true, confidenceScore: true },
  });
  if (!node) return;

  // Find nearby nodes (same category, published, no existing edge or suggestion)
  const existingEdgeNodeIds = await prisma.edge.findMany({
    where:  { OR: [{ fromId: nodeId }, { toId: nodeId }] },
    select: { fromId: true, toId: true },
  }).then(edges => new Set(edges.flatMap(e => [e.fromId, e.toId]).filter(id => id !== nodeId)));

  const existingSuggestionNodeIds = await prisma.relationshipSuggestion.findMany({
    where:  { OR: [{ fromNodeId: nodeId }, { toNodeId: nodeId }] },
    select: { fromNodeId: true, toNodeId: true },
  }).then(rows => new Set(rows.flatMap(r => [r.fromNodeId, r.toNodeId]).filter(id => id !== nodeId)));

  const candidates = await prisma.node.findMany({
    where: {
      id:         { notIn: [...existingEdgeNodeIds, ...existingSuggestionNodeIds, nodeId] },
      categoryId: node.categoryId,
      status:     'published',
    },
    select: { id: true, title: true, evidenceLevel: true, confidenceScore: true },
    take:   REL_SUGGEST_LIMIT,
  });

  if (candidates.length === 0) return;

  const suggestions = candidates.map(c => ({
    fromNodeId:       nodeId,
    toNodeId:         c.id,
    relationshipType: 'related_to',
    reason:           `Both nodes share the same category and evidence level (${node.evidenceLevel}).`,
    evidenceBasis:    'category_match',
    confidenceScore:  Math.min(node.confidenceScore, c.confidenceScore) * 0.8,
    riskLevel:        'low',
    signalBreakdown:  { categoryMatch: true, evidenceLevel: node.evidenceLevel },
    generationMethod: 'rule_based',
    triggeredByNodeId: nodeId,
  }));

  // Upsert to avoid duplicates (unique on [fromNodeId, toNodeId])
  await Promise.allSettled(
    suggestions.map(s =>
      prisma.relationshipSuggestion.upsert({
        where:  { fromNodeId_toNodeId: { fromNodeId: s.fromNodeId, toNodeId: s.toNodeId } },
        create: s,
        update: { updatedAt: new Date() },
      }),
    ),
  );
}

async function updateMaturity(entityType: 'node' | 'source', entityId: string) {
  if (entityType === 'node') {
    await recalculateNodeMaturity(entityId);
  }
  // Source maturity scoring is not yet implemented — no-op for now
}

// ── Embedding generation ──────────────────────────────────────────────────────

// Returns null when VOYAGE_API_KEY is not configured — callers must skip
// the DB write in that case. Never returns a zero-vector placeholder, which
// would silently corrupt cosine-similarity queries.
async function generateEmbedding(text: string): Promise<string | null> {
  const apiKey = process.env.VOYAGE_API_KEY;

  if (!apiKey) return null;

  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model: 'voyage-3',
      input: [text],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage AI embeddings API error ${res.status}: ${body}`);
  }

  const json = await res.json() as { data: { embedding: number[] }[] };
  const vec   = json.data[0].embedding;
  return `[${vec.join(',')}]`;
}
