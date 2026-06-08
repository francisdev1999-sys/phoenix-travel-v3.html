import { NextRequest, NextResponse } from 'next/server';
import { dequeue, completeJob, failJob, getQueueStats } from '@/lib/jobs/queue';
import { prisma } from '@/lib/db';
import { invalidateNode } from '@/lib/cache/node-cache';

/**
 * POST /api/jobs/process
 *
 * Dequeues and processes the next pending ingestion job.
 * Call this from:
 *   - A Railway cron job (every 1 minute)
 *   - A Next.js route handler triggered on demand
 *   - The admin panel "Process Queue" button
 *
 * Protected by CRON_SECRET to prevent unauthorized triggering.
 *
 * Supported job types:
 *   embed-node        — generate vector embedding for a node
 *   embed-source      — generate vector embedding for a source
 *   rebuild-adjacency — recompute and cache adjacency for a node
 *
 * GET /api/jobs/process — returns queue stats (admin only in production)
 */

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const auth = req.headers.get('authorization');
  return !!CRON_SECRET && auth === `Bearer ${CRON_SECRET}`;
}

export async function GET(_req: NextRequest) {
  const stats = await getQueueStats().catch(() => ({}));
  return NextResponse.json({ queue: stats });
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const job = await dequeue();
  if (!job) {
    return NextResponse.json({ processed: false, reason: 'queue empty' });
  }

  try {
    await processJob(job.type, job.payload as Record<string, string>);
    await completeJob(job.id);
    return NextResponse.json({ processed: true, jobId: job.id, type: job.type });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await failJob(job.id, message);
    return NextResponse.json({ processed: false, jobId: job.id, error: message }, { status: 500 });
  }
}

// ── Job handlers ──────────────────────────────────────────────────────────────

async function processJob(type: string, payload: Record<string, string>) {
  switch (type) {
    case 'embed-node':        return embedNode(payload.nodeId);
    case 'embed-source':      return embedSource(payload.sourceId);
    case 'rebuild-adjacency': return rebuildAdjacency(payload.nodeId);
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

async function embedNode(nodeId: string) {
  const node = await prisma.node.findUnique({
    where:   { id: nodeId },
    include: {
      tags:       true,
      claims:     { orderBy: { orderIndex: 'asc' } },
      criticisms: { orderBy: { orderIndex: 'asc' } },
    },
  });

  if (!node) throw new Error(`Node not found: ${nodeId}`);

  const text = [
    node.title,
    node.description,
    node.mainstreamView,
    node.tags.map(t => t.tag).join(' '),
    node.claims.map(c => c.text).join(' '),
  ].filter(Boolean).join(' ').slice(0, 8000);

  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    INSERT INTO "NodeEmbedding" ("nodeId", "embedding", "model", "updatedAt")
    VALUES (${nodeId}, ${embedding}::vector, 'text-embedding-3-small', NOW())
    ON CONFLICT ("nodeId") DO UPDATE
    SET "embedding" = EXCLUDED."embedding",
        "model"     = EXCLUDED."model",
        "updatedAt" = NOW()
  `;

  invalidateNode(nodeId);
}

async function embedSource(sourceId: string) {
  const source = await prisma.source.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error(`Source not found: ${sourceId}`);

  const text = [source.title, source.author, source.abstract, source.notes]
    .filter(Boolean).join(' ').slice(0, 8000);

  const embedding = await generateEmbedding(text);

  await prisma.$executeRaw`
    INSERT INTO "SourceEmbedding" ("sourceId", "embedding", "model", "updatedAt")
    VALUES (${sourceId}, ${embedding}::vector, 'text-embedding-3-small', NOW())
    ON CONFLICT ("sourceId") DO UPDATE
    SET "embedding" = EXCLUDED."embedding",
        "model"     = EXCLUDED."model",
        "updatedAt" = NOW()
  `;
}

async function rebuildAdjacency(nodeId: string) {
  // Re-fetch direct connections and rewrite the adjacency cache
  const edges = await prisma.edge.findMany({
    where: {
      OR: [{ fromId: nodeId }, { toId: nodeId }],
      status: 'published',
    },
    select: { id: true, fromId: true, toId: true, confidenceScore: true, strengthScore: true },
  });

  const hop1 = edges.map(e => ({
    nodeId:    e.fromId === nodeId ? e.toId : e.fromId,
    edgeId:    e.id,
    score:     e.confidenceScore,
    direction: e.fromId === nodeId ? 'outgoing' : 'incoming',
  }));

  await prisma.adjacencyCache.upsert({
    where:  { nodeId },
    create: { nodeId, hop1, hop2: [], cachedAt: new Date() },
    update: { hop1, cachedAt: new Date() },
  });

  invalidateNode(nodeId);
}

// ── Embedding generation ──────────────────────────────────────────────────────

async function generateEmbedding(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Return a zero vector placeholder when no API key is configured.
    // This lets the job complete without crashing so other job types still work.
    const zeros = new Array(1536).fill(0).join(',');
    return `[${zeros}]`;
  }

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings API error ${res.status}: ${body}`);
  }

  const json = await res.json() as { data: { embedding: number[] }[] };
  const vec   = json.data[0].embedding;
  return `[${vec.join(',')}]`;
}
