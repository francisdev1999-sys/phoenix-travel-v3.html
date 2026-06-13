import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

type BulkAction = 'ignore' | 'resolve' | 'archive' | 'review' | 'blacklist';

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { ids, action, blacklistType, blacklistReason } = body as {
    ids: string[];
    action: BulkAction;
    blacklistType?: string;
    blacklistReason?: string;
  };

  if (!Array.isArray(ids) || ids.length === 0 || !action) {
    return NextResponse.json({ error: 'ids and action are required' }, { status: 400 });
  }

  const adminEmail = session!.user!.email!;
  const now        = new Date();

  if (action === 'ignore') {
    await prisma.cleanupFinding.updateMany({
      where: { id: { in: ids } },
      data:  { status: 'ignored', resolvedBy: adminEmail, resolvedAt: now },
    });
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  if (action === 'resolve') {
    await prisma.cleanupFinding.updateMany({
      where: { id: { in: ids } },
      data:  { status: 'resolved', resolvedBy: adminEmail, resolvedAt: now },
    });
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  // For archive / review / blacklist we need to read the findings first
  const findings = await prisma.cleanupFinding.findMany({
    where: { id: { in: ids } },
    select: { id: true, itemType: true, itemId: true, title: true, blacklistSuggestion: true },
  });

  if (action === 'archive') {
    const nodeIds   = findings.filter(f => f.itemType === 'node').map(f => f.itemId);
    const sourceIds = findings.filter(f => f.itemType === 'source').map(f => f.itemId);

    await Promise.all([
      nodeIds.length > 0
        ? prisma.node.updateMany({ where: { id: { in: nodeIds } }, data: { status: 'archived' } })
        : Promise.resolve(),
      sourceIds.length > 0
        ? prisma.source.updateMany({ where: { id: { in: sourceIds } }, data: { status: 'archived' } })
        : Promise.resolve(),
      prisma.cleanupFinding.updateMany({
        where: { id: { in: ids } },
        data:  { status: 'resolved', resolvedBy: adminEmail, resolvedAt: now },
      }),
    ]);
    return NextResponse.json({ ok: true, affected: ids.length, nodeIds, sourceIds });
  }

  if (action === 'review') {
    const nodeIds   = findings.filter(f => f.itemType === 'node').map(f => f.itemId);
    const sourceIds = findings.filter(f => f.itemType === 'source').map(f => f.itemId);

    await Promise.all([
      nodeIds.length > 0
        ? prisma.node.updateMany({
            where: { id: { in: nodeIds } },
            data:  { adminReviewStatus: 'needs_review' },
          })
        : Promise.resolve(),
      sourceIds.length > 0
        ? prisma.source.updateMany({
            where: { id: { in: sourceIds } },
            data:  { reviewNotes: 'Flagged by AI cleanup audit — needs review' },
          })
        : Promise.resolve(),
      prisma.cleanupFinding.updateMany({
        where: { id: { in: ids } },
        data:  { status: 'resolved', resolvedBy: adminEmail, resolvedAt: now },
      }),
    ]);
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  if (action === 'blacklist') {
    const bType   = blacklistType ?? 'title';
    const bReason = blacklistReason ?? 'Flagged by AI cleanup audit';

    await Promise.all([
      ...findings.map(f =>
        prisma.discoveryBlacklist.create({
          data: {
            type:      bType,
            value:     f.blacklistSuggestion ?? f.title,
            reason:    bReason,
            createdBy: adminEmail,
          },
        }),
      ),
      prisma.cleanupFinding.updateMany({
        where: { id: { in: ids } },
        data:  { status: 'resolved', resolvedBy: adminEmail, resolvedAt: now },
      }),
    ]);
    return NextResponse.json({ ok: true, affected: ids.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
