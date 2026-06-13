import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const finding = await prisma.cleanupFinding.update({
    where: { id },
    data: {
      status: 'resolved',
      resolvedBy: session!.user!.email!,
      resolvedAt: new Date(),
      ...(body.action ? { recommendedAction: body.action } : {}),
    },
  });

  return NextResponse.json(finding);
}
