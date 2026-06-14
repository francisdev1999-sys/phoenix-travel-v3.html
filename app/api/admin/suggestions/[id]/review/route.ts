/**
 * POST /api/admin/suggestions/:id/review
 *
 * Reviewer actions on a relationship suggestion:
 *   approved  → creates a draft Edge, marks suggestion approved
 *   rejected  → marks suggestion rejected
 *   revised   → changes relationship type then creates the Edge
 *
 * Requirement: AI never publishes. Every connection must go through this human gate.
 * The created Edge has status='draft' and must be separately published.
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';
import { SUGGESTION_TO_EDGE_TYPE } from '@/lib/suggestion-engine';

type Params = { params: Promise<{ id: string }> };

const VALID_ACTIONS = ['approved', 'rejected', 'revised'] as const;

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session || !isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { action, reviewNote, revisedType } = body as {
    action:      string;
    reviewNote?: string;
    revisedType?: string;
  };

  if (!VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    return NextResponse.json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
  }

  const suggestion = await prisma.relationshipSuggestion.findUnique({ where: { id } });
  if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  if (suggestion.status !== 'pending') {
    return NextResponse.json({ error: `Suggestion already ${suggestion.status}` }, { status: 409 });
  }

  const now          = new Date();
  const reviewedBy   = session.user.id;
  const reviewerEmail = session.user.email ?? null;

  if (action === 'rejected') {
    await prisma.relationshipSuggestion.update({
      where: { id },
      data:  { status: 'rejected', reviewedBy, reviewerEmail, reviewedAt: now, reviewNote: reviewNote ?? null },
    });
    await writeAuditLog({
      userId:     reviewedBy,
      userEmail:  reviewerEmail,
      action:     'reject',
      entityType: 'suggestion',
      entityId:   id,
      detail:     { fromNodeId: suggestion.fromNodeId, toNodeId: suggestion.toNodeId, reason: reviewNote },
    });
    return NextResponse.json({ ok: true, action: 'rejected' });
  }

  // approved or revised — create a draft Edge
  const finalType = action === 'revised' && revisedType ? revisedType : suggestion.relationshipType;
  const edgeType  = SUGGESTION_TO_EDGE_TYPE[finalType] ?? 'thematic';

  // Check edge doesn't already exist
  const existing = await prisma.edge.findFirst({
    where: { OR: [
      { fromId: suggestion.fromNodeId, toId: suggestion.toNodeId },
      { fromId: suggestion.toNodeId,   toId: suggestion.fromNodeId },
    ]},
  });
  if (existing) {
    await prisma.relationshipSuggestion.update({
      where: { id },
      data:  { status: 'rejected', reviewedBy, reviewerEmail, reviewedAt: now, reviewNote: 'Edge already exists' },
    });
    return NextResponse.json({ error: 'An edge already exists between these nodes', code: 'EDGE_EXISTS' }, { status: 409 });
  }

  // Create the edge (draft — not published)
  const edge = await prisma.edge.create({
    data: {
      fromId:           suggestion.fromNodeId,
      toId:             suggestion.toNodeId,
      relationshipType: edgeType,
      strengthScore:    suggestion.confidenceScore,
      confidenceScore:  suggestion.confidenceScore,
      explanation:      suggestion.reason,
      evidenceBasis:    suggestion.evidenceBasis,
      sourceType:       'academic',
      status:           'draft',
    },
  });

  await prisma.relationshipSuggestion.update({
    where: { id },
    data: {
      status:          action === 'revised' ? 'revised' : 'approved',
      reviewedBy,
      reviewerEmail,
      reviewedAt:      now,
      reviewNote:      reviewNote ?? null,
      promotedEdgeId:  edge.id,
    },
  });

  await writeAuditLog({
    userId:     reviewedBy,
    userEmail:  reviewerEmail,
    action:     action === 'revised' ? 'revise' : 'approve',
    entityType: 'suggestion',
    entityId:   id,
    detail:     {
      fromNodeId:    suggestion.fromNodeId,
      toNodeId:      suggestion.toNodeId,
      edgeId:        edge.id,
      originalType:  suggestion.relationshipType,
      finalType,
      revised:       action === 'revised',
    },
  });

  return NextResponse.json({ ok: true, action, edge: { id: edge.id, status: edge.status } });
}
