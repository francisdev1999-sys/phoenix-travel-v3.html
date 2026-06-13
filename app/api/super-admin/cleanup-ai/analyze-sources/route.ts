import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { runSourceRules } from '@/lib/cleanup/rules';
import { analyzeSource, estimateCost, checkApiKey, checkGeminiKey } from '@/lib/cleanup/analyzer';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

const MAX_CANDIDATES = 20;
const QUICK_LIMIT    = 5;
const BATCH_SIZE     = 3;

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

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin();
  if (error) return error;

  if (!checkApiKey() && !checkGeminiKey()) {
    return NextResponse.json(
      { error: 'No AI key configured. Set ANTHROPIC_API_KEY (Claude) or GEMINI_API_KEY (Gemini) in Railway environment variables.' },
      { status: 503 },
    );
  }

  const body   = await req.json().catch(() => ({}));
  const mode   = body.mode === 'quick' ? 'quick' : 'full';
  const dryRun = body.dryRun === true;

  const allCandidates = await runSourceRules();
  const limit         = mode === 'quick' ? QUICK_LIMIT : MAX_CANDIDATES;
  const candidates    = allCandidates.slice(0, limit);
  const estimatedCost = estimateCost(candidates.length);

  if (dryRun) {
    return NextResponse.json({
      candidatesScanned:  allCandidates.length,
      candidatesSentToAI: candidates.length,
      estimatedCost,
      preview: candidates.map(c => ({ id: c.id, title: c.title, flagReasons: c.flagReasons })),
    });
  }

  const run = await prisma.cleanupAuditRun.create({
    data: {
      mode: 'source',
      status: 'running',
      triggeredBy:        session!.user!.email!,
      candidatesScanned:  allCandidates.length,
      candidatesSentToAI: candidates.length,
      estimatedCost,
    },
  });

  let keepCount = 0, reviewCount = 0, archiveCount = 0, deleteCount = 0, blacklistCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  const results = await processBatch(candidates, analyzeSource, BATCH_SIZE);

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
          itemType:            'source',
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

  if (allFailed) {
    return NextResponse.json(
      { error: `All ${candidates.length} analyses failed. Error: ${errors[0]}`, run: completed },
      { status: 500 },
    );
  }

  return NextResponse.json(completed);
}
