import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { GraphNode, GraphEdge } from '@/lib/graph/types';

// Returns approved proposed nodes + edges in GraphNode/GraphEdge shape
// so KnowledgeGraph can merge them with the static dataset.
export async function GET() {
  const [proposedNodes, proposedEdges] = await Promise.all([
    prisma.proposedNode.findMany({ where: { status: 'approved' } }),
    prisma.proposedEdge.findMany({ where: { status: 'approved' } }),
  ]);

  const nodes: GraphNode[] = proposedNodes.map(n => ({
    id: n.nodeId ?? n.id,
    title: n.label,
    category: n.category as GraphNode['category'],
    description: n.description,
    evidence_level: n.evidenceLevel as GraphNode['evidence_level'],
    confidence_score: n.confidence,
    claims: (n.claims as string[] | null) ?? [],
    criticisms: (n.criticisms as string[] | null) ?? [],
    open_questions: (n.openQuestions as string[] | null) ?? [],
    mainstream_view: n.mainstreamView ?? '',
    region: n.region ?? undefined,
    country: n.country ?? undefined,
    date_start: n.dateStart ?? undefined,
    date_end: n.dateEnd ?? undefined,
    tags: (n.tags as string[] | null) ?? [],
    sources: [],
  }));

  const edges: GraphEdge[] = proposedEdges.map(e => ({
    id: e.id,
    from: e.fromNodeId,
    to: e.toNodeId,
    relationship_type: e.relationship as GraphEdge['relationship_type'],
    strength_score: e.strengthScore,
    confidence_score: e.confidence,
    explanation: e.explanation ?? '',
    evidence_basis: e.historicalBasis ?? e.description,
    source_type: 'academic' as GraphEdge['source_type'],
    source_count: 0,
  }));

  return NextResponse.json({ nodes, edges });
}
