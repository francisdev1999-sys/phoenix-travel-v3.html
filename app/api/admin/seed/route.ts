export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { nodes as staticNodes, edges as staticEdges } from '@/lib/graph';
import { NODE_SOURCES } from '@/lib/graph/sources';
import type { ResearchSource } from '@/lib/graph/types';

export async function POST(request: Request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const log: string[] = [];

  function slugify(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  }

  const CATEGORY_COLORS: Record<string, string> = {
    'Ancient Civilizations': '#a16207',
    'Egypt & Ancient Engineering': '#eab308',
    'Religious Texts & Mythology': '#f59e0b',
    'UFO / UAP': '#22c55e',
    'Human Origins': '#10b981',
    'Consciousness & Reality': '#6366f1',
    'Secret Societies & Esoteric': '#1e40af',
    'Global Mysteries': '#7c3aed',
    'Legends & Folklore': '#dc2626',
  };

  const categoryIdMap = new Map<string, string>();

  try {
    // 1. Categories
    const categoryNames = [...new Set(staticNodes.map(n => n.category))];
    for (const name of categoryNames) {
      const slug = slugify(name);
      const cat = await prisma.category.upsert({
        where: { slug },
        create: { id: slug, slug, name, color: CATEGORY_COLORS[name] ?? '#7c3aed' },
        update: { name, color: CATEGORY_COLORS[name] ?? '#7c3aed' },
      });
      categoryIdMap.set(name, cat.id);
    }
    log.push(`categories: ${categoryNames.length}`);

    // 2. Nodes
    let nodes = 0;
    for (const node of staticNodes) {
      const categoryId = categoryIdMap.get(node.category);
      if (!categoryId) continue;
      await prisma.node.upsert({
        where: { id: node.id },
        create: {
          id: node.id, title: node.title, categoryId,
          description: node.description, mainstreamView: node.mainstream_view,
          evidenceLevel: node.evidence_level, confidenceScore: node.confidence_score,
          color: node.color, icon: node.icon,
          lat: node.coordinates?.[0], lon: node.coordinates?.[1],
          region: node.region, country: node.country,
          year: node.year, dateStart: node.date_start, dateEnd: node.date_end,
          datePrecision: node.date_precision, status: 'published', publishedAt: new Date(),
        },
        update: {
          title: node.title, categoryId, description: node.description,
          mainstreamView: node.mainstream_view, evidenceLevel: node.evidence_level,
          confidenceScore: node.confidence_score, color: node.color, icon: node.icon,
          lat: node.coordinates?.[0], lon: node.coordinates?.[1],
          region: node.region, country: node.country,
          year: node.year, dateStart: node.date_start, dateEnd: node.date_end,
          datePrecision: node.date_precision, status: 'published',
        },
      });
      await prisma.nodeTag.deleteMany({ where: { nodeId: node.id } });
      if (node.tags.length > 0) await prisma.nodeTag.createMany({ data: node.tags.map(tag => ({ nodeId: node.id, tag })), skipDuplicates: true });
      await prisma.claim.deleteMany({ where: { nodeId: node.id } });
      if (node.claims.length > 0) await prisma.claim.createMany({ data: node.claims.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })) });
      await prisma.criticism.deleteMany({ where: { nodeId: node.id } });
      if (node.criticisms.length > 0) await prisma.criticism.createMany({ data: node.criticisms.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })) });
      await prisma.openQuestion.deleteMany({ where: { nodeId: node.id } });
      if (node.open_questions?.length) await prisma.openQuestion.createMany({ data: node.open_questions.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })) });
      nodes++;
    }
    log.push(`nodes: ${nodes}`);

    // 3. Edges
    let edges = 0;
    for (const edge of staticEdges) {
      const [fromExists, toExists] = await Promise.all([
        prisma.node.findUnique({ where: { id: edge.from }, select: { id: true } }),
        prisma.node.findUnique({ where: { id: edge.to }, select: { id: true } }),
      ]);
      if (!fromExists || !toExists) continue;
      await prisma.edge.upsert({
        where: { fromId_toId: { fromId: edge.from, toId: edge.to } },
        create: {
          id: edge.id, fromId: edge.from, toId: edge.to,
          relationshipType: edge.relationship_type, strengthScore: edge.strength_score,
          confidenceScore: edge.confidence_score, explanation: edge.explanation,
          evidenceBasis: edge.evidence_basis, sourceType: edge.source_type,
          sourceCount: edge.source_count, status: 'published',
        },
        update: {
          relationshipType: edge.relationship_type, strengthScore: edge.strength_score,
          confidenceScore: edge.confidence_score, explanation: edge.explanation,
          evidenceBasis: edge.evidence_basis, sourceType: edge.source_type,
          sourceCount: edge.source_count, status: 'published',
        },
      });
      edges++;
    }
    log.push(`edges: ${edges}`);

    // 4. Sources
    const srcMap = new Map<string, { src: ResearchSource; nodeIds: string[] }>();
    for (const [nodeId, sources] of Object.entries(NODE_SOURCES)) {
      for (const src of sources) {
        if (!srcMap.has(src.id)) srcMap.set(src.id, { src, nodeIds: [] });
        srcMap.get(src.id)!.nodeIds.push(nodeId);
      }
    }
    let sources = 0, links = 0;
    for (const { src, nodeIds } of srcMap.values()) {
      const doi = src.url?.startsWith('https://doi.org/') ? src.url.replace('https://doi.org/', '') : `seed:${src.id}`;
      const created = await prisma.source.upsert({
        where: { doi },
        create: {
          title: src.title, sourceType: src.source_type, author: src.author,
          publicationYear: src.publication_year, url: src.url, doi,
          notes: `[seed:${src.id}] ${src.notes ?? ''}`.trim(),
          credibilityScore: src.credibility_score, status: 'approved',
          reviewedAt: new Date(), language: 'en',
        },
        update: { credibilityScore: src.credibility_score, notes: `[seed:${src.id}] ${src.notes ?? ''}`.trim() },
      });
      sources++;
      for (const nodeId of nodeIds) {
        const nodeExists = await prisma.node.findUnique({ where: { id: nodeId }, select: { id: true } });
        if (!nodeExists) continue;
        try {
          await prisma.sourceLink.upsert({
            where: { legacy_source_link_unique: { sourceId: created.id, targetType: 'node', targetId: nodeId, claimIndex: null as unknown as number } },
            create: { sourceId: created.id, targetType: 'node', targetId: nodeId, nodeId, linkType: src.link_type ?? 'supports' },
            update: { nodeId, linkType: src.link_type ?? 'supports' },
          });
          links++;
        } catch { /* duplicate */ }
      }
    }
    log.push(`sources: ${sources}  links: ${links}`);

    return NextResponse.json({ ok: true, seeded: log.join(', ') });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
