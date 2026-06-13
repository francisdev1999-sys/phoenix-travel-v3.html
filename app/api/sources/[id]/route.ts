export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeCredibility } from '@/lib/source-credibility';
import { emit } from '@/lib/orchestration/emit';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  const isAdmin = isAdminSession(session);

  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      submitter: { select: { id: true, name: true, email: true, image: true } },
      links: true,
    },
  });

  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const canView =
    isAdmin ||
    source.status === 'approved' ||
    source.submittedBy === session?.user?.id;

  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json(source);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = isAdminSession(session);
  const isOwner = source.submittedBy === session.user.id;

  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Owner can only edit pending/needs_revision; admin can edit anything
  if (isOwner && !isAdmin && !['pending', 'needs_revision'].includes(source.status)) {
    return NextResponse.json({ error: 'Cannot edit an approved or rejected source' }, { status: 409 });
  }

  const body = await req.json();
  const {
    title, sourceType, author, publicationYear, publisher, journal,
    volume, issue, pages, url, doi, isbn, abstract, notes, language,
  } = body;

  const year = publicationYear != null ? Number(publicationYear) : null;
  const { score, factors } = computeCredibility({
    sourceType: sourceType ?? source.sourceType,
    doi: doi ?? source.doi,
    isbn: isbn ?? source.isbn,
    url: url ?? source.url,
    author: author ?? source.author,
    publicationYear: year ?? source.publicationYear,
    journal: journal ?? source.journal,
    publisher: publisher ?? source.publisher,
  });

  const updated = await prisma.source.update({
    where: { id },
    data: {
      ...(title !== undefined      && { title: title.trim() }),
      ...(sourceType !== undefined && { sourceType }),
      ...(author !== undefined     && { author: author?.trim() || null }),
      ...(publicationYear !== undefined && { publicationYear: year }),
      ...(publisher !== undefined  && { publisher: publisher?.trim() || null }),
      ...(journal !== undefined    && { journal: journal?.trim() || null }),
      ...(volume !== undefined     && { volume: volume?.trim() || null }),
      ...(issue !== undefined      && { issue: issue?.trim() || null }),
      ...(pages !== undefined      && { pages: pages?.trim() || null }),
      ...(url !== undefined        && { url: url?.trim() || null }),
      ...(doi !== undefined        && { doi: doi?.trim() || null }),
      ...(isbn !== undefined       && { isbn: isbn?.trim() || null }),
      ...(abstract !== undefined   && { abstract: abstract?.trim() || null }),
      ...(notes !== undefined      && { notes: notes?.trim() || null }),
      ...(language !== undefined   && { language }),
      credibilityScore: score,
      credibilityFactors: factors,
      // Owner edits reset status to pending if it was needs_revision
      ...(isOwner && !isAdmin && source.status === 'needs_revision' && { status: 'pending' }),
    },
    include: {
      submitter: { select: { id: true, name: true, email: true, image: true } },
      links: true,
    },
  });

  // Emit orchestration event when source status changes to approved
  const newStatus = body.status;
  if (typeof newStatus === 'string' && newStatus !== source.status) {
    const evtType = newStatus === 'approved' ? 'source.approved' : 'source.archived';
    if (newStatus === 'approved' || newStatus === 'archived') {
      emit(evtType, {
        entityType: 'source',
        entityId:   id,
        actorEmail: session.user?.email ?? undefined,
      }).catch(() => {});
    }
  } else {
    // Content edit (no status change) — emit source.created as a lightweight signal
    emit('source.created', {
      entityType: 'source',
      entityId:   id,
      actorEmail: session.user?.email ?? undefined,
    }).catch(() => {});
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isAdmin = isAdminSession(session);
  const isOwner = source.submittedBy === session.user.id;

  if (!isAdmin && !isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.source.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
