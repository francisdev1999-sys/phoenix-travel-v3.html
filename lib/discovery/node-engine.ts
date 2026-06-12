/**
 * Autonomous node discovery engine.
 *
 * Anti-hallucination design:
 *   Claude only structures information present in the Wikipedia article.
 *   It never invents facts, authors, dates or claims not in the source text.
 *   temperature: 0 for deterministic output.
 *   If the API is unavailable or over budget, discovery silently skips.
 *
 * Cost: ~$0.004–$0.006 per discovered node (Claude Haiku)
 * Budget guard: shares AiBudget daily/monthly cap with source discovery.
 */

import { prisma } from '@/lib/db';
import { checkBudget, recordUsage } from '@/lib/budget/tracker';
import { nodes as staticNodes } from '@/lib/graph';

const DISCOVERY_MODEL    = 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS  = 1200;
const COST_PER_M_INPUT   = 0.80;
const COST_PER_M_OUTPUT  = 4.00;

// ── Category → color/icon mapping ────────────────────────────────────────────

const CATEGORY_META: Record<string, { color: string; icon: string }> = {
  'Ancient Civilizations': { color: '#d97706', icon: '🏛️' },
  'Ancient Texts':         { color: '#b45309', icon: '📜' },
  'UFO/Paranormal':        { color: '#7c3aed', icon: '🛸' },
  'Human Origins':         { color: '#059669', icon: '🧬' },
  'Consciousness':         { color: '#0891b2', icon: '🧠' },
  'Secret Societies':      { color: '#dc2626', icon: '🔺' },
  'Government/Surveillance': { color: '#1d4ed8', icon: '🔭' },
  'Technology':            { color: '#16a34a', icon: '⚙️' },
  'Historical Figures':    { color: '#7c3aed', icon: '👤' },
  'Modern Mystery':        { color: '#9333ea', icon: '❓' },
  'Extraterrestrial':      { color: '#6366f1', icon: '👽' },
  'Disease/Pandemic':      { color: '#dc2626', icon: '🦠' },
  'Ancient History':       { color: '#92400e', icon: '⚱️' },
  'Archaeology':           { color: '#78350f', icon: '🗿' },
  'Science':               { color: '#047857', icon: '🔬' },
  'Mythology':             { color: '#7e22ce', icon: '🐉' },
  'Finance/Economics':     { color: '#065f46', icon: '💰' },
  'Environment':           { color: '#166534', icon: '🌍' },
  'Space/Astronomy':       { color: '#1e3a5f', icon: '🌌' },
};

// Discovery seeds — queries that surface novel archive-relevant topics
const DISCOVERY_SEEDS = [
  // Ancient civilisations & archaeology
  'ancient civilisation discovery archaeology',
  'lost civilisation underwater archaeology',
  'megalithic structure prehistoric',
  'ancient astronomical observatory',
  'ancient underground city tunnel system',
  // Government/surveillance/conspiracy
  'declassified government programme secret',
  'intelligence operation covert history',
  'government experiment civilians whistleblower',
  // UFO/extraterrestrial
  'UFO sighting credible military evidence',
  'extraterrestrial intelligence search SETI',
  'unidentified aerial phenomenon government',
  // Consciousness/paranormal
  'consciousness research anomalous phenomena',
  'psychic research parapsychology institute',
  'near death experience scientific study',
  // Technology/modern
  'emerging technology breakthrough implications',
  'artificial intelligence consciousness ethics',
  'biotechnology genetic modification controversy',
  // Historical mysteries
  'historical mystery unsolved ancient',
  'ancient technology out of place artefact',
  'historical conspiracy cover-up evidence',
  // Disease/health
  'pandemic outbreak origin mystery',
  'disease epidemic historical unexplained',
  // Secret societies/esoterica
  'secret society historical influence power',
  'occult tradition esoteric knowledge history',
  'mystery religion ancient initiation rite',
  // Space/astronomy
  'interstellar object anomalous space',
  'dark matter dark energy unexplained physics',
  'exoplanet biosignature life detection',
];

// ── Wikipedia search + fetch helpers ─────────────────────────────────────────

interface WikiSearchResult {
  title: string;
  pageid: number;
  snippet: string;
}

async function searchWikipedia(query: string, limit = 8): Promise<WikiSearchResult[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json&origin=*`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NexusArchive/1.0 (research; contact@nexusarchive.app)' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { query?: { search?: WikiSearchResult[] } };
    return data.query?.search ?? [];
  } catch {
    return [];
  }
}

async function fetchWikipediaContent(title: string): Promise<string> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=false&explaintext=true&exsectionformat=plain&format=json&origin=*`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NexusArchive/1.0 (research; contact@nexusarchive.app)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return '';
    const data = await res.json() as { query?: { pages?: Record<string, { extract?: string }> } };
    const pages = data.query?.pages ?? {};
    const page  = Object.values(pages)[0];
    const text  = page?.extract ?? '';
    // Trim to ~3000 chars to save tokens
    return text.slice(0, 3000);
  } catch {
    return '';
  }
}

// ── Claude node extraction ────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a structured data extractor for a knowledge archive called Nexus Archive. The archive covers: ancient civilisations, UFOs/UAP, government secrets, consciousness, secret societies, human origins, modern technology controversies, and related esoteric/fringe topics.

STRICT ANTI-HALLUCINATION RULES:
1. Only use information explicitly present in the provided Wikipedia article.
2. Do NOT invent claims, authors, dates, statistics, or facts not in the article.
3. If the article does not contain enough for a field, use shorter/vague text rather than inventing.
4. temperature is 0 — be deterministic and conservative.

Respond with a single valid JSON object only — no prose, no markdown fences.`;

interface NodeProposal {
  slug:             string;
  title:            string;
  category:         string;
  description:      string;
  mainstream_view:  string;
  evidence_level:   'verified' | 'strong_evidence' | 'debated' | 'speculative' | 'mythological';
  confidence_score: number;
  year:             number | null;
  tags:             string[];
  claims:           string[];
  criticisms:       string[];
  open_questions:   string[];
}

async function extractNodeFromArticle(
  title: string,
  content: string,
  relatedTitles: string[],
): Promise<{ proposal: NodeProposal; inputTokens: number; outputTokens: number; costUsd: number } | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const categoryList = Object.keys(CATEGORY_META).join(', ');

  const userPrompt = `Extract a structured knowledge node from the following Wikipedia article.

Article title: ${title}
Related existing archive topics (for context): ${relatedTitles.slice(0, 5).join(', ')}

Article content:
${content}

Return a JSON object with exactly these fields:
{
  "slug": "kebab-case-id-max-40-chars",
  "title": "Article title (cleaned, max 60 chars)",
  "category": "ONE of: ${categoryList}",
  "description": "2-3 paragraph encyclopaedic description using ONLY facts from the article. Max 600 chars.",
  "mainstream_view": "The mainstream scientific or scholarly consensus on this topic, from the article. Max 300 chars.",
  "evidence_level": "ONE of: verified | strong_evidence | debated | speculative | mythological",
  "confidence_score": 0.1-1.0 (how well-evidenced the core claims are),
  "year": integer year of the primary event/discovery, or null,
  "tags": ["3-8 specific keywords from the article"],
  "claims": ["3-5 specific factual claims directly supported by the article, each max 150 chars"],
  "criticisms": ["2-4 genuine criticisms or counter-arguments mentioned in the article, each max 150 chars"],
  "open_questions": ["2-3 unresolved questions the article raises, each max 120 chars"]
}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:       DISCOVERY_MODEL,
        max_tokens:  MAX_OUTPUT_TOKENS,
        temperature: 0,
        system:      SYSTEM_PROMPT,
        messages:    [{ role: 'user', content: userPrompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return null;

    const json = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage:   { input_tokens: number; output_tokens: number };
    };

    const rawText     = json.content.find(c => c.type === 'text')?.text ?? '';
    const inputTokens = json.usage?.input_tokens  ?? 0;
    const outputTokens= json.usage?.output_tokens ?? 0;
    const costUsd     = (inputTokens / 1_000_000) * COST_PER_M_INPUT +
                        (outputTokens / 1_000_000) * COST_PER_M_OUTPUT;

    // Extract JSON — strip any accidental markdown fences
    const jsonStr = rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    const proposal = JSON.parse(jsonStr) as NodeProposal;

    // Validate required fields
    if (!proposal.slug || !proposal.title || !proposal.category || !proposal.description) {
      return null;
    }

    // Sanitise slug
    proposal.slug = proposal.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);

    return { proposal, inputTokens, outputTokens, costUsd };
  } catch {
    return null;
  }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreProposal(
  proposal: NodeProposal,
  existingTitles: Set<string>,
  existingSlugs: Set<string>,
): { relevanceScore: number; qualityScore: number; noveltyScore: number } {
  // Relevance: does this fit archive themes?
  const archiveKeywords = [
    'ufo', 'uap', 'alien', 'extraterrestrial', 'ancient', 'mystery', 'secret',
    'government', 'classified', 'conspiracy', 'paranormal', 'consciousness',
    'supernatural', 'cover-up', 'stonehenge', 'pyramid', 'illuminati', 'surveillance',
    'whistleblower', 'declassified', 'unexplained', 'anomal', 'occult', 'esoteric',
    'ritual', 'artefact', 'civilisation', 'prehistoric', 'burial', 'genetic',
    'experiment', 'radiation', 'mind control', 'remote view', 'time travel',
    'dark matter', 'quantum', 'ai', 'pandemic', 'epidemic', 'bioweapon',
  ];
  const text = `${proposal.title} ${proposal.description} ${proposal.tags.join(' ')}`.toLowerCase();
  const matchCount = archiveKeywords.filter(k => text.includes(k)).length;
  const relevanceScore = Math.min(1.0, 0.3 + matchCount * 0.07);

  // Quality: completeness of the proposal
  const qualityScore = Math.min(1.0, (
    (proposal.description.length > 100 ? 0.2 : 0.0) +
    (proposal.mainstream_view?.length > 50 ? 0.15 : 0.0) +
    (proposal.claims.length >= 3 ? 0.2 : proposal.claims.length * 0.07) +
    (proposal.criticisms.length >= 2 ? 0.15 : proposal.criticisms.length * 0.08) +
    (proposal.open_questions.length >= 2 ? 0.1 : 0.05) +
    (proposal.tags.length >= 4 ? 0.1 : 0.05) +
    (proposal.year ? 0.1 : 0.0)
  ));

  // Novelty: not already in the graph
  const titleLower = proposal.title.toLowerCase();
  const alreadyExists = existingTitles.has(titleLower) || existingSlugs.has(proposal.slug);
  const noveltyScore = alreadyExists ? 0.0 : 0.85;

  return { relevanceScore, qualityScore, noveltyScore };
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface NodeDiscoveryResult {
  seedsChecked:  number;
  articlesFound: number;
  nodesProposed: number;
  skipped:       number;
  totalCostUsd:  number;
}

export async function runNodeDiscovery(opts: {
  maxNodes?:   number;
  runId?:      string;
}): Promise<NodeDiscoveryResult> {
  const maxNodes = opts.maxNodes ?? 10;

  // Budget check
  const budget = await checkBudget();
  if (!budget.ok) {
    console.info('[node-discovery] Budget exceeded:', budget.reason);
    return { seedsChecked: 0, articlesFound: 0, nodesProposed: 0, skipped: 0, totalCostUsd: 0 };
  }

  // Build set of existing titles/slugs to avoid proposing duplicates
  const existingTitlesSet = new Set<string>(
    staticNodes.map(n => n.title.toLowerCase())
  );
  const existingSlugsSet = new Set<string>(
    staticNodes.map(n => n.id)
  );

  // Also pull from DB
  try {
    const dbNodes = await prisma.node.findMany({ select: { id: true, title: true }, where: { status: 'published' } });
    dbNodes.forEach(n => { existingTitlesSet.add(n.title.toLowerCase()); existingSlugsSet.add(n.id); });
  } catch { /* DB may not have nodes yet */ }

  // Already-discovered slugs (don't re-propose)
  const alreadyDiscovered = await prisma.discoveredNode.findMany({
    select: { slug: true },
  }).catch(() => [] as { slug: string }[]);
  alreadyDiscovered.forEach(d => existingSlugsSet.add(d.slug));

  const result: NodeDiscoveryResult = {
    seedsChecked: 0, articlesFound: 0,
    nodesProposed: 0, skipped: 0, totalCostUsd: 0,
  };

  // Sample seeds randomly so we don't always hit the same ones
  const shuffled = [...DISCOVERY_SEEDS].sort(() => Math.random() - 0.5);
  const seedBatch = shuffled.slice(0, Math.min(8, Math.ceil(maxNodes * 1.5)));

  for (const seed of seedBatch) {
    if (result.nodesProposed >= maxNodes) break;

    result.seedsChecked++;

    // Budget re-check every 3 proposals
    if (result.nodesProposed > 0 && result.nodesProposed % 3 === 0) {
      const b = await checkBudget();
      if (!b.ok) break;
    }

    const searchResults = await searchWikipedia(seed, 6);
    result.articlesFound += searchResults.length;

    // Find existing nodes related to this seed for context
    const relatedNodeTitles = staticNodes
      .filter(n => seed.split(' ').some(w => w.length > 4 && n.title.toLowerCase().includes(w.toLowerCase())))
      .map(n => n.title)
      .slice(0, 4);

    for (const article of searchResults) {
      if (result.nodesProposed >= maxNodes) break;

      // Skip if title too similar to existing
      const titleLower = article.title.toLowerCase();
      const tooSimilar = existingTitlesSet.has(titleLower) ||
        [...existingTitlesSet].some(t => t.length > 5 && titleLower.includes(t) || t.includes(titleLower));
      if (tooSimilar) { result.skipped++; continue; }

      // Fetch article content
      const content = await fetchWikipediaContent(article.title);
      if (content.length < 200) { result.skipped++; continue; }

      // Extract structured node via Claude
      const extracted = await extractNodeFromArticle(article.title, content, relatedNodeTitles);
      if (!extracted) { result.skipped++; continue; }

      const { proposal, inputTokens, outputTokens, costUsd } = extracted;

      // Score
      const scores = scoreProposal(proposal, existingTitlesSet, existingSlugsSet);

      // Skip low-relevance and non-novel
      if (scores.noveltyScore < 0.5 || scores.relevanceScore < 0.25) {
        result.skipped++;
        continue;
      }

      // Ensure slug uniqueness
      let finalSlug = proposal.slug;
      let suffix = 2;
      while (existingSlugsSet.has(finalSlug)) {
        finalSlug = `${proposal.slug}-${suffix++}`;
      }

      const meta = CATEGORY_META[proposal.category] ?? { color: '#6b7280', icon: '📌' };

      try {
        await prisma.discoveredNode.upsert({
          where:  { slug: finalSlug },
          update: {
            title:          proposal.title,
            description:    proposal.description,
            mainstreamView: proposal.mainstream_view ?? null,
            evidenceLevel:  proposal.evidence_level,
            confidenceScore:proposal.confidence_score,
            tags:           proposal.tags,
            claims:         proposal.claims,
            criticisms:     proposal.criticisms,
            openQuestions:  proposal.open_questions,
            year:           proposal.year ?? null,
            color:          meta.color,
            icon:           meta.icon,
            relevanceScore: scores.relevanceScore,
            qualityScore:   scores.qualityScore,
            noveltyScore:   scores.noveltyScore,
            aiCostUsd:      costUsd,
          },
          create: {
            slug:           finalSlug,
            title:          proposal.title,
            category:       proposal.category,
            description:    proposal.description,
            mainstreamView: proposal.mainstream_view ?? null,
            evidenceLevel:  proposal.evidence_level,
            confidenceScore:proposal.confidence_score,
            color:          meta.color,
            icon:           meta.icon,
            year:           proposal.year ?? null,
            tags:           proposal.tags,
            claims:         proposal.claims,
            criticisms:     proposal.criticisms,
            openQuestions:  proposal.open_questions,
            discoveryQuery: seed,
            relatedNodeIds: relatedNodeTitles,
            sourceUrl:      `https://en.wikipedia.org/wiki/${encodeURIComponent(article.title)}`,
            relevanceScore: scores.relevanceScore,
            qualityScore:   scores.qualityScore,
            noveltyScore:   scores.noveltyScore,
            aiCostUsd:      costUsd,
            status:         'pending_review',
          },
        });

        existingSlugsSet.add(finalSlug);
        existingTitlesSet.add(proposal.title.toLowerCase());
        result.nodesProposed++;
        result.totalCostUsd += costUsd;

        // Record AI usage
        await recordUsage(inputTokens, outputTokens, DISCOVERY_MODEL).catch(() => {});
      } catch {
        result.skipped++;
      }

      // Polite delay
      await new Promise(r => setTimeout(r, 300));
    }
  }

  return result;
}
