/**
 * Haiku prose layer for exploration synthesis.
 *
 * Receives the ALREADY-COMPUTED structured result from the rule engine
 * and asks Haiku to write 2-3 readable sentences.
 *
 * Input to Claude: ~150 tokens (structured JSON, no raw node text).
 * Output: ~80 tokens.
 * Cost: ~$0.0005 per synthesis.
 *
 * ANTI-HALLUCINATION:
 *   Claude receives no raw node descriptions, no edge explanations.
 *   It only sees the extracted patterns (tag names, counts, relationship
 *   types, evidence levels). It cannot invent facts it wasn't given.
 *   Prompt explicitly forbids external knowledge.
 *
 * Falls back to null silently if ANTHROPIC_API_KEY is not configured
 * or if the API call fails — the UI renders rule-based output either way.
 */

import type { SynthesisResult } from './rule-engine';

const MODEL      = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 180;

const SYSTEM = `You write 2-3 sentence discovery narratives for researchers exploring a knowledge archive.

STRICT RULES:
1. Use ONLY the data given to you — never add external facts, sources, or names.
2. Frame findings as what "the path reveals" or "researchers have proposed" — never state fringe claims as fact.
3. Mention specific node titles from the data by name.
4. No bullet points, no headers, flowing prose only.
5. End with one open question that emerges naturally from the path.`;

export async function generateProse(result: SynthesisResult): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || result.qualityScore < 30) return null;

  const topThemes   = result.themes.slice(0, 3).map(t => `${t.tag} (${t.count} nodes)`).join(', ');
  const topConn     = result.connections[0];
  const topConLabel = topConn
    ? `${topConn.fromTitle} → ${topConn.toTitle} (${topConn.relationshipType}, ${Math.round(topConn.confidenceScore * 100)}% confidence)`
    : 'none found';
  const nodeList    = result.nodes.map(n => n.title).join(', ');

  const payload = {
    nodes_explored:     nodeList,
    node_count:         result.nodeCount,
    path_type:          result.pathType,
    convergent_themes:  topThemes || 'none detected',
    direct_connections: result.connections.length,
    strongest_link:     topConLabel,
    contradictions:     result.contradictions.length,
    evidence_quality:   `${result.evidenceBreakdown.dominantLevel} (score ${result.evidenceBreakdown.qualityScore}/100)`,
    unvisited_bridges:  result.bridges.map(b => b.title).join(', ') || 'none',
  };

  const userMsg = `Exploration data:\n${JSON.stringify(payload, null, 2)}\n\nWrite the discovery narrative.`;

  try {
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
        temperature: 0.4,
        system:      SYSTEM,
        messages:    [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) return null;

    const json = await res.json() as { content: Array<{ type: string; text: string }> };
    return json.content.find(c => c.type === 'text')?.text?.trim() ?? null;
  } catch {
    return null;
  }
}
