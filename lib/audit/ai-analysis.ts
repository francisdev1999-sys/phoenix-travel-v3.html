import type { AuditSettings } from './types';

const SYSTEM_PROMPT = `You are an archive quality analyst reviewing knowledge graph nodes.

RULES:
1. Only evaluate data explicitly provided in the input JSON
2. Every "reasoning" MUST quote specific field values from the input (e.g. "evidenceLevel='verified' but claimsCount=1")
3. If unsure about a finding, omit it — do not guess
4. Return ONLY a valid JSON array, nothing else

Flag genuine internal quality issues using exactly these two types:
- "ai_quality"        : evidence level too high for claim/description count; zero criticisms on clearly controversial topic; overconfident absolute language with low confidenceScore
- "category_mismatch" : the assigned category name is clearly inconsistent with the node title or tags

Return format (empty array [] when nothing found):
[{"nodeId":"<id>","type":"ai_quality"|"category_mismatch","severity":"high"|"medium"|"low","issue":"<10 words max>","description":"<1-2 sentences>","suggestedFix":"<specific action>","reasoning":"<must quote field values from the input>"}]`;

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

export interface AiAnalysisResult {
  findings: AiParsedFinding[];
  errors: number;          // count of batches that failed (API error or timeout)
  lastError?: string;      // last error message for diagnostics
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
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function runAiAnalysis(
  nodes: NodeInput[],
  settings: AuditSettings,
): Promise<AiAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[ai-analysis] ANTHROPIC_API_KEY not set — skipping AI checks');
    return { findings: [], errors: 0 };
  }

  const limited = nodes.slice(0, settings.maxNodesPerAiRun);
  const batches = chunkArray(limited, 20);
  const allFindings: AiParsedFinding[] = [];
  let errorCount = 0;
  let lastError: string | undefined;

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
      const timeout = setTimeout(() => controller.abort(), 30_000);  // 30 s per batch

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
          max_tokens: 2048,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Review these ${batch.length} archive nodes for quality issues:\n\n${JSON.stringify(input, null, 2)}`,
          }],
        }),
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text();
        lastError = `API ${res.status}: ${errText.slice(0, 200)}`;
        console.error(`[ai-analysis] ${lastError}`);
        errorCount++;
        continue;
      }

      const data = await res.json() as { content?: { type: string; text: string }[] };
      const text = data.content?.find(c => c.type === 'text')?.text ?? '[]';
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) {
        lastError = `Unexpected response (no JSON array found)`;
        console.error(`[ai-analysis] ${lastError}: ${text.slice(0, 200)}`);
        errorCount++;
        continue;
      }

      raw = JSON.parse(match[0]) as RawAiFinding[];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg.includes('abort') ? 'Batch timed out (30 s)' : msg;
      console.error('[ai-analysis] fetch/parse error:', err);
      errorCount++;
      continue;
    }

    for (const r of raw) {
      if (!r.nodeId || !r.type || !r.reasoning) continue;
      if (r.reasoning.length < 20) continue;
      if (r.type !== 'ai_quality' && r.type !== 'category_mismatch') continue;

      const node = batch.find(n => n.id === r.nodeId);
      if (!node) continue;

      const severity = (r.severity === 'high' || r.severity === 'medium' || r.severity === 'low')
        ? r.severity : 'medium';

      allFindings.push({
        type: r.type as 'ai_quality' | 'category_mismatch',
        severity,
        nodeId: r.nodeId,
        title: `${r.type === 'category_mismatch' ? 'Category mismatch' : 'AI quality flag'}: "${node.title}" — ${r.issue ?? 'quality issue'}`,
        description: r.description ?? 'AI-detected quality issue.',
        beforeState: {
          nodeId: node.id, title: node.title,
          evidenceLevel: node.evidenceLevel, confidenceScore: node.confidenceScore,
          claimsCount: node._count.claims, criticismsCount: node._count.criticisms,
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

  return { findings: allFindings, errors: errorCount, lastError };
}
