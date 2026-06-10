export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runAudit } from '@/lib/audit/runner';
import { DEFAULT_AUDIT_SETTINGS } from '@/lib/audit/types';

export async function POST() {
  try {
    const session = await auth();
    if (!isAdminSession(session)) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Load saved settings or use defaults
    const configRow = await prisma.systemConfig.findUnique({ where: { key: 'audit_settings' } });
    const settings = configRow
      ? { ...DEFAULT_AUDIT_SETTINGS, ...(configRow.value as object) }
      : DEFAULT_AUDIT_SETTINGS;

    // Check nothing already running
    const running = await prisma.archiveAuditRun.findFirst({ where: { status: 'running' } });
    if (running) {
      return NextResponse.json({ error: 'Audit already running', runId: running.id }, { status: 409 });
    }

    const run = await prisma.archiveAuditRun.create({
      data: {
        status:      'running',
        triggeredBy: session?.user?.email ?? 'admin',
        settings:    settings as object,
      },
    });

    after(async () => {
      await runAudit(run.id, settings);
    });

    return NextResponse.json({ runId: run.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[archive-audit/run]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
