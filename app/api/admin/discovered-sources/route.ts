export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const status   = searchParams.get('status')   ?? 'pending_review';
  const nodeId   = searchParams.get('nodeId')   ?? undefined;
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const offset   = parseInt(searchParams.get('offset') ?? '0', 10);

  const where = {
    ...(status !== 'all' ? { status } : {}),
    ...(nodeId ? { nodeId } : {}),
  };

  const [items, total, stats] = await Promise.all([
    prisma.discoveredSource.findMany({
      where,
      orderBy: [{ credibilityScore: 'desc' }, { fetchedAt: 'desc' }],
      take:    limit,
      skip:    offset,
      include: { node: { select: { id: true, title: true } } },
    }),
    prisma.discoveredSource.count({ where }),
    prisma.discoveredSource.groupBy({
      by:     ['status'],
      _count: { _all: true },
    }),
  ]);

  const counts = Object.fromEntries(stats.map(s => [s.status, s._count._all]));
  return NextResponse.json({ items, total, offset, counts });
}
