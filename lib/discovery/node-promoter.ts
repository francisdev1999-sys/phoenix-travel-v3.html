/**
 * Shared node promotion logic — used by both the discovery engine (auto-approve)
 * and the admin review route (manual approve).
 */

import { prisma } from '@/lib/db';
import { enqueue } from '@/lib/jobs/queue';
import { generateSuggestionsForNode } from '@/lib/suggestion-engine';
import { generateAiSemanticSuggestions } from '@/lib/ai/semantic-suggestions';

const CATEGORY_META: Record<string, { slug: string; name: string; color: string }> = {
  'Ancient Civilizations': { slug: 'ancient-civilizations', name: 'Ancient Civilizations', color: '#d97706' },
  'Ancient Texts':         { slug: 'ancient-texts',         name: 'Ancient Texts',         color: '#b45309' },
  'UFO/Paranormal':        { slug: 'ufo-paranormal',        name: 'UFO / Paranormal',      color: '#7c3aed' },
  'Human Origins':         { slug: 'human-origins',         name: 'Human Origins',         color: '#059669' },
  'Consciousness':         { slug: 'consciousness',          name: 'Consciousness',         color: '#0891b2' },
  'Secret Societies':      { slug: 'secret-societies',      name: 'Secret Societies',      color: '#dc2626' },
  'Government/Surveillance': { slug: 'government-surveillance', name: 'Government / Surveillance', color: '#1d4ed8' },
  'Technology':            { slug: 'technology',            name: 'Technology',            color: '#16a34a' },
  'Historical Figures':    { slug: 'historical-figures',    name: 'Historical Figures',    color: '#7c3aed' },
  'Modern Mystery':        { slug: 'modern-mystery',        name: 'Modern Mystery',        color: '#9333ea' },
  'Extraterrestrial':      { slug: 'extraterrestrial',      name: 'Extraterrestrial',      color: '#6366f1' },
  'Disease/Pandemic':      { slug: 'disease-pandemic',      name: 'Disease / Pandemic',    color: '#dc2626' },
  'Ancient History':       { slug: 'ancient-history',       name: 'Ancient History',       color: '#92400e' },
  'Archaeology':           { slug: 'archaeology',           name: 'Archaeology',           color: '#78350f' },
  'Science':               { slug: 'science',               name: 'Science',               color: '#047857' },
  'Mythology':             { slug: 'mythology',             name: 'Mythology',             color: '#7e22ce' },
  'Finance/Economics':     { slug: 'finance-economics',     name: 'Finance / Economics',   color: '#065f46' },
  'Environment':           { slug: 'environment',           name: 'Environment',           color: '#166534' },
  'Space/Astronomy':       { slug: 'space-astronomy',       name: 'Space / Astronomy',     color: '#1e3a5f' },
};

export async function getOrCreateCategory(categoryName: string): Promise<string> {
  const meta = CATEGORY_META[categoryName] ?? {
    slug:  categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name:  categoryName,
    color: '#6b7280',
  };

  const cat = await prisma.category.upsert({
    where:  { slug: meta.slug },
    update: {},
    create: { slug: meta.slug, name: meta.name, color: meta.color },
  });

  return cat.id;
}

// ── Auto-approve quality thresholds ─────────────────────────────────────────

const AUTO_APPROVE_MIN_RELEVANCE  = 0.60;
const AUTO_APPROVE_MIN_QUALITY    = 0.60;
const AUTO_APPROVE_MIN_NOVELTY    = 0.65;
const AUTO_APPROVE_MIN_CLAIMS     = 2;
const AUTO_APPROVE_MIN_CRITICISMS = 1;
// Only auto-approve verifiable topics (not pure speculation)
const AUTO_APPROVE_EVIDENCE_LEVELS = new Set(['verified', 'strong_evidence', 'debated']);

export function qualifiesForAutoApprove(opts: {
  relevanceScore:  number;
  qualityScore:    number;
  noveltyScore:    number;
  evidenceLevel:   string;
  claimCount:      number;
  criticismCount:  number;
}): boolean {
  return (
    opts.relevanceScore  >= AUTO_APPROVE_MIN_RELEVANCE  &&
    opts.qualityScore    >= AUTO_APPROVE_MIN_QUALITY    &&
    opts.noveltyScore    >= AUTO_APPROVE_MIN_NOVELTY    &&
    opts.claimCount      >= AUTO_APPROVE_MIN_CLAIMS     &&
    opts.criticismCount  >= AUTO_APPROVE_MIN_CRITICISMS &&
    AUTO_APPROVE_EVIDENCE_LEVELS.has(opts.evidenceLevel)
  );
}

// ── Core promotion ────────────────────────────────────────────────────────────

export interface DiscoveredNodeRecord {
  id:              string;
  slug:            string;
  title:           string;
  category:        string;
  description:     string;
  mainstreamView:  string | null;
  evidenceLevel:   string;
  confidenceScore: number;
  color:           string | null;
  icon:            string | null;
  year:            number | null;
  tags:            unknown;
  claims:          unknown;
  criticisms:      unknown;
  openQuestions:   unknown;
  relatedNodeIds:  unknown;
}

export async function promoteDiscoveredNode(
  discovered:  DiscoveredNodeRecord,
  reviewedBy?: string,
): Promise<string> {
  const tags          = (discovered.tags          as string[]) ?? [];
  const claims        = (discovered.claims        as string[]) ?? [];
  const criticisms    = (discovered.criticisms    as string[]) ?? [];
  const openQuestions = (discovered.openQuestions as string[]) ?? [];
  const relatedIds    = (discovered.relatedNodeIds as string[]) ?? [];

  // Ensure slug uniqueness vs existing DB nodes
  const existing = await prisma.node.findUnique({ where: { id: discovered.slug } });
  const nodeId   = existing ? `${discovered.slug}-ai` : discovered.slug;

  const categoryId = await getOrCreateCategory(discovered.category);

  const node = await prisma.node.create({
    data: {
      id:              nodeId,
      title:           discovered.title,
      categoryId,
      description:     discovered.description,
      mainstreamView:  discovered.mainstreamView ?? undefined,
      evidenceLevel:   discovered.evidenceLevel,
      confidenceScore: discovered.confidenceScore,
      color:           discovered.color ?? undefined,
      icon:            discovered.icon ?? undefined,
      year:            discovered.year ?? undefined,
      status:          'published',
      publishedAt:     new Date(),
      createdBy:       reviewedBy ?? null,
      adminReviewStatus: reviewedBy ? 'ready_to_review' : 'needs_enrichment',
      tags:          { create: tags.map(t => ({ tag: t })) },
      claims:        { create: claims.map((text, i) => ({ text, orderIndex: i })) },
      criticisms:    { create: criticisms.map((text, i) => ({ text, orderIndex: i })) },
      openQuestions: { create: openQuestions.map((text, i) => ({ text, orderIndex: i })) },
    },
  });

  // Connect to related nodes that exist in DB
  for (const relId of relatedIds.slice(0, 3)) {
    const relNode = await prisma.node.findUnique({
      where: { id: relId, status: 'published' },
    }).catch(() => null);
    if (!relNode) continue;
    await prisma.edge.create({
      data: {
        fromId:           node.id,
        toId:             relNode.id,
        relationshipType: 'thematic',
        strengthScore:    0.5,
        confidenceScore:  0.5,
        explanation:      `AI-discovered thematic relationship between "${node.title}" and "${relNode.title}".`,
        evidenceBasis:    'Autonomous discovery — pending human review.',
        sourceType:       'academic',
        status:           'published',
      },
    }).catch(() => {});
  }

  // Same background pipeline as a manual publish — keeps autonomously
  // discovered nodes eligible for the AI-semantic auto-approve gate instead
  // of only ever getting the three fixed thematic edges above.
  await Promise.allSettled([
    enqueue('embed-node',        { nodeId: node.id }, 60),
    enqueue('rebuild-adjacency', { nodeId: node.id }, 60),
    generateSuggestionsForNode(node.id).then(() => generateAiSemanticSuggestions(node.id)),
  ]);

  return node.id;
}
