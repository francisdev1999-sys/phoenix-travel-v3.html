export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runAudit, getOrCreateSettings } from '@/lib/audit/runner';

export async function POST() {
  try {
    const session = await auth();
    if (!isAdminSession(session) || !session) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Block if a fresh run is already in progress
    const existing = await prisma.archiveAuditRun.findFirst({
      where: { status: 'running' },
      select: { id: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    });
    if (existing) {
      const ageMs = Date.now() - new Date(existing.startedAt).getTime();
      if (ageMs < 10 * 60 * 1000) {
        return NextResponse.json({ error: 'An audit is already running', runId: existing.id }, { status: 409 });
      }
      await prisma.archiveAuditRun.update({
        where: { id: existing.id },
        data: { status: 'failed', completedAt: new Date() },
      }).catch(() => {});
    }

    const settings = await getOrCreateSettings();

    const run = await prisma.archiveAuditRun.create({
      data: {
        triggeredBy: session.user?.email ?? session.user?.id ?? 'unknown',
        status:      'running',
        settings:    settings as object,
      },
    });

    // Run synchronously — Railway has no per-request timeout on persistent servers.
    // after() and void are both unreliable here; awaiting directly is the only
    // guarantee the work actually completes.
    await runAudit(run.id, settings);

    return NextResponse.json({ runId: run.id });
  } catch (err) {
    console.error('[POST /api/admin/archive-audit/run]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
