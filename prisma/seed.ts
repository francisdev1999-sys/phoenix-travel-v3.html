/**
 * Prisma seed — Source Population Phase
 *
 * Derives all seed data from lib/graph/sources.ts (single source of truth).
 * Inverts NODE_SOURCES to build a deduplicated flat list with nodeIds, then
 * upserts each Source record and its SourceLink records.
 *
 * Run with: npx tsx prisma/seed.ts
 *   or via:  npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import { NODE_SOURCES } from '../lib/graph/sources';
import type { ResearchSource } from '../lib/graph/types';

const prisma = new PrismaClient();

// Invert NODE_SOURCES: { nodeId → sources[] } → unique sources with their nodeIds
function buildFlatSources(): { src: ResearchSource; nodeIds: string[] }[] {
  const map = new Map<string, { src: ResearchSource; nodeIds: string[] }>();
  for (const [nodeId, sources] of Object.entries(NODE_SOURCES)) {
    for (const src of sources) {
      if (!map.has(src.id)) {
        map.set(src.id, { src, nodeIds: [] });
      }
      map.get(src.id)!.nodeIds.push(nodeId);
    }
  }
  return [...map.values()];
}

// Extract a DOI string from a doi.org URL, or fall back to a stable seed key
function stableDoi(src: ResearchSource): string {
  if (src.url?.startsWith('https://doi.org/')) {
    return src.url.replace('https://doi.org/', '');
  }
  return `seed:${src.id}`;
}

async function main() {
  console.log('🌱 Starting source population seed...\n');

  const allSources = buildFlatSources();
  let sourcesCreated = 0;
  let linksCreated = 0;
  let sourcesFailed = 0;

  await Promise.all(allSources.map(async ({ src, nodeIds }) => {
    const doi = stableDoi(src);
    try {
      const created = await prisma.source.upsert({
        where: { doi },
        create: {
          title: src.title,
          sourceType: src.source_type,
          author: src.author,
          publicationYear: src.publication_year,
          url: src.url,
          doi,
          notes: `[seed:${src.id}] ${src.notes ?? ''}`.trim(),
          credibilityScore: src.credibility_score,
          status: 'approved',
          reviewedAt: new Date(),
          language: 'en',
        },
        update: {
          credibilityScore: src.credibility_score,
          notes: `[seed:${src.id}] ${src.notes ?? ''}`.trim(),
        },
      });

      sourcesCreated++;

      await Promise.all(nodeIds.map(async (nodeId) => {
        try {
          await prisma.sourceLink.upsert({
            where: {
              sourceId_targetType_targetId_claimIndex: {
                sourceId: created.id,
                targetType: 'node',
                targetId: nodeId,
                claimIndex: null as unknown as number,
              },
            },
            create: {
              sourceId: created.id,
              targetType: 'node',
              targetId: nodeId,
              linkType: src.link_type ?? 'supports',
            },
            update: {
              linkType: src.link_type ?? 'supports',
            },
          });
          linksCreated++;
        } catch {
          // Link already exists — skip
        }
      }));

      process.stdout.write(`  ✓ ${src.id}\n`);
    } catch (err) {
      console.error(`  ✗ Failed: ${src.id} — ${(err as Error).message}`);
      sourcesFailed++;
    }
  }));

  console.log(`\n📊 Seed complete:`);
  console.log(`   Sources created/updated: ${sourcesCreated}`);
  console.log(`   Source links created:    ${linksCreated}`);
  console.log(`   Failures:                ${sourcesFailed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
