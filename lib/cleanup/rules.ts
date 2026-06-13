import { prisma } from '@/lib/db';
import type { NodeCandidate, SourceCandidate } from './types';

const FICTION_KEYWORDS = [
  'cartoon', 'anime', 'manga', 'animated series', 'fictional character',
  'video game character', 'gaming character', 'movie character', 'tv show character',
  'meme', 'tiktok', 'instagram influencer', 'reality tv', 'pop star',
  'scooby', 'mickey', 'batman', 'superman', 'spider-man', 'avengers',
  'marvel comics', 'dc comics', 'disney character',
];

const SPAM_DOMAINS = [
  'blogspot.com', 'weebly.com', 'wix.com', 'freewebs.com', 'tripod.com',
  'angelfire.com', 'geocities.com', 'yolasite.com', 'sitew.com',
];

export async function runNodeRules(): Promise<NodeCandidate[]> {
  const [blacklistRows, whitelistRows] = await Promise.all([
    prisma.discoveryBlacklist.findMany({
      where: { type: { in: ['keyword', 'title', 'category', 'entity_type'] } },
      select: { type: true, value: true },
    }),
    prisma.discoveryWhitelist.findMany({ select: { type: true, value: true } }),
  ]);

  const blacklistKeywords = blacklistRows.filter(b => b.type === 'keyword').map(b => b.value.toLowerCase());
  const blacklistTitles   = blacklistRows.filter(b => b.type === 'title').map(b => b.value.toLowerCase());
  const blacklistCats     = blacklistRows.filter(b => b.type === 'category').map(b => b.value.toLowerCase());
  const whitelistKeywords = whitelistRows.map(w => w.value.toLowerCase());

  const nodes = await prisma.node.findMany({
    where: { status: 'published' },  // drafts/pending are not yet ready for cleanup review
    select: {
      id: true,
      title: true,
      description: true,
      evidenceLevel: true,
      confidenceScore: true,
      category: { select: { name: true, slug: true } },
      tags: { select: { tag: true } },
      edgesFrom: { select: { id: true } },
      edgesTo:   { select: { id: true } },
      sourceLinks: { select: { id: true } },
    },
    take: 500,
  });

  const allFictionKw = [...FICTION_KEYWORDS, ...blacklistKeywords];
  const candidates: NodeCandidate[] = [];

  for (const node of nodes) {
    const flagReasons: string[] = [];
    const titleLower = node.title.toLowerCase();
    const descLower  = node.description.toLowerCase();
    const tags       = node.tags.map(t => t.tag.toLowerCase());

    const isWhitelisted = whitelistKeywords.some(
      wk => titleLower.includes(wk) || descLower.includes(wk),
    );

    if (!isWhitelisted) {
      for (const kw of allFictionKw) {
        if (titleLower.includes(kw) || descLower.includes(kw) || tags.some(t => t.includes(kw))) {
          flagReasons.push(`Fiction/pop-culture keyword: "${kw}"`);
          break;
        }
      }
    }

    if (blacklistTitles.includes(titleLower)) {
      flagReasons.push('Exact blacklist title match');
    }

    const catName = node.category.name.toLowerCase();
    if (blacklistCats.includes(catName) || blacklistCats.includes(node.category.slug.toLowerCase())) {
      flagReasons.push(`Blacklisted category: ${node.category.name}`);
    }

    if (node.confidenceScore < 0.15) {
      flagReasons.push(`Extremely low confidence: ${node.confidenceScore.toFixed(2)}`);
    }

    const edgeCount   = node.edgesFrom.length + node.edgesTo.length;
    const sourceCount = node.sourceLinks.length;

    if (edgeCount === 0)   flagReasons.push('Orphan node: no connections to other nodes');
    if (sourceCount === 0) flagReasons.push('No sources linked to this node');

    if (flagReasons.length > 0) {
      candidates.push({
        id: node.id,
        title: node.title,
        category: node.category.name,
        descriptionSummary: node.description.slice(0, 300),
        tags: node.tags.map(t => t.tag),
        sourceCount,
        relationshipCount: edgeCount,
        evidenceLevel: node.evidenceLevel,
        confidenceScore: node.confidenceScore,
        flagReasons,
      });
    }
  }

  return candidates;
}

export async function runSourceRules(): Promise<SourceCandidate[]> {
  const blacklistDomains = await prisma.discoveryBlacklist.findMany({
    where: { type: 'domain' },
    select: { value: true },
  });
  const blockedDomains = [...SPAM_DOMAINS, ...blacklistDomains.map(b => b.value.toLowerCase())];

  const sources = await prisma.source.findMany({
    where: { status: { in: ['approved', 'published'] } },
    select: {
      id: true,
      title: true,
      sourceType: true,
      author: true,
      publicationYear: true,
      url: true,
      credibilityScore: true,
      links: {
        where: { nodeId: { not: null } },
        select: { node: { select: { id: true, title: true } } },
        take: 1,
      },
    },
    take: 500,
  });

  const candidates: SourceCandidate[] = [];

  for (const src of sources) {
    const flagReasons: string[] = [];

    if (!src.title || src.title.trim().length < 2) flagReasons.push('Missing or very short title');
    if (!src.sourceType)                            flagReasons.push('Missing source type');
    if (!src.author && !src.publicationYear && src.sourceType !== 'ancient_text') {
      flagReasons.push('No author and no publication year');
    }
    if (src.credibilityScore < 0.2) {
      flagReasons.push(`Very low credibility score: ${src.credibilityScore.toFixed(2)}`);
    }

    let domain: string | undefined;
    if (src.url) {
      try {
        const hostname = new URL(src.url).hostname.toLowerCase();
        domain = hostname;
        if (blockedDomains.some(d => hostname.includes(d))) {
          flagReasons.push(`Low-quality or blocked domain: ${hostname}`);
        }
      } catch {
        flagReasons.push('Malformed URL');
      }
    }

    if (flagReasons.length > 0) {
      const linked = src.links[0]?.node;
      candidates.push({
        id: src.id,
        title: src.title ?? 'Untitled',
        url: src.url ?? undefined,
        domain,
        sourceType: src.sourceType ?? 'unknown',
        linkedNodeId: linked?.id ?? '',
        linkedNodeTitle: linked?.title ?? '(no linked node)',
        author: src.author ?? undefined,
        year: src.publicationYear ?? undefined,
        flagReasons,
      });
    }
  }

  return candidates;
}
