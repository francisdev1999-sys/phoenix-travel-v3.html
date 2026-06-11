export const dynamic = 'force-dynamic';
/**
 * POST /api/sources/[id]/analyze
 * Admin-only: trigger (or re-trigger) source intelligence pipeline for a source.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { runSourceIntelligencePipeline } from '@/lib/source-intelligence/pipeline';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

  // Don't re-trigger if already processing
  const existing = await prisma.sourceAnalysis.findUnique({ where: { sourceId: id } });
  if (existing?.status === 'processing') {
    return NextResponse.json({ message: 'Analysis already in progress', status: 'processing' });
  }

  void runSourceIntelligencePipeline(id);

  return NextResponse.json({ message: 'Analysis started', sourceId: id });
}
