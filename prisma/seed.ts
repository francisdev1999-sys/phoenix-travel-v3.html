/**
 * Prisma seed — Full graph population
 *
 * Migrates all static data (nodes, edges, claims, sources) from TypeScript
 * files into the PostgreSQL database. Safe to run multiple times (upserts).
 *
 * Run: npx tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import { nodes as staticNodes, edges as staticEdges } from '../lib/graph';
import { NODE_SOURCES } from '../lib/graph/sources';
import type { ResearchSource } from '../lib/graph/types';

const prisma = new PrismaClient();

// Category slug → id mapping (built during category seeding)
const categoryIdMap = new Map<string, string>();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ── Category colours matching the static graph ────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  'Ancient Civilizations':       '#a16207',
  'Egypt & Ancient Engineering': '#eab308',
  'Religious Texts & Mythology': '#f59e0b',
  'UFO / UAP':                   '#22c55e',
  'Human Origins':               '#10b981',
  'Consciousness & Reality':     '#6366f1',
  'Secret Societies & Esoteric': '#1e40af',
  'Global Mysteries':            '#7c3aed',
  'Legends & Folklore':          '#dc2626',
};

// ── 1. Seed categories ────────────────────────────────────────────────────────

async function seedCategories() {
  console.log('\n[1/4] Seeding categories...');
  const categoryNames = [...new Set(staticNodes.map(n => n.category))];

  for (const name of categoryNames) {
    const slug = slugify(name);
    const cat = await prisma.category.upsert({
      where: { slug },
      create: {
        id:    slug,
        slug,
        name,
        color: CATEGORY_COLORS[name] ?? '#7c3aed',
      },
      update: {
        name,
        color: CATEGORY_COLORS[name] ?? '#7c3aed',
      },
    });
    categoryIdMap.set(name, cat.id);
    process.stdout.write(`  ✓ ${name}\n`);
  }
}

// ── 2. Seed nodes (with claims, criticisms, open questions, tags) ─────────────

async function seedNodes() {
  console.log('\n[2/4] Seeding nodes...');
  let created = 0;
  let failed  = 0;

  for (const node of staticNodes) {
    const categoryId = categoryIdMap.get(node.category);
    if (!categoryId) {
      console.error(`  ✗ No category id for "${node.category}" (node: ${node.id})`);
      failed++;
      continue;
    }

    try {
      // Upsert the node row
      await prisma.node.upsert({
        where:  { id: node.id },
        create: {
          id:              node.id,
          title:           node.title,
          categoryId,
          description:     node.description,
          mainstreamView:  node.mainstream_view,
          evidenceLevel:   node.evidence_level,
          confidenceScore: node.confidence_score,
          color:           node.color,
          icon:            node.icon,
          lat:             node.coordinates?.[0],
          lon:             node.coordinates?.[1],
          region:          node.region,
          country:         node.country,
          year:            node.year,
          dateStart:       node.date_start,
          dateEnd:         node.date_end,
          datePrecision:   node.date_precision,
          status:          'published',
          publishedAt:     new Date(),
        },
        update: {
          title:           node.title,
          categoryId,
          description:     node.description,
          mainstreamView:  node.mainstream_view,
          evidenceLevel:   node.evidence_level,
          confidenceScore: node.confidence_score,
          color:           node.color,
          icon:            node.icon,
          lat:             node.coordinates?.[0],
          lon:             node.coordinates?.[1],
          region:          node.region,
          country:         node.country,
          year:            node.year,
          dateStart:       node.date_start,
          dateEnd:         node.date_end,
          datePrecision:   node.date_precision,
          status:          'published',
        },
      });

      // Sync tags — delete old, insert new
      await prisma.nodeTag.deleteMany({ where: { nodeId: node.id } });
      if (node.tags.length > 0) {
        await prisma.nodeTag.createMany({
          data: node.tags.map(tag => ({ nodeId: node.id, tag })),
          skipDuplicates: true,
        });
      }

      // Sync claims — delete old, insert new with stable ordering
      await prisma.claim.deleteMany({ where: { nodeId: node.id } });
      if (node.claims.length > 0) {
        await prisma.claim.createMany({
          data: node.claims.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })),
        });
      }

      // Sync criticisms
      await prisma.criticism.deleteMany({ where: { nodeId: node.id } });
      if (node.criticisms.length > 0) {
        await prisma.criticism.createMany({
          data: node.criticisms.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })),
        });
      }

      // Sync open questions
      await prisma.openQuestion.deleteMany({ where: { nodeId: node.id } });
      if (node.open_questions && node.open_questions.length > 0) {
        await prisma.openQuestion.createMany({
          data: node.open_questions.map((text, i) => ({ nodeId: node.id, text, orderIndex: i })),
        });
      }

      created++;
      process.stdout.write(`  ✓ ${node.id}\n`);
    } catch (err) {
      console.error(`  ✗ ${node.id} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`     Created/updated: ${created}  Failed: ${failed}`);
}

// ── 3. Seed edges ─────────────────────────────────────────────────────────────

async function seedEdges() {
  console.log('\n[3/4] Seeding edges...');
  let created = 0;
  let skipped = 0;
  let failed  = 0;

  for (const edge of staticEdges) {
    // Skip edges that reference nodes not in the DB
    const [fromExists, toExists] = await Promise.all([
      prisma.node.findUnique({ where: { id: edge.from }, select: { id: true } }),
      prisma.node.findUnique({ where: { id: edge.to },   select: { id: true } }),
    ]);

    if (!fromExists || !toExists) {
      console.warn(`  ~ skipping edge ${edge.id}: missing node (${edge.from} → ${edge.to})`);
      skipped++;
      continue;
    }

    try {
      await prisma.edge.upsert({
        where:  { fromId_toId: { fromId: edge.from, toId: edge.to } },
        create: {
          id:               edge.id,
          fromId:           edge.from,
          toId:             edge.to,
          relationshipType: edge.relationship_type,
          strengthScore:    edge.strength_score,
          confidenceScore:  edge.confidence_score,
          explanation:      edge.explanation,
          evidenceBasis:    edge.evidence_basis,
          sourceType:       edge.source_type,
          sourceCount:      edge.source_count,
          status:           'published',
        },
        update: {
          relationshipType: edge.relationship_type,
          strengthScore:    edge.strength_score,
          confidenceScore:  edge.confidence_score,
          explanation:      edge.explanation,
          evidenceBasis:    edge.evidence_basis,
          sourceType:       edge.source_type,
          sourceCount:      edge.source_count,
          status:           'published',
        },
      });
      created++;
    } catch (err) {
      console.error(`  ✗ ${edge.id} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`     Created/updated: ${created}  Skipped: ${skipped}  Failed: ${failed}`);
}

// ── 4. Seed sources (from NODE_SOURCES) ───────────────────────────────────────

function stableDoi(src: ResearchSource): string {
  if (src.url?.startsWith('https://doi.org/')) {
    return src.url.replace('https://doi.org/', '');
  }
  return `seed:${src.id}`;
}

function buildFlatSources(): { src: ResearchSource; nodeIds: string[] }[] {
  const map = new Map<string, { src: ResearchSource; nodeIds: string[] }>();
  for (const [nodeId, sources] of Object.entries(NODE_SOURCES)) {
    for (const src of sources) {
      if (!map.has(src.id)) map.set(src.id, { src, nodeIds: [] });
      map.get(src.id)!.nodeIds.push(nodeId);
    }
  }
  return [...map.values()];
}

async function seedSources() {
  console.log('\n[4/4] Seeding sources...');
  const allSources = buildFlatSources();
  let sourcesCreated = 0;
  let linksCreated   = 0;
  let failed         = 0;

  for (const { src, nodeIds } of allSources) {
    const doi = stableDoi(src);
    try {
      const created = await prisma.source.upsert({
        where:  { doi },
        create: {
          title:           src.title,
          sourceType:      src.source_type,
          author:          src.author,
          publicationYear: src.publication_year,
          url:             src.url,
          doi,
          notes:           `[seed:${src.id}] ${src.notes ?? ''}`.trim(),
          credibilityScore: src.credibility_score,
          status:          'approved',
          reviewedAt:      new Date(),
          language:        'en',
        },
        update: {
          credibilityScore: src.credibility_score,
          notes: `[seed:${src.id}] ${src.notes ?? ''}`.trim(),
        },
      });

      sourcesCreated++;

      for (const nodeId of nodeIds) {
        // Check node exists in DB before creating link
        const nodeExists = await prisma.node.findUnique({ where: { id: nodeId }, select: { id: true } });
        if (!nodeExists) continue;

        try {
          await prisma.sourceLink.upsert({
            where: {
              legacy_source_link_unique: {
                sourceId:   created.id,
                targetType: 'node',
                targetId:   nodeId,
                claimIndex: null as unknown as number,
              },
            },
            create: {
              sourceId:   created.id,
              targetType: 'node',
              targetId:   nodeId,
              nodeId:     nodeId,   // also set the FK column
              linkType:   src.link_type ?? 'supports',
            },
            update: {
              nodeId:   nodeId,
              linkType: src.link_type ?? 'supports',
            },
          });
          linksCreated++;
        } catch {
          // duplicate — skip
        }
      }
    } catch (err) {
      console.error(`  ✗ ${src.id} — ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`     Sources: ${sourcesCreated}  Links: ${linksCreated}  Failed: ${failed}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Nexus Archive — Foundation Seed\n');
  console.log(`   Nodes:   ${staticNodes.length}`);
  console.log(`   Edges:   ${staticEdges.length}`);
  console.log(`   Sources: ${Object.values(NODE_SOURCES).flat().length} (deduplicated)`);

  await seedCategories();
  await seedNodes();
  await seedEdges();
  await seedSources();

  console.log('\n✅ Seed complete.\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
