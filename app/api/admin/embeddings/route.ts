export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/admin/embeddings — embedding coverage stats
export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const [totalPublished, hasEmbedding, pendingJobs, failedJobs] = await Promise.all([
    prisma.node.count({ where: { status: 'published' } }),
    prisma.nodeEmbedding.count(),
    prisma.ingestionJob.count({ where: { type: 'embed-node', status: 'pending' } }),
    prisma.ingestionJob.count({ where: { type: 'embed-node', status: 'failed' } }),
  ]);

  const missing = Math.max(0, totalPublished - hasEmbedding);
  const coveragePct =
    totalPublished > 0 ? Math.round((hasEmbedding / totalPublished) * 100) : 0;

  return NextResponse.json({
    totalPublished,
    hasEmbedding,
    missing,
    coveragePct,
    pendingJobs,
    failedJobs,
  });
}

// POST /api/admin/embeddings — { action: 'enqueue-missing' }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.action !== 'enqueue-missing') {
    return NextResponse.json({ error: "action must be 'enqueue-missing'" }, { status: 400 });
  }

  // Find published nodes without an embedding
  const nodesWithEmbedding = await prisma.nodeEmbedding.findMany({
    select: { nodeId: true },
  });
  const embeddedIds = new Set(nodesWithEmbedding.map((e) => e.nodeId));

  // Collect IDs of published nodes missing embeddings in batches
  const toEnqueue: { type: string; targetId: string; priority: number; status: string }[] = [];
  let skip = 0;
  const BATCH = 200;

  while (true) {
    const batch = await prisma.node.findMany({
      where: { status: 'published' },
      select: { id: true },
      skip,
      take: BATCH,
      orderBy: { id: 'asc' },
    });
    if (batch.length === 0) break;
    for (const node of batch) {
      if (!embeddedIds.has(node.id)) {
        toEnqueue.push({ type: 'embed-node', targetId: node.id, priority: 50, status: 'pending' });
      }
    }
    if (batch.length < BATCH) break;
    skip += BATCH;
  }

  if (toEnqueue.length === 0) {
    return NextResponse.json({ enqueued: 0 });
  }

  const result = await prisma.ingestionJob.createMany({
    data: toEnqueue,
    skipDuplicates: true,
  });

  return NextResponse.json({ enqueued: result.count });
}
