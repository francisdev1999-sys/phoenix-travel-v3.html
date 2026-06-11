/**
 * GET /api/admin/ai-review/usage
 *
 * Returns current-month AI review usage stats.
 * Admin only — cost data should not be exposed to reviewers.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { getMonthlyUsage } from '@/lib/ai-review';

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const usage = await getMonthlyUsage();
  return NextResponse.json({
    ...usage,
    warningThreshold:  15,
    hardLimitThreshold: 20,
    configuredModel:   process.env.ANTHROPIC_API_KEY ? 'claude-sonnet-4-6' : null,
    apiKeyConfigured:  !!process.env.ANTHROPIC_API_KEY,
  });
}
