export const dynamic = 'force-dynamic';
/**
 * Believer–Skeptic slider backend.
 *
 * GET  /api/nodes/[id]/stance?anonId=…  → community distribution + your stance
 * POST /api/nodes/[id]/stance { value: 0..100, anonId }
 *
 * Anonymous by design: anonId is a client-generated localStorage id, one
 * stance per visitor per topic (upsert). No account, no PII, no free text —
 * a spectrum can't be spammed with content, only re-dragged.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { bucketize } from '@/lib/stance';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const anonId = req.nextUrl.searchParams.get('anonId') ?? '';

  const rows = await prisma.topicStance.findMany({
    where:  { nodeId: id },
    select: { value: true, anonId: true },
    take:   5000,
  });

  const dist = bucketize(rows.map(r => r.value));
  const mine = anonId ? rows.find(r => r.anonId === anonId)?.value ?? null : null;

  return NextResponse.json({ ...dist, myStance: mine });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null) as { value?: unknown; anonId?: unknown } | null;

  const value  = Number(body?.value);
  const anonId = String(body?.anonId ?? '').slice(0, 64);
  if (!Number.isFinite(value) || value < 0 || value > 100 || anonId.length < 8) {
    return NextResponse.json({ error: 'value 0-100 and anonId required' }, { status: 400 });
  }

  // Only published topics accept stances.
  const node = await prisma.node.findUnique({ where: { id }, select: { status: true } });
  if (!node || node.status !== 'published') {
    return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
  }

  await prisma.topicStance.upsert({
    where:  { nodeId_anonId: { nodeId: id, anonId } },
    create: { nodeId: id, anonId, value: Math.round(value) },
    update: { value: Math.round(value) },
  });

  const rows = await prisma.topicStance.findMany({ where: { nodeId: id }, select: { value: true }, take: 5000 });
  return NextResponse.json({ ...bucketize(rows.map(r => r.value)), myStance: Math.round(value) });
}
