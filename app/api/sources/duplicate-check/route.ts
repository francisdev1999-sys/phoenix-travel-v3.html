export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, doi, isbn, excludeId } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exact: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const likely: any[] = [];

  // Exact DOI match
  if (doi?.trim()) {
    const doiMatch = await prisma.source.findUnique({
      where: { doi: doi.trim() },
      include: { submitter: { select: { id: true, name: true, email: true, image: true } }, links: true },
    });
    if (doiMatch && doiMatch.id !== excludeId) exact.push(doiMatch);
  }

  // Exact ISBN match
  if (isbn?.trim()) {
    const isbnMatches = await prisma.source.findMany({
      where: { isbn: isbn.trim(), id: { not: excludeId } },
      include: { submitter: { select: { id: true, name: true, email: true, image: true } }, links: true },
    });
    for (const m of isbnMatches) {
      if (!exact.find(e => e.id === m.id)) exact.push(m);
    }
  }

  // Fuzzy title match (simple: contains significant words)
  if (title?.trim().length >= 5) {
    const words = title.trim()
      .split(/\s+/)
      .filter((w: string) => w.length > 4)
      .slice(0, 4);

    if (words.length > 0) {
      const titleMatches = await prisma.source.findMany({
        where: {
          id: { not: excludeId },
          AND: words.map((w: string) => ({ title: { contains: w, mode: 'insensitive' } })),
        },
        include: { submitter: { select: { id: true, name: true, email: true, image: true } }, links: true },
        take: 5,
      });
      for (const m of titleMatches) {
        if (!exact.find(e => e.id === m.id)) likely.push(m);
      }
    }
  }

  return NextResponse.json({
    isDuplicate: exact.length > 0 || likely.length > 0,
    exact,
    likely,
  });
}
