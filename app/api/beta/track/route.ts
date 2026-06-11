export const dynamic = 'force-dynamic';
/**
 * POST /api/beta/track
 * Fire-and-forget usage event tracking.
 * Accepted from both authenticated and anonymous sessions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const VALID_TYPES = new Set([
  'search', 'search_click', 'graph_view', 'timeline_view', 'globe_view',
  'source_view', 'node_submit', 'rabbit_hole', 'node_view',
  'evidence_view', 'universe_view',
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false }, { status: 400 });

  const { eventType, meta, page, sessionId } = body;

  if (!VALID_TYPES.has(eventType)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Fire and forget — never block the client
  void prisma.usageEvent.create({
    data: {
      userId:    session?.user?.id ?? null,
      sessionId: sessionId?.toString().slice(0, 64) || null,
      eventType,
      meta:      meta ?? undefined,
      page:      typeof page === 'string' ? page.slice(0, 200) : null,
    },
  }).catch(() => {/* best-effort */});

  return NextResponse.json({ ok: true });
}
