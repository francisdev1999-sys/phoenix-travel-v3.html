/**
 * AI-powered archive analysis — Claude Haiku, temperature 0.
 *
 * ANTI-HALLUCINATION DESIGN:
 *   Claude only receives structured data already in the DB.
 *   It evaluates INTERNAL consistency (evidence level vs claims, category vs content)
 *   not factual truth. It cannot invent external sources, DOIs, or facts.
 *   Every finding's reasoning must quote specific values from the input.
 *   Findings with missing or generic reasoning are discarded.
 */

import { prisma } from '@/lib/db';
import type { AuditSettings } from './types';

const SYSTEM_PROMPT = `You are an archive quality analyst reviewing knowledge graph nodes.

STRICT RULES — VIOLATIONS INVALIDATE THE ENTIRE RESPONSE:
1. Only evaluate data explicitly provided in the input JSON
2. Never suggest adding external sources, URLs, DOIs, or publications not in the input
3. Never invent facts, dates, names, institutions, or identifiers
4. Every "reasoning" MUST quote specific field values from the input node (e.g. "evidenceLevel='verified' but claimsCount=1")
5. If unsure about a finding, omit it — do not guess
6. Return ONLY a valid JSON array, no preamble or commentary

You evaluate INTERNAL quality only:
- evidence_level_mismatch: evidenceLevel seems too high given claimsCount/descriptionLength
- missing_criticisms: 0 criticisms for clearly controversial content (check if topic implies controversy)
- category_mismatch: category seems inconsistent with the title/tags (use only provided data)
- overconfident: description contains absolute language ("proves", "definitely") with low confidenceScore

Return format (empty array [] is valid if no issues found):
[{
  "nodeId": "<exact id from input>",
  "type": "ai_quality" | "category_mismatch",
  "severity": "high" | "medium" | "low",
  "issue": "<12 words max issue title>",
  "description": "<1-2 sentences>",
  "suggestedFix": "<specific change using only existing data>",
  "reasoning": "<must quote specific field values from the input>"
}]`;

interface AiRawFinding {
  nodeId:       string;
  type:         string;
  severity:     string;
  issue:        string;
  description:  string;
  suggestedFix: string;
  reasoning:    string;
}

interface AiParsedFinding {
  type:        'ai_quality' | 'category_mismatch';
  severity:    'high' | 'medium' | 'low';
  nodeId:      string;
  title:       string;
  description: string;
  beforeState: object;
  afterState:  object;
  reasoning:   string;
  autoFixable: false;
}

export async function runAiAnalysis(settings: AuditSettings): Promise<AiParsedFinding[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
  if (!settings.checks.aiQuality && !settings.checks.categoryMismatch) return [];

  const nodes = await prisma.node.findMany({
    where: { status: 'published' },
    select: {
      id: true, title: true, description: true,
      evidenceLevel: true, confidenceScore: true,
      mainstreamView: true,
      category: { select: { name: true } },
      _count: { select: { claims: true, criticisms: true, tags: true, sourceLinks: true } },
      tags: { select: { tag: true }, take: 8 },
    },
    take: settings.maxNodesPerAiRun,
    orderBy: { updatedAt: 'asc' },
  });

  if (nodes.length === 0) return [];

  const structured = nodes.map(n => ({
    id:                  n.id,
    title:               n.title,
    category:            n.category?.name ?? 'Unknown',
    evidenceLevel:       n.evidenceLevel,
    confidenceScore:     n.confidenceScore,
    descriptionLength:   n.description?.length ?? 0,
    descriptionSample:   n.description?.slice(0, 200) ?? '',
    claimsCount:         n._count.claims,
    criticismsCount:     n._count.criticisms,
    hasMainstreamView:   (n.mainstreamView?.length ?? 0) > 20,
    tagsCount:           n._count.tags,
    sourcesCount:        n._count.sourceLinks,
    tags:                n.tags.map(t => t.tag),
  }));

  const BATCH = 20;
  const findings: AiParsedFinding[] = [];

  for (let i = 0; i < structured.length; i += BATCH) {
    const batch = structured.slice(i, i + BATCH);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':          apiKey,
          'anthropic-version':  '2023-06-01',
          'content-type':       'application/json',
        },
        body: JSON.stringify({
          model:      settings.aiModel,
          max_tokens: 1800,
          temperature: 0,
          system:     SYSTEM_PROMPT,
          messages:   [{ role: 'user', content: `Analyze these ${batch.length} nodes:\n\n${JSON.stringify(batch, null, 2)}` }],
        }),
      });
      if (!res.ok) continue;

      const data   = await res.json() as { content?: { text: string }[] };
      const text   = data.content?.[0]?.text ?? '[]';
      const match  = text.match(/\[[\s\S]*\]/);
      if (!match) continue;

      const raw: AiRawFinding[] = JSON.parse(match[0]);
      for (const r of raw) {
        const node = nodes.find(n => n.id === r.nodeId);
        if (!node) continue;
        if (r.type !== 'ai_quality' && r.type !== 'category_mismatch') continue;
        if (!['high', 'medium', 'low'].includes(r.severity)) continue;
        if (!r.reasoning || r.reasoning.length < 30) continue; // reject vague reasoning
        if (!settings.checks.aiQuality && r.type === 'ai_quality') continue;
        if (!settings.checks.categoryMismatch && r.type === 'category_mismatch') continue;

        findings.push({
          type:        r.type as 'ai_quality' | 'category_mismatch',
          severity:    r.severity as 'high' | 'medium' | 'low',
          nodeId:      r.nodeId,
          title:       r.issue   || `Quality issue: "${node.title}"`,
          description: r.description || '',
          beforeState: {
            nodeId: node.id, title: node.title,
            category: node.category?.name,
            evidenceLevel: node.evidenceLevel,
            confidenceScore: node.confidenceScore,
            descriptionLength: node.description?.length ?? 0,
            claimsCount: node._count.claims,
            criticismsCount: node._count.criticisms,
          },
          afterState: {
            action:      r.type === 'category_mismatch' ? 'review_category' : 'flag_for_revision',
            suggestedFix: r.suggestedFix,
          },
          reasoning:   r.reasoning,
          autoFixable: false,
        });
      }
    } catch {
      // silently skip failed batch — never block the whole run
    }
  }

  return findings;
}
