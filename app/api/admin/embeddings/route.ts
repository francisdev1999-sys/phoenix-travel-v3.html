export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
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
  const hasOpenAiKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    totalPublished,
    hasEmbedding,
    missing,
    coveragePct,
    pendingJobs,
    failedJobs,
    hasOpenAiKey,
  });
}

// POST /api/admin/embeddings
// action: 'enqueue-missing' — adds jobs to the queue (processed by cron)
// action: 'generate-all'   — generates embeddings directly in after() background task
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as { action?: string };

  if (body?.action === 'generate-all') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not set in environment variables' }, { status: 400 });
    }

    // Count how many need embeddings
    const [totalPublished, hasEmbedding] = await Promise.all([
      prisma.node.count({ where: { status: 'published' } }),
      prisma.nodeEmbedding.count(),
    ]);
    const missing = Math.max(0, totalPublished - hasEmbedding);

    if (missing === 0) {
      return NextResponse.json({ started: false, message: 'All nodes already have embeddings' });
    }

    after(async () => {
      await generateAllMissingEmbeddings(apiKey);
    });

    return NextResponse.json({ started: true, missing, message: `Generating embeddings for ${missing} nodes in the background. This takes 2–3 minutes.` });
  }

  if (body?.action === 'enqueue-missing') {
    const nodesWithEmbedding = await prisma.nodeEmbedding.findMany({ select: { nodeId: true } });
    const embeddedIds = new Set(nodesWithEmbedding.map((e) => e.nodeId));

    const toEnqueue: { type: string; targetId: string; priority: number; status: string }[] = [];
    let skip = 0;
    const BATCH = 200;
    while (true) {
      const batch = await prisma.node.findMany({
        where: { status: 'published' },
        select: { id: true },
        skip, take: BATCH, orderBy: { id: 'asc' },
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

    if (toEnqueue.length === 0) return NextResponse.json({ enqueued: 0 });
    const result = await prisma.ingestionJob.createMany({ data: toEnqueue, skipDuplicates: true });
    return NextResponse.json({ enqueued: result.count });
  }

  return NextResponse.json({ error: "action must be 'generate-all' or 'enqueue-missing'" }, { status: 400 });
}

async function generateAllMissingEmbeddings(apiKey: string) {
  const existing = await prisma.nodeEmbedding.findMany({ select: { nodeId: true } });
  const embeddedIds = new Set(existing.map(e => e.nodeId));

  const nodes = await prisma.node.findMany({
    where: { status: 'published' },
    select: {
      id: true, title: true, description: true, mainstreamView: true,
      tags: true,
      claims: { orderBy: { orderIndex: 'asc' } },
      criticisms: { orderBy: { orderIndex: 'asc' } },
    },
  });

  let generated = 0;
  let failed = 0;

  for (const node of nodes) {
    if (embeddedIds.has(node.id)) continue;

    const text = [
      node.title,
      node.description,
      node.mainstreamView,
      node.tags.map((t: { tag: string }) => t.tag).join(' '),
      node.claims.map((c: { text: string }) => c.text).join(' '),
      node.criticisms.map((c: { text: string }) => c.text).join(' '),
    ].filter(Boolean).join(' ').slice(0, 8000);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);

      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
      });
      clearTimeout(timeout);

      if (!res.ok) {
        console.error(`[embed] node ${node.id} API error ${res.status}`);
        failed++;
        continue;
      }

      const json = await res.json() as { data: { embedding: number[] }[] };
      const vec = json.data[0].embedding;
      const vecStr = `[${vec.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO "NodeEmbedding" ("nodeId", "embedding", "model", "updatedAt")
        VALUES (${node.id}, ${vecStr}::vector, 'text-embedding-3-small', NOW())
        ON CONFLICT ("nodeId") DO UPDATE
        SET "embedding" = EXCLUDED."embedding",
            "model"     = EXCLUDED."model",
            "updatedAt" = NOW()
      `;
      generated++;
    } catch (err) {
      console.error(`[embed] node ${node.id} error:`, err);
      failed++;
    }
  }

  console.log(`[embed] Done — generated: ${generated}, failed: ${failed}`);
}
