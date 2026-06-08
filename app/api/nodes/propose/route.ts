export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EVIDENCE_LEVELS, NODE_CATEGORIES, isValidScore } from '@/lib/validation/enums';
import { checkTrustGate, checkSubmissionRate, validateNodeSubmission, checkDuplicate } from '@/lib/quality-gates';
import { logActivity } from '@/lib/rank-system';
import { rateLimit } from '@/lib/rate-limiter';

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

  const nodes = await prisma.proposedNode.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { submitter: { select: { id: true, name: true, image: true } } },
  });
  return NextResponse.json(nodes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 20 proposal attempts per minute per user (DB submission limits still apply below)
  const rl = rateLimit(`propose-node:${session.user.id}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

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
  const { label, category, description, evidenceLevel, confidence,
          claims, criticisms, openQuestions, mainstreamView,
          region, country, dateStart, dateEnd, tags, nodeId } = body;

  if (!label?.trim())       return NextResponse.json({ error: 'Label required' }, { status: 400 });
  if (!category?.trim())    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 });

  // Content quality validation
  const validation = validateNodeSubmission({
    title:         label?.trim() ?? '',
    description:   description?.trim() ?? '',
    evidenceLevel: evidenceLevel ?? 'speculative',
    tags:          Array.isArray(tags)    ? tags    : [],
    claims:        Array.isArray(claims)  ? claims  : [],
  });
  if (!validation.passed) {
    return NextResponse.json({ errors: validation.errors, warnings: validation.warnings, risk: validation.risk }, { status: 400 });
  }

  // Duplicate detection
  const dupCheck = await checkDuplicate(label?.trim() ?? '');
  if (dupCheck.isDuplicate) {
    return NextResponse.json({
      error: 'A similar node may already exist in the archive.',
      similarTitles: dupCheck.similarTitles,
      warnings: validation.warnings,
      risk: validation.risk,
    }, { status: 409 });
  }

  const resolvedEvidence = evidenceLevel ?? 'speculative';
  if (!(EVIDENCE_LEVELS as readonly string[]).includes(resolvedEvidence)) {
    return NextResponse.json(
      { error: `Invalid evidenceLevel. Must be one of: ${EVIDENCE_LEVELS.join(', ')}` },
      { status: 400 },
    );
  }

  if (!(NODE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${NODE_CATEGORIES.join(', ')}` },
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

  const node = await prisma.proposedNode.create({
    data: {
      nodeId: nodeId?.trim() || null,
      label: label.trim(),
      category,
      description: description.trim(),
      evidenceLevel: resolvedEvidence,
      confidence: resolvedConfidence,
      claims: claims ?? [],
      criticisms: criticisms ?? [],
      openQuestions: openQuestions ?? [],
      mainstreamView: mainstreamView?.trim() || null,
      region: region?.trim() || null,
      country: country?.trim() || null,
      dateStart: dateStart ? Number(dateStart) : null,
      dateEnd: dateEnd ? Number(dateEnd) : null,
      tags: tags ?? [],
      status: 'pending',
      submittedBy: session.user.id,
    },
    include: { submitter: { select: { id: true, name: true, image: true } } },
  });

  // Update submission counter and activity score (fire-and-forget)
  void Promise.allSettled([
    prisma.user.update({ where: { id: session.user.id }, data: { submissionCount: { increment: 1 } } }),
    logActivity(session.user.id, 'submit', { type: 'node', proposalId: node.id }),
  ]);

  return NextResponse.json({ ...node, warnings: validation.warnings, risk: validation.risk }, { status: 201 });
}
