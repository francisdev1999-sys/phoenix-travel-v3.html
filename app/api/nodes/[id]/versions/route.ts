/**
 * GET /api/nodes/:id/versions
 *
 * Returns all version snapshots for a node, newest first. Admin-only.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const node = await prisma.node.findUnique({ where: { id }, select: { id: true } });
  if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 });

  const versions = await prisma.nodeVersion.findMany({
    where: { nodeId: id },
    orderBy: { version: 'desc' },
  });

  return NextResponse.json(versions);
}
