export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeCredibility } from '@/lib/source-credibility';
import { SOURCE_TYPES } from '@/lib/validation/enums';
import { checkTrustGate, checkSubmissionRate } from '@/lib/quality-gates';
import { logActivity } from '@/lib/rank-system';
import { getNodeStaticSources, filterNodeSources } from '@/lib/graph/node-sources';

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page    = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const status  = searchParams.get('status')  ?? undefined;
  const type    = searchParams.get('type')    ?? undefined;
  const q       = searchParams.get('q')       ?? undefined;
  const mine    = searchParams.get('mine') === 'true';

  const session = await auth();

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (type)   where.sourceType = type;
  if (q)      where.title = { contains: q, mode: 'insensitive' };
  if (mine && session?.user?.id) where.submittedBy = session.user.id;

  // Non-admins can only see approved sources (plus their own)
  const isAdmin = isAdminSession(session);
  if (!isAdmin) {
    where.OR = [
      { status: 'approved' },
      ...(session?.user?.id ? [{ submittedBy: session.user.id }] : []),
    ];
  }

  // Static node-derived sources (only in non-mine Browse view)
  const staticSources = mine
    ? []
    : filterNodeSources(getNodeStaticSources(), { q, type, status });
  const staticTotal = staticSources.length;

  // Paginate: static entries fill the front of the combined list
  const globalStart  = (page - 1) * PAGE_SIZE;
  const globalEnd    = globalStart + PAGE_SIZE;
  const staticSlice  = staticSources.slice(globalStart, Math.min(globalEnd, staticTotal));
  const dbSkip       = Math.max(0, globalStart - staticTotal);
  const dbTake       = PAGE_SIZE - staticSlice.length;

  const [dbTotal, dbSources] = await Promise.all([
    prisma.source.count({ where }),
    dbTake > 0
      ? prisma.source.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: dbSkip,
          take: dbTake,
          include: {
            submitter: { select: { id: true, name: true, email: true, image: true } },
            links: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const total   = staticTotal + dbTotal;
  const pages   = Math.ceil(total / PAGE_SIZE) || 1;
  const sources = [...staticSlice, ...dbSources];

  return NextResponse.json({ sources, total, page, pages });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Sign in to submit sources' }, { status: 401 });
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
  const {
    title, sourceType, author, publicationYear, publisher, journal,
    volume, issue, pages, url, doi, isbn, abstract, notes, language,
    sourceTrustExplanation,
  } = body;

  if (!title?.trim())      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  if (!sourceType?.trim()) return NextResponse.json({ error: 'Source type is required' }, { status: 400 });

  if (!(SOURCE_TYPES as readonly string[]).includes(sourceType)) {
    return NextResponse.json(
      { error: `Invalid sourceType. Must be one of: ${SOURCE_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  const year = publicationYear ? Number(publicationYear) : null;

  const { score, factors } = computeCredibility({
    sourceType, doi: doi || null, isbn: isbn || null,
    url: url || null, author: author || null,
    publicationYear: year, journal: journal || null,
    publisher: publisher || null,
  });

  const source = await prisma.source.create({
    data: {
      title: title.trim(),
      sourceType,
      author:          author?.trim()    || null,
      publicationYear: year,
      publisher:       publisher?.trim() || null,
      journal:         journal?.trim()   || null,
      volume:          volume?.trim()    || null,
      issue:           issue?.trim()     || null,
      pages:           pages?.trim()     || null,
      url:             url?.trim()       || null,
      doi:             doi?.trim()       || null,
      isbn:            isbn?.trim()      || null,
      abstract:        abstract?.trim()  || null,
      notes:           notes?.trim()     || null,
      language:        language          || 'en',
      sourceTrustExplanation: sourceTrustExplanation?.trim() || null,
      credibilityScore: score,
      credibilityFactors: factors,
      status: 'pending',
      submittedBy: session.user.id,
    },
    include: {
      submitter: { select: { id: true, name: true, email: true, image: true } },
      links: true,
    },
  });

  void Promise.allSettled([
    prisma.user.update({ where: { id: session.user.id }, data: { submissionCount: { increment: 1 } } }),
    logActivity(session.user.id, 'submit', { type: 'source', sourceId: source.id }),
  ]);

  return NextResponse.json(source, { status: 201 });
}
