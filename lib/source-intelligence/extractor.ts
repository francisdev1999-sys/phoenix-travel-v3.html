/**
 * AI extraction engine — Phase C Source Intelligence.
 *
 * AI RULES (enforced in prompt and checked before storing):
 *   MAY:  extract, classify, summarize, suggest
 *   MUST NOT: publish, approve, create live nodes/relationships,
 *             invent facts/URLs/DOIs/dates not present in the source metadata
 */

import type { AiExtractionResult } from './types';

const SYSTEM_PROMPT = `You are a source intelligence analyst for an academic knowledge archive.

STRICT RULES — violations invalidate the entire response:
1. Extract ONLY from the source metadata provided — never invent or hallucinate facts
2. Never fabricate authors, dates, URLs, DOIs, institutions, or identifiers
3. Never suggest an evidence level above "speculative" unless the source explicitly uses peer-reviewed or verified language
4. Every extracted item must be directly traceable to the provided source text
5. If unsure, omit the item — empty arrays are valid
6. Return ONLY valid JSON matching the schema below, no preamble or commentary

Your job:
- EXTRACT entities, claims, timeline references, geographic references from the source
- SUGGEST potential new knowledge graph nodes (DRAFT status only — these require human review)
- IDENTIFY possible contradictions with existing nodes (advisory only)
- HINT at potential relationships (advisory only — never assert a verified connection)

You may NOT:
- Publish or approve anything
- Create live nodes or live relationships
- Assert that any relationship is definitely true
- Use language implying certainty about unverified claims

Return JSON matching this exact schema:
{
  "entities": [{"entityType":"person|organization|location|event|artifact|concept|text","name":"...","aliases":[],"context":"...","confidence":0.0–1.0,"matchedNodeId":"optional existing node id"}],
  "claims": [{"claimText":"...","claimType":"factual|temporal|geographic|causal|speculative|contradictory","confidence":0.0–1.0,"supportedBy":"optional quote from source","relatedNodeId":"optional"}],
  "timeline": [{"year":null_or_int,"yearStart":null_or_int,"yearEnd":null_or_int,"datePrecision":"exact|decade|century|millennium|era","description":"...","period":"optional","confidence":0.0–1.0,"rawText":"verbatim from source","relatedNodeId":"optional"}],
  "locations": [{"name":"...","locationType":"country|region|city|site|ancient_name","modernName":"optional","lat":null_or_float,"lon":null_or_float,"confidence":0.0–1.0,"context":"...","relatedNodeId":"optional"}],
  "potentialNodes": [{"suggestedTitle":"...","suggestedCategory":"...","suggestedDescription":"1-2 sentence draft description","suggestedEvidenceLevel":"speculative|debated|strong_evidence","suggestedConfidence":0.1–0.5,"suggestedTags":[],"suggestedYear":null_or_int,"suggestedLocation":"optional","reasoning":"why this could be a node","aiConfidence":0.0–1.0}],
  "contradictions": [{"existingNodeId":"...","contradictionType":"evidence_conflict|factual_dispute|dating_conflict|geographic_conflict|authorship_conflict","description":"...","sourceClaimText":"verbatim from source","nodeClaimText":"verbatim from node data provided","severity":"minor|moderate|significant","aiConfidence":0.0–1.0}],
  "relationshipHints": [{"fromNodeId":"...","toNodeId":"...","relType":"historical|geographical|textual|thematic|influence","reason":"...","confidence":0.0–1.0}],
  "summary": "1-2 sentence summary of what this source adds to the archive"
}`;

interface NodeContext {
  id:          string;
  title:       string;
  category:    string;
  description: string;
  evidenceLevel: string;
  claims:      string[];
}

interface ExtractionInput {
  source: {
    id:              string;
    title:           string;
    sourceType:      string;
    author?:         string | null;
    publicationYear?: number | null;
    publisher?:      string | null;
    journal?:        string | null;
    abstract?:       string | null;
    notes?:          string | null;
  };
  existingNodes: NodeContext[];
}

export async function extractSourceIntelligence(
  input: ExtractionInput,
): Promise<AiExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[source-intelligence] ANTHROPIC_API_KEY not set — returning empty extraction');
    return emptyResult();
  }

  const { source, existingNodes } = input;

  const sourceText = [
    `Title: ${source.title}`,
    source.author         ? `Author(s): ${source.author}` : null,
    source.publicationYear? `Year: ${source.publicationYear}` : null,
    source.publisher      ? `Publisher: ${source.publisher}` : null,
    source.journal        ? `Journal: ${source.journal}` : null,
    source.sourceType     ? `Type: ${source.sourceType}` : null,
    source.abstract       ? `\nAbstract:\n${source.abstract}` : null,
    source.notes          ? `\nNotes:\n${source.notes}` : null,
  ].filter(Boolean).join('\n');

  const nodeContextText = existingNodes.length > 0
    ? `\n\nExisting archive nodes (for contradiction/relationship context):\n` +
      existingNodes.slice(0, 60).map(n =>
        `[${n.id}] "${n.title}" (${n.category}, ${n.evidenceLevel}): ${n.description.slice(0, 120)}` +
        (n.claims.length > 0 ? ` Claims: ${n.claims[0].slice(0, 80)}` : '')
      ).join('\n')
    : '';

  const userMessage = `Analyze this source and extract intelligence:\n\n${sourceText}${nodeContextText}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data.content?.[0]?.text ?? '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AiExtractionResult>;

    return {
      entities:          Array.isArray(parsed.entities)          ? parsed.entities          : [],
      claims:            Array.isArray(parsed.claims)            ? parsed.claims            : [],
      timeline:          Array.isArray(parsed.timeline)          ? parsed.timeline          : [],
      locations:         Array.isArray(parsed.locations)         ? parsed.locations         : [],
      potentialNodes:    Array.isArray(parsed.potentialNodes)    ? parsed.potentialNodes    : [],
      contradictions:    Array.isArray(parsed.contradictions)    ? parsed.contradictions    : [],
      relationshipHints: Array.isArray(parsed.relationshipHints) ? parsed.relationshipHints : [],
      summary:           typeof parsed.summary === 'string'      ? parsed.summary           : '',
    };
  } catch (err) {
    console.error('[source-intelligence] extraction failed:', err);
    throw err;
  }
}

function emptyResult(): AiExtractionResult {
  return {
    entities: [], claims: [], timeline: [], locations: [],
    potentialNodes: [], contradictions: [], relationshipHints: [], summary: '',
  };
}
