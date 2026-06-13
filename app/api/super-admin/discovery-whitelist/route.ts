import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/cleanup/admin-auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const items = await prisma.discoveryWhitelist.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireSuperAdmin();
  if (error) return error;

  const body = await req.json();
  if (!body.type || !body.value || !body.reason) {
    return NextResponse.json({ error: 'type, value, and reason are required' }, { status: 400 });
  }

  const item = await prisma.discoveryWhitelist.create({
    data: {
      type: body.type,
      value: body.value,
      reason: body.reason,
      createdBy: session!.user!.email!,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
