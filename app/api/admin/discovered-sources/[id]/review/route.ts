export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!isAdminSession(session)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const { action, reason } = await req.json() as { action: 'approve' | 'reject'; reason?: string };

  if (action !== 'approve' && action !== 'reject')
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });

  const discovered = await prisma.discoveredSource.findUnique({ where: { id } });
  if (!discovered) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'approve') {
    // Promote to proper Source record — deduplicate by DOI if available, else create new
    let source;
    if (discovered.doi) {
      source = await prisma.source.upsert({
        where:  { doi: discovered.doi },
        update: {},
        create: {
          title:           discovered.title,
          sourceType:      discovered.sourceType,
          author:          discovered.author,
          publicationYear: discovered.publicationYear,
          journal:         discovered.journal,
          doi:             discovered.doi,
          abstract:        discovered.abstract,
          url:             discovered.url,
          language:        'en',
          credibilityScore: discovered.credibilityScore,
          status:          'approved',
          reviewedBy:      session!.user!.id,
          reviewedAt:      new Date(),
          submittedBy:     null,
        },
      });
    } else {
      source = await prisma.source.create({
        data: {
          title:           discovered.title,
          sourceType:      discovered.sourceType,
          author:          discovered.author,
          publicationYear: discovered.publicationYear,
          journal:         discovered.journal,
          doi:             null,
          abstract:        discovered.abstract,
          url:             discovered.url,
          language:        'en',
          credibilityScore: discovered.credibilityScore,
          status:          'approved',
          reviewedBy:      session!.user!.id,
          reviewedAt:      new Date(),
          submittedBy:     null,
        },
      });
    }

    // Link to node
    // Link to node (create only if not already linked)
    const existingLink = await prisma.sourceLink.findFirst({
      where: { sourceId: source.id, targetType: 'node', targetId: discovered.nodeId },
    });
    if (!existingLink) {
      await prisma.sourceLink.create({
        data: { sourceId: source.id, targetType: 'node', targetId: discovered.nodeId, linkType: 'supports' },
      }).catch(() => {});
    }

    // Update domain reputation
    await prisma.sourceDomainReputation.upsert({
      where:  { domain: discovered.domain },
      update: { approvalCount: { increment: 1 }, reputationScore: { increment: 0.001 } },
      create: { domain: discovered.domain, approvalCount: 1, reputationScore: 0.65 },
    }).catch(() => {});

    await prisma.discoveredSource.update({
      where:  { id },
      data:   { status: 'approved', promotedSourceId: source.id, reviewedBy: session!.user!.id, reviewedAt: new Date() },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session!.user!.id, action: 'source_approved',
        entityType: 'discovered_source', entityId: id,
        detail: { title: discovered.title, url: discovered.url, nodeId: discovered.nodeId },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, sourceId: source.id });
  } else {
    await prisma.sourceDomainReputation.upsert({
      where:  { domain: discovered.domain },
      update: { rejectionCount: { increment: 1 } },
      create: { domain: discovered.domain, rejectionCount: 1, reputationScore: 0.40 },
    }).catch(() => {});

    await prisma.discoveredSource.update({
      where: { id },
      data:  { status: 'rejected', rejectionReason: reason ?? null, reviewedBy: session!.user!.id, reviewedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  }
}
