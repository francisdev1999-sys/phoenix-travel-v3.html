/**
 * AI Deep Research Review API
 *
 * POST /api/admin/ai-review
 *   Body: { nodeId: string, forceRerun?: boolean }
 *   Runs or returns cached AI review for a node.
 *   Requires reviewer role or above.
 *
 * GET /api/admin/ai-review?nodeId=xxx
 *   Returns the most recent stored review for a node (no new API call).
 *   Returns null if none exists.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isReviewerOrAboveSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runAiReview, getMonthlyUsage } from '@/lib/ai-review';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isReviewerOrAboveSession(session) || !session) {
    return NextResponse.json({ error: 'Reviewer role required' }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not configured on this server. Add it to your Railway environment variables.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.nodeId) {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
  }

  const { nodeId, forceRerun = false } = body as { nodeId: string; forceRerun?: boolean };

  const node = await prisma.node.findUnique({ where: { id: nodeId }, select: { id: true, title: true } });
  if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

  try {
    const result = await runAiReview(nodeId, session.user.id ?? null, forceRerun);

    // Include budget warning if active
    const usage = await getMonthlyUsage();

    return NextResponse.json({
      ...result,
      budgetWarning: usage.warningActive
        ? `Monthly spend $${usage.totalCost.toFixed(2)} — approaching $15 warning threshold.`
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status  = message.includes('budget exceeded') ? 429
                  : message.includes('API key')         ? 503
                  : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isReviewerOrAboveSession(session) || !session) {
    return NextResponse.json({ error: 'Reviewer role required' }, { status: 403 });
  }

  const nodeId = req.nextUrl.searchParams.get('nodeId');
  if (!nodeId) return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });

  const review = await prisma.aiResearchReview.findFirst({
    where:   { nodeId },
    orderBy: { createdAt: 'desc' },
  });

  if (!review) return NextResponse.json(null);

  return NextResponse.json({
    id:            review.id,
    nodeId:        review.nodeId,
    model:         review.model,
    promptVersion: review.promptVersion,
    review:        review.reviewJson,
    inputTokens:   review.inputTokens,
    outputTokens:  review.outputTokens,
    estimatedCost: review.estimatedCost,
    createdAt:     review.createdAt,
    cached:        true,
  });
}
