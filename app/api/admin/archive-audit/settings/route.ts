export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_AUDIT_SETTINGS } from '@/lib/audit/types';
import type { AuditSettings } from '@/lib/audit/types';

export async function GET() {
  try {
    const session = await auth();
    if (!isAdminSession(session) || !session) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const row = await prisma.systemConfig.findUnique({ where: { key: 'audit_settings' } });
    const settings: AuditSettings = row
      ? { ...DEFAULT_AUDIT_SETTINGS, ...(row.value as Partial<AuditSettings>) }
      : DEFAULT_AUDIT_SETTINGS;

    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[GET /api/admin/archive-audit/settings]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!isAdminSession(session) || !session) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json() as Partial<AuditSettings>;
    const merged: AuditSettings = { ...DEFAULT_AUDIT_SETTINGS, ...body };

    await prisma.systemConfig.upsert({
      where:  { key: 'audit_settings' },
      create: {
        key:       'audit_settings',
        value:     merged as object,
        updatedBy: session.user?.email ?? session.user?.id ?? 'unknown',
      },
      update: {
        value:     merged as object,
        updatedBy: session.user?.email ?? session.user?.id ?? 'unknown',
      },
    });

    return NextResponse.json({ settings: merged });
  } catch (err) {
    console.error('[PUT /api/admin/archive-audit/settings]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
