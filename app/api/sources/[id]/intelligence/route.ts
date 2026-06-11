export const dynamic = 'force-dynamic';
/**
 * GET /api/sources/[id]/intelligence
 * Returns full source intelligence analysis for a source.
 * Approved sources are publicly readable; pending/draft sources require admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = isAdminSession(session);

  const source = await prisma.source.findUnique({
    where: { id },
    select: { id: true, status: true, title: true },
  });
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (source.status !== 'approved' && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const analysis = await prisma.sourceAnalysis.findUnique({
    where: { sourceId: id },
    include: {
      entities:      { orderBy: { confidence: 'desc' } },
      claims:        { orderBy: { confidence: 'desc' } },
      timelineRefs:  { orderBy: { year: 'asc' } },
      locationRefs:  { orderBy: { confidence: 'desc' } },
      potentialNodes:{ where: { status: 'pending' }, orderBy: { aiConfidence: 'desc' } },
      contradictions:{ where: { status: 'pending' }, orderBy: { aiConfidence: 'desc' } },
    },
  });

  if (!analysis) {
    return NextResponse.json({ sourceId: id, analyzed: false, analysis: null });
  }

  return NextResponse.json({ sourceId: id, analyzed: true, analysis });
}
