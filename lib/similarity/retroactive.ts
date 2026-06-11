/**
 * Retroactive similarity processor — DB-backed.
 *
 * ANTI-ECHO-CHAMBER GUARANTEES (enforced, never negotiate):
 *   - NEVER creates or modifies GraphEdges
 *   - NEVER changes evidenceLevel, confidenceScore, or node content
 *   - NEVER auto-approves or auto-publishes anything
 *   - Stores advisory metadata only in ResearchSimilarity table
 *   - Errors per-pair are silently swallowed; run-level errors logged
 */

import { prisma } from '@/lib/db';
import { computeSimilarity, detectContradictions, type ContradictionPair } from './engine';
import { loadPublishedNodes, loadPublishedEdges } from './db-loader';

const WRITE_BATCH = 100; // upsert this many pairs per DB call

interface RebuildStatus {
  status:        'idle' | 'running' | 'complete' | 'failed';
  startedAt?:    string;
  completedAt?:  string;
  totalNodes:    number;
  totalPairs:    number;
  upsertedPairs: number;
  errorCount:    number;
  message?:      string;
}

async function setRebuildStatus(s: RebuildStatus) {
  await prisma.systemConfig.upsert({
    where:  { key: 'similarity_rebuild_status' },
    create: { key: 'similarity_rebuild_status', value: s as object },
    update: { value: s as object },
  }).catch(() => {/* best-effort */});
}

export async function getRebuildStatus(): Promise<RebuildStatus> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: 'similarity_rebuild_status' } });
    if (row) return row.value as unknown as RebuildStatus;
  } catch { /* ignore */ }
  return { status: 'idle', totalNodes: 0, totalPairs: 0, upsertedPairs: 0, errorCount: 0 };
}

// ── Retroactive rebuild ────────────────────────────────────────────────────────

export async function retroactiveSimilarityRebuild(): Promise<void> {
  const startedAt = new Date().toISOString();
  try {
    const [liveNodes, liveEdges] = await Promise.all([
      loadPublishedNodes(),
      loadPublishedEdges(),
    ]);

    const total = liveNodes.length;
    const totalPairs = (total * (total - 1)) / 2;

    await setRebuildStatus({
      status: 'running', startedAt,
      totalNodes: total, totalPairs, upsertedPairs: 0, errorCount: 0,
    });

    console.info(`[similarity] Retroactive rebuild — ${total} nodes, ${totalPairs} pairs`);

    let upserted = 0;
    let errors   = 0;

    // Collect a batch then write
    const batch: Parameters<typeof prisma.researchSimilarity.upsert>[0]['create'][] = [];

    const flushBatch = async () => {
      if (batch.length === 0) return;
      await Promise.all(
        batch.map(b =>
          prisma.researchSimilarity.upsert({
            where:  { nodeAId_nodeBId: { nodeAId: b.nodeAId, nodeBId: b.nodeBId } },
            create: b,
            update: {
              overallSimilarity:      b.overallSimilarity,
              thematicSimilarity:     b.thematicSimilarity,
              timelineSimilarity:     b.timelineSimilarity,
              geographicSimilarity:   b.geographicSimilarity,
              sourceSimilarity:       b.sourceSimilarity,
              evidenceSimilarity:     b.evidenceSimilarity,
              entitySimilarity:       b.entitySimilarity,
              relationshipSimilarity: b.relationshipSimilarity,
              researchPotentialScore: b.researchPotentialScore,
              confidence:             b.confidence,
              explanation:            b.explanation,
              criticAnalysis:         b.criticAnalysis,
              breakdown:              b.breakdown,
            },
          }).catch(() => { errors++; }),
        ),
      );
      upserted += batch.length;
      batch.length = 0;

      await setRebuildStatus({
        status: 'running', startedAt,
        totalNodes: total, totalPairs, upsertedPairs: upserted, errorCount: errors,
      });
    };

    for (let i = 0; i < liveNodes.length; i++) {
      for (let j = i + 1; j < liveNodes.length; j++) {
        const a = liveNodes[i];
        const b = liveNodes[j];

        try {
          const r = computeSimilarity(a, b, liveEdges);

          // Canonical ordering: nodeAId < nodeBId lexicographically
          const [nA, nB] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];

          batch.push({
            nodeAId:               nA,
            nodeBId:               nB,
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
          });

          if (batch.length >= WRITE_BATCH) await flushBatch();
        } catch {
          errors++;
        }
      }
    }

    await flushBatch();

    console.info(`[similarity] Rebuild complete — ${upserted} pairs stored, ${errors} errors`);
    await setRebuildStatus({
      status: 'complete', startedAt, completedAt: new Date().toISOString(),
      totalNodes: total, totalPairs, upsertedPairs: upserted, errorCount: errors,
    });
  } catch (err) {
    console.error('[similarity] Retroactive rebuild failed:', err);
    await setRebuildStatus({
      status: 'failed', startedAt,
      totalNodes: 0, totalPairs: 0, upsertedPairs: 0, errorCount: 1,
      message: String(err),
    });
  }
}

// ── Audit — reads ResearchSimilarity table (no recomputation) ─────────────────

export interface SimilarityAuditResult {
  node_count:             number;
  edge_count:             number;
  computed_pairs:         number;
  coverage_pct:           number;
  high_similarity_pairs:  { nodeAId: string; nodeBId: string; score: number }[];
  top_research_potential: { nodeAId: string; nodeBId: string; potential: number }[];
  contradictions:         ContradictionPair[];
  echo_chamber_clusters:  { nodeId: string; similar_count: number }[];
  duplicate_concept_risk: { nodeAId: string; nodeBId: string; score: number }[];
  relationship_inflation_risk: {
    description:      string;
    high_sim_no_edge: number;
  };
  disclaimer: string;
}

export async function runSimilarityAudit(): Promise<SimilarityAuditResult> {
  const [nodeCount, edgeCount, computedPairs] = await Promise.all([
    prisma.node.count({ where: { status: 'published' } }),
    prisma.edge.count({ where: { status: 'published' } }),
    prisma.researchSimilarity.count(),
  ]);

  const totalPossible = (nodeCount * (nodeCount - 1)) / 2;
  const coveragePct   = totalPossible > 0 ? Math.round((computedPairs / totalPossible) * 100) : 0;

  const [highSim, topPotential] = await Promise.all([
    prisma.researchSimilarity.findMany({
      where:   { overallSimilarity: { gte: 0.7 } },
      orderBy: { overallSimilarity: 'desc' },
      take: 20,
      select: { nodeAId: true, nodeBId: true, overallSimilarity: true },
    }),
    prisma.researchSimilarity.findMany({
      where:   { researchPotentialScore: { gte: 0.7 } },
      orderBy: { researchPotentialScore: 'desc' },
      take: 20,
      select: { nodeAId: true, nodeBId: true, researchPotentialScore: true },
    }),
  ]);

  // Contradiction: high thematic similarity, low evidence similarity
  const contradictionRows = await prisma.researchSimilarity.findMany({
    where: {
      thematicSimilarity: { gte: 0.4 },
      evidenceSimilarity: { lte: 0.35 },
      overallSimilarity:  { gte: 0.35 },
    },
    orderBy: { overallSimilarity: 'desc' },
    take: 30,
    select: { nodeAId: true, nodeBId: true, overallSimilarity: true, evidenceSimilarity: true },
  });

  const contradictions: ContradictionPair[] = contradictionRows.map(r => ({
    nodeAId:  r.nodeAId,
    nodeBId:  r.nodeBId,
    reason:   `Evidence levels conflict (evidenceSimilarity=${r.evidenceSimilarity.toFixed(2)}) despite thematic overlap.`,
    severity: r.evidenceSimilarity < 0.2 ? 'significant' : 'moderate',
  }));

  // Echo-chamber: nodes with many high-similarity neighbors
  const simCounts: Record<string, number> = {};
  for (const p of highSim) {
    simCounts[p.nodeAId] = (simCounts[p.nodeAId] ?? 0) + 1;
    simCounts[p.nodeBId] = (simCounts[p.nodeBId] ?? 0) + 1;
  }
  const echoClusters = Object.entries(simCounts)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nodeId, similar_count]) => ({ nodeId, similar_count }));

  // High-sim pairs with no graph edge
  const edgeSet = new Set<string>();
  const edges = await prisma.edge.findMany({
    where:  { status: 'published' },
    select: { fromId: true, toId: true },
  });
  for (const e of edges) {
    const k1 = e.fromId < e.toId ? `${e.fromId}:${e.toId}` : `${e.toId}:${e.fromId}`;
    edgeSet.add(k1);
  }
  const highSimNoEdge = highSim.filter(p => {
    const k = p.nodeAId < p.nodeBId ? `${p.nodeAId}:${p.nodeBId}` : `${p.nodeBId}:${p.nodeAId}`;
    return !edgeSet.has(k);
  });

  return {
    node_count:             nodeCount,
    edge_count:             edgeCount,
    computed_pairs:         computedPairs,
    coverage_pct:           coveragePct,
    high_similarity_pairs:  highSim.map(r => ({ nodeAId: r.nodeAId, nodeBId: r.nodeBId, score: r.overallSimilarity })),
    top_research_potential: topPotential.map(r => ({ nodeAId: r.nodeAId, nodeBId: r.nodeBId, potential: r.researchPotentialScore })),
    contradictions,
    echo_chamber_clusters:  echoClusters,
    duplicate_concept_risk: highSim.filter(r => r.overallSimilarity >= 0.85).map(r => ({ nodeAId: r.nodeAId, nodeBId: r.nodeBId, score: r.overallSimilarity })),
    relationship_inflation_risk: {
      description:      'Nodes with high similarity (≥0.7) but no existing graph edge. Similarity alone is NOT grounds for adding an edge.',
      high_sim_no_edge: highSimNoEdge.length,
    },
    disclaimer: 'ADVISORY ONLY. Similarity scores do not constitute evidence of any relationship. No graph edges may be created from similarity data alone. All relationships require independent evidence and human review.',
  };
}
