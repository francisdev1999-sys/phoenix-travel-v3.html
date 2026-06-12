export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const status = req.nextUrl.searchParams.get('status') ?? 'all';
  const limit  = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100', 10), 500);

  const domains = await prisma.sourceDomainReputation.findMany({
    where:   status !== 'all' ? { status } : {},
    orderBy: { reputationScore: 'desc' },
    take:    limit,
  });

  const summary = await prisma.sourceDomainReputation.groupBy({
    by:     ['status'],
    _count: { _all: true },
    _avg:   { reputationScore: true },
  });

  return NextResponse.json({ domains, summary });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { domain, status, notes, reputationScore } = await req.json() as {
    domain: string; status?: string; notes?: string; reputationScore?: number;
  };

  const updated = await prisma.sourceDomainReputation.upsert({
    where:  { domain },
    update: {
      ...(status !== undefined          ? { status }          : {}),
      ...(notes !== undefined           ? { notes }           : {}),
      ...(reputationScore !== undefined ? { reputationScore } : {}),
    },
    create: { domain, status: status ?? 'normal', notes, reputationScore: reputationScore ?? 0.5 },
  });

  return NextResponse.json({ domain: updated });
}
