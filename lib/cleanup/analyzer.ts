import Anthropic from '@anthropic-ai/sdk';
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

export function checkApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY ?? null;
}

function getClient(): Anthropic {
  const key = checkApiKey();
  if (!key) throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  return new Anthropic({ apiKey: key });
}

async function callClaude(userMessage: string): Promise<AnalysisResult> {
  const client = getClient();
  const response = await client.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userMessage }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  try {
    return JSON.parse(text) as AnalysisResult;
  } catch {
    throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

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

  const result = await callClaude(msg);
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

  const result = await callClaude(msg);
  result.itemId   = candidate.id;
  result.itemType = 'source';
  return result;
}

export function estimateCost(count: number): number {
  const inputCost  = (count * 400 / 1_000_000) * 0.25;
  const outputCost = (count * 150 / 1_000_000) * 1.25;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}
