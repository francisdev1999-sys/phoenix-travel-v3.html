export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const session = await auth();
    if (!isAdminSession(session) || !session) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { runId } = await params;

    const run = await prisma.archiveAuditRun.findUnique({
      where: { id: runId },
      include: {
        findings: {
          orderBy: [
            { status: 'asc' },
          ],
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    // Sort findings by severity then status
    const sorted = [...run.findings].sort((a, b) => {
      const sA = SEVERITY_ORDER[a.severity] ?? 99;
      const sB = SEVERITY_ORDER[b.severity] ?? 99;
      if (sA !== sB) return sA - sB;
      return a.status.localeCompare(b.status);
    });

    return NextResponse.json({ ...run, findings: sorted });
  } catch (err) {
    console.error('[GET /api/admin/archive-audit/[runId]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
