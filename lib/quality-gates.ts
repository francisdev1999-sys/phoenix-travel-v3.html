/**
 * Quality Gates & Risk Classifier
 *
 * Validates submissions before they enter the review queue.
 * Assigns GREEN / YELLOW / RED risk level to help reviewers prioritise.
 */

import { prisma } from '@/lib/db';

// ── Risk classification ───────────────────────────────────────────────────────

export type RiskLevel = 'green' | 'yellow' | 'red';

const HIGH_RISK_KEYWORDS = [
  'alien', 'extraterrestrial', 'reptilian', 'stargate', 'portal',
  'interdimensional', 'dimension hopping', 'ancient astronaut',
  'ancient advanced technology', 'suppressed history', 'hidden civilization',
  'lost advanced civilization', 'miracle technology', 'supernatural power',
  'paranormal', 'free energy device', 'reality manipulation',
  'time travel', 'government secret', 'shadow government', 'deep state',
  'illuminati', 'new world order', 'chemtrails', 'flat earth',
];

const MEDIUM_RISK_KEYWORDS = [
  'conspiracy', 'cover-up', 'cover up', 'hidden truth', 'secret society',
  'forbidden history', 'mainstream is wrong', 'they dont want you to know',
  'suppressed', 'banned research', 'silenced', 'censored truth',
  'ancient mystery', 'lost civilization',
];

export interface RiskResult {
  level:    RiskLevel;
  reasons:  string[];
  highHits: string[];
  medHits:  string[];
}

export function classifyRisk(
  text:          string,
  evidenceLevel: string,
  sourceCount:   number,
): RiskResult {
  const lower    = text.toLowerCase();
  const highHits = HIGH_RISK_KEYWORDS.filter(k => lower.includes(k));
  const medHits  = MEDIUM_RISK_KEYWORDS.filter(k => lower.includes(k));
  const reasons: string[] = [];

  let level: RiskLevel = 'green';

  if (highHits.length >= 3) {
    level = 'red';
    reasons.push(`Contains ${highHits.length} high-risk keywords: ${highHits.slice(0, 3).join(', ')}`);
  } else if (highHits.length >= 1 && sourceCount === 0) {
    level = 'red';
    reasons.push('Extraordinary claim with zero supporting sources');
  } else if (highHits.length >= 1) {
    level = 'yellow';
    reasons.push(`Contains high-risk keyword: ${highHits[0]}`);
  }

  if (medHits.length >= 2 && level === 'green') {
    level = 'yellow';
    reasons.push(`Multiple conspiracy-framing keywords: ${medHits.slice(0, 2).join(', ')}`);
  } else if (medHits.length >= 1 && level === 'green') {
    level = 'yellow';
    reasons.push(`Conspiracy-framing keyword detected: ${medHits[0]}`);
  }

  if (['speculative', 'mythological', 'unverified'].includes(evidenceLevel) && level === 'green') {
    level = 'yellow';
    reasons.push(`Evidence level is '${evidenceLevel}'`);
  }

  if (sourceCount === 0 && level === 'green') {
    level = 'yellow';
    reasons.push('No sources attached');
  }

  return { level, reasons, highHits, medHits };
}

// ── Submission quality gates ──────────────────────────────────────────────────

export interface GateResult {
  passed:  boolean;
  errors:  string[];
  warnings: string[];
  risk:    RiskResult;
}

export interface NodeSubmissionInput {
  title:         string;
  description:   string;
  evidenceLevel: string;
  tags?:         string[];
  claims?:       string[];
  url?:          string;
}

const URL_PATTERN = /^https?:\/\/.+\..+/;
const SPAM_PATTERN = /(.)\1{6,}/; // 7+ repeated chars

export function validateNodeSubmission(input: NodeSubmissionInput): GateResult {
  const errors:   string[] = [];
  const warnings: string[] = [];
  const fullText  = `${input.title} ${input.description}`;
  const sourceCount = 0; // sources not attached at proposal stage

  if (!input.title || input.title.trim().length < 10) {
    errors.push('Title must be at least 10 characters.');
  }
  if (!input.description || input.description.trim().length < 100) {
    errors.push('Description must be at least 100 characters.');
  }
  if (input.url && !URL_PATTERN.test(input.url)) {
    errors.push('URL format is invalid. Must begin with http:// or https://');
  }
  if (SPAM_PATTERN.test(input.title) || SPAM_PATTERN.test(input.description)) {
    errors.push('Submission contains repeated character patterns consistent with spam.');
  }
  if (!input.tags || input.tags.length === 0) {
    warnings.push('No tags provided — this makes the node harder to discover.');
  }
  if (!input.claims || input.claims.length === 0) {
    warnings.push('No key claims listed — reviewers recommend adding at least one claim.');
  }

  const risk = classifyRisk(fullText, input.evidenceLevel, sourceCount);

  return {
    passed:  errors.length === 0,
    errors,
    warnings,
    risk,
  };
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

export interface RateCheck {
  allowed:     boolean;
  count:       number;
  limit:       number;
  resetAt:     Date;
}

const SUBMISSION_LIMITS: Record<string, number> = {
  contributor:          5,
  verified_contributor: 10,
  source_verifier:      15,
  reviewer:             20,
  admin:                100,
  owner:                999,
};

export async function checkSubmissionRate(
  userId: string,
  role:   string,
): Promise<RateCheck> {
  const limit = SUBMISSION_LIMITS[role] ?? 3; // default for user/unknown

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const resetAt = new Date(dayStart);
  resetAt.setDate(resetAt.getDate() + 1);

  const count = await prisma.userActivityLog.count({
    where: {
      userId,
      actionType: 'submit',
      createdAt:  { gte: dayStart },
    },
  });

  return { allowed: count < limit, count, limit, resetAt };
}

// ── Trust gate ────────────────────────────────────────────────────────────────

export function checkTrustGate(
  trustScore: number,
  isBanned:   boolean,
): { allowed: boolean; reason?: string } {
  if (isBanned) return { allowed: false, reason: 'Your account has been banned.' };
  if (trustScore < 20) {
    return {
      allowed: false,
      reason:  `Your trust score (${Math.round(trustScore)}) is too low to submit content. Engage with the archive to increase it.`,
    };
  }
  return { allowed: true };
}

// ── Duplicate detection ───────────────────────────────────────────────────────

export async function checkDuplicate(title: string): Promise<{
  isDuplicate: boolean;
  similarTitles: string[];
}> {
  // Simple trigram-based check via pg_trgm
  try {
    const results = await prisma.$queryRaw<{ title: string }[]>`
      SELECT title FROM "Node"
      WHERE similarity(lower(title), lower(${title})) > 0.6
      LIMIT 3
    `;
    const similarTitles = results.map(r => r.title);
    return { isDuplicate: similarTitles.length > 0, similarTitles };
  } catch {
    return { isDuplicate: false, similarTitles: [] };
  }
}
