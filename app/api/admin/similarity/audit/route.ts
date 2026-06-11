export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { runSimilarityAudit } from '@/lib/similarity/retroactive';

export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const audit = await runSimilarityAudit();
  return NextResponse.json(audit);
}
