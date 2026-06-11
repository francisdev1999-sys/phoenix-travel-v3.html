export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { retroactiveSimilarityRebuild, getRebuildStatus } from '@/lib/similarity/retroactive';

/** GET — similarity rebuild status and coverage stats */
export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [status, nodeCount, computedPairs] = await Promise.all([
    getRebuildStatus(),
    prisma.node.count({ where: { status: 'published' } }),
    prisma.researchSimilarity.count(),
  ]);

  const totalPossible = (nodeCount * (nodeCount - 1)) / 2;
  const coveragePct   = totalPossible > 0
    ? Math.round((computedPairs / totalPossible) * 100)
    : 0;

  return NextResponse.json({
    rebuildStatus: status,
    coverage: {
      totalNodes:    nodeCount,
      totalPossible,
      computedPairs,
      coveragePct,
    },
  });
}

/** POST — trigger retroactive rebuild (fire-and-forget, admin only) */
export async function POST() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Don't re-trigger if already running
  const current = await getRebuildStatus();
  if (current.status === 'running') {
    return NextResponse.json({
      message: 'Rebuild already in progress.',
      rebuildStatus: current,
    });
  }

  void retroactiveSimilarityRebuild();

  return NextResponse.json({ message: 'Similarity rebuild started.' });
}
