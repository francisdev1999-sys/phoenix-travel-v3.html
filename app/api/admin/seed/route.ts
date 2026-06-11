export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { GALAXIES, CATEGORY_TO_GALAXY } from '@/lib/taxonomy/galaxies';
import { CATEGORY_MIGRATION_MAP, NODE_CATEGORY_VALUES, NODE_CATEGORY_COLORS } from '@/lib/taxonomy/node-categories';
import { nodes as staticNodes, edges as staticEdges } from '@/lib/graph';
import { NODE_SOURCES } from '@/lib/graph/sources';
import type { ResearchSource } from '@/lib/graph/types';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

function stableDoi(src: ResearchSource): string {
  if (src.url?.startsWith('https://doi.org/')) return src.url.replace('https://doi.org/', '');
  return `seed:${src.id}`;
}

async function runSeed(): Promise<{ nodes: number; edges: number; galaxies: number; sources: number; links: number; errors: number }> {
  const stats = { nodes: 0, edges: 0, galaxies: 0, sources: 0, links: 0, errors: 0 };
  const categoryIdMap = new Map<string, string>();

  // ── 1. Seed categories from static node data ─────────────────────────────
  const categoryNames = [...new Set(staticNodes.map(n => n.category))];
  for (const name of categoryNames) {
    const slug = slugify(name);
    const color = (NODE_CATEGORY_COLORS as Record<string, string>)[name] ?? '#7c3aed';
    try {
      const cat = await prisma.category.upsert({
        where:  { slug },
        create: { id: slug, slug, name, color },
        update: { name, color },
      });
      categoryIdMap.set(name, cat.id);
    } catch { stats.errors++; }
  }

  // ── 2. Seed nodes (claims, criticisms, open questions, tags) ──────────────
  for (const node of staticNodes) {
    const categoryId = categoryIdMap.get(node.category);
    if (!categoryId) { stats.errors++; continue; }
    try {
      await prisma.node.upsert({
        where:  { id: node.id },
        create: {
          id: node.id, title: node.title, categoryId,
          description:     node.description,
          mainstreamView:  node.mainstream_view,
          evidenceLevel:   node.evidence_level,
          confidenceScore: node.confidence_score,
          color:  node.color, icon: node.icon,
          lat:    node.coordinates?.[0],  lon: node.coordinates?.[1],
          region: node.region,            country: node.country,
          year:   node.year,              dateStart: node.date_start,
          dateEnd: node.date_end,         datePrecision: node.date_precision,
          status: 'published',            publishedAt: new Date(),
        },
        update: {
          title: node.title, categoryId,
          description:     node.description,
          mainstreamView:  node.mainstream_view,
          evidenceLevel:   node.evidence_level,
          confidenceScore: node.confidence_score,
          color: node.color, icon: node.icon,
          lat:   node.coordinates?.[0],   lon: node.coordinates?.[1],
          region: node.region,            country: node.country,
          year:   node.year,              dateStart: node.date_start,
          dateEnd: node.date_end,         datePrecision: node.date_precision,
          status: 'published',
        },
      });
      await prisma.nodeTag.deleteMany({ where: { nodeId: node.id } });
      if (node.tags.length > 0) {
        await prisma.nodeTag.createMany({ data: node.tags.map(tag => ({ nodeId: node.id, tag })), skipDuplicates: true });
      }
      await prisma.claim.deleteMany({ where: { nodeId: node.id } });
      if (node.claims.length > 0) {
        await prisma.claim.createMany({ data: node.claims.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })) });
      }
      await prisma.criticism.deleteMany({ where: { nodeId: node.id } });
      if (node.criticisms.length > 0) {
        await prisma.criticism.createMany({ data: node.criticisms.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })) });
      }
      await prisma.openQuestion.deleteMany({ where: { nodeId: node.id } });
      if (node.open_questions && node.open_questions.length > 0) {
        await prisma.openQuestion.createMany({ data: node.open_questions.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })) });
      }
      stats.nodes++;
    } catch { stats.errors++; }
  }

  // ── 3. Seed edges ────────────────────────────────────────────────────────
  for (const edge of staticEdges) {
    const [fromExists, toExists] = await Promise.all([
      prisma.node.findUnique({ where: { id: edge.from }, select: { id: true } }),
      prisma.node.findUnique({ where: { id: edge.to },   select: { id: true } }),
    ]);
    if (!fromExists || !toExists) continue;
    try {
      await prisma.edge.upsert({
        where:  { fromId_toId: { fromId: edge.from, toId: edge.to } },
        create: {
          id: edge.id, fromId: edge.from, toId: edge.to,
          relationshipType: edge.relationship_type,
          strengthScore:    edge.strength_score,
          confidenceScore:  edge.confidence_score,
          explanation:      edge.explanation,
          evidenceBasis:    edge.evidence_basis,
          sourceType:       edge.source_type,
          sourceCount:      edge.source_count,
          status: 'published',
        },
        update: {
          relationshipType: edge.relationship_type,
          strengthScore:    edge.strength_score,
          confidenceScore:  edge.confidence_score,
          explanation:      edge.explanation,
          evidenceBasis:    edge.evidence_basis,
          sourceType:       edge.source_type,
          sourceCount:      edge.source_count,
          status: 'published',
        },
      });
      stats.edges++;
    } catch { stats.errors++; }
  }

  // ── 4. Seed galaxies ─────────────────────────────────────────────────────
  const galaxyIdMap = new Map<string, string>();
  for (const g of GALAXIES) {
    try {
      const galaxy = await prisma.galaxy.upsert({
        where:  { slug: g.slug },
        create: { slug: g.slug, name: g.name, description: g.description, icon: g.icon, color: g.color, order: g.order },
        update: { name: g.name, description: g.description, icon: g.icon, color: g.color, order: g.order },
      });
      galaxyIdMap.set(g.slug, galaxy.id);
      stats.galaxies++;
    } catch { stats.errors++; }
  }

  // Assign galaxyId to categories
  const allCategories = await prisma.category.findMany({ select: { id: true, name: true } });
  for (const cat of allCategories) {
    const canonicalName = (NODE_CATEGORY_VALUES as readonly string[]).includes(cat.name)
      ? cat.name
      : CATEGORY_MIGRATION_MAP[cat.name] ?? null;
    if (!canonicalName) continue;
    const galaxySlug = CATEGORY_TO_GALAXY[canonicalName];
    if (!galaxySlug) continue;
    const galaxyId = galaxyIdMap.get(galaxySlug);
    if (!galaxyId) continue;
    try {
      await prisma.category.update({ where: { id: cat.id }, data: { galaxyId } });
    } catch { /* ignore */ }
  }

  // ── 5. Seed sources ──────────────────────────────────────────────────────
  const sourceMap = new Map<string, { src: ResearchSource; nodeIds: string[] }>();
  for (const [nodeId, sources] of Object.entries(NODE_SOURCES)) {
    for (const src of sources) {
      if (!sourceMap.has(src.id)) sourceMap.set(src.id, { src, nodeIds: [] });
      sourceMap.get(src.id)!.nodeIds.push(nodeId);
    }
  }

  for (const { src, nodeIds } of sourceMap.values()) {
    const doi = stableDoi(src);
    try {
      const created = await prisma.source.upsert({
        where:  { doi },
        create: {
          title: src.title, sourceType: src.source_type,
          author: src.author, publicationYear: src.publication_year,
          url: src.url, doi, notes: `[seed:${src.id}] ${src.notes ?? ''}`.trim(),
          credibilityScore: src.credibility_score,
          status: 'approved', reviewedAt: new Date(), language: 'en',
        },
        update: { credibilityScore: src.credibility_score, notes: `[seed:${src.id}] ${src.notes ?? ''}`.trim() },
      });
      stats.sources++;

      for (const nodeId of nodeIds) {
        const nodeExists = await prisma.node.findUnique({ where: { id: nodeId }, select: { id: true } });
        if (!nodeExists) continue;
        try {
          // Avoid null-claimIndex upsert — PostgreSQL treats NULL != NULL in unique indexes
          // so ON CONFLICT never fires. Use findFirst+create instead.
          const existing = await prisma.sourceLink.findFirst({
            where: { sourceId: created.id, nodeId },
            select: { id: true },
          });
          if (!existing) {
            await prisma.sourceLink.create({
              data: { sourceId: created.id, targetType: 'node', targetId: nodeId, nodeId, linkType: src.link_type ?? 'supports' },
            });
          }
          stats.links++;
        } catch { /* skip */ }
      }
    } catch { stats.errors++; }
  }

  console.log(`[seed] Done — nodes:${stats.nodes} edges:${stats.edges} galaxies:${stats.galaxies} sources:${stats.sources} links:${stats.links} errors:${stats.errors}`);
  return stats;
}

export async function POST() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const existing = await Promise.all([
    prisma.galaxy.count(),
    prisma.node.count({ where: { status: 'published' } }),
  ]);

  after(async () => { await runSeed(); });

  return NextResponse.json({
    status: 'started',
    message: `Seed running in background. ${existing[0]} galaxies and ${existing[1]} published nodes currently in DB. Reload the page in ~30 seconds.`,
    currentGalaxies: existing[0],
    currentNodes: existing[1],
  });
}

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }
  const [galaxies, nodes, edges, sources] = await Promise.all([
    prisma.galaxy.count(),
    prisma.node.count({ where: { status: 'published' } }),
    prisma.edge.count({ where: { status: 'published' } }),
    prisma.source.count(),
  ]);
  return NextResponse.json({ galaxies, nodes, edges, sources });
}
