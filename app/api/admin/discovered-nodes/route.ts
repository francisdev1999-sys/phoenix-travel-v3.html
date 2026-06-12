export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runNodeDiscovery } from '@/lib/discovery/node-engine';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const status  = req.nextUrl.searchParams.get('status') ?? 'pending_review';
  const limit   = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '30', 10), 100);
  const offset  = parseInt(req.nextUrl.searchParams.get('offset') ?? '0', 10);

  const [nodes, total] = await Promise.all([
    prisma.discoveredNode.findMany({
      where:   status === 'all' ? {} : { status },
      orderBy: { relevanceScore: 'desc' },
      take:    limit,
      skip:    offset,
    }),
    prisma.discoveredNode.count({
      where: status === 'all' ? {} : { status },
    }),
  ]);

  const counts = await prisma.discoveredNode.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  return NextResponse.json({
    nodes,
    total,
    counts: Object.fromEntries(counts.map(c => [c.status, c._count._all])),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { maxNodes?: number };

  try {
    const result = await runNodeDiscovery({ maxNodes: body.maxNodes ?? 10 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
