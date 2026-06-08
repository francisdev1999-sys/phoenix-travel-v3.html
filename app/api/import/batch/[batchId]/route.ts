/**
 * GET /api/import/batch/:batchId
 * Returns the full batch report including per-record validation detail.
 * Admin-only.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ batchId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { batchId } = await params;
  const session = await auth();
  if (session?.user?.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: {
      nodes: {
        select: {
          id:           true,
          title:        true,
          status:       true,
          evidenceLevel: true,
          confidenceScore: true,
          createdAt:    true,
        },
      },
      edges: {
        select: {
          id:              true,
          fromId:          true,
          toId:            true,
          relationshipType: true,
          status:          true,
        },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  return NextResponse.json(batch);
}
