import { withCronTracking } from '@/lib/cron/tracker';
export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/learning-pass
 *
 * Nightly training pass for the adaptive node-promotion model. Rebuilds the
 * labeled dataset from approval/survival history, warm-starts from the current
 * model and continues training (so it evolves), evaluates on a held-out split,
 * saves the new active version, and resolves outstanding predictions.
 *
 * Protected by CRON_SECRET (enforced in middleware). Suggested: daily.
 */
import { NextRequest, NextResponse } from 'next/server';
import { runLearningPass, runEdgeLearningPass } from '@/lib/learning/trainer';
import { runInterestLearningPass } from '@/lib/learning/interest';

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

async function handler(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Train all three learners; one failing must not stop the others.
  const [nodeResult, edgeResult, interestResult] = await Promise.allSettled([
    runLearningPass(),
    runEdgeLearningPass(),
    runInterestLearningPass(),
  ]);
  const unwrap = (r: PromiseSettledResult<unknown>) =>
    r.status === 'fulfilled' ? r.value : { trained: false, reason: String(r.reason) };
  const node     = unwrap(nodeResult) as { trained: boolean };
  const edge     = unwrap(edgeResult) as { trained: boolean };
  const interest = unwrap(interestResult) as { trained: boolean };
  // Keep top-level fields for backward compatibility with the dashboard.
  return NextResponse.json({ ...node, node, edge, interest });
}

export const POST = withCronTracking('learning-pass', handler);
