/**
 * Shared discovered-source promotion logic — used by both autonomous source
 * discovery (auto-approve lane) and the admin review route (manual approve).
 *
 * Promotes a staged DiscoveredSource (already scored as credible) into a
 * live, citable Source + SourceLink. Never fabricates fields it doesn't
 * have — only writes what the discovery API actually returned.
 */

import { prisma } from '@/lib/db';

export interface DiscoveredSourceRecord {
  id:               string;
  nodeId:           string;
  title:            string;
  url:              string;
  sourceType:       string;
  author:           string | null;
  publicationYear:  number | null;
  journal:          string | null;
  doi:              string | null;
  abstract:         string | null;
  domain:           string;
  credibilityScore: number;
}

export async function promoteDiscoveredSource(
  discovered:  DiscoveredSourceRecord,
  reviewedBy?: string,
): Promise<string> {
  const sourceData = {
    title:            discovered.title,
    sourceType:       discovered.sourceType,
    author:           discovered.author,
    publicationYear:  discovered.publicationYear,
    journal:          discovered.journal,
    abstract:         discovered.abstract,
    url:              discovered.url,
    language:         'en',
    credibilityScore: discovered.credibilityScore,
    status:           'approved',
    reviewedBy:       reviewedBy ?? null,
    reviewedAt:       new Date(),
    submittedBy:      null,
  };

  // Dedupe by DOI when available, else by URL — never create duplicate
  // citations for the same underlying source across different nodes.
  const source = discovered.doi
    ? await prisma.source.upsert({
        where:  { doi: discovered.doi },
        update: {},
        create: { ...sourceData, doi: discovered.doi },
      })
    : await prisma.source.findFirst({ where: { url: discovered.url } })
      ?? await prisma.source.create({ data: { ...sourceData, doi: null } });

  const existingLink = await prisma.sourceLink.findFirst({
    where: { sourceId: source.id, nodeId: discovered.nodeId },
  });
  if (!existingLink) {
    await prisma.sourceLink.create({
      data: { sourceId: source.id, nodeId: discovered.nodeId, linkType: 'supports' },
    }).catch(() => {});
  }

  await prisma.sourceDomainReputation.upsert({
    where:  { domain: discovered.domain },
    update: { approvalCount: { increment: 1 }, reputationScore: { increment: 0.001 } },
    create: { domain: discovered.domain, approvalCount: 1, reputationScore: 0.65 },
  }).catch(() => {});

  return source.id;
}
