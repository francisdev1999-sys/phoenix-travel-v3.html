export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!isAdminSession(session) || !session) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const runs = await prisma.archiveAuditRun.findMany({
      orderBy: { startedAt: 'desc' },
      take:    20,
      select: {
        id:          true,
        status:      true,
        triggeredBy: true,
        startedAt:   true,
        completedAt: true,
        summary:     true,
        settings:    true,
        _count:      { select: { findings: true } },
      },
    });

    return NextResponse.json({ runs });
  } catch (err) {
    console.error('[GET /api/admin/archive-audit/runs]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
