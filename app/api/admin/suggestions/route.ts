/**
 * GET /api/admin/suggestions
 *
 * Lists relationship suggestions.
 * Query params:
 *   status      pending | approved | rejected (default: pending)
 *   riskLevel   low | medium | high
 *   type        contradiction | thematic | etc.
 *   page        1-based (default 1)
 *   limit       max 50 (default 20)
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session) || !session) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const sp        = req.nextUrl.searchParams;
  const status    = sp.get('status')    ?? 'pending';
  const riskLevel = sp.get('riskLevel') ?? undefined;
  const type      = sp.get('type')      ?? undefined;
  const page      = Math.max(1, Number(sp.get('page') ?? 1));
  const limit     = Math.min(50, Math.max(1, Number(sp.get('limit') ?? PAGE_SIZE)));

  const where: Record<string, unknown> = {};
  if (status !== 'all') where.status = status;
  if (riskLevel)        where.riskLevel = riskLevel;
  if (type)             where.relationshipType = type;

  const [total, suggestions] = await Promise.all([
    prisma.relationshipSuggestion.count({ where }),
    prisma.relationshipSuggestion.findMany({
      where,
      orderBy: [{ confidenceScore: 'desc' }, { createdAt: 'desc' }],
      skip:  (page - 1) * limit,
      take:  limit,
      include: {
        fromNode: { select: { id: true, title: true, categoryId: true, evidenceLevel: true, confidenceScore: true, status: true } },
        toNode:   { select: { id: true, title: true, categoryId: true, evidenceLevel: true, confidenceScore: true, status: true } },
      },
    }),
  ]);

  return NextResponse.json({
    suggestions,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
