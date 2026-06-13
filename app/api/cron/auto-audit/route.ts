export const dynamic = 'force-dynamic';
/**
 * POST /api/cron/auto-audit
 *
 * Automatically triggers a quick AI cleanup audit (nodes + sources) when
 * no audit has run in the past 24 hours. Uses the super-admin analyze
 * endpoints internally.
 *
 * Protected by CRON_SECRET. Suggested schedule: daily at 04:00 UTC.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runNodeRules } from '@/lib/cleanup/rules';
import { checkApiKey, checkGeminiKey } from '@/lib/cleanup/analyzer';

const CRON_SECRET    = process.env.CRON_SECRET;
const AUDIT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Skip if no AI key configured (avoid creating failed runs)
  if (!checkApiKey() && !checkGeminiKey()) {
    return NextResponse.json({ skipped: true, reason: 'no AI key configured' });
  }

  // Skip if a run already completed in the last 24 hours
  const recent = await prisma.cleanupAuditRun.findFirst({
    where: {
      status:      { in: ['completed', 'running'] },
      startedAt:   { gte: new Date(Date.now() - AUDIT_INTERVAL) },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (recent) {
    return NextResponse.json({ skipped: true, reason: `recent run exists: ${recent.id}` });
  }

  // Run a quick rule-scan to see if there are candidates worth auditing
  const candidates = await runNodeRules();
  if (candidates.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'no flagged candidates' });
  }

  // Trigger the analyze-nodes endpoint internally
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/super-admin/cleanup-ai/analyze-nodes`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${CRON_SECRET ?? ''}`,
      // Pass a special header so the admin-auth check recognises cron context
      'X-Cron-Token':  CRON_SECRET ?? '',
    },
    body: JSON.stringify({ mode: 'quick', dryRun: false }),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Analyze-nodes failed: ${res.status} ${body}` }, { status: 502 });
  }

  const result = await res.json();
  return NextResponse.json({ triggered: true, candidates: candidates.length, run: result });
}
