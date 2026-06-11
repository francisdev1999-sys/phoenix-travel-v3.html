export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { nodes as staticNodes } from '@/lib/graph';

export interface TimelineEntry {
  id:             string;
  year:           number;
  dateEnd?:       number;
  datePrecision?: string;
  title:          string;
  description:    string;
  category:       string;
  era:            string;
  evidenceLevel:  string;
  confidenceScore:number;
  sourceCount:    number;
  location?:      string;
  icon?:          string;
  tags:           string[];
  isLive:         boolean;
}

function getEra(year: number): string {
  if (year < -500)  return 'ancient';
  if (year < 500)   return 'classical';
  if (year < 1500)  return 'medieval';
  if (year < 1950)  return 'modern';
  return 'contemporary';
}

const CREDIBLE = new Set(['verified', 'strong_evidence', 'debated']);

export async function GET() {
  // ── 1. DB: all published nodes that have a date ──────────────────────────
  let liveEntries: TimelineEntry[] = [];
  try {
    const dbNodes = await prisma.node.findMany({
      where: {
        status: 'published',
        OR: [{ year: { not: null } }, { dateStart: { not: null } }],
      },
      include: {
        category:    { select: { name: true } },
        tags:        { select: { tag: true } },
        sourceLinks: {
          where:  { source: { status: 'approved' }, nodeId: { not: null } },
          select: { id: true },
        },
      },
    });

    liveEntries = dbNodes
      // credibility gate: must have credible evidence OR at least 1 approved source
      .filter(n => CREDIBLE.has(n.evidenceLevel) || n.sourceLinks.length > 0)
      .map(n => {
        const year = (n.year ?? n.dateStart)!;
        return {
          id:             n.id,
          year,
          dateEnd:        n.dateEnd   ?? undefined,
          datePrecision:  n.datePrecision ?? undefined,
          title:          n.title,
          description:    n.description.slice(0, 500),
          category:       n.category.name,
          era:            getEra(year),
          evidenceLevel:  n.evidenceLevel,
          confidenceScore:n.confidenceScore,
          sourceCount:    n.sourceLinks.length,
          location:       [n.region, n.country].filter(Boolean).join(', ') || undefined,
          icon:           n.icon ?? undefined,
          tags:           n.tags.map(t => t.tag),
          isLive:         true,
        };
      });
  } catch {
    // DB unavailable — fall through to static-only
  }

  // ── 2. Static nodes as fallback (not already covered by a live entry) ───
  const liveIds = new Set(liveEntries.map(e => e.id));

  const staticEntries: TimelineEntry[] = staticNodes
    .filter(n =>
      n.year != null &&
      CREDIBLE.has(n.evidence_level) &&
      !liveIds.has(n.id),
    )
    .map(n => ({
      id:             n.id,
      year:           n.year!,
      title:          n.title,
      description:    n.description.slice(0, 500),
      category:       n.category,
      era:            getEra(n.year!),
      evidenceLevel:  n.evidence_level,
      confidenceScore:n.confidence_score,
      sourceCount:    (n.sources ?? []).length,
      location:       n.region ?? n.country ?? undefined,
      icon:           n.icon ?? undefined,
      tags:           n.tags ?? [],
      isLive:         false,
    }));

  const all = [...liveEntries, ...staticEntries].sort((a, b) => a.year - b.year);
  return NextResponse.json(all);
}
