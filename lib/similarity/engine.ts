import { GraphNode, GraphEdge, EvidenceLevel } from '@/lib/graph/types';
import {
  DimensionScore,
  thematicSimilarity,
  timelineSimilarity,
  geographicSimilarity,
  sourceSimilarity,
  evidenceSimilarity,
  entitySimilarity,
  relationshipSimilarity,
} from './dimensions';

// ── Types ──────────────────────────────────────────────────────────────────────

export type { DimensionScore };

export interface SimilarityDimensions {
  thematic:     DimensionScore;
  timeline:     DimensionScore;
  geographic:   DimensionScore;
  source:       DimensionScore;
  evidence:     DimensionScore;
  entity:       DimensionScore;
  relationship: DimensionScore;
}

export interface ContradictionReason {
  type:     'evidence_conflict' | 'geographic_conflict' | 'confidence_conflict' | 'speculative_vs_verified' | 'timeline_conflict';
  detail:   string;
  severity: 'minor' | 'moderate' | 'significant';
}

export interface CriticAnalysis {
  disclaimer:         string;
  why_not_related:    string[];
  contradictions:     ContradictionReason[];
  confidence_caveats: string[];
}

export interface SimilarityResult {
  nodeAId:            string;
  nodeBId:            string;
  overall:            number;
  dimensions:         SimilarityDimensions;
  research_potential: number;
  critic:             CriticAnalysis;
  computed_at:        string;
}

export interface SimilarityWeights {
  thematic:     number;
  timeline:     number;
  geographic:   number;
  source:       number;
  evidence:     number;
  entity:       number;
  relationship: number;
}

export interface RankedSimilarity {
  nodeId:             string;
  overall:            number;
  research_potential: number;
  dimensions:         SimilarityDimensions;
  critic:             CriticAnalysis;
}

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_WEIGHTS: SimilarityWeights = {
  thematic:     0.20,
  timeline:     0.15,
  geographic:   0.10,
  source:       0.20,
  evidence:     0.15,
  entity:       0.10,
  relationship: 0.10,
};

// ── Research Potential ─────────────────────────────────────────────────────────

function researchPotential(dims: SimilarityDimensions, a: GraphNode, b: GraphNode): number {
  // High thematic + entity but low source overlap = unexplored investigation space
  const sourceDiff = 1 - dims.source.score;
  const tension    = Math.abs(a.confidence_score - b.confidence_score);
  return Math.min(1,
    dims.thematic.score  * 0.35 +
    dims.entity.score    * 0.20 +
    sourceDiff           * 0.25 +
    dims.timeline.score  * 0.10 +
    tension              * 0.10,
  );
}

// ── Critic Analysis ────────────────────────────────────────────────────────────

const EVIDENCE_RANK: Record<EvidenceLevel, number> = {
  verified:        5,
  strong_evidence: 4,
  debated:         3,
  speculative:     2,
  mythological:    1,
};

const DISCLAIMER =
  'Similarity does not imply causation, proof, or a verified connection. ' +
  'High similarity means only that these nodes share measurable characteristics — ' +
  'it provides no evidence of historical relationship, shared origin, or claim validity.';

function buildCritic(
  a: GraphNode,
  b: GraphNode,
  dims: SimilarityDimensions,
  overall: number,
): CriticAnalysis {
  const contradictions: ContradictionReason[] = [];
  const whyNot: string[] = [];

  const rA = EVIDENCE_RANK[a.evidence_level] ?? 3;
  const rB = EVIDENCE_RANK[b.evidence_level] ?? 3;
  const levelDiff = Math.abs(rA - rB);

  if (levelDiff >= 2) {
    contradictions.push({
      type:     rA >= 4 && rB <= 2 ? 'speculative_vs_verified' : 'evidence_conflict',
      detail:   `Evidence levels differ: "${a.evidence_level}" vs "${b.evidence_level}". Findings from one must not be used to support the other.`,
      severity: levelDiff >= 3 ? 'significant' : 'moderate',
    });
  }

  if (Math.abs(a.confidence_score - b.confidence_score) > 0.4) {
    contradictions.push({
      type:   'confidence_conflict',
      detail: `Confidence scores differ substantially (${Math.round(a.confidence_score * 100)}% vs ${Math.round(b.confidence_score * 100)}%). The higher-confidence node should not lend credibility to the lower-confidence one.`,
      severity: 'moderate',
    });
  }

  if (dims.thematic.score > 0.5 && dims.geographic.score < 0.2 && a.coordinates && b.coordinates) {
    contradictions.push({
      type:     'geographic_conflict',
      detail:   'Thematically similar but geographically distant. Location-specific claims should not be conflated.',
      severity: 'minor',
    });
  }

  if (dims.source.score < 0.2) {
    whyNot.push('No shared sources — these nodes draw on entirely different evidence bases, which may mean independent development in separate traditions.');
  }
  if (dims.relationship.score < 0.2) {
    whyNot.push('No shared graph neighbors — the existing knowledge graph does not connect these nodes through any third party.');
  }
  if (dims.timeline.score < 0.3 && a.year !== undefined && b.year !== undefined) {
    const gap = Math.abs(a.year - b.year);
    whyNot.push(`~${gap.toLocaleString()} year temporal gap makes direct historical influence unlikely without documented transmission chains.`);
  }
  if (a.category !== b.category) {
    whyNot.push(`Different categories (${a.category} vs ${b.category}) — surface similarities may reflect convergent themes rather than a genuine connection.`);
  }
  if (overall < 0.4) {
    whyNot.push('Overall similarity is low. These nodes may appear related due to shared general terms but lack specific connective evidence.');
  }

  const confidence_caveats = [
    'This score is computed from structural characteristics only — it cannot capture context, nuance, or researcher intent.',
    ...(dims.thematic.score > 0.7 ? ['High thematic similarity may reflect shared genre conventions rather than a factual relationship.'] : []),
    'Absence of contradictory evidence is not evidence of compatibility.',
  ];

  return { disclaimer: DISCLAIMER, why_not_related: whyNot, contradictions, confidence_caveats };
}

// ── Main compute ───────────────────────────────────────────────────────────────

export function computeSimilarity(
  a: GraphNode,
  b: GraphNode,
  edges: GraphEdge[],
  weights: SimilarityWeights = DEFAULT_WEIGHTS,
): SimilarityResult {
  const dims: SimilarityDimensions = {
    thematic:     thematicSimilarity(a, b),
    timeline:     timelineSimilarity(a, b),
    geographic:   geographicSimilarity(a, b),
    source:       sourceSimilarity(a, b),
    evidence:     evidenceSimilarity(a, b),
    entity:       entitySimilarity(a, b),
    relationship: relationshipSimilarity(a, b, edges),
  };

  const overall = Math.min(1,
    dims.thematic.score     * weights.thematic +
    dims.timeline.score     * weights.timeline +
    dims.geographic.score   * weights.geographic +
    dims.source.score       * weights.source +
    dims.evidence.score     * weights.evidence +
    dims.entity.score       * weights.entity +
    dims.relationship.score * weights.relationship,
  );

  return {
    nodeAId:            a.id,
    nodeBId:            b.id,
    overall:            Math.round(overall * 1000) / 1000,
    dimensions:         dims,
    research_potential: Math.round(researchPotential(dims, a, b) * 1000) / 1000,
    critic:             buildCritic(a, b, dims, overall),
    computed_at:        new Date().toISOString(),
  };
}

// ── Ranked lookup (pure — no DB) ───────────────────────────────────────────────

export function getTopSimilar(
  targetId: string,
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
  limit = 10,
): RankedSimilarity[] {
  const target = allNodes.find(n => n.id === targetId);
  if (!target) return [];

  return allNodes
    .filter(n => n.id !== targetId)
    .map(n => {
      const r = computeSimilarity(target, n, allEdges);
      return {
        nodeId:             n.id,
        overall:            r.overall,
        research_potential: r.research_potential,
        dimensions:         r.dimensions,
        critic:             r.critic,
      };
    })
    .sort((a, b) => b.overall - a.overall)
    .slice(0, limit);
}

// ── Contradiction pairs ────────────────────────────────────────────────────────

export interface ContradictionPair {
  nodeAId:  string;
  nodeBId:  string;
  reason:   string;
  severity: 'minor' | 'moderate' | 'significant';
}

export function detectContradictions(
  allNodes: GraphNode[],
  allEdges: GraphEdge[],
): ContradictionPair[] {
  const pairs: ContradictionPair[] = [];
  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      const a = allNodes[i];
      const b = allNodes[j];
      const r = computeSimilarity(a, b, allEdges);
      for (const c of r.critic.contradictions) {
        if (c.severity === 'significant' || (c.severity === 'moderate' && r.overall > 0.5)) {
          pairs.push({ nodeAId: a.id, nodeBId: b.id, reason: c.detail, severity: c.severity });
        }
      }
    }
  }
  return pairs.sort((a, b) => (b.severity === 'significant' ? 1 : 0) - (a.severity === 'significant' ? 1 : 0));
}
