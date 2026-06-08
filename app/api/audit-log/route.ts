/**
 * GET /api/audit-log
 *
 * Returns paginated audit log entries. Admin-only.
 *
 * Query params:
 *   entityType  node | edge | batch
 *   entityId    string
 *   action      string
 *   page        number (default: 1)
 *   limit       number (default: 50, max: 100)
 */
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const sp         = req.nextUrl.searchParams;
  const entityType = sp.get('entityType') ?? undefined;
  const entityId   = sp.get('entityId')   ?? undefined;
  const action     = sp.get('action')     ?? undefined;
  const page       = Math.max(1, parseInt(sp.get('page')  ?? '1',  10));
  const limit      = Math.min(100, Math.max(1, parseInt(sp.get('limit') ?? '50', 10)));
  const skip       = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (entityType) where.entityType = entityType;
  if (entityId)   where.entityId   = entityId;
  if (action)     where.action     = action;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditLog = (prisma as any).auditLog;
  const [entries, total] = await Promise.all([
    auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    auditLog.count({ where }),
  ]);

  return NextResponse.json({
    entries,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
