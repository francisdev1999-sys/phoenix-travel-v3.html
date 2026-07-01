/**
 * Shared AI cleanup-audit runner.
 *
 * Extracted from app/api/super-admin/cleanup-ai/analyze-nodes so that BOTH the
 * admin-triggered route and the auto-audit cron can run the exact same audit
 * WITHOUT an internal HTTP hop. The cron previously fetched the super-admin
 * route with a Bearer/cron token, but that route (and the /api/super-admin
 * middleware) is session-based only — an internal fetch carries no session, so
 * it always 401/403'd and the daily audit never actually ran. Calling this
 * function directly guarantees the loop closes.
 */

import { prisma } from '@/lib/db';
import { runNodeRules } from '@/lib/cleanup/rules';
import { analyzeNode, estimateCost, checkApiKey, checkGeminiKey } from '@/lib/cleanup/analyzer';

const MAX_CANDIDATES = 15;
const QUICK_LIMIT    = 5;
const BATCH_SIZE     = 3; // parallel Claude calls per batch

async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number,
): Promise<{ result: R | null; error: string | null }[]> {
  const out: { result: R | null; error: string | null }[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch   = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fn));
    for (const s of settled) {
      if (s.status === 'fulfilled') out.push({ result: s.value, error: null });
      else out.push({ result: null, error: s.reason instanceof Error ? s.reason.message : String(s.reason) });
    }
  }
  return out;
}

export interface NodeAuditOptions {
  mode?:       'quick' | 'full';
  dryRun?:     boolean;
  triggeredBy: string;
}

export type NodeAuditResult =
  | { kind: 'no_ai_key' }
  | {
      kind:               'dry_run';
      candidatesScanned:  number;
      candidatesSentToAI: number;
      estimatedCost:      number;
      preview:            { id: string; title: string; flagReasons: string[] }[];
    }
  | {
      kind:      'completed';
      allFailed: boolean;
      run:       Awaited<ReturnType<typeof prisma.cleanupAuditRun.update>>;
      errors:    string[];
      errorCount: number;
      candidateCount: number;
    };

/**
 * Runs the node cleanup audit. Never throws for the "no candidates" or
 * "no key" cases — returns a descriptive discriminated result the caller
 * maps to an HTTP response (route) or a JSON summary (cron).
 */
export async function runNodeCleanupAudit(opts: NodeAuditOptions): Promise<NodeAuditResult> {
  if (!checkApiKey() && !checkGeminiKey()) {
    return { kind: 'no_ai_key' };
  }

  const mode   = opts.mode === 'quick' ? 'quick' : 'full';
  const dryRun = opts.dryRun === true;

  const allCandidates = await runNodeRules();
  const limit         = mode === 'quick' ? QUICK_LIMIT : MAX_CANDIDATES;
  const candidates    = allCandidates.slice(0, limit);
  const estimatedCost = estimateCost(candidates.length);

  if (dryRun) {
    return {
      kind:               'dry_run',
      candidatesScanned:  allCandidates.length,
      candidatesSentToAI: candidates.length,
      estimatedCost,
      preview: candidates.map(c => ({ id: c.id, title: c.title, flagReasons: c.flagReasons })),
    };
  }

  const run = await prisma.cleanupAuditRun.create({
    data: {
      mode:               'node',
      status:             'running',
      triggeredBy:        opts.triggeredBy,
      candidatesScanned:  allCandidates.length,
      candidatesSentToAI: candidates.length,
      estimatedCost,
    },
  });

  let keepCount = 0, reviewCount = 0, archiveCount = 0, deleteCount = 0, blacklistCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  const results = await processBatch(candidates, analyzeNode, BATCH_SIZE);

  for (let i = 0; i < candidates.length; i++) {
    const { result, error: itemErr } = results[i];
    const candidate = candidates[i];
    if (!result) {
      errorCount++;
      errors.push(`"${candidate.title}": ${itemErr ?? 'unknown error'}`);
      continue;
    }
    try {
      await prisma.cleanupFinding.create({
        data: {
          auditRunId:          run.id,
          itemType:            'node',
          itemId:              candidate.id,
          title:               candidate.title,
          classification:      result.classification,
          relevanceScore:      result.relevanceScore,
          confidence:          result.confidence,
          reasons:             result.reasons,
          risksIfKept:         result.risksIfKept,
          risksIfDeleted:      result.risksIfDeleted,
          recommendedAction:   result.recommendedAction,
          blacklistSuggestion: result.blacklistSuggestion ?? null,
        },
      });
      if      (result.classification === 'KEEP')                keepCount++;
      else if (result.classification === 'REVIEW')              reviewCount++;
      else if (result.classification === 'ARCHIVE_CANDIDATE')   archiveCount++;
      else if (result.classification === 'DELETE_CANDIDATE')    deleteCount++;
      else if (result.classification === 'BLACKLIST_CANDIDATE') blacklistCount++;
    } catch (err) {
      errorCount++;
      errors.push(`DB write failed for ${candidate.title}: ${String(err)}`);
    }
  }

  const allFailed   = errorCount === candidates.length && candidates.length > 0;
  const finalStatus = allFailed ? 'failed' : 'completed';

  const completed = await prisma.cleanupAuditRun.update({
    where: { id: run.id },
    data: {
      status:                  finalStatus,
      completedAt:             new Date(),
      keepCount,
      reviewCount,
      archiveCandidateCount:   archiveCount,
      deleteCandidateCount:    deleteCount,
      blacklistCandidateCount: blacklistCount,
      reportJson:              errors.length > 0
        ? { errors, errorCount, successCount: candidates.length - errorCount }
        : undefined,
    },
  });

  return {
    kind:           'completed',
    allFailed,
    run:            completed,
    errors,
    errorCount,
    candidateCount: candidates.length,
  };
}
