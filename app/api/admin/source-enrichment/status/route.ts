export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Returns counts so the UI can show before/after progress
export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const [total, withUrl, noUrl, approved] = await Promise.all([
    prisma.source.count(),
    prisma.source.count({ where: { url: { not: null } } }),
    prisma.source.count({ where: { url: null } }),
    prisma.source.count({ where: { status: 'approved', url: null } }),
  ]);

  return NextResponse.json({ total, withUrl, noUrl, approvedWithoutUrl: approved });
}
