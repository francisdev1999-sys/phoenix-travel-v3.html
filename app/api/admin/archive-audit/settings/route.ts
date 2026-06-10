export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_AUDIT_SETTINGS, AuditSettings } from '@/lib/audit/types';

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const row = await prisma.systemConfig.findUnique({ where: { key: 'audit_settings' } });
  const settings: AuditSettings = row
    ? { ...DEFAULT_AUDIT_SETTINGS, ...(row.value as object) }
    : DEFAULT_AUDIT_SETTINGS;

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const body = await req.json() as Partial<AuditSettings>;
  const merged: AuditSettings = { ...DEFAULT_AUDIT_SETTINGS, ...body };

  await prisma.systemConfig.upsert({
    where:  { key: 'audit_settings' },
    create: { key: 'audit_settings', value: merged as object, updatedBy: session?.user?.email ?? 'admin' },
    update: { value: merged as object, updatedBy: session?.user?.email ?? 'admin' },
  });

  return NextResponse.json(merged);
}
