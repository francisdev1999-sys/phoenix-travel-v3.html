/**
 * GET  /api/admin/moderation/reports — list reports (mod/admin)
 * POST /api/admin/moderation/reports — submit a report (any auth user)
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isModSession, isAdminSession } from '@/lib/permissions';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session) && !isModSession(session)) {
    return NextResponse.json({ error: 'Moderator access required' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? 'open';
  const page   = Math.max(1, Number(searchParams.get('page') ?? 1));
  const limit  = 30;

  const reports = await prisma.report.findMany({
    where:   { status },
    orderBy: { createdAt: 'desc' },
    skip:    (page - 1) * limit,
    take:    limit,
    include: {
      submitter:    { select: { id: true, name: true, email: true } },
      reportedUser: { select: { id: true, name: true, email: true } },
    },
  });

  const total = await prisma.report.count({ where: { status } });

  return NextResponse.json({ reports, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { entityType, entityId, reason, detail, reportedUserId } = body ?? {};

  const VALID_ENTITY_TYPES = ['node', 'source', 'edge', 'user', 'proposed_node'];
  const VALID_REASONS      = ['spam', 'misinformation', 'fake_source', 'harassment', 'low_quality', 'other'];

  if (!VALID_ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 });
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ error: 'entityId is required' }, { status: 400 });
  }

  // Prevent duplicate open reports from same user for same entity
  const existing = await prisma.report.findFirst({
    where: { submittedBy: session.user.id, entityType, entityId, status: 'open' },
  });
  if (existing) {
    return NextResponse.json({ error: 'You already have an open report for this item.' }, { status: 409 });
  }

  const report = await prisma.report.create({
    data: {
      submittedBy:    session.user.id,
      reportedUserId: reportedUserId ?? null,
      entityType,
      entityId,
      reason,
      detail:         detail ?? null,
    },
  });

  return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
}
