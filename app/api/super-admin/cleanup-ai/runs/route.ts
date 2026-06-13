import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const runs = await prisma.cleanupAuditRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: 50,
    include: { _count: { select: { findings: true } } },
  });

  return NextResponse.json(runs);
}
