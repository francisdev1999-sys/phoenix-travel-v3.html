/**
 * AI Deep Research Review Engine
 *
 * Calls Anthropic Claude to produce a structured research dossier for a node.
 *
 * Guarantees:
 *   - Server-side only — API key never touches the client
 *   - Manual execution only — no background jobs, no automatic triggers
 *   - Results stored in AiResearchReview; node status is never changed
 *   - Monthly budget enforced: warning at $15, hard block at $20
 *   - Cached: returns existing review if node hasn't changed since last review
 */

import { prisma } from '@/lib/db';

// ── Constants ─────────────────────────────────────────────────────────────────

export const AI_REVIEW_MODEL        = 'claude-sonnet-4-6';
export const PROMPT_VERSION         = '1.1';
const MAX_TOKENS                    = 2048;
const BUDGET_WARNING_USD            = 15;
const BUDGET_HARD_LIMIT_USD         = 20;

// Approximate pricing per million tokens (claude-sonnet-4-6)
const COST_PER_M_INPUT              = 3.0;
const COST_PER_M_OUTPUT             = 15.0;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiReviewJson {
  research_summary:    string;
  supporting_evidence: string[];
  contradictory_evidence: string[];
  academic_consensus: {
    level:   'strong_support' | 'moderate_support' | 'debated' | 'weak_support' | 'rejected' | 'unknown';
    summary: string;
    mainstream_position:  string;
    minority_position:    string;
    alternative_position: string;
  };
  source_analysis: {
    strength: number;   // 0–1
    notes:    string[];
  };
  extraordinary_claim_risk: {
    level:  'low' | 'medium' | 'high';
    reason: string;
  };
  suggested_evidence_level:    string;
  suggested_confidence_score:  number;
  hallucination_risk: {
    level:  'low' | 'medium' | 'high';
    reason: string;
  };
  missing_information:  string[];
  red_flags:            string[];
  archive_relationships: Array<{
    nodeTitle:        string;
    relationshipType: string;
    reason:           string;
  }>;
  recommended_actions: string[];
  review_recommendation: {
    status: 'approve_candidate' | 'needs_review' | 'high_risk_review';
    reason: string;
  };
}

export interface AiReviewResult {
  review:        AiReviewJson;
  inputTokens:   number;
  outputTokens:  number;
  estimatedCost: number;
  model:         string;
  promptVersion: string;
  cached:        boolean;
}

export interface MonthlyUsage {
  reviewCount:   number;
  inputTokens:   number;
  outputTokens:  number;
  totalCost:     number;
  warningActive: boolean;
  limitReached:  boolean;
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Nexus Archive Research Analyst.

You are a research assistant — not a judge, not a publisher, not an editor.

Your sole purpose is to evaluate evidence quality and research strength so that human reviewers can make informed decisions without needing personal expertise in every domain.

CORE RULES:
- You NEVER publish, approve, reject, or modify archive content
- You NEVER invent sources, citations, authors, DOIs, ISBNs, URLs, or publication data
- You NEVER claim verification without direct evidence
- You NEVER merge mainstream and fringe positions together
- You ALWAYS state uncertainty explicitly
- You ALWAYS apply extraordinary evidence standards to extraordinary claims
- You ALWAYS distinguish: fact vs interpretation, evidence vs speculation, primary vs secondary sources, mainstream scholarship vs fringe interpretations

ACADEMIC CONSENSUS ANALYSIS:
Report these three separately — never merge them:
1. Mainstream academic position (peer-reviewed, institutional consensus)
2. Minority scholarly position (credentialed researchers outside consensus)
3. Alternative/fringe interpretation (popular or speculative claims)

EXTRAORDINARY CLAIM DETECTION:
Apply heightened scrutiny to any claims involving:
extraterrestrials, lost advanced civilizations, ancient super-technology, dimensional portals, supernatural intervention, hidden world governments, suppressed history, reality manipulation, or similar extraordinary topics.

Extraordinary claims require extraordinary evidence. State this explicitly.

SOURCE EVALUATION:
Classify each attached source as: primary, secondary, tertiary, or unsupported.
Flag: weak sources, unverifiable sources, missing citations, potential misinformation.

HALLUCINATION RISK:
Honestly assess your own uncertainty. If the topic is obscure, niche, or at the edge of your knowledge, say so. Prefer "unknown" over guessing.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this exact structure. No markdown, no preamble, no explanation outside the JSON:

{
  "research_summary": "string — 2-4 sentence overview of the research quality and key findings",
  "supporting_evidence": ["string", ...],
  "contradictory_evidence": ["string", ...],
  "academic_consensus": {
    "level": "strong_support | moderate_support | debated | weak_support | rejected | unknown",
    "summary": "string",
    "mainstream_position": "string",
    "minority_position": "string",
    "alternative_position": "string"
  },
  "source_analysis": {
    "strength": 0.0,
    "notes": ["string", ...]
  },
  "extraordinary_claim_risk": {
    "level": "low | medium | high",
    "reason": "string"
  },
  "suggested_evidence_level": "verified | strong_evidence | debated | speculative | mythological",
  "suggested_confidence_score": 0.0,
  "hallucination_risk": {
    "level": "low | medium | high",
    "reason": "string"
  },
  "missing_information": ["string", ...],
  "red_flags": ["string", ...],
  "archive_relationships": [
    { "nodeTitle": "string", "relationshipType": "string", "reason": "string" }
  ],
  "recommended_actions": ["string", ...],
  "review_recommendation": {
    "status": "approve_candidate | needs_review | high_risk_review",
    "reason": "string"
  }
}`;

// ── Research package builder ───────────────────────────────────────────────────

async function buildResearchPackage(nodeId: string): Promise<string> {
  const node = await prisma.node.findUnique({
    where:   { id: nodeId },
    include: {
      tags:          true,
      claims:        { orderBy: { orderIndex: 'asc' } },
      criticisms:    { orderBy: { orderIndex: 'asc' } },
      openQuestions: { orderBy: { orderIndex: 'asc' } },
      category:      true,
      sourceLinks: {
        include: {
          source: {
            select: {
              title:           true,
              author:          true,
              publicationYear: true,
              sourceType:      true,
              url:             true,
              doi:             true,
              isbn:            true,
              credibilityScore: true,
              credibilityOverride: true,
              status:          true,
            },
          },
        },
        where: { source: { status: 'approved' } },
      },
    },
  });

  if (!node) throw new Error(`Node not found: ${nodeId}`);

  // Top 10 related published nodes by tag overlap
  const nodeTags = node.tags.map(t => t.tag);
  const relatedNodes = nodeTags.length > 0
    ? await prisma.node.findMany({
        where: {
          status: 'published',
          id:     { not: nodeId },
          tags:   { some: { tag: { in: nodeTags } } },
        },
        include: { tags: true },
        take: 30,
      })
    : [];

  const sortedRelated = relatedNodes
    .map(n => ({
      title:         n.title,
      description:   n.description.slice(0, 150),
      tags:          n.tags.map(t => t.tag).slice(0, 8),
      evidenceLevel: n.evidenceLevel,
      overlap:       n.tags.filter(t => nodeTags.includes(t.tag)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 10);

  const sections: string[] = [];

  sections.push(`=== NODE UNDER REVIEW ===
Title: ${node.title}
ID: ${node.id}
Category: ${node.category.name}
Evidence Level: ${node.evidenceLevel}
Confidence Score: ${node.confidenceScore}
Tags: ${node.tags.map(t => t.tag).join(', ') || 'none'}

Description:
${node.description}

${node.mainstreamView ? `Mainstream View:\n${node.mainstreamView}` : 'Mainstream View: Not provided'}`);

  if (node.claims.length > 0) {
    sections.push(`Key Claims:\n${node.claims.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`);
  }

  if (node.criticisms.length > 0) {
    sections.push(`Known Criticisms:\n${node.criticisms.map((c, i) => `${i + 1}. ${c.text}`).join('\n')}`);
  }

  if (node.openQuestions.length > 0) {
    sections.push(`Open Questions:\n${node.openQuestions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}`);
  }

  if (node.sourceLinks.length > 0) {
    const srcLines = node.sourceLinks.map(l => {
      const s = l.source;
      const eff = s.credibilityOverride ?? s.credibilityScore;
      return `- [${l.linkType.toUpperCase()}] "${s.title}" | ${s.sourceType} | ${s.author ?? 'No author'} | ${s.publicationYear ?? 'No year'} | Credibility: ${Math.round(eff * 100)}% | DOI: ${s.doi ?? 'none'} | URL: ${s.url ?? 'none'}`;
    });
    sections.push(`Attached Sources (approved):\n${srcLines.join('\n')}`);
  } else {
    sections.push(`Attached Sources: None approved`);
  }

  if (sortedRelated.length > 0) {
    const relLines = sortedRelated.map(n =>
      `- "${n.title}" [${n.evidenceLevel}] — Tags: ${n.tags.join(', ')}\n  ${n.description}`,
    );
    sections.push(`Related Archive Nodes (top ${sortedRelated.length} by tag overlap):\n${relLines.join('\n')}`);
  }

  return sections.join('\n\n---\n\n');
}

// ── Anthropic API call ────────────────────────────────────────────────────────

async function callClaude(userContent: string): Promise<{
  text:         string;
  inputTokens:  number;
  outputTokens: number;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      AI_REVIEW_MODEL,
      max_tokens: MAX_TOKENS,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const json = await res.json() as {
    content:  Array<{ type: string; text: string }>;
    usage:    { input_tokens: number; output_tokens: number };
  };

  const text = json.content.find(c => c.type === 'text')?.text ?? '';
  return {
    text,
    inputTokens:  json.usage.input_tokens,
    outputTokens: json.usage.output_tokens,
  };
}

// ── JSON extraction and validation ────────────────────────────────────────────

function extractJson(raw: string): AiReviewJson {
  // Strip optional markdown code fences
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract the first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No valid JSON found in AI response');
    parsed = JSON.parse(match[0]);
  }

  // Minimal shape validation
  const obj = parsed as Record<string, unknown>;
  if (!obj.research_summary || !obj.review_recommendation) {
    throw new Error('AI response missing required fields');
  }

  return obj as unknown as AiReviewJson;
}

// ── Budget check ──────────────────────────────────────────────────────────────

export async function getMonthlyUsage(): Promise<MonthlyUsage> {
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);

  const rows = await prisma.aiResearchReview.findMany({
    where:  { createdAt: { gte: start } },
    select: { inputTokens: true, outputTokens: true, estimatedCost: true },
  });

  const reviewCount   = rows.length;
  const inputTokens   = rows.reduce((s, r) => s + r.inputTokens,   0);
  const outputTokens  = rows.reduce((s, r) => s + r.outputTokens,  0);
  const totalCost     = rows.reduce((s, r) => s + r.estimatedCost, 0);

  return {
    reviewCount,
    inputTokens,
    outputTokens,
    totalCost:     Math.round(totalCost * 10000) / 10000,
    warningActive: totalCost >= BUDGET_WARNING_USD,
    limitReached:  totalCost >= BUDGET_HARD_LIMIT_USD,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runAiReview(
  nodeId:    string,
  createdBy: string | null,
  forceRerun = false,
): Promise<AiReviewResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  // Budget check
  const usage = await getMonthlyUsage();
  if (usage.limitReached) {
    throw new Error(
      `Monthly AI review budget exceeded ($${BUDGET_HARD_LIMIT_USD}). ` +
      `Current spend: $${usage.totalCost.toFixed(4)}. Owner must override.`,
    );
  }

  // Cache check: return existing review if node hasn't changed since last run
  if (!forceRerun) {
    const node    = await prisma.node.findUnique({ where: { id: nodeId }, select: { updatedAt: true } });
    const latest  = await prisma.aiResearchReview.findFirst({
      where:   { nodeId },
      orderBy: { createdAt: 'desc' },
    });

    if (latest && node && latest.createdAt >= node.updatedAt) {
      return {
        review:        latest.reviewJson as unknown as AiReviewJson,
        inputTokens:   latest.inputTokens,
        outputTokens:  latest.outputTokens,
        estimatedCost: latest.estimatedCost,
        model:         latest.model,
        promptVersion: latest.promptVersion,
        cached:        true,
      };
    }
  }

  // Build and send research package
  const researchPackage = await buildResearchPackage(nodeId);
  const { text, inputTokens, outputTokens } = await callClaude(researchPackage);

  const review       = extractJson(text);
  const estimatedCost = Math.round(
    ((inputTokens / 1_000_000) * COST_PER_M_INPUT +
     (outputTokens / 1_000_000) * COST_PER_M_OUTPUT) * 100000,
  ) / 100000;

  // Persist result
  await prisma.aiResearchReview.create({
    data: {
      nodeId,
      model:         AI_REVIEW_MODEL,
      promptVersion: PROMPT_VERSION,
      reviewJson:    JSON.parse(JSON.stringify(review)),
      inputTokens,
      outputTokens,
      estimatedCost,
      createdBy,
    },
  });

  return { review, inputTokens, outputTokens, estimatedCost, model: AI_REVIEW_MODEL, promptVersion: PROMPT_VERSION, cached: false };
}
