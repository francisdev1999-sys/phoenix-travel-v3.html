export const dynamic = 'force-dynamic';
/**
 * GET /api/explore/daily-mystery
 *
 * Today's Mystery — one unresolved open question from the archive, rotating
 * deterministically at UTC midnight (every visitor sees the same one). The
 * daily-habit hook on the landing page: come back tomorrow, new mystery.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cachedJson } from '@/lib/cache/api-cache';
import { dailyIndex, currentDayNumber } from '@/lib/daily-mystery';

export async function GET() {
  const day = currentDayNumber();

  const payload = await cachedJson(`mystery:${day}`, 60 * 60 * 1000, async () => {
    const total = await prisma.openQuestion.count({
      where: { node: { status: 'published' } },
    });
    if (total === 0) return null;

    const [q] = await prisma.openQuestion.findMany({
      where:   { node: { status: 'published' } },
      orderBy: { id: 'asc' },
      skip:    dailyIndex(day, total),
      take:    1,
      select: {
        text: true,
        node: { select: { id: true, title: true, icon: true, evidenceLevel: true } },
      },
    });
    if (!q) return null;

    return {
      question:      q.text,
      nodeId:        q.node.id,
      nodeTitle:     q.node.title,
      icon:          q.node.icon,
      evidenceLevel: q.node.evidenceLevel,
    };
  });

  return NextResponse.json(payload ?? { question: null }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  });
}
