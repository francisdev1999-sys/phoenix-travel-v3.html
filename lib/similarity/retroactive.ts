/**
 * Retroactive similarity processor.
 *
 * IMPORTANT GUARANTEES:
 *   - NEVER creates or modifies GraphEdges
 *   - NEVER changes evidence_level, confidence_score, or node content
 *   - NEVER auto-approves or auto-publishes anything
 *   - Stores advisory metadata only in ResearchSimilarity table
 *   - Fire-and-forget: errors are logged, never propagated
 */

import { nodes, edges } from '@/lib/graph';
import { prisma } from '@/lib/db';
import { computeSimilarity, detectContradictions, ContradictionPair } from './engine';

// ── Retroactive rebuild ────────────────────────────────────────────────────────

export async function retroactiveSimilarityRebuild(): Promise<void> {
  try {
    const total = nodes.length;
    console.info(`[similarity] Starting retroactive rebuild — ${total} nodes, ${(total * (total - 1)) / 2} pairs`);

    let upserted = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        try {
          const result = computeSimilarity(a, b, edges);

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
              relationshipSimilarity:result.dimensions.relationship.score,
              researchPotentialScore:result.research_potential,
              confidence:            result.overall,
              explanation:           result.dimensions.thematic.rationale,
              criticAnalysis:        result.critic as object,
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
              relationshipSimilarity:result.dimensions.relationship.score,
              researchPotentialScore:result.research_potential,
              confidence:            result.overall,
              explanation:           result.dimensions.thematic.rationale,
              criticAnalysis:        result.critic as object,
              breakdown:             result.dimensions as unknown as object,
            },
          });
          upserted++;
        } catch {
          // Never propagate pair failures
        }
      }
    }

    console.info(`[similarity] Retroactive rebuild complete — ${upserted} pairs stored`);
  } catch (err) {
    console.error('[similarity] Retroactive rebuild failed:', err);
  }
}

// ── Audit (pure — reads static graph, no DB) ───────────────────────────────────

export interface SimilarityAuditResult {
  node_count:            number;
  edge_count:            number;
  pair_count:            number;
  high_similarity_pairs: { nodeAId: string; nodeBId: string; score: number }[];
  top_research_potential:{ nodeAId: string; nodeBId: string; potential: number }[];
  contradictions:        ContradictionPair[];
  echo_chamber_clusters: { nodeId: string; title: string; similar_count: number }[];
  duplicate_concept_risk:{ nodeAId: string; nodeBId: string; score: number }[];
  relationship_inflation_risk: {
    description: string;
    total_edges: number;
    high_sim_no_edge: number;
  };
  disclaimer:            string;
}

export function runSimilarityAudit(): SimilarityAuditResult {
  const highSim: { nodeAId: string; nodeBId: string; score: number }[] = [];
  const highPot: { nodeAId: string; nodeBId: string; potential: number }[] = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const r = computeSimilarity(nodes[i], nodes[j], edges);
      if (r.overall >= 0.7) {
        highSim.push({ nodeAId: nodes[i].id, nodeBId: nodes[j].id, score: r.overall });
      }
      if (r.research_potential >= 0.7) {
        highPot.push({ nodeAId: nodes[i].id, nodeBId: nodes[j].id, potential: r.research_potential });
      }
    }
  }

  const edgeSet = new Set(edges.map(e => `${e.from}:${e.to}`));
  const highSimNoEdge = highSim.filter(
    p => !edgeSet.has(`${p.nodeAId}:${p.nodeBId}`) && !edgeSet.has(`${p.nodeBId}:${p.nodeAId}`),
  );

  // Echo chamber clusters: nodes with many high-similarity neighbors
  const simCounts: Record<string, number> = {};
  for (const p of highSim) {
    simCounts[p.nodeAId] = (simCounts[p.nodeAId] ?? 0) + 1;
    simCounts[p.nodeBId] = (simCounts[p.nodeBId] ?? 0) + 1;
  }
  const echoClusters = nodes
    .filter(n => (simCounts[n.id] ?? 0) >= 3)
    .map(n => ({ nodeId: n.id, title: n.title, similar_count: simCounts[n.id] ?? 0 }))
    .sort((a, b) => b.similar_count - a.similar_count)
    .slice(0, 10);

  // Duplicate concept risk: very high similarity (>= 0.85)
  const dupRisk = highSim.filter(p => p.score >= 0.85).slice(0, 20);

  const contradictions = detectContradictions(nodes, edges).slice(0, 30);

  return {
    node_count:             nodes.length,
    edge_count:             edges.length,
    pair_count:             (nodes.length * (nodes.length - 1)) / 2,
    high_similarity_pairs:  highSim.sort((a, b) => b.score - a.score).slice(0, 20),
    top_research_potential: highPot.sort((a, b) => b.potential - a.potential).slice(0, 20),
    contradictions,
    echo_chamber_clusters:  echoClusters,
    duplicate_concept_risk: dupRisk,
    relationship_inflation_risk: {
      description: 'Nodes with high similarity (≥0.7) but no existing graph edge. These may represent research gaps — or they may simply be coincidentally similar. Similarity alone is NOT grounds for adding an edge.',
      total_edges:       edges.length,
      high_sim_no_edge:  highSimNoEdge.length,
    },
    disclaimer: 'ADVISORY ONLY. Similarity scores do not constitute evidence of any relationship. No graph edges may be created from similarity data alone. All relationships require independent evidence and human review.',
  };
}
