import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { runNodeRules } from '@/lib/cleanup/rules';
import { analyzeNode, estimateCost, checkApiKey } from '@/lib/cleanup/analyzer';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

const MAX_CANDIDATES = 15;
const QUICK_LIMIT    = 5;
const BATCH_SIZE     = 3;  // parallel Claude calls per batch

async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number,
): Promise<(R | null)[]> {
  const results: (R | null)[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fn));
    for (const s of settled) {
      results.push(s.status === 'fulfilled' ? s.value : null);
    }
  }
  return results;
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin();
  if (error) return error;

  // Fail fast if API key missing
  if (!checkApiKey()) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured. Set it in your Railway environment variables.' },
      { status: 503 },
    );
  }

  const body   = await req.json().catch(() => ({}));
  const mode   = body.mode === 'quick' ? 'quick' : 'full';
  const dryRun = body.dryRun === true;

  const allCandidates = await runNodeRules();
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
      mode: 'node',
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

  const results = await processBatch(candidates, analyzeNode, BATCH_SIZE);

  for (let i = 0; i < candidates.length; i++) {
    const result   = results[i];
    const candidate = candidates[i];
    if (!result) {
      errorCount++;
      errors.push(`Failed to analyze: ${candidate.title}`);
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

  const allFailed  = errorCount === candidates.length && candidates.length > 0;
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
      { error: `All ${candidates.length} analyses failed. First error: ${errors[0]}`, run: completed },
      { status: 500 },
    );
  }

  return NextResponse.json(completed);
}
