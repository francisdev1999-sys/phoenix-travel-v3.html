/**
 * Lightweight node quality auditor — Claude Haiku, fire-and-forget.
 *
 * ANTI-HALLUCINATION DESIGN (critical):
 *   Claude is never asked whether a claim is factually true.
 *   It only evaluates INTERNAL quality: logical consistency, claim specificity,
 *   evidence-level alignment, balance, completeness, and language neutrality.
 *   temperature: 0 for deterministic, reproducible output.
 *   If the API is unavailable or over budget, the call silently skips —
 *   it never blocks a submission.
 *
 * COST: ~$0.002–$0.003 per audit (Haiku pricing: $0.80/MTok in, $4/MTok out)
 * DEFAULT MONTHLY CAP: 500 audits ≈ $1.50  (override via MAX_MONTHLY_AUDITS env)
 */

import { prisma } from '@/lib/db';

const AUDIT_MODEL         = 'claude-haiku-4-5-20251001';
const MAX_OUTPUT_TOKENS   = 800;
const COST_PER_M_INPUT    = 0.80;
const COST_PER_M_OUTPUT   = 4.00;

// ── Types ─────────────────────────────────────────────────────────────────────

export type AuditFlagType =
  | 'vague_claim'
  | 'contradictory_claims'
  | 'evidence_level_mismatch'
  | 'missing_criticisms'
  | 'sensational_language'
  | 'unsupported_claim'
  | 'duplicate_content'
  | 'incomplete_section'
  | 'overconfident_claim';

export interface AuditFlag {
  type:     AuditFlagType;
  severity: 'low' | 'medium' | 'high';
  detail:   string;
}

export interface SixQuestions {
  supports:        string; // What in the submission supports its claims?
  contradicts:     string; // What in the submission complicates its claims?
  mainstream_view: string; // Does the submission include a mainstream perspective?
  missing_evidence:string; // What evidence or perspectives appear to be missing?
  assumptions:     string; // What assumptions underlie the framing?
  archive_bias:    string; // Could an archive featuring this entry over-weight one interpretation?
}

export interface NodeAuditResult {
  quality_score:      number;                                           // 0–100
  recommendation:     'approve' | 'flag_for_review' | 'needs_revision';
  confidence:         'high' | 'medium' | 'low';
  flags:              AuditFlag[];
  strengths:          string[];
  summary:            string;
  six_questions?:     SixQuestions;
  model:              string;
  input_tokens:       number;
  output_tokens:      number;
  estimated_cost_usd: number;
  audited_at:         string;
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a research quality auditor for a knowledge archive. Your ONLY job is to evaluate the INTERNAL quality and structural consistency of node submissions.

YOU ARE NOT A FACT-CHECKER. These strict rules apply to every response:
1. Do NOT claim any specific fact is true or false based on your training knowledge.
2. Do NOT invent sources, authors, dates, people, or events not present in the submission.
3. Do NOT use outside knowledge to verify claims — only read what is in the submission.
4. Do NOT hallucinate. If you are uncertain whether a flag applies, omit it.
5. Flag issues only when clearly evidenced by the submitted text itself.

EVALUATE these 6 dimensions using ONLY the submitted text:
1. CONSISTENCY — do claims align with the description without internal contradiction?
2. SPECIFICITY — are claims concrete and falsifiable, or vague ("some say", "evidence suggests", "many believe")?
3. EVIDENCE ALIGNMENT — does the declared evidence_level match the strength of claims? (verified = scientifically proven; speculative = unconfirmed hypothesis)
4. BALANCE — does the submission acknowledge mainstream perspective and genuine criticisms?
5. COMPLETENESS — are all sections present and substantive, not placeholder text?
6. LANGUAGE — neutral and academic, or sensational/biased language?

Respond with a single valid JSON object only — no prose, no markdown fences.`;

// ── Prompt builder ────────────────────────────────────────────────────────────

interface NodeInput {
  label:          string;
  category:       string;
  evidenceLevel:  string;
  confidence:     number;
  description:    string;
  claims:         string[];
  criticisms:     string[];
  mainstreamView: string | null | undefined;
  tags:           string[];
}

function buildPrompt(n: NodeInput): string {
  return [
    `Label: ${n.label}`,
    `Category: ${n.category}`,
    `Evidence Level: ${n.evidenceLevel}  (scale: verified > strong_evidence > debated > speculative > mythological)`,
    `Declared Confidence: ${Math.round(n.confidence * 100)}%`,
    ``,
    `Description:`,
    n.description.slice(0, 800),
    ``,
    `Claims (${n.claims.length}):`,
    ...n.claims.map((c, i) => `  ${i + 1}. ${c}`),
    ``,
    `Criticisms (${n.criticisms.length}):`,
    ...n.criticisms.map((c, i) => `  ${i + 1}. ${c}`),
    ``,
    `Mainstream View: ${n.mainstreamView ?? '(not provided)'}`,
    `Tags: ${n.tags.join(', ') || '(none)'}`,
    ``,
    `Return ONLY valid JSON matching exactly:`,
    `{"quality_score":<0-100>,"recommendation":"approve"|"flag_for_review"|"needs_revision","confidence":"high"|"medium"|"low","flags":[{"type":"<flag_type>","severity":"low"|"medium"|"high","detail":"<specific text from submission>"}],"strengths":["..."],"summary":"<1-2 sentences, no fact claims>","six_questions":{"supports":"...","contradicts":"...","mainstream_view":"...","missing_evidence":"...","assumptions":"...","archive_bias":"..."}}`,
    ``,
    `Valid flag types: vague_claim | contradictory_claims | evidence_level_mismatch | missing_criticisms | sensational_language | unsupported_claim | duplicate_content | incomplete_section | overconfident_claim`,
    `six_questions instructions: answer each using ONLY what is written in the submission. If a section is absent, say so. Do NOT claim facts from outside knowledge.`,
  ].join('\n');
}

// ── Response parser ───────────────────────────────────────────────────────────

function parseResponse(raw: string): Omit<NodeAuditResult, 'model' | 'input_tokens' | 'output_tokens' | 'estimated_cost_usd' | 'audited_at' | 'six_questions'> & { six_questions?: SixQuestions } {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const p = JSON.parse(cleaned) as Record<string, unknown>;

  const validRecommendations = ['approve', 'flag_for_review', 'needs_revision'] as const;
  const validConfidences      = ['high', 'medium', 'low'] as const;

  return {
    quality_score: typeof p.quality_score === 'number'
      ? Math.min(100, Math.max(0, Math.round(p.quality_score)))
      : 50,
    recommendation: validRecommendations.includes(p.recommendation as never)
      ? p.recommendation as NodeAuditResult['recommendation']
      : 'flag_for_review',
    confidence: validConfidences.includes(p.confidence as never)
      ? p.confidence as NodeAuditResult['confidence']
      : 'low',
    flags: Array.isArray(p.flags)
      ? (p.flags as AuditFlag[]).slice(0, 10)
      : [],
    strengths: Array.isArray(p.strengths)
      ? (p.strengths as string[]).slice(0, 5)
      : [],
    summary: typeof p.summary === 'string'
      ? p.summary.slice(0, 400)
      : 'Audit completed.',
    six_questions: p.six_questions && typeof p.six_questions === 'object'
      ? p.six_questions as SixQuestions
      : undefined,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function auditProposedNode(proposalId: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return; // silently skip — not configured

  try {
    const node = await prisma.proposedNode.findUnique({
      where:  { id: proposalId },
      select: {
        id: true, label: true, category: true,
        evidenceLevel: true, confidence: true, description: true,
        claims: true, criticisms: true, mainstreamView: true, tags: true,
      },
    });
    if (!node) return;

    // Monthly cap — default 500 audits ≈ $1.50/mo with Haiku
    const maxAudits = parseInt(process.env.MAX_MONTHLY_AUDITS ?? '500', 10);
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyCount = await prisma.proposedNode.count({
      where: { aiAuditedAt: { gte: monthStart } },
    });
    if (monthlyCount >= maxAudits) {
      console.info('[node-auditor] Monthly cap reached, skipping audit');
      return;
    }

    const prompt = buildPrompt({
      label:          node.label,
      category:       node.category,
      evidenceLevel:  node.evidenceLevel,
      confidence:     node.confidence,
      description:    node.description,
      claims:         Array.isArray(node.claims)      ? node.claims as string[]      : [],
      criticisms:     Array.isArray(node.criticisms)  ? node.criticisms as string[]  : [],
      mainstreamView: node.mainstreamView,
      tags:           Array.isArray(node.tags)        ? node.tags as string[]        : [],
    });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:       AUDIT_MODEL,
        max_tokens:  MAX_OUTPUT_TOKENS,
        temperature: 0,
        system:      SYSTEM_PROMPT,
        messages:    [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error('[node-auditor] API error', res.status, await res.text());
      return;
    }

    const json = await res.json() as {
      content: Array<{ type: string; text: string }>;
      usage:   { input_tokens: number; output_tokens: number };
    };

    const rawText       = json.content.find(c => c.type === 'text')?.text ?? '';
    const inputTokens   = json.usage.input_tokens;
    const outputTokens  = json.usage.output_tokens;
    const estimatedCost = (inputTokens / 1_000_000) * COST_PER_M_INPUT
                        + (outputTokens / 1_000_000) * COST_PER_M_OUTPUT;

    const parsed = parseResponse(rawText);

    const result: NodeAuditResult = {
      ...parsed,
      model:              AUDIT_MODEL,
      input_tokens:       inputTokens,
      output_tokens:      outputTokens,
      estimated_cost_usd: Math.round(estimatedCost * 100_000) / 100_000,
      audited_at:         new Date().toISOString(),
    };

    await prisma.proposedNode.update({
      where: { id: proposalId },
      data:  { aiAuditResult: result as object, aiAuditedAt: new Date() },
    });
  } catch (err) {
    // Never propagate — audit failure must not affect the submission flow
    console.error('[node-auditor] Unhandled error:', err);
  }
}
