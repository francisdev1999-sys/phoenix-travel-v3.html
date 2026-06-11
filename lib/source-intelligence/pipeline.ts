/**
 * Source Intelligence Pipeline — Phase C
 *
 * Triggered when a source is approved.
 * Runs entirely in background (fire-and-forget via void).
 *
 * AI RULES (hard-coded, never negotiable):
 *   AI may extract, classify, summarize, suggest.
 *   AI may NOT publish, approve, create live nodes, or create live relationships.
 *   All output goes to the review queue with status='pending'.
 */

import { prisma } from '@/lib/db';
import { extractSourceIntelligence } from './extractor';

const PIPELINE_VERSION = '1.0';

export async function runSourceIntelligencePipeline(sourceId: string): Promise<void> {
  const startedAt = new Date();

  // Create or reset the analysis record
  const analysis = await prisma.sourceAnalysis.upsert({
    where:  { sourceId },
    create: {
      sourceId,
      status:          'processing',
      pipelineVersion: PIPELINE_VERSION,
      startedAt,
    },
    update: {
      status:          'processing',
      pipelineVersion: PIPELINE_VERSION,
      startedAt,
      completedAt:     null,
      processingError: null,
    },
  });

  try {
    // ── Load source ─────────────────────────────────────────────────────────────
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      select: {
        id: true, title: true, sourceType: true, author: true,
        publicationYear: true, publisher: true, journal: true,
        abstract: true, notes: true,
      },
    });

    if (!source) {
      await markFailed(analysis.id, 'Source not found');
      return;
    }

    // ── Load existing nodes for contradiction/relationship context ────────────
    const existingNodes = await prisma.node.findMany({
      where: { status: 'published' },
      select: {
        id: true, title: true, evidenceLevel: true, description: true,
        category: { select: { name: true } },
        claims: { select: { text: true }, take: 2, orderBy: { orderIndex: 'asc' } },
      },
      take: 60,
      orderBy: { createdAt: 'desc' },
    });

    const nodeContext = existingNodes.map(n => ({
      id:            n.id,
      title:         n.title,
      category:      n.category.name,
      description:   n.description,
      evidenceLevel: n.evidenceLevel,
      claims:        n.claims.map(c => c.text),
    }));

    // ── Run AI extraction ────────────────────────────────────────────────────
    const extracted = await extractSourceIntelligence({
      source: {
        id:              source.id,
        title:           source.title,
        sourceType:      source.sourceType,
        author:          source.author,
        publicationYear: source.publicationYear,
        publisher:       source.publisher,
        journal:         source.journal,
        abstract:        source.abstract,
        notes:           source.notes,
      },
      existingNodes: nodeContext,
    });

    // ── Store extracted data (all status='pending' — never auto-published) ───

    const [entities, claims, timelineRefs, locationRefs, potentialNodes, contradictions] =
      await Promise.all([

        // Entities
        extracted.entities.length > 0
          ? prisma.extractedEntity.createMany({
              data: extracted.entities.map(e => ({
                analysisId:    analysis.id,
                entityType:    e.entityType,
                name:          e.name,
                aliases:       e.aliases,
                context:       e.context,
                confidence:    clamp(e.confidence),
                matchedNodeId: e.matchedNodeId || null,
              })),
              skipDuplicates: true,
            }).then(r => r.count)
          : Promise.resolve(0),

        // Claims
        extracted.claims.length > 0
          ? prisma.extractedClaim.createMany({
              data: extracted.claims.map(c => ({
                analysisId:    analysis.id,
                claimText:     c.claimText,
                claimType:     c.claimType,
                confidence:    clamp(c.confidence),
                supportedBy:   c.supportedBy || null,
                relatedNodeId: c.relatedNodeId || null,
                status:        'pending',
              })),
              skipDuplicates: true,
            }).then(r => r.count)
          : Promise.resolve(0),

        // Timeline references
        extracted.timeline.length > 0
          ? prisma.timelineReference.createMany({
              data: extracted.timeline.map(t => ({
                analysisId:    analysis.id,
                year:          t.year ?? null,
                yearStart:     t.yearStart ?? null,
                yearEnd:       t.yearEnd ?? null,
                datePrecision: t.datePrecision || null,
                description:   t.description,
                period:        t.period || null,
                confidence:    clamp(t.confidence),
                rawText:       t.rawText,
                relatedNodeId: t.relatedNodeId || null,
              })),
              skipDuplicates: true,
            }).then(r => r.count)
          : Promise.resolve(0),

        // Location references
        extracted.locations.length > 0
          ? prisma.locationReference.createMany({
              data: extracted.locations.map(l => ({
                analysisId:    analysis.id,
                name:          l.name,
                locationType:  l.locationType,
                modernName:    l.modernName || null,
                lat:           l.lat ?? null,
                lon:           l.lon ?? null,
                confidence:    clamp(l.confidence),
                context:       l.context,
                relatedNodeId: l.relatedNodeId || null,
              })),
              skipDuplicates: true,
            }).then(r => r.count)
          : Promise.resolve(0),

        // Potential node suggestions — always pending, requires human review
        extracted.potentialNodes.length > 0
          ? prisma.potentialNodeSuggestion.createMany({
              data: extracted.potentialNodes.map(n => ({
                analysisId:              analysis.id,
                sourceId,
                suggestedTitle:          n.suggestedTitle,
                suggestedCategory:       n.suggestedCategory,
                suggestedDescription:    n.suggestedDescription,
                suggestedEvidenceLevel:  n.suggestedEvidenceLevel ?? 'speculative',
                suggestedConfidence:     clamp(n.suggestedConfidence, 0.1, 0.5),
                suggestedTags:           n.suggestedTags ?? [],
                suggestedYear:           n.suggestedYear ?? null,
                suggestedLocation:       n.suggestedLocation || null,
                reasoning:               n.reasoning,
                aiConfidence:            clamp(n.aiConfidence),
                status:                  'pending',
              })),
              skipDuplicates: true,
            }).then(r => r.count)
          : Promise.resolve(0),

        // Contradiction suggestions — advisory only, always pending
        extracted.contradictions.length > 0
          ? prisma.contradictionSuggestion.createMany({
              data: extracted.contradictions
                .filter(c => nodeContext.some(n => n.id === c.existingNodeId))
                .map(c => ({
                  analysisId:         analysis.id,
                  sourceId,
                  existingNodeId:     c.existingNodeId,
                  contradictionType:  c.contradictionType,
                  description:        c.description,
                  sourceClaimText:    c.sourceClaimText,
                  nodeClaimText:      c.nodeClaimText,
                  severity:           c.severity,
                  aiConfidence:       clamp(c.aiConfidence),
                  status:             'pending',
                })),
              skipDuplicates: true,
            }).then(r => r.count)
          : Promise.resolve(0),
      ]);

    // ── Update analysis with counts and completion ───────────────────────────
    await prisma.sourceAnalysis.update({
      where: { id: analysis.id },
      data:  {
        status:            'complete',
        completedAt:       new Date(),
        aiSummary:         extracted.summary || null,
        relationshipHints: extracted.relationshipHints as object[],
        entityCount:       entities,
        claimCount:        claims,
        timelineCount:     timelineRefs,
        locationCount:     locationRefs,
        nodeCount:         potentialNodes,
        contradictionCount: contradictions,
      },
    });

    console.info(
      `[source-intelligence] ${sourceId} complete — ` +
      `entities:${entities} claims:${claims} timeline:${timelineRefs} ` +
      `locations:${locationRefs} nodes:${potentialNodes} contradictions:${contradictions}`,
    );
  } catch (err) {
    console.error('[source-intelligence] pipeline failed for', sourceId, err);
    await markFailed(analysis.id, String(err));
  }
}

async function markFailed(analysisId: string, error: string) {
  await prisma.sourceAnalysis.update({
    where: { id: analysisId },
    data:  { status: 'failed', completedAt: new Date(), processingError: error },
  }).catch(() => {/* best-effort */});
}

function clamp(v: number, min = 0, max = 1): number {
  if (typeof v !== 'number' || isNaN(v)) return (min + max) / 2;
  return Math.max(min, Math.min(max, v));
}
