import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

type ApplyAction = 'keep' | 'archive' | 'review' | 'delete' | 'blacklist';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireSuperAdmin();
  if (error) return error;

  const { id }     = await params;
  const body        = await req.json().catch(() => ({}));
  const action      = body.action as ApplyAction;
  const confirmation = body.confirmation as string | undefined;
  const reason       = body.reason as string | undefined;

  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }

  const finding = await prisma.cleanupFinding.findUnique({
    where: { id },
    select: { id: true, itemType: true, itemId: true, title: true, blacklistSuggestion: true },
  });
  if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });

  const adminEmail = session!.user!.email!;
  const now        = new Date();

  const resolveFind = () =>
    prisma.cleanupFinding.update({
      where: { id },
      data:  { status: 'resolved', resolvedBy: adminEmail, resolvedAt: now },
    });

  if (action === 'keep') {
    await resolveFind();
    return NextResponse.json({ ok: true });
  }

  if (action === 'archive') {
    if (finding.itemType === 'node') {
      await prisma.node.update({ where: { id: finding.itemId }, data: { status: 'archived' } });
    } else if (finding.itemType === 'source') {
      await prisma.source.update({ where: { id: finding.itemId }, data: { status: 'archived' } });
    }
    await resolveFind();
    return NextResponse.json({ ok: true });
  }

  if (action === 'review') {
    if (finding.itemType === 'node') {
      await prisma.node.update({
        where: { id: finding.itemId },
        data:  { adminReviewStatus: 'needs_review' },
      });
    } else if (finding.itemType === 'source') {
      await prisma.source.update({
        where: { id: finding.itemId },
        data:  { reviewNotes: 'Flagged by AI cleanup audit — needs review' },
      });
    }
    await resolveFind();
    return NextResponse.json({ ok: true });
  }

  if (action === 'blacklist') {
    await prisma.discoveryBlacklist.create({
      data: {
        type:      body.blacklistType ?? 'title',
        value:     finding.blacklistSuggestion ?? finding.title,
        reason:    reason ?? 'Flagged by AI cleanup audit',
        createdBy: adminEmail,
      },
    });
    await resolveFind();
    return NextResponse.json({ ok: true });
  }

  if (action === 'delete') {
    if (confirmation !== 'DELETE') {
      return NextResponse.json({ error: 'Confirmation text must be DELETE' }, { status: 400 });
    }
    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({ error: 'A reason is required for hard deletion' }, { status: 400 });
    }

    // Gather dependency counts before deleting (for audit log)
    let deps: Record<string, number> = {};
    if (finding.itemType === 'node') {
      const [edges, sources] = await Promise.all([
        prisma.edge.count({ where: { OR: [{ fromId: finding.itemId }, { toId: finding.itemId }] } }),
        prisma.sourceLink.count({ where: { nodeId: finding.itemId } }),
      ]);
      deps = { edges, sources };
      await prisma.node.delete({ where: { id: finding.itemId } });
    } else if (finding.itemType === 'source') {
      const links = await prisma.sourceLink.count({ where: { sourceId: finding.itemId } });
      deps = { links };
      await prisma.source.delete({ where: { id: finding.itemId } });
    }

    await resolveFind();
    return NextResponse.json({ ok: true, deletedItemType: finding.itemType, deps, reason });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
