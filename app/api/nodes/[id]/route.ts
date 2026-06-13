export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getNodeFromDB, getNeighboursFromDB, computeResearchScoreFromDB } from '@/lib/retrieval/graph';
import { prisma } from '@/lib/db';
import { auth, isAdminSession } from '@/lib/auth';
import { EVIDENCE_LEVELS, isValidScore } from '@/lib/validation/enums';
import { writeAuditLog } from '@/lib/audit';
import { emit } from '@/lib/orchestration/emit';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/nodes/[id]
 *
 * Returns a fully hydrated node from the database:
 * - Core fields (title, description, evidence, confidence, geo, temporal)
 * - Category name and color
 * - Claims, criticisms, open questions (ordered)
 * - Tags
 * - Approved sources (ordered by credibility score desc)
 * - Direct neighbours + edges (for the Connections tab)
 * - Research score
 *
 * Falls back gracefully when DB is unavailable (returns static data if possible).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const [node, neighbours, researchScore] = await Promise.all([
      getNodeFromDB(id),
      getNeighboursFromDB(id),
      computeResearchScoreFromDB(id),
    ]);

    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Fetch approved sources linked to this node
    const sourceLinks = await prisma.sourceLink.findMany({
      where: {
        nodeId: id,
        source: { status: 'approved' },
      },
      include: {
        source: {
          include: {
            submitter: { select: { id: true, name: true, image: true } },
          },
        },
      },
      orderBy: { source: { credibilityScore: 'desc' } },
    });

    const sources = sourceLinks.map(sl => sl.source);

    return NextResponse.json({
      node: {
        ...node,
        tags:          node.tags.map((t: { tag: string }) => t.tag),
        claims:        node.claims.map((c: { text: string }) => c.text),
        criticisms:    node.criticisms.map((c: { text: string }) => c.text),
        openQuestions: node.openQuestions.map((q: { text: string }) => q.text),
      },
      sources,
      neighbours: neighbours.map(({ edge, neighbour }) => ({
        edge,
        neighbour: {
          ...neighbour,
          tags:       neighbour.tags.map((t: { tag: string }) => t.tag),
          claims:     neighbour.claims.map((c: { text: string }) => c.text),
          criticisms: neighbour.criticisms.map((c: { text: string }) => c.text),
        },
      })),
      researchScore,
    });
  } catch (err) {
    console.error(`[nodes/${id}] error:`, err);
    return NextResponse.json({ error: 'Failed to fetch node' }, { status: 500 });
  }
}

/**
 * PATCH /api/nodes/:id
 *
 * Inline-edit a node (admin only). Accepts any subset of editable fields.
 * Creates a NodeVersion snapshot and writes an AuditLog entry.
 *
 * Editable fields: title, description, mainstreamView, evidenceLevel,
 *   confidenceScore, tags, claims, criticisms, openQuestions,
 *   adminReviewStatus, adminReviewNote, region, country,
 *   year, dateStart, dateEnd, datePrecision.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const node = await prisma.node.findUnique({
    where: { id },
    include: {
      tags:          true,
      claims:        { orderBy: { orderIndex: 'asc' } },
      criticisms:    { orderBy: { orderIndex: 'asc' } },
      openQuestions: { orderBy: { orderIndex: 'asc' } },
      category:      true,
    },
  });

  if (!node) {
    return NextResponse.json({ error: `Node '${id}' not found` }, { status: 404 });
  }

  if (node.status === 'archived') {
    return NextResponse.json({ error: 'Cannot edit an archived node' }, { status: 409 });
  }

  const b = body as Record<string, unknown>;

  // Validate editable scalar fields
  if (b.evidenceLevel !== undefined && !EVIDENCE_LEVELS.includes(b.evidenceLevel as never)) {
    return NextResponse.json({ error: `Invalid evidenceLevel: ${b.evidenceLevel}` }, { status: 400 });
  }
  if (b.confidenceScore !== undefined && !isValidScore(b.confidenceScore)) {
    return NextResponse.json({ error: 'confidenceScore must be a number in [0, 1]' }, { status: 400 });
  }
  if (b.title !== undefined && (typeof b.title !== 'string' || !b.title.trim())) {
    return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 });
  }

  // Build scalar update payload — only include fields present in body
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = { version: { increment: 1 } };
  const scalarFields = [
    'title', 'description', 'mainstreamView', 'evidenceLevel', 'confidenceScore',
    'region', 'country', 'year', 'dateStart', 'dateEnd', 'datePrecision',
    'adminReviewStatus', 'adminReviewNote',
  ] as const;
  for (const f of scalarFields) {
    if (f in b) data[f] = b[f];
  }

  const userId    = session!.user!.id    ?? null;
  const userEmail = session!.user!.email ?? null;
  const changeNote = (typeof b.changeNote === 'string' && b.changeNote.trim())
    ? b.changeNote.trim()
    : 'Admin edit';

  await prisma.$transaction(async (tx) => {
    // Apply scalar changes
    await tx.node.update({ where: { id }, data });

    // Replace list fields if provided
    if (Array.isArray(b.tags)) {
      await tx.nodeTag.deleteMany({ where: { nodeId: id } });
      if (b.tags.length > 0) {
        await tx.nodeTag.createMany({
          data: (b.tags as string[]).map(tag => ({ nodeId: id, tag })),
          skipDuplicates: true,
        });
      }
    }
    if (Array.isArray(b.claims)) {
      await tx.claim.deleteMany({ where: { nodeId: id } });
      if (b.claims.length > 0) {
        await tx.claim.createMany({
          data: (b.claims as string[]).map((text, i) => ({ nodeId: id, text, orderIndex: i })),
        });
      }
    }
    if (Array.isArray(b.criticisms)) {
      await tx.criticism.deleteMany({ where: { nodeId: id } });
      if (b.criticisms.length > 0) {
        await tx.criticism.createMany({
          data: (b.criticisms as string[]).map((text, i) => ({ nodeId: id, text, orderIndex: i })),
        });
      }
    }
    if (Array.isArray(b.openQuestions)) {
      await tx.openQuestion.deleteMany({ where: { nodeId: id } });
      if (b.openQuestions.length > 0) {
        await tx.openQuestion.createMany({
          data: (b.openQuestions as string[]).map((text, i) => ({ nodeId: id, text, orderIndex: i })),
        });
      }
    }

    // Snapshot
    await tx.nodeVersion.create({
      data: {
        nodeId:     id,
        version:    node.version + 1,
        snapshot:   {
          id:             node.id,
          title:          String(b.title ?? node.title),
          evidenceLevel:  String(b.evidenceLevel ?? node.evidenceLevel),
          confidenceScore: Number(b.confidenceScore ?? node.confidenceScore),
          status:         node.status,
          editedAt:       new Date().toISOString(),
        },
        changedBy:  userId,
        changeNote,
      },
    });
  });

  await writeAuditLog({
    userId, userEmail, action: 'edit', entityType: 'node', entityId: id,
    detail: { fields: Object.keys(b).filter(k => k !== 'changeNote'), changeNote },
  });

  // Determine which orchestration event to emit based on new status
  const newStatus = typeof b.status === 'string' ? b.status : node.status;
  let eventType: 'node.updated' | 'node.published' | 'node.archived' = 'node.updated';
  if (newStatus === 'published' && node.status !== 'published') eventType = 'node.published';
  else if (newStatus === 'archived' && node.status !== 'archived') eventType = 'node.archived';
  emit(eventType, { entityType: 'node', entityId: id, actorEmail: userEmail ?? undefined }).catch(() => {});

  const updated = await prisma.node.findUnique({
    where: { id },
    include: {
      category:      { select: { name: true, color: true } },
      tags:          { select: { tag: true } },
      claims:        { orderBy: { orderIndex: 'asc' } },
      criticisms:    { orderBy: { orderIndex: 'asc' } },
      openQuestions: { orderBy: { orderIndex: 'asc' } },
    },
  });

  return NextResponse.json({ node: updated });
}
