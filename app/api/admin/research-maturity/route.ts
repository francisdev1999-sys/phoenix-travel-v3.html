export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { getMaturityStats } from '@/lib/maturity/scorer';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const [stats, bottom5rows] = await Promise.all([
    getMaturityStats(),
    prisma.researchMaturityScore.findMany({
      where:   { entityType: 'node' },
      orderBy: { score: 'asc' },
      take:    5,
      select:  { entityId: true, score: true },
    }),
  ]);

  const bottom5ids   = bottom5rows.map(r => r.entityId);
  const bottom5nodes = await prisma.node.findMany({
    where:  { id: { in: bottom5ids } },
    select: { id: true, title: true },
  });
  const bottom5 = bottom5rows.map(r => ({
    nodeId: r.entityId,
    score:  r.score,
    title:  bottom5nodes.find(n => n.id === r.entityId)?.title ?? r.entityId,
  }));

  return NextResponse.json({ ...stats, bottom5 });
}
