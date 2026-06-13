import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalysisResult, NodeCandidate, SourceCandidate } from './types';

const SYSTEM_PROMPT = `You are the Nexus Archive quality auditor. Your job is to protect the credibility of an archive focused on conspiracy theories, ancient mysteries, alternative history, folklore, mythology, and unexplained phenomena.

VALID archive topics include: ancient civilizations, mythology, folklore, religious texts and figures, cryptids, unexplained phenomena, UFO/UAP, secret societies, consciousness theories, historical mysteries, archaeological debates. Unusual-sounding topics like Nephilim, Anunnaki, Watchers, Mothman, Bigfoot, Shambhala, Agartha are VALID if connected to mythology, folklore, religion, or documented belief systems.

INVALID archive content includes: fictional entertainment characters (cartoons, anime, games), random celebrities with no archive relevance, memes, pop culture references with no historical/mythological connection, spam content, duplicates, and completely off-topic entries.

Be CONSERVATIVE — prefer REVIEW or KEEP over DELETE when uncertain. Never flag legitimate mythology/folklore as junk just because it sounds unusual.

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "itemType": "node",
  "itemId": "",
  "classification": "KEEP|REVIEW|ARCHIVE_CANDIDATE|DELETE_CANDIDATE|BLACKLIST_CANDIDATE",
  "relevanceScore": 0,
  "confidence": 0.0,
  "reasons": ["string"],
  "risksIfKept": ["string"],
  "risksIfDeleted": ["string"],
  "recommendedAction": "string",
  "blacklistSuggestion": null
}`;

// Support both GEMINI_API_KEY and GOOGLE_API_KEY
export function checkApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}

export function checkGeminiKey(): string | null {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
}

function parseJson(text: string, provider: string): AnalysisResult {
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(clean) as AnalysisResult;
  } catch {
    throw new Error(`${provider} returned invalid JSON: ${clean.slice(0, 200)}`);
  }
}

// ── Claude ────────────────────────────────────────────────────────────────────

async function callClaude(userMessage: string): Promise<AnalysisResult> {
  const key = checkApiKey();
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const client   = new Anthropic({ apiKey: key });
  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userMessage }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  return parseJson(text, 'Claude');
}

// ── Gemini (tries flash models in order) ─────────────────────────────────────

const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b'];

async function callGemini(userMessage: string): Promise<AnalysisResult> {
  const key = checkGeminiKey();
  if (!key) throw new Error('GEMINI_API_KEY (or GOOGLE_API_KEY) not set');

  const genAI = new GoogleGenerativeAI(key);
  let lastErr: Error = new Error('No Gemini model succeeded');

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model:             modelName,
        generationConfig:  { maxOutputTokens: 600, temperature: 0.1 },
      });
      const prompt = `${SYSTEM_PROMPT}\n\n${userMessage}`;
      const result = await model.generateContent(prompt);
      const text   = result.response.text().trim();
      return parseJson(text, `Gemini(${modelName})`);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      console.warn(`[cleanup] Gemini model ${modelName} failed:`, lastErr.message);
    }
  }
  throw lastErr;
}

// ── With automatic fallback ───────────────────────────────────────────────────

async function callAI(userMessage: string): Promise<AnalysisResult> {
  if (checkApiKey()) {
    try {
      return await callClaude(userMessage);
    } catch (err) {
      console.warn('[cleanup] Claude failed, trying Gemini:', err instanceof Error ? err.message : err);
    }
  }
  if (checkGeminiKey()) {
    return await callGemini(userMessage);
  }
  throw new Error(
    'No AI key available — set ANTHROPIC_API_KEY or GEMINI_API_KEY in Railway environment variables',
  );
}

// ── Public exports ────────────────────────────────────────────────────────────

export async function analyzeNode(candidate: NodeCandidate): Promise<AnalysisResult> {
  const msg = `Analyze this node:
Title: ${candidate.title}
Category: ${candidate.category}
Description: ${candidate.descriptionSummary}
Tags: ${candidate.tags.join(', ')}
Evidence Level: ${candidate.evidenceLevel}
Confidence Score: ${candidate.confidenceScore}
Relationships: ${candidate.relationshipCount}
Source Count: ${candidate.sourceCount}
Flagged by rules because: ${candidate.flagReasons.join('; ')}

Return JSON only. Set itemId to "${candidate.id}".`;

  const result    = await callAI(msg);
  result.itemId   = candidate.id;
  result.itemType = 'node';
  return result;
}

export async function analyzeSource(candidate: SourceCandidate): Promise<AnalysisResult> {
  const msg = `Analyze this source:
Title: ${candidate.title}
Type: ${candidate.sourceType}
Author: ${candidate.author ?? 'Unknown'}
Year: ${candidate.year ?? 'Unknown'}
URL: ${candidate.url ?? 'None'}
Domain: ${candidate.domain ?? 'None'}
Linked To Node: ${candidate.linkedNodeTitle}
Flagged by rules because: ${candidate.flagReasons.join('; ')}

Return JSON only. Set itemType to "source" and itemId to "${candidate.id}".`;

  const result    = await callAI(msg);
  result.itemId   = candidate.id;
  result.itemType = 'source';
  return result;
}

export function estimateCost(count: number): number {
  const inputCost  = (count * 400 / 1_000_000) * 0.25;
  const outputCost = (count * 150 / 1_000_000) * 1.25;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
