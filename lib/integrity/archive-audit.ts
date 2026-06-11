import { nodes, edges } from '@/lib/graph';
import {
  computeSourceDiversity,
  computeEchoChamberRisk,
  computeResearchCompleteness,
  EchoChamberRisk,
} from './scores';

export interface ArchiveAuditResult {
  totalNodes: number;
  nodesWithCriticisms: number;
  nodesWithMainstreamView: number;
  nodesWithSources: number;
  nodesWithContradictoryEdges: number;
  coveragePercent: {
    criticisms: number;
    mainstreamView: number;
    sources: number;
    contradictoryEdges: number;
  };
  sourceTypeCoverage: Record<string, number>;
  echoChamberDistribution: Record<EchoChamberRisk, number>;
  completenessDistribution: { low: number; medium: number; high: number };
  avgCompletenessScore: number;
  highRiskNodes: { id: string; title: string; riskScore: number; missingFactors: string[] }[];
  archiveEchoChamberRisk: EchoChamberRisk;
  generatedAt: string;
}

export function runArchiveAudit(): ArchiveAuditResult {
  const totalNodes = nodes.length;
  let nodesWithCriticisms = 0;
  let nodesWithMainstreamView = 0;
  let nodesWithSources = 0;
  let nodesWithContradictoryEdges = 0;
  const sourceTypeCoverage: Record<string, number> = {};
  const echoChamberDist: Record<EchoChamberRisk, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  const completenessDistribution = { low: 0, medium: 0, high: 0 };
  let completenessSum = 0;
  const highRiskNodes: ArchiveAuditResult['highRiskNodes'] = [];

  for (const node of nodes) {
    if (Array.isArray(node.criticisms) && node.criticisms.length > 0) nodesWithCriticisms++;
    if (typeof node.mainstream_view === 'string' && node.mainstream_view.trim().length > 20) nodesWithMainstreamView++;
    if (Array.isArray(node.sources) && node.sources.length > 0) nodesWithSources++;

    const nodeEdges = edges.filter(e => e.from === node.id || e.to === node.id);
    if (nodeEdges.some(e => e.relationship_type === 'contradictory')) nodesWithContradictoryEdges++;

    for (const src of node.sources ?? []) {
      sourceTypeCoverage[src.source_type] = (sourceTypeCoverage[src.source_type] ?? 0) + 1;
    }

    const diversity = computeSourceDiversity(node.sources);
    const echo = computeEchoChamberRisk(node, edges, diversity);
    const completeness = computeResearchCompleteness(node, edges);

    echoChamberDist[echo.risk]++;
    completenessSum += completeness.score;

    if (completeness.score < 34) completenessDistribution.low++;
    else if (completeness.score < 67) completenessDistribution.medium++;
    else completenessDistribution.high++;

    if (echo.riskScore >= 2) {
      const missingFactors: string[] = [];
      if (echo.factors.missingCriticisms) missingFactors.push('No criticisms');
      if (echo.factors.missingMainstreamView) missingFactors.push('No mainstream view');
      if (echo.factors.lowSourceDiversity) missingFactors.push('Low source diversity');
      if (echo.factors.noContradictoryRelationships) missingFactors.push('No contradictory relationships');
      highRiskNodes.push({ id: node.id, title: node.title, riskScore: echo.riskScore, missingFactors });
    }
  }

  const avg = totalNodes > 0 ? Math.round(completenessSum / totalNodes) : 0;
  const highRiskFraction = totalNodes > 0 ? echoChamberDist.HIGH / totalNodes : 0;
  const archiveRisk: EchoChamberRisk = highRiskFraction > 0.4 ? 'HIGH' : highRiskFraction > 0.2 ? 'MEDIUM' : 'LOW';

  return {
    totalNodes,
    nodesWithCriticisms,
    nodesWithMainstreamView,
    nodesWithSources,
    nodesWithContradictoryEdges,
    coveragePercent: {
      criticisms:          totalNodes > 0 ? Math.round((nodesWithCriticisms / totalNodes) * 100) : 0,
      mainstreamView:      totalNodes > 0 ? Math.round((nodesWithMainstreamView / totalNodes) * 100) : 0,
      sources:             totalNodes > 0 ? Math.round((nodesWithSources / totalNodes) * 100) : 0,
      contradictoryEdges:  totalNodes > 0 ? Math.round((nodesWithContradictoryEdges / totalNodes) * 100) : 0,
    },
    sourceTypeCoverage,
    echoChamberDistribution: echoChamberDist,
    completenessDistribution,
    avgCompletenessScore: avg,
    highRiskNodes: highRiskNodes.sort((a, b) => b.riskScore - a.riskScore),
    archiveEchoChamberRisk: archiveRisk,
    generatedAt: new Date().toISOString(),
  };
}
