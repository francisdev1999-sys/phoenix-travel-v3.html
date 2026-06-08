export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EVIDENCE_LEVELS, RELATIONSHIP_TYPES, isValidScore } from '@/lib/validation/enums';
import { checkTrustGate, checkSubmissionRate } from '@/lib/quality-gates';
import { logActivity } from '@/lib/rank-system';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const session = await auth();
  const isAdmin = isAdminSession(session);

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

  // ── Quality gates ─────────────────────────────────────────────────────────
  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { trustScore: true, isBanned: true, role: true },
  });

  const trustCheck = checkTrustGate(dbUser?.trustScore ?? 50, dbUser?.isBanned ?? false);
  if (!trustCheck.allowed) {
    return NextResponse.json({ error: trustCheck.reason }, { status: 403 });
  }

  const rateCheck = await checkSubmissionRate(session.user.id, dbUser?.role ?? 'user');
  if (!rateCheck.allowed) {
    return NextResponse.json({
      error: `Daily submission limit reached (${rateCheck.count}/${rateCheck.limit}). Resets at midnight.`,
    }, { status: 429 });
  }

  const body = await req.json();
  const { fromNodeId, toNodeId, relationship, description, evidenceLevel,
          confidence, strengthScore, explanation, historicalBasis } = body;

  if (!fromNodeId?.trim())   return NextResponse.json({ error: 'fromNodeId required' }, { status: 400 });
  if (!toNodeId?.trim())     return NextResponse.json({ error: 'toNodeId required' }, { status: 400 });
  if (!relationship?.trim()) return NextResponse.json({ error: 'relationship required' }, { status: 400 });
  if (!description?.trim())  return NextResponse.json({ error: 'description required' }, { status: 400 });

  if (fromNodeId.trim() === toNodeId.trim()) {
    return NextResponse.json({ error: 'Self-links are not allowed (fromNodeId === toNodeId)' }, { status: 400 });
  }

  if (!(RELATIONSHIP_TYPES as readonly string[]).includes(relationship.trim())) {
    return NextResponse.json(
      { error: `Invalid relationship. Must be one of: ${RELATIONSHIP_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  const resolvedEvidence = evidenceLevel ?? 'speculative';
  if (!(EVIDENCE_LEVELS as readonly string[]).includes(resolvedEvidence)) {
    return NextResponse.json(
      { error: `Invalid evidenceLevel. Must be one of: ${EVIDENCE_LEVELS.join(', ')}` },
      { status: 400 },
    );
  }

  const resolvedConfidence = confidence ?? 0.5;
  if (!isValidScore(resolvedConfidence)) {
    return NextResponse.json(
      { error: 'confidence must be a number between 0 and 1' },
      { status: 400 },
    );
  }

  const resolvedStrength = strengthScore ?? 0.5;
  if (!isValidScore(resolvedStrength)) {
    return NextResponse.json(
      { error: 'strengthScore must be a number between 0 and 1' },
      { status: 400 },
    );
  }

  const edge = await prisma.proposedEdge.create({
    data: {
      fromNodeId: fromNodeId.trim(),
      toNodeId: toNodeId.trim(),
      relationship: relationship.trim(),
      description: description.trim(),
      evidenceLevel: resolvedEvidence,
      confidence: resolvedConfidence,
      strengthScore: resolvedStrength,
      explanation: explanation?.trim() || null,
      historicalBasis: historicalBasis?.trim() || null,
      status: 'pending',
      submittedBy: session.user.id,
    },
    include: { submitter: { select: { id: true, name: true, image: true } } },
  });

  void Promise.allSettled([
    prisma.user.update({ where: { id: session.user.id }, data: { submissionCount: { increment: 1 } } }),
    logActivity(session.user.id, 'submit', { type: 'edge', proposalId: edge.id }),
  ]);

  return NextResponse.json(edge, { status: 201 });
}
