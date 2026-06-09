import type { GraphNode, GraphEdge, ResearchSource } from '@/lib/graph/types';

export type EchoChamberRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ResearchCompletenessResult {
  score: number; // 0–100
  factors: {
    hasClaims: boolean;
    hasCriticisms: boolean;
    hasMainstreamView: boolean;
    hasSources: boolean;
    hasOpenQuestions: boolean;
    hasContradictoryRelationships: boolean;
  };
}

export interface SourceDiversityResult {
  score: number; // 0–100
  breakdown: Record<string, number>;
  dominantType?: string;
  isDominated: boolean; // one type ≥ 90%
  totalSources: number;
}

export interface EchoChamberResult {
  risk: EchoChamberRisk;
  factors: {
    lowSourceDiversity: boolean;
    missingCriticisms: boolean;
    missingMainstreamView: boolean;
    noContradictoryRelationships: boolean;
  };
  riskScore: number; // 0–4, count of risk factors present
}

const COMPLETENESS_WEIGHTS = {
  hasClaims:                   20,
  hasCriticisms:               25,
  hasMainstreamView:           25,
  hasSources:                  15,
  hasOpenQuestions:            10,
  hasContradictoryRelationships: 5,
} as const;

export function computeResearchCompleteness(
  node: GraphNode,
  edges: GraphEdge[],
): ResearchCompletenessResult {
  const nodeEdges = edges.filter(e => e.from === node.id || e.to === node.id);

  const factors: ResearchCompletenessResult['factors'] = {
    hasClaims:                    Array.isArray(node.claims) && node.claims.length > 0,
    hasCriticisms:                Array.isArray(node.criticisms) && node.criticisms.length > 0,
    hasMainstreamView:            typeof node.mainstream_view === 'string' && node.mainstream_view.trim().length > 20,
    hasSources:                   Array.isArray(node.sources) && node.sources.length > 0,
    hasOpenQuestions:             Array.isArray(node.open_questions) && node.open_questions.length > 0,
    hasContradictoryRelationships: nodeEdges.some(e => e.relationship_type === 'contradictory'),
  };

  const score = (Object.keys(factors) as Array<keyof typeof factors>).reduce(
    (sum, key) => sum + (factors[key] ? COMPLETENESS_WEIGHTS[key] : 0),
    0,
  );

  return { score, factors };
}

// 9 ResearchSourceTypes defined in types.ts
const MAX_SOURCE_TYPES = 9;

export function computeSourceDiversity(sources?: ResearchSource[]): SourceDiversityResult {
  if (!sources || sources.length === 0) {
    return { score: 0, breakdown: {}, isDominated: false, totalSources: 0 };
  }

  const breakdown: Record<string, number> = {};
  for (const src of sources) {
    breakdown[src.source_type] = (breakdown[src.source_type] ?? 0) + 1;
  }

  const total = sources.length;
  const typeCount = Object.keys(breakdown).length;
  const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const dominantType = sorted[0]?.[0];
  const dominantFraction = sorted[0] ? sorted[0][1] / total : 0;
  const isDominated = dominantFraction >= 0.9;

  const diversityRatio = Math.min(typeCount / MAX_SOURCE_TYPES, 1);
  const dominationPenalty = isDominated ? 0.3 : 0;
  const score = Math.round(Math.max(0, diversityRatio - dominationPenalty) * 100);

  return { score, breakdown, dominantType, isDominated, totalSources: total };
}

export function computeEchoChamberRisk(
  node: GraphNode,
  edges: GraphEdge[],
  sourceDiversity: SourceDiversityResult,
): EchoChamberResult {
  const nodeEdges = edges.filter(e => e.from === node.id || e.to === node.id);

  const factors: EchoChamberResult['factors'] = {
    lowSourceDiversity:         sourceDiversity.score < 30 || sourceDiversity.isDominated,
    missingCriticisms:          !Array.isArray(node.criticisms) || node.criticisms.length === 0,
    missingMainstreamView:      typeof node.mainstream_view !== 'string' || node.mainstream_view.trim().length < 20,
    noContradictoryRelationships: !nodeEdges.some(e => e.relationship_type === 'contradictory'),
  };

  const riskScore = Object.values(factors).filter(Boolean).length;
  const risk: EchoChamberRisk = riskScore >= 3 ? 'HIGH' : riskScore >= 2 ? 'MEDIUM' : 'LOW';

  return { risk, factors, riskScore };
}
