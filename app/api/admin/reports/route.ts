export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { nodes, edges } from '@/lib/graph';

export async function GET() {
  const session = await auth();
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // Node IDs that have at least one approved source link
  const linkedNodeIds = await prisma.sourceLink.findMany({
    where: { targetType: 'node', source: { status: 'approved' } },
    select: { targetId: true },
    distinct: ['targetId'],
  });
  const linkedSet = new Set(linkedNodeIds.map(l => l.targetId));

  // Missing source report — static graph nodes with no approved source linked
  const missingSources = nodes
    .filter(n => !linkedSet.has(n.id))
    .map(n => ({
      id: n.id,
      label: n.title,
      category: n.category,
      evidenceLevel: n.evidence_level,
      confidence: n.confidence_score,
    }))
    .sort((a, b) => b.confidence - a.confidence);

  // Low confidence edges (static graph)
  const LOW_THRESHOLD = 0.45;
  const lowConfidenceEdges = edges
    .filter(e => e.confidence_score < LOW_THRESHOLD)
    .map(e => ({
      id: e.id,
      from: e.from,
      to: e.to,
      relationship: e.relationship_type,
      confidence: e.confidence_score,
      evidenceBasis: e.evidence_basis,
      sourceType: e.source_type,
    }))
    .sort((a, b) => a.confidence - b.confidence);

  // Nodes with low confidence
  const LOW_NODE_THRESHOLD = 0.4;
  const lowConfidenceNodes = nodes
    .filter(n => n.confidence_score < LOW_NODE_THRESHOLD)
    .map(n => ({
      id: n.id,
      label: n.title,
      category: n.category,
      confidence: n.confidence_score,
      evidenceLevel: n.evidence_level,
    }))
    .sort((a, b) => a.confidence - b.confidence);

  return NextResponse.json({ missingSources, lowConfidenceEdges, lowConfidenceNodes });
}
