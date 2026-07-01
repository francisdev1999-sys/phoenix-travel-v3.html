import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { runNodeCleanupAudit } from '@/lib/cleanup/run-audit';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin();
  if (error) return error;

  const body   = await req.json().catch(() => ({}));
  const mode   = body.mode === 'quick' ? 'quick' : 'full';
  const dryRun = body.dryRun === true;

  const result = await runNodeCleanupAudit({
    mode,
    dryRun,
    triggeredBy: session!.user!.email!,
  });

  if (result.kind === 'no_ai_key') {
    return NextResponse.json(
      { error: 'No AI key configured. Set ANTHROPIC_API_KEY (Claude) or GEMINI_API_KEY (Gemini) in Railway environment variables.' },
      { status: 503 },
    );
  }

  if (result.kind === 'dry_run') {
    return NextResponse.json({
      candidatesScanned:  result.candidatesScanned,
      candidatesSentToAI: result.candidatesSentToAI,
      estimatedCost:      result.estimatedCost,
      preview:            result.preview,
    });
  }

  if (result.allFailed) {
    return NextResponse.json(
      { error: `All ${result.candidateCount} analyses failed. Error: ${result.errors[0]}`, run: result.run },
      { status: 500 },
    );
  }

  return NextResponse.json(result.run);
}
