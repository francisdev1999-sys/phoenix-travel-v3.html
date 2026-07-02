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
import { runLearningPass } from '@/lib/learning/trainer';

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
  const result = await runLearningPass();
  return NextResponse.json(result);
}

export const POST = withCronTracking('learning-pass', handler);
