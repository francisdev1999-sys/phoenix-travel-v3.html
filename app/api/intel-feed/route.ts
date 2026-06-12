export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const category = searchParams.get('category') ?? 'all';
  const cursor   = searchParams.get('cursor') ?? undefined;
  const q        = searchParams.get('q')?.toLowerCase().trim() ?? '';

  const where = {
    ...(category !== 'all' ? { category } : {}),
    ...(q ? {
      OR: [
        { title:       { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
        { source:      { contains: q, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const items = await prisma.newsItem.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take:    PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, title: true, description: true, url: true,
      source: true, sourceUrl: true, category: true,
      publishedAt: true, imageUrl: true,
    },
  });

  const hasMore    = items.length > PAGE_SIZE;
  const page       = items.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  // Category counts for filter tabs
  const counts = await prisma.newsItem.groupBy({
    by:     ['category'],
    _count: { _all: true },
  });
  const categoryCounts = Object.fromEntries(counts.map(c => [c.category, c._count._all]));

  return NextResponse.json({ items: page, nextCursor, categoryCounts });
}
