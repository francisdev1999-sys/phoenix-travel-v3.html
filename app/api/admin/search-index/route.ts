export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const [totalPublished, coverageRows] = await Promise.all([
    prisma.node.count({ where: { status: 'published' } }),
    prisma.$queryRaw<{ indexed: bigint }[]>`
      SELECT COUNT(*)::bigint AS indexed
      FROM "Node"
      WHERE "status" = 'published'
        AND "search_vector" IS NOT NULL
    `,
  ]);

  const indexed = Number((coverageRows[0] as { indexed: bigint }).indexed);
  const missing = totalPublished - indexed;
  const coveragePct = totalPublished === 0
    ? 100
    : Math.round((indexed / totalPublished) * 100);

  return NextResponse.json({
    totalPublished,
    indexed,
    missing,
    coveragePct,
    lastRebuilt: null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.action !== 'rebuild') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  // Process one batch of up to 100 null/stale tsvectors
  const updated = await prisma.$executeRaw`
    UPDATE "Node"
    SET "search_vector" = to_tsvector('english',
      coalesce("title", '') || ' ' ||
      coalesce("description", '') || ' ' ||
      coalesce("region", '') || ' ' ||
      coalesce("country", '')
    )
    WHERE "status" = 'published'
      AND "search_vector" IS NULL
    LIMIT 100
  `;

  const remainingRows = await prisma.$queryRaw<{ remaining: bigint }[]>`
    SELECT COUNT(*)::bigint AS remaining
    FROM "Node"
    WHERE "status" = 'published'
      AND "search_vector" IS NULL
  `;

  const remaining = Number((remainingRows[0] as { remaining: bigint }).remaining);

  return NextResponse.json({ updated, remaining });
}
