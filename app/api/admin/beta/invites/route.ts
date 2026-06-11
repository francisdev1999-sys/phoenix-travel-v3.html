export const dynamic = 'force-dynamic';
/**
 * GET  /api/admin/beta/invites — list all invites
 * POST /api/admin/beta/invites — create a new invite code
 *
 * POST body: { email?, group, maxUses?, expiresAt?, notes? }
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

const BETA_GROUPS = [
  'researcher', 'archaeologist', 'historian', 'ufo_researcher',
  'skeptic', 'journalist', 'student', 'curious',
] as const;

function generateCode(): string {
  return randomBytes(4).toString('hex').toUpperCase(); // e.g. A3F2B1C9
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const group = searchParams.get('group') || undefined;

  const invites = await prisma.betaInvite.findMany({
    where: group ? { group } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      redemptions: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(invites);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session) || !session?.user?.id) {
    return NextResponse.json({ error: 'Admin only' }, { status: 401 });
  }

  const { email, group, maxUses, expiresAt, notes } = await req.json();

  if (!BETA_GROUPS.includes(group)) {
    return NextResponse.json({ error: 'Invalid group' }, { status: 400 });
  }

  // Ensure uniqueness — retry up to 5 times on collision
  let code = generateCode();
  for (let i = 0; i < 4; i++) {
    const existing = await prisma.betaInvite.findUnique({ where: { code } });
    if (!existing) break;
    code = generateCode();
  }

  const invite = await prisma.betaInvite.create({
    data: {
      code,
      email:    email?.trim().toLowerCase() || null,
      group,
      maxUses:  typeof maxUses === 'number' && maxUses > 0 ? maxUses : 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: session.user.id,
      notes:    notes?.trim() || null,
    },
  });

  return NextResponse.json(invite, { status: 201 });
}
