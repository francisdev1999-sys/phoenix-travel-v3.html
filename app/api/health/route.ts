export const dynamic = 'force-dynamic';
/**
 * GET /api/health
 *
 * Railway healthcheck target (see railway.json). Deliberately touches NOTHING —
 * no DB, no caches — so it answers instantly and only reflects whether the
 * Node process itself is alive and serving. Railway uses it to gate deployment
 * swaps and to detect/replace dead instances instead of leaving them in the
 * routing rotation.
 */
import { NextResponse } from 'next/server';

const startedAt = Date.now();

export async function GET() {
  return NextResponse.json({
    ok:       true,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
  });
}
