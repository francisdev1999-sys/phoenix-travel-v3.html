/**
 * POST /api/sources/:id/override
 *
 * Admin sets a manual credibility override for a source.
 * Requirement: user-submitted source credibility must never be final —
 * this is the gate that enforces admin approval of the final score.
 *
 * Body: { credibilityOverride: number (0–1), overrideReason?: string }
 * To remove an override, send { credibilityOverride: null }
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const session = await auth();
  if (!isAdminSession(session) || !session) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const { credibilityOverride, overrideReason } = body as {
    credibilityOverride: number | null;
    overrideReason?:     string;
  };

  if (credibilityOverride !== null) {
    if (typeof credibilityOverride !== 'number' || credibilityOverride < 0 || credibilityOverride > 1) {
      return NextResponse.json({ error: 'credibilityOverride must be a number between 0 and 1' }, { status: 400 });
    }
  }

  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

  const updated = await prisma.source.update({
    where: { id },
    data:  {
      credibilityOverride: credibilityOverride ?? null,
      overriddenBy:        credibilityOverride !== null ? (session.user.id ?? null) : null,
      overrideReason:      credibilityOverride !== null ? (overrideReason?.trim() || null) : null,
    },
  });

  await writeAuditLog({
    userId:     session.user.id    ?? null,
    userEmail:  session.user.email ?? null,
    action:     'edit',
    entityType: 'node',
    entityId:   id,
    detail: {
      type:       'credibility_override',
      previous:   source.credibilityOverride,
      override:   credibilityOverride,
      autoScore:  source.credibilityScore,
      reason:     overrideReason,
    },
  });

  return NextResponse.json({
    id:                  updated.id,
    credibilityScore:    updated.credibilityScore,
    credibilityOverride: updated.credibilityOverride,
    effectiveScore:      updated.credibilityOverride ?? updated.credibilityScore,
    overrideReason:      updated.overrideReason,
  });
}
