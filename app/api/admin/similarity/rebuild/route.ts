export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { retroactiveSimilarityRebuild } from '@/lib/similarity/retroactive';

export async function POST() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Fire-and-forget — returns immediately, rebuild happens in background
  void retroactiveSimilarityRebuild();
  return NextResponse.json({ message: 'Similarity rebuild started.' });
}
