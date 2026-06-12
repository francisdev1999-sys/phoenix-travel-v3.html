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
- missing_criticisms: 0 criticisms for clearly controversial content
- category_mismatch: category seems inconsistent with the title/tags
- overconfident: description contains absolute language ("proves", "definitely") with low confidenceScore

Return format (empty array [] is valid):
[{"nodeId":"<id>","type":"ai_quality"|"category_mismatch","severity":"high"|"medium"|"low","issue":"<12 words max>","description":"<1-2 sentences>","suggestedFix":"<specific change>","reasoning":"<must quote specific field values>"}]`;

export interface AiParsedFinding {
  type: 'ai_quality' | 'category_mismatch';
  severity: 'high' | 'medium' | 'low';
  nodeId: string;
  title: string;
  description: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  reasoning: string;
  autoFixable: false;
}

interface NodeInput {
  id: string;
  title: string;
  description: string | null;
  evidenceLevel: string;
  confidenceScore: number;
  mainstreamView: string | null;
  category: { name: string } | null;
  _count: { claims: number; criticisms: number; tags: number };
  tags: { tag: string }[];
}

interface RawAiFinding {
  nodeId?: string;
  type?: string;
  severity?: string;
  issue?: string;
  description?: string;
  suggestedFix?: string;
  reasoning?: string;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function runAiAnalysis(
  nodes: NodeInput[],
  settings: AuditSettings,
): Promise<AiParsedFinding[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[ai-analysis] ANTHROPIC_API_KEY not set — skipping AI checks');
    return [];
  }

  const limited = nodes.slice(0, settings.maxNodesPerAiRun);
  const batches = chunkArray(limited, 20);
  const allFindings: AiParsedFinding[] = [];

  for (const batch of batches) {
    const input = batch.map(n => ({
      id: n.id,
      title: n.title,
      category: n.category?.name ?? null,
      evidenceLevel: n.evidenceLevel,
      confidenceScore: n.confidenceScore,
      descriptionLength: n.description?.length ?? 0,
      mainstreamViewLength: n.mainstreamView?.length ?? 0,
      claimsCount: n._count.claims,
      criticismsCount: n._count.criticisms,
      tagsCount: n._count.tags,
      tags: n.tags.map(t => t.tag).slice(0, 8),
    }));

    let raw: RawAiFinding[] = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: settings.aiModel,
          max_tokens: 1800,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Review these ${batch.length} archive nodes for internal quality issues:\n\n${JSON.stringify(input, null, 2)}`,
            },
          ],
        }),
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[ai-analysis] API error ${res.status}: ${errText}`);
        continue;
      }

      const data = await res.json() as {
        content?: { type: string; text: string }[];
      };
      const text = data.content?.find(c => c.type === 'text')?.text ?? '[]';

      // Extract JSON array from the response text
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) continue;

      raw = JSON.parse(match[0]) as RawAiFinding[];
    } catch (err) {
      console.error('[ai-analysis] parse/fetch error:', err);
      continue;
    }

    for (const r of raw) {
      if (!r.nodeId || !r.type || !r.reasoning) continue;
      if (r.reasoning.length < 30) continue;
      if (r.type !== 'ai_quality' && r.type !== 'category_mismatch') continue;

      const node = batch.find(n => n.id === r.nodeId);
      if (!node) continue;

      const severity = (r.severity === 'high' || r.severity === 'medium' || r.severity === 'low')
        ? r.severity
        : 'medium';

      allFindings.push({
        type: r.type as 'ai_quality' | 'category_mismatch',
        severity,
        nodeId: r.nodeId,
        title: `${r.type === 'category_mismatch' ? 'Category mismatch' : 'AI quality flag'}: "${node.title}" — ${r.issue ?? 'quality issue'}`,
        description: r.description ?? 'AI-detected quality issue.',
        beforeState: {
          nodeId: node.id,
          title: node.title,
          evidenceLevel: node.evidenceLevel,
          confidenceScore: node.confidenceScore,
          claimsCount: node._count.claims,
          criticismsCount: node._count.criticisms,
          category: node.category?.name ?? null,
        },
        afterState: {
          action: 'manual_review_required',
          suggestedFix: r.suggestedFix ?? 'Review and update node content.',
        },
        reasoning: r.reasoning,
        autoFixable: false,
      });
    }
  }

  return allFindings;
}
