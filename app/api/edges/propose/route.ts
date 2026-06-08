export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const session = await auth();
  const isAdmin = session?.user?.email === process.env.ADMIN_EMAIL;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (!isAdmin) {
    where.OR = [
      { status: 'approved' },
      ...(session?.user?.id ? [{ submittedBy: session.user.id }] : []),
    ];
  }

  const edges = await prisma.proposedEdge.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { submitter: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json(edges);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { fromNodeId, toNodeId, relationship, description, evidenceLevel,
          confidence, strengthScore, explanation, historicalBasis } = body;

  if (!fromNodeId?.trim())   return NextResponse.json({ error: 'fromNodeId required' }, { status: 400 });
  if (!toNodeId?.trim())     return NextResponse.json({ error: 'toNodeId required' }, { status: 400 });
  if (!relationship?.trim()) return NextResponse.json({ error: 'relationship required' }, { status: 400 });
  if (!description?.trim())  return NextResponse.json({ error: 'description required' }, { status: 400 });

  const edge = await prisma.proposedEdge.create({
    data: {
      fromNodeId: fromNodeId.trim(),
      toNodeId: toNodeId.trim(),
      relationship,
      description: description.trim(),
      evidenceLevel: evidenceLevel ?? 'speculative',
      confidence: confidence ?? 0.5,
      strengthScore: strengthScore ?? 0.5,
      explanation: explanation?.trim() || null,
      historicalBasis: historicalBasis?.trim() || null,
      status: 'pending',
      submittedBy: session.user.id,
    },
    include: { submitter: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(edge, { status: 201 });
}
