export const dynamic = 'force-dynamic';
/**
 * GET /api/admin/nodes/search?q=...&status=all&limit=20
 *
 * Admin node search — returns nodes across all statuses (published, draft,
 * archived) with full metadata for display in the Node Manager.
 * Auth: admin or owner (enforced by middleware on /api/admin/*).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const q      = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const status = req.nextUrl.searchParams.get('status') ?? 'all';
  const limit  = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '30'), 100);

  const statusFilter = status === 'all'
    ? undefined
    : { status: status as 'published' | 'draft' | 'archived' };

  const where = q.length >= 2
    ? {
        ...statusFilter,
        OR: [
          { title:       { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : statusFilter ?? {};

  const nodes = await prisma.node.findMany({
    where,
    select: {
      id:             true,
      title:          true,
      status:         true,
      evidenceLevel:  true,
      confidenceScore: true,
      createdAt:      true,
      category:       { select: { name: true, color: true } },
      _count:         { select: { edgesFrom: true, sourceLinks: true } },
    },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  });

  return NextResponse.json({ nodes, count: nodes.length });
}
