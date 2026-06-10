export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { runArchiveAudit } from '@/lib/integrity/archive-audit';

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = runArchiveAudit();
  return NextResponse.json(result);
}
