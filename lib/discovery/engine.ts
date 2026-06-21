/**
 * Autonomous source discovery engine.
 *
 * For each published node:
 * 1. Generate targeted search queries from title, tags, claims, etc.
 * 2. Query free academic APIs in parallel (CrossRef, Semantic Scholar, arXiv, OpenAlex, Wikipedia, PubMed)
 * 3. Score each result with the credibility scorer
 * 4. Upsert into DiscoveredSource (staging)
 * 5. Auto-approve green-lane sources
 * 6. Return counts for DiscoveryRun audit record
 */

import { prisma } from '@/lib/db';
import { scoreSource, seedDomainReputations } from './credibility';
import {
  searchCrossRef, searchSemanticScholar, searchArXiv,
  searchOpenAlex, searchWikipedia, searchPubMed,
  type DiscoveredRaw,
} from './apis';
import { promoteDiscoveredSource } from './source-promoter';

export interface DiscoveryResult {
  nodesChecked:  number;
  sourcesFound:  number;
  autoApproved:  number;
  pendingReview: number;
  skipped:       number;
}

// ── Query generation ─────────────────────────────────────────────────────────

function buildQueries(node: {
  title: string;
  description: string;
  tags: { tag: string }[];
  claims: { text: string }[];
}): string[] {
  const queries: string[] = [];

  // Primary: title
  queries.push(node.title);

  // Title + top tag
  if (node.tags.length > 0) {
    queries.push(`${node.title} ${node.tags[0].tag}`);
  }

  // First substantive claim keyword phrase
  if (node.claims.length > 0) {
    const claim = node.claims[0].text;
    const words = claim.split(/\s+/).filter(w => w.length > 3).slice(0, 6).join(' ');
    if (words) queries.push(words);
  }

  // Description excerpt
  const descWords = node.description.split(/\s+/).filter(w => w.length > 4).slice(0, 8).join(' ');
  if (descWords && descWords !== node.title) queries.push(descWords);

  return [...new Set(queries)].slice(0, 4);
}

// ── Per-node discovery ───────────────────────────────────────────────────────

async function discoverForNode(node: {
  id: string;
  title: string;
  description: string;
  tags: { tag: string }[];
  claims: { text: string }[];
}): Promise<{ sourcesFound: number; autoApproved: number; pendingReview: number }> {

  const queries = buildQueries(node);
  const allRaw:  DiscoveredRaw[] = [];

  // Each query hits a different API to maximise coverage while respecting rate limits
  const apiCalls = [
    queries[0] ? searchCrossRef(queries[0], 5)           : Promise.resolve([]),
    queries[0] ? searchSemanticScholar(queries[0], 5)    : Promise.resolve([]),
    queries[1] ? searchArXiv(queries[1], 5)              : Promise.resolve([]),
    queries[2] ? searchOpenAlex(queries[2], 5)           : Promise.resolve([]),
    queries[0] ? searchWikipedia(queries[0], 3)          : Promise.resolve([]),
    queries[3] ? searchPubMed(queries[3], 5)             : Promise.resolve([]),
  ];

  const settled = await Promise.allSettled(apiCalls);
  for (const r of settled) {
    if (r.status === 'fulfilled') allRaw.push(...r.value);
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allRaw.filter(r => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  let autoApproved = 0;
  let pendingReview = 0;

  for (const raw of unique) {
    const scoring = await scoreSource({
      domain:          raw.domain,
      sourceType:      raw.sourceType,
      doi:             raw.doi,
      abstract:        raw.abstract,
      publicationYear: raw.publicationYear,
      nodeTitle:       node.title,
      nodeDescription: node.description,
      title:           raw.title,
    });

    const status = scoring.autoApprove ? 'auto_approved' : 'pending_review';

    let discoveredSource;
    try {
      discoveredSource = await prisma.discoveredSource.upsert({
        where:  { nodeId_url: { nodeId: node.id, url: raw.url } },
        update: {}, // Don't overwrite existing entries — preserve reviewer decisions
        create: {
          nodeId:          node.id,
          title:           raw.title,
          url:             raw.url,
          sourceType:      raw.sourceType,
          author:          raw.author,
          publicationYear: raw.publicationYear,
          journal:         raw.journal,
          doi:             raw.doi,
          abstract:        raw.abstract,
          domain:          raw.domain,
          discoveryApi:    raw.discoveryApi,
          discoveryQuery:  queries[0],
          credibilityScore: scoring.credibilityScore,
          relevanceScore:  scoring.relevanceScore,
          riskScore:       scoring.riskScore,
          credibilityClass: scoring.credibilityClass,
          autoApprove:     scoring.autoApprove,
          status,
        },
      });
    } catch {
      continue; // Unique constraint violation means it already exists — skip
    }

    // Green-lane sources don't just sit at "auto_approved" waiting for an
    // admin click — they're already deemed credible, so promote them to a
    // live, citable Source immediately, same as a human approval would.
    if (status === 'auto_approved' && !discoveredSource.promotedSourceId) {
      try {
        const sourceId = await promoteDiscoveredSource(discoveredSource);
        await prisma.discoveredSource.update({
          where: { id: discoveredSource.id },
          data:  { promotedSourceId: sourceId, reviewedAt: new Date() },
        });
      } catch (err) {
        console.warn(`[discovery] auto-promote failed for ${raw.url}:`, err);
      }
    }

    if (status === 'auto_approved') autoApproved++;
    else pendingReview++;
  }

  return { sourcesFound: unique.length, autoApproved, pendingReview };
}

// ── Full discovery run ───────────────────────────────────────────────────────

export async function runDiscovery(opts: {
  nodeId?:    string;   // Single node mode
  maxNodes?:  number;   // Limit for scheduled runs
  runId?:     string;   // DiscoveryRun.id for progress tracking
}): Promise<DiscoveryResult> {

  await seedDomainReputations();

  const where = {
    status: 'published',
    ...(opts.nodeId ? { id: opts.nodeId } : {}),
  };

  const nodes = await prisma.node.findMany({
    where,
    take:    opts.maxNodes ?? 50,
    orderBy: { publishedAt: 'desc' },
    select:  {
      id: true, title: true, description: true,
      tags:   { select: { tag: true } },
      claims: { select: { text: true }, take: 3 },
    },
  });

  const result: DiscoveryResult = {
    nodesChecked:  0,
    sourcesFound:  0,
    autoApproved:  0,
    pendingReview: 0,
    skipped:       0,
  };

  // Process nodes with a small delay to stay within free API rate limits
  for (const node of nodes) {
    try {
      const counts = await discoverForNode(node);
      result.nodesChecked++;
      result.sourcesFound  += counts.sourcesFound;
      result.autoApproved  += counts.autoApproved;
      result.pendingReview += counts.pendingReview;
    } catch (err) {
      console.warn(`[discovery] Node ${node.id} failed:`, err);
      result.skipped++;
    }

    // 200ms between nodes to be polite to free APIs
    await new Promise(r => setTimeout(r, 200));
  }

  return result;
}
