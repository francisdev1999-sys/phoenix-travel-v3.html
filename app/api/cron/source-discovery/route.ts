export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/source-discovery
 *
 * Runs the autonomous source discovery engine across published nodes.
 * Queries CrossRef, Semantic Scholar, arXiv, OpenAlex, Wikipedia, PubMed.
 * Auto-approves green-lane sources; sends others to pending_review.
 *
 * Protected by CRON_SECRET (enforced in middleware).
 * Suggested Railway schedule: every 6 hours — 0 *\/6 * * *
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runDiscovery } from '@/lib/discovery/engine';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { nodeId?: string; maxNodes?: number };
  const started = new Date();

  // Create a DiscoveryRun record upfront
  const run = await prisma.discoveryRun.create({
    data: {
      mode:         body.nodeId ? 'node' : 'scheduled',
      targetNodeId: body.nodeId ?? null,
      status:       'running',
    },
  });

  try {
    const result = await runDiscovery({
      nodeId:   body.nodeId,
      maxNodes: body.maxNodes ?? 30,
      runId:    run.id,
    });

    await prisma.discoveryRun.update({
      where: { id: run.id },
      data:  {
        status:       'complete',
        nodesChecked: result.nodesChecked,
        sourcesFound: result.sourcesFound,
        autoApproved: result.autoApproved,
        pendingReview: result.pendingReview,
        skipped:      result.skipped,
        completedAt:  new Date(),
      },
    });

    return NextResponse.json({ runId: run.id, ...result, ms: Date.now() - started.getTime() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.discoveryRun.update({
      where: { id: run.id },
      data:  { status: 'failed', errorMessage: msg, completedAt: new Date() },
    }).catch(() => {});
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
