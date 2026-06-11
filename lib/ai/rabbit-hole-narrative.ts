/**
 * Rabbit-hole narrative generator — Claude Opus 4.8, cached per node.
 *
 * Generates a 2-3 paragraph exploration context explaining why a node's
 * connections matter and what threads of research they open up.
 *
 * ANTI-HALLUCINATION:
 *   Claude receives only the node data and connection list already in the DB.
 *   It is explicitly instructed to frame researcher proposals, not assert facts.
 *   temperature: 0.3 — some narrative variation, still deterministic.
 *
 * COST: ~$0.025–$0.035 per unique node (Opus 4.8: $5/$25 per MTok)
 * CACHE: narrative stored in NodeNarrative; re-generated only if node updated
 *        or cache is >30 days old.
 */

import { prisma } from '@/lib/db';

const MODEL         = 'claude-opus-4-8';
const PROMPT_VER    = '1.0';
const MAX_TOKENS    = 600;

interface ConnectionSummary {
  title:            string;
  relationshipType: string;
  explanation:      string;
}

interface NarrativeInput {
  nodeId:      string;
  title:       string;
  description: string;
  evidenceLevel: string;
  connections: ConnectionSummary[];
}

const SYSTEM_PROMPT = `You are a research archivist writing short exploration narratives for a knowledge archive about historical mysteries, ancient civilizations, and contested theories.

STRICT RULES:
1. Frame everything as "researchers propose", "some scholars argue", "the evidence suggests" — never assert fringe claims as established fact.
2. Do NOT invent sources, authors, dates, or external facts not given to you.
3. Use only the node data and connections provided.
4. Write 2–3 paragraphs (120–200 words total). Academic but accessible tone.
5. The narrative should explain WHY these connections matter and what deeper questions they open — it is an invitation to explore further, not a summary.
6. End with an open question that invites reflection.
7. No bullet points, no headers — flowing prose only.`;

function buildPrompt(input: NarrativeInput): string {
  const connLines = input.connections
    .slice(0, 8)
    .map(c => `  - ${c.title} (${c.relationshipType}): ${c.explanation.slice(0, 120)}`)
    .join('\n');

  return [
    `Node: ${input.title}`,
    `Evidence Level: ${input.evidenceLevel}`,
    ``,
    `Description:`,
    input.description.slice(0, 600),
    ``,
    `Connected nodes (${input.connections.length} total, showing up to 8):`,
    connLines || '  (none)',
    ``,
    `Write an exploration narrative for someone who just opened this node's connections. ` +
    `Explain what threads of inquiry these connections open and why they matter together.`,
  ].join('\n');
}

export async function getOrGenerateNarrative(
  input: NarrativeInput,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    // Cache check — skip if narrative exists and node hasn't changed recently
    const [cached, node] = await Promise.all([
      prisma.nodeNarrative.findUnique({ where: { nodeId: input.nodeId } }),
      prisma.node.findUnique({ where: { id: input.nodeId }, select: { updatedAt: true } }),
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (
      cached &&
      cached.promptVersion === PROMPT_VER &&
      cached.cachedAt > thirtyDaysAgo &&
      node &&
      cached.cachedAt >= node.updatedAt
    ) {
      return cached.narrative;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:       MODEL,
        max_tokens:  MAX_TOKENS,
        temperature: 0.3,
        system:      SYSTEM_PROMPT,
        messages:    [{ role: 'user', content: buildPrompt(input) }],
      }),
    });

    if (!res.ok) {
      console.warn('[rabbit-hole-narrative] API error', res.status);
      return cached?.narrative ?? null;
    }

    const json = await res.json() as { content: Array<{ type: string; text: string }> };
    const text = json.content.find(c => c.type === 'text')?.text?.trim() ?? '';
    if (!text) return cached?.narrative ?? null;

    await prisma.nodeNarrative.upsert({
      where:  { nodeId: input.nodeId },
      create: { nodeId: input.nodeId, narrative: text, model: MODEL, promptVersion: PROMPT_VER },
      update: { narrative: text, model: MODEL, promptVersion: PROMPT_VER, cachedAt: new Date() },
    });

    return text;
  } catch (err) {
    console.error('[rabbit-hole-narrative] error:', err);
    return null;
  }
}
