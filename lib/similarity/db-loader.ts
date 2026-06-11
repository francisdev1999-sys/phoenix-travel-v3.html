/**
 * Load live published nodes/edges from DB and convert to GraphNode/GraphEdge
 * for use by the similarity engine.
 *
 * ANTI-ECHO-CHAMBER GUARANTEES (enforced here and in every caller):
 *   - Output is READ-ONLY metadata — never creates or modifies edges
 *   - Never changes evidenceLevel, confidenceScore, or any node content
 *   - Similarity scores are advisory only
 */

import { prisma } from '@/lib/db';
import type { GraphNode, GraphEdge } from '@/lib/graph/types';

export async function loadPublishedNodes(): Promise<GraphNode[]> {
  const rows = await prisma.node.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      title: true,
      description: true,
      mainstreamView: true,
      evidenceLevel: true,
      confidenceScore: true,
      color: true,
      icon: true,
      lat: true,
      lon: true,
      region: true,
      country: true,
      year: true,
      dateStart: true,
      dateEnd: true,
      datePrecision: true,
      category: { select: { name: true } },
      tags: { select: { tag: true } },
      claims: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
      criticisms: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
      openQuestions: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
      sourceLinks: {
        select: {
          source: {
            select: {
              id: true,
              title: true,
              sourceType: true,
              author: true,
              publicationYear: true,
              url: true,
              credibilityScore: true,
            },
          },
        },
        take: 10,
      },
    },
  });

  return rows.map(n => ({
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
    color: n.color ?? undefined,
    icon: n.icon ?? undefined,
    coordinates:
      n.lat != null && n.lon != null
        ? ([n.lat, n.lon] as [number, number])
        : undefined,
    year: n.year ?? undefined,
    date_start: n.dateStart ?? undefined,
    date_end: n.dateEnd ?? undefined,
    date_precision: (n.datePrecision as GraphNode['date_precision']) ?? undefined,
    region: n.region ?? undefined,
    country: n.country ?? undefined,
    sources: n.sourceLinks
      .filter(sl => sl.source)
      .map(sl => ({
        id: sl.source!.id,
        title: sl.source!.title,
        source_type: sl.source!.sourceType as import('@/lib/graph/types').ResearchSourceType,
        author: sl.source!.author ?? undefined,
        publication_year: sl.source!.publicationYear ?? undefined,
        url: sl.source!.url ?? undefined,
        credibility_score: sl.source!.credibilityScore,
      })),
  }));
}

export async function loadPublishedEdges(): Promise<GraphEdge[]> {
  const rows = await prisma.edge.findMany({
    where: { status: 'published' },
    select: {
      id: true,
      fromId: true,
      toId: true,
      relationshipType: true,
      strengthScore: true,
      confidenceScore: true,
      explanation: true,
      evidenceBasis: true,
      sourceType: true,
      sourceCount: true,
    },
  });

  return rows.map(e => ({
    id: e.id,
    from: e.fromId,
    to: e.toId,
    relationship_type: e.relationshipType as GraphEdge['relationship_type'],
    strength_score: e.strengthScore,
    confidence_score: e.confidenceScore,
    explanation: e.explanation,
    evidence_basis: e.evidenceBasis,
    source_type: e.sourceType as GraphEdge['source_type'],
    source_count: e.sourceCount ?? undefined,
  }));
}

/** Fetch a single published node as GraphNode, or null if not found. */
export async function loadNode(id: string): Promise<GraphNode | null> {
  const n = await prisma.node.findUnique({
    where: { id, status: 'published' },
    select: {
      id: true,
      title: true,
      description: true,
      mainstreamView: true,
      evidenceLevel: true,
      confidenceScore: true,
      color: true,
      icon: true,
      lat: true,
      lon: true,
      region: true,
      country: true,
      year: true,
      dateStart: true,
      dateEnd: true,
      datePrecision: true,
      category: { select: { name: true } },
      tags: { select: { tag: true } },
      claims: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
      criticisms: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
      openQuestions: { select: { text: true }, orderBy: { orderIndex: 'asc' } },
      sourceLinks: {
        select: {
          source: {
            select: {
              id: true,
              title: true,
              sourceType: true,
              author: true,
              publicationYear: true,
              url: true,
              credibilityScore: true,
            },
          },
        },
        take: 10,
      },
    },
  });

  if (!n) return null;

  return {
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
    color: n.color ?? undefined,
    icon: n.icon ?? undefined,
    coordinates:
      n.lat != null && n.lon != null
        ? ([n.lat, n.lon] as [number, number])
        : undefined,
    year: n.year ?? undefined,
    date_start: n.dateStart ?? undefined,
    date_end: n.dateEnd ?? undefined,
    date_precision: (n.datePrecision as GraphNode['date_precision']) ?? undefined,
    region: n.region ?? undefined,
    country: n.country ?? undefined,
    sources: n.sourceLinks
      .filter(sl => sl.source)
      .map(sl => ({
        id: sl.source!.id,
        title: sl.source!.title,
        source_type: sl.source!.sourceType as import('@/lib/graph/types').ResearchSourceType,
        author: sl.source!.author ?? undefined,
        publication_year: sl.source!.publicationYear ?? undefined,
        url: sl.source!.url ?? undefined,
        credibility_score: sl.source!.credibilityScore,
      })),
  };
}
