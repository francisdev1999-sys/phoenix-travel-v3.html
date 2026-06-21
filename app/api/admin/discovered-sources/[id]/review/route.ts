export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { promoteDiscoveredSource } from '@/lib/discovery/source-promoter';

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
    const sourceId = discovered.promotedSourceId
      ?? await promoteDiscoveredSource(discovered, session!.user!.id);

    await prisma.discoveredSource.update({
      where:  { id },
      data:   { status: 'approved', promotedSourceId: sourceId, reviewedBy: session!.user!.id, reviewedAt: new Date() },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session!.user!.id, action: 'source_approved',
        entityType: 'discovered_source', entityId: id,
        detail: { title: discovered.title, url: discovered.url, nodeId: discovered.nodeId },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, sourceId });
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
