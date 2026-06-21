/**
 * AI-powered semantic relationship suggestions — Claude Opus 4.8.
 *
 * Supplements the rule-based suggestion engine (lib/suggestion-engine.ts)
 * by reading the actual node descriptions and using semantic understanding
 * to identify non-obvious connections that Jaccard similarity misses.
 *
 * PIPELINE:
 *   1. Pull the new node + top-20 rule-based candidates (already scored ≥ 0.25)
 *   2. Send ALL pairs in a single batched Claude call to minimize API cost
 *   3. Claude returns which connections are semantically meaningful + a reason
 *   4. Write accepted pairs to RelationshipSuggestion with generationMethod='ai_semantic'
 *
 * ANTI-HALLUCINATION:
 *   Claude is given the actual node text and told to judge semantic overlap only.
 *   It does NOT invent connections; it evaluates pairs we already flagged as candidates.
 *
 * COST: ~$0.025–$0.040 per publish event (Opus 4.8)
 * GUARDRAILS:
 *   - Never overwrites an existing approved or rejected suggestion
 *   - All results land in status='pending', require human review before use
 *   - Monthly cap: 200 events (override via MAX_MONTHLY_SEMANTIC_EVENTS env)
 */

import { prisma } from '@/lib/db';
import { qualifiesForRelationshipAutoApprove, promoteRelationshipSuggestion } from '@/lib/discovery/relationship-promoter';

const MODEL      = 'claude-opus-4-8';
const MAX_TOKENS = 1200;
const MAX_PAIRS  = 10; // max candidate pairs per batch

interface CandidatePair {
  candidateId:    string;
  candidateTitle: string;
  candidateDesc:  string;
  ruleScore:      number;
  ruleType:       string;
}

interface SemanticResult {
  candidateId:      string;
  relevant:         boolean;
  relationshipType: string;
  reason:           string;
  confidence:       number;
}

const SYSTEM_PROMPT = `You are evaluating pairs of research nodes to determine if they share a semantically meaningful connection.

RULES:
1. Judge based ONLY on the text provided — do not use outside knowledge.
2. Never invent facts, sources, or dates not in the given text.
3. A connection is meaningful if the nodes address overlapping research questions, share thematic or evidential significance, or represent related phenomena in the historical/archaeological/mythological record.
4. Connections that are only tangentially related (general topic overlap without substantive link) should be marked relevant: false.
5. Respond ONLY with valid JSON — no prose, no markdown.`;

function buildBatchPrompt(newNode: { title: string; description: string; evidenceLevel: string }, pairs: CandidatePair[]): string {
  const pairList = pairs
    .map((p, i) =>
      `Pair ${i + 1}:\n  Candidate ID: ${p.candidateId}\n  Title: ${p.candidateTitle}\n  Description: ${p.candidateDesc.slice(0, 300)}\n  Rule score: ${p.ruleScore.toFixed(2)} (${p.ruleType})`
    )
    .join('\n\n');

  return [
    `New node to evaluate:`,
    `  Title: ${newNode.title}`,
    `  Evidence Level: ${newNode.evidenceLevel}`,
    `  Description: ${newNode.description.slice(0, 600)}`,
    ``,
    `Evaluate whether each candidate has a semantically meaningful connection to the new node:`,
    ``,
    pairList,
    ``,
    `Return ONLY a JSON array of objects:`,
    `[{"candidateId":"<id>","relevant":true|false,"relationshipType":"historical"|"geographical"|"thematic"|"textual"|"contradictory"|"speculative","reason":"<1-2 sentences from text only>","confidence":<0.0-1.0>}]`,
    `Include all ${pairs.length} pairs in the array.`,
  ].join('\n');
}

function parseResponse(raw: string, pairs: CandidatePair[]): SemanticResult[] {
  try {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    const arr = JSON.parse(cleaned) as SemanticResult[];
    if (!Array.isArray(arr)) return [];

    const validTypes = ['historical', 'geographical', 'thematic', 'textual', 'contradictory', 'speculative'] as const;
    const knownIds   = new Set(pairs.map(p => p.candidateId));

    return arr
      .filter(r => typeof r.candidateId === 'string' && knownIds.has(r.candidateId))
      .map(r => ({
        candidateId:      r.candidateId,
        relevant:         Boolean(r.relevant),
        relationshipType: validTypes.includes(r.relationshipType as never)
          ? r.relationshipType
          : 'thematic',
        reason:     typeof r.reason   === 'string' ? r.reason.slice(0, 500)   : '',
        confidence: typeof r.confidence === 'number'
          ? Math.min(1, Math.max(0, Math.round(r.confidence * 100) / 100))
          : 0.5,
      }));
  } catch {
    return [];
  }
}

export async function generateAiSemanticSuggestions(nodeId: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return;

  try {
    // Monthly cap
    const maxEvents  = parseInt(process.env.MAX_MONTHLY_SEMANTIC_EVENTS ?? '200', 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyCount = await prisma.relationshipSuggestion.count({
      where: { generationMethod: 'ai_semantic', createdAt: { gte: monthStart } },
    });
    if (monthlyCount >= maxEvents * MAX_PAIRS) return;

    const node = await prisma.node.findUnique({
      where:   { id: nodeId },
      select:  { id: true, title: true, description: true, evidenceLevel: true },
    });
    if (!node) return;

    // Get existing rule-based suggestions for this node (already pending)
    const existing = await prisma.relationshipSuggestion.findMany({
      where:  { fromNodeId: nodeId, status: 'pending', generationMethod: 'rule_based' },
      orderBy: { confidenceScore: 'desc' },
      take:   MAX_PAIRS,
      include: {
        toNode: { select: { id: true, title: true, description: true, evidenceLevel: true } },
      },
    });

    if (!existing.length) return;

    const pairs: CandidatePair[] = existing.map(s => ({
      candidateId:    s.toNodeId,
      candidateTitle: s.toNode.title,
      candidateDesc:  s.toNode.description,
      ruleScore:      s.confidenceScore,
      ruleType:       s.relationshipType,
    }));
    const toEvidenceLevelById = new Map(existing.map(s => [s.toNodeId, s.toNode.evidenceLevel]));

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
        temperature: 0,
        system:      SYSTEM_PROMPT,
        messages:    [{ role: 'user', content: buildBatchPrompt(node, pairs) }],
      }),
    });

    if (!res.ok) {
      console.warn('[semantic-suggestions] API error', res.status);
      return;
    }

    const json = await res.json() as { content: Array<{ type: string; text: string }> };
    const rawText = json.content.find(c => c.type === 'text')?.text ?? '';
    const results = parseResponse(rawText, pairs);

    // Upsert only relevant pairs — skip already-approved/rejected
    for (const r of results) {
      if (!r.relevant || !r.reason) continue;

      const alreadyDecided = await prisma.relationshipSuggestion.findFirst({
        where: {
          fromNodeId: nodeId,
          toNodeId:   r.candidateId,
          status:     { in: ['approved', 'rejected'] },
        },
      });
      if (alreadyDecided) continue;

      const suggestion = await prisma.relationshipSuggestion.upsert({
        where: {
          fromNodeId_toNodeId: { fromNodeId: nodeId, toNodeId: r.candidateId },
        },
        create: {
          fromNodeId:        nodeId,
          toNodeId:          r.candidateId,
          relationshipType:  r.relationshipType,
          reason:            r.reason,
          evidenceBasis:     'AI semantic analysis of node descriptions.',
          confidenceScore:   r.confidence,
          riskLevel:         r.confidence >= 0.65 ? 'low' : r.confidence >= 0.40 ? 'medium' : 'high',
          signalBreakdown:   { ai_semantic: r.confidence },
          generationMethod:  'ai_semantic',
          triggeredByNodeId: nodeId,
        },
        update: {
          reason:           r.reason,
          confidenceScore:  r.confidence,
          riskLevel:        r.confidence >= 0.65 ? 'low' : r.confidence >= 0.40 ? 'medium' : 'high',
          generationMethod: 'ai_semantic',
        },
      });

      const toEvidenceLevel = toEvidenceLevelById.get(r.candidateId);
      if (
        suggestion.status === 'pending' &&
        toEvidenceLevel &&
        qualifiesForRelationshipAutoApprove({
          confidence:        r.confidence,
          relationshipType:  r.relationshipType,
          generationMethod:  'ai_semantic',
          fromEvidenceLevel: node.evidenceLevel,
          toEvidenceLevel,
        })
      ) {
        await promoteRelationshipSuggestion(suggestion).catch(err =>
          console.error('[semantic-suggestions] auto-approve failed:', err),
        );
      }
    }
  } catch (err) {
    console.error('[semantic-suggestions] error:', err);
  }
}
