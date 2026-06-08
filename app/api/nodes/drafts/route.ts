/**
 * GET /api/nodes/drafts
 *
 * Admin-only draft node queue with filtering and per-node IQS.
 *
 * Query params:
 *   status          string  (default: 'draft')
 *   category        string
 *   evidenceLevel   string
 *   iqsTier         ready_to_review | review_required | needs_enrichment | soft_rejected
 *   batchId         string
 *   page            number  (default: 1)
 *   limit           number  (default: 50, max: 100)
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { computeIQS } from '@/lib/validation/iqs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const sp             = req.nextUrl.searchParams;
  const status         = sp.get('status')       ?? 'draft';
  const category       = sp.get('category')     ?? undefined;
  const evidenceLevel  = sp.get('evidenceLevel') ?? undefined;
  const iqsTier        = sp.get('iqsTier')       ?? undefined;
  const importBatchId  = sp.get('batchId')       ?? undefined;
  const page           = Math.max(1, parseInt(sp.get('page')  ?? '1',  10));
  const limit          = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)));
  const skip           = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { status };
  if (evidenceLevel) where.evidenceLevel = evidenceLevel;
  if (importBatchId) where.importBatchId = importBatchId;
  if (category)      where.category      = { name: category };

  const [nodes, total] = await Promise.all([
    prisma.node.findMany({
      where,
      include: {
        category:      { select: { name: true, color: true } },
        tags:          { select: { tag: true } },
        claims:        { orderBy: { orderIndex: 'asc' } },
        criticisms:    { orderBy: { orderIndex: 'asc' } },
        openQuestions: { orderBy: { orderIndex: 'asc' } },
        sourceLinks:   { select: { sourceId: true } },
        _count:        { select: { edgesFrom: true, edgesTo: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.node.count({ where }),
  ]);

  const withIQS = nodes.map(node => {
    const raw = {
      id:               node.id,
      title:            node.title,
      category:         node.category?.name,
      description:      node.description,
      mainstream_view:  node.mainstreamView,
      evidence_level:   node.evidenceLevel,
      confidence_score: node.confidenceScore,
      tags:             node.tags.map(t => t.tag),
      claims:           node.claims.map(c => c.text),
      criticisms:       node.criticisms.map(c => c.text),
      open_questions:   node.openQuestions.map(q => q.text),
      sources:          node.sourceLinks.map(() => ({})),
      year:             node.year,
      date_start:       node.dateStart,
      coordinates:      node.lat != null ? [node.lat, node.lon] : null,
    };
    const iqs = computeIQS(raw);
    return {
      id:               node.id,
      title:            node.title,
      description:      node.description,
      mainstreamView:   node.mainstreamView,
      status:           node.status,
      evidenceLevel:    node.evidenceLevel,
      confidenceScore:  node.confidenceScore,
      category:         node.category,
      tags:             node.tags.map(t => t.tag),
      claims:           node.claims.map(c => c.text),
      criticisms:       node.criticisms.map(c => c.text),
      openQuestions:    node.openQuestions.map(q => q.text),
      adminReviewStatus: node.adminReviewStatus,
      adminReviewNote:   node.adminReviewNote,
      importBatchId:     node.importBatchId,
      createdAt:         node.createdAt,
      publishedAt:       node.publishedAt,
      edgeCount:         node._count.edgesFrom + node._count.edgesTo,
      sourceCount:       node.sourceLinks.length,
      iqs,
    };
  });

  const filtered = iqsTier ? withIQS.filter(n => n.iqs.tier === iqsTier) : withIQS;

  return NextResponse.json({
    nodes: filtered,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
