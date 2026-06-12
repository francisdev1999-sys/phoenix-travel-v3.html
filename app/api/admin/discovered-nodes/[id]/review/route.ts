export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

// Category slug mapping — find or create in DB
const CATEGORY_SLUGS: Record<string, { slug: string; name: string; color: string }> = {
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

async function getOrCreateCategory(categoryName: string): Promise<string> {
  const meta = CATEGORY_SLUGS[categoryName] ?? {
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

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const body   = await req.json() as { action: 'approve' | 'reject'; reason?: string };

  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const discovered = await prisma.discoveredNode.findUnique({ where: { id } });
  if (!discovered) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.action === 'reject') {
    await prisma.discoveredNode.update({
      where: { id },
      data:  {
        status:          'rejected',
        rejectionReason: body.reason ?? null,
        reviewedBy:      session!.user!.id,
        reviewedAt:      new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Approve: promote to full Node record ─────────────────────────────────

  // Check slug not already in use
  const existing = await prisma.node.findUnique({ where: { id: discovered.slug } });
  const nodeId   = existing ? `${discovered.slug}-ai` : discovered.slug;

  const categoryId = await getOrCreateCategory(discovered.category);

  const tags          = (discovered.tags          as string[]) ?? [];
  const claims        = (discovered.claims        as string[]) ?? [];
  const criticisms    = (discovered.criticisms    as string[]) ?? [];
  const openQuestions = (discovered.openQuestions as string[]) ?? [];

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
      createdBy:       session!.user!.id,
      adminReviewStatus: 'ready_to_review',
      tags: {
        create: tags.map(t => ({ tag: t })),
      },
      claims: {
        create: claims.map((text, i) => ({ text, orderIndex: i })),
      },
      criticisms: {
        create: criticisms.map((text, i) => ({ text, orderIndex: i })),
      },
      openQuestions: {
        create: openQuestions.map((text, i) => ({ text, orderIndex: i })),
      },
    },
  });

  // Create thematic edges to related nodes that exist in DB
  const relatedIds = (discovered.relatedNodeIds as string[]) ?? [];
  for (const relId of relatedIds.slice(0, 3)) {
    const relNode = await prisma.node.findUnique({ where: { id: relId, status: 'published' } }).catch(() => null);
    if (!relNode) continue;
    await prisma.edge.create({
      data: {
        fromId:           node.id,
        toId:             relNode.id,
        relationshipType: 'thematic',
        strengthScore:    0.5,
        confidenceScore:  0.5,
        explanation:      `AI-discovered thematic relationship between "${node.title}" and "${relNode.title}".`,
        evidenceBasis:    'Autonomous discovery — pending human review and refinement.',
        sourceType:       'academic',
        status:           'published',
      },
    }).catch(() => {});
  }

  // Update staging record
  await prisma.discoveredNode.update({
    where: { id },
    data:  {
      status:        'approved',
      promotedNodeId: node.id,
      reviewedBy:    session!.user!.id,
      reviewedAt:    new Date(),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId:     session!.user!.id,
      action:     'node_approved',
      entityType: 'discovered_node',
      entityId:   id,
      detail:     { title: discovered.title, slug: node.id, category: discovered.category },
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, nodeId: node.id });
}
