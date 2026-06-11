export const dynamic = 'force-dynamic';
/**
 * GET /api/admin/source-intelligence/queue
 * Returns the pending review queue: potential node suggestions + contradiction suggestions.
 *
 * Query params:
 *   type    — 'potential_node' | 'contradiction' | 'all' (default 'all')
 *   status  — 'pending' | 'approved' | 'dismissed' | 'applied' (default 'pending')
 *   limit   — max items (default 50, max 200)
 *   cursor  — pagination offset
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const type   = searchParams.get('type')   ?? 'all';
  const status = searchParams.get('status') ?? 'pending';
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const offset = parseInt(searchParams.get('cursor') ?? '0', 10);

  const [nodes, contradictions, totalNodes, totalContradictions] = await Promise.all([
    (type === 'all' || type === 'potential_node')
      ? prisma.potentialNodeSuggestion.findMany({
          where:   { status },
          orderBy: { aiConfidence: 'desc' },
          take:    type === 'all' ? Math.ceil(limit / 2) : limit,
          skip:    offset,
          include: {
            source: { select: { id: true, title: true, sourceType: true, author: true } },
          },
        })
      : Promise.resolve([]),

    (type === 'all' || type === 'contradiction')
      ? prisma.contradictionSuggestion.findMany({
          where:   { status },
          orderBy: [{ severity: 'desc' }, { aiConfidence: 'desc' }],
          take:    type === 'all' ? Math.floor(limit / 2) : limit,
          skip:    offset,
          include: {
            source: { select: { id: true, title: true, sourceType: true, author: true } },
          },
        })
      : Promise.resolve([]),

    prisma.potentialNodeSuggestion.count({ where: { status } }),
    prisma.contradictionSuggestion.count({ where: { status } }),
  ]);

  return NextResponse.json({
    potentialNodes:    nodes,
    contradictions,
    totals: { potentialNodes: totalNodes, contradictions: totalContradictions },
    status,
  });
}
