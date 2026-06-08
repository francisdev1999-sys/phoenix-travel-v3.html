/**
 * GET /api/nodes/:id/source-quality
 *
 * Returns the source-credibility quality assessment for a node.
 * Public endpoint — used by both admin views and public node pages.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { computeNodeSourceQuality } from '@/lib/source-quality';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const node = await prisma.node.findUnique({ where: { id }, select: { id: true } });
  if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

  const quality = await computeNodeSourceQuality(id);
  return NextResponse.json(quality);
}
