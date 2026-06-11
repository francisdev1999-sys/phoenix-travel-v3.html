export const dynamic = 'force-dynamic';
/**
 * GET /api/admin/beta/feedback
 * List beta feedback with optional filters.
 * Query: ?status=open&category=bug&severity=high&limit=50&cursor=<id>
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const status   = searchParams.get('status') || undefined;
  const category = searchParams.get('category') || undefined;
  const severity = searchParams.get('severity') || undefined;
  const limit    = Math.min(Number(searchParams.get('limit') ?? 50), 100);
  const cursor   = searchParams.get('cursor') || undefined;

  const where: Record<string, unknown> = {};
  if (status)   where.status   = status;
  if (category) where.category = category;
  if (severity) where.severity = severity;

  const [items, total] = await Promise.all([
    prisma.betaFeedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take:    limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.betaFeedback.count({ where }),
  ]);

  return NextResponse.json({
    items,
    total,
    nextCursor: items.length === limit ? items[items.length - 1].id : null,
  });
}
