export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runAudit, getOrCreateSettings } from '@/lib/audit/runner';

export async function POST() {
  try {
    const session = await auth();
    if (!isAdminSession(session) || !session) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const settings = await getOrCreateSettings();

    const run = await prisma.archiveAuditRun.create({
      data: {
        triggeredBy: session.user?.email ?? session.user?.id ?? 'unknown',
        status:      'running',
        settings:    settings as object,
      },
    });

    after(async () => {
      await runAudit(run.id, settings);
    });

    return NextResponse.json({ runId: run.id });
  } catch (err) {
    console.error('[POST /api/admin/archive-audit/run]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
