import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  const { id } = await params;

  const finding = await prisma.cleanupFinding.update({
    where: { id },
    data: { status: 'ignored' },
  });

  return NextResponse.json(finding);
}
