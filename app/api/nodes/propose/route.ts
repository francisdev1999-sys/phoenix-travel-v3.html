export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EVIDENCE_LEVELS, NODE_CATEGORIES, isValidScore } from '@/lib/validation/enums';

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

  const body = await req.json();
  const { label, category, description, evidenceLevel, confidence,
          claims, criticisms, openQuestions, mainstreamView,
          region, country, dateStart, dateEnd, tags, nodeId } = body;

  if (!label?.trim())       return NextResponse.json({ error: 'Label required' }, { status: 400 });
  if (!category?.trim())    return NextResponse.json({ error: 'Category required' }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 });

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

  return NextResponse.json(node, { status: 201 });
}
