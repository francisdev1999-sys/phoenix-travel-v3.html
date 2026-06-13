import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');
  const itemType = searchParams.get('itemType');
  const classification = searchParams.get('classification');
  const status = searchParams.get('status') ?? 'open';

  const findings = await prisma.cleanupFinding.findMany({
    where: {
      ...(runId ? { auditRunId: runId } : {}),
      ...(itemType ? { itemType } : {}),
      ...(classification ? { classification } : {}),
      status,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json(findings);
}
