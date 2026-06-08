/**
 * Source-link management for a node. Admin-only.
 *
 * GET  /api/nodes/:id/sources          — list all sources linked to this node
 * POST /api/nodes/:id/sources          — body: { sourceId, linkType? }  → create link
 * DELETE /api/nodes/:id/sources        — body: { linkId }                → remove link
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const links = await prisma.sourceLink.findMany({
    where: { nodeId: id },
    include: {
      source: {
        select: {
          id:              true,
          title:           true,
          sourceType:      true,
          author:          true,
          publicationYear: true,
          credibilityScore: true,
          status:          true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(links);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { sourceId, linkType = 'supports' } = body as Record<string, string>;
  if (!sourceId?.trim()) {
    return NextResponse.json({ error: 'sourceId is required' }, { status: 400 });
  }

  const [node, source] = await Promise.all([
    prisma.node.findUnique({ where: { id }, select: { id: true } }),
    prisma.source.findUnique({ where: { id: sourceId }, select: { id: true, title: true, status: true } }),
  ]);

  if (!node)   return NextResponse.json({ error: 'Node not found' },   { status: 404 });
  if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

  // Prevent duplicate links
  const existing = await prisma.sourceLink.findFirst({ where: { sourceId, nodeId: id } });
  if (existing) {
    return NextResponse.json({ error: 'Source is already linked to this node' }, { status: 409 });
  }

  const link = await prisma.sourceLink.create({
    data: { sourceId, nodeId: id, linkType },
    include: {
      source: {
        select: {
          id: true, title: true, sourceType: true,
          author: true, publicationYear: true, credibilityScore: true, status: true,
        },
      },
    },
  });

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const linkId = (body as Record<string, string>)?.linkId;
  if (!linkId) return NextResponse.json({ error: 'linkId is required' }, { status: 400 });

  // Verify the link belongs to this node
  const link = await prisma.sourceLink.findFirst({ where: { id: linkId, nodeId: id } });
  if (!link) return NextResponse.json({ error: 'Link not found on this node' }, { status: 404 });

  await prisma.sourceLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}
