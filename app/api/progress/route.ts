import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);

  const progress = await prisma.userProgress.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(progress);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const progress = await prisma.userProgress.upsert({
    where: { userId: session.user.id },
    update: {
      xp: body.xp,
      level: body.level,
      theoriesExplored: body.theoriesExplored,
      connectionsDiscovered: body.connectionsDiscovered,
      achievements: body.achievements,
      rabbitHoleChain: body.rabbitHoleChain,
      rabbitHoleDepth: body.rabbitHoleDepth,
      recentDiscoveries: body.recentDiscoveries,
    },
    create: {
      userId: session.user.id,
      xp: body.xp ?? 0,
      level: body.level ?? 'Curious Visitor',
      theoriesExplored: body.theoriesExplored ?? [],
      connectionsDiscovered: body.connectionsDiscovered ?? [],
      achievements: body.achievements ?? [],
      rabbitHoleChain: body.rabbitHoleChain ?? [],
      rabbitHoleDepth: body.rabbitHoleDepth ?? 0,
      recentDiscoveries: body.recentDiscoveries ?? [],
    },
  });

  return NextResponse.json(progress);
}
