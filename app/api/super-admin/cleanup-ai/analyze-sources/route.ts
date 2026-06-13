import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { runSourceRules } from '@/lib/cleanup/rules';
import { analyzeSource, estimateCost } from '@/lib/cleanup/analyzer';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

const MAX_CANDIDATES = 100;
const QUICK_LIMIT    = 20;

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin();
  if (error) return error;

  const body    = await req.json().catch(() => ({}));
  const mode    = body.mode === 'quick' ? 'quick' : 'full';
  const dryRun  = body.dryRun === true;

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
      triggeredBy: session!.user!.email!,
      candidatesScanned:  allCandidates.length,
      candidatesSentToAI: candidates.length,
      estimatedCost,
    },
  });

  let keepCount = 0, reviewCount = 0, archiveCount = 0, deleteCount = 0, blacklistCount = 0;

  for (const candidate of candidates) {
    try {
      const result = await analyzeSource(candidate);
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
      if      (result.classification === 'KEEP')               keepCount++;
      else if (result.classification === 'REVIEW')             reviewCount++;
      else if (result.classification === 'ARCHIVE_CANDIDATE')  archiveCount++;
      else if (result.classification === 'DELETE_CANDIDATE')   deleteCount++;
      else if (result.classification === 'BLACKLIST_CANDIDATE') blacklistCount++;
    } catch (err) {
      console.error(`Source analysis failed for ${candidate.id}:`, err);
    }
  }

  const completed = await prisma.cleanupAuditRun.update({
    where: { id: run.id },
    data: {
      status:                  'completed',
      completedAt:             new Date(),
      keepCount,
      reviewCount,
      archiveCandidateCount:   archiveCount,
      deleteCandidateCount:    deleteCount,
      blacklistCandidateCount: blacklistCount,
    },
  });

  return NextResponse.json(completed);
}
