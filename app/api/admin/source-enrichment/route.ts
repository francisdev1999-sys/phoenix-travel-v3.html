export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { after } from 'next/server';
import { auth, isAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

// CrossRef API — free, no auth, finds academic DOIs/URLs by title+author
const CROSSREF_AGENT = 'NexusArchive/1.0 (mailto:admin@nexusarchive.app)';

interface CrossRefWork {
  DOI?: string;
  URL?: string;
  title?: string[];
  author?: { family?: string; given?: string }[];
  'container-title'?: string[];
  published?: { 'date-parts'?: number[][] };
  score?: number;
}

interface CrossRefResponse {
  message?: {
    items?: CrossRefWork[];
  };
}

// Normalise a string for title comparison (lowercase, strip punctuation)
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Jaccard token overlap between two strings (0-1)
function titleSimilarity(a: string, b: string): number {
  const ta = new Set(normalise(a).split(' ').filter(w => w.length > 2));
  const tb = new Set(normalise(b).split(' ').filter(w => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  const inter = [...ta].filter(w => tb.has(w)).length;
  const union = new Set([...ta, ...tb]).size;
  return inter / union;
}

async function crossrefLookup(title: string, author?: string | null, year?: number | null): Promise<{ url: string; doi: string | null; confidence: number } | null> {
  try {
    const params = new URLSearchParams({
      'query.title':         title,
      'rows':                '3',
      'select':              'DOI,URL,title,author,published,score',
      'mailto':              'admin@nexusarchive.app',
    });
    if (author) params.set('query.author', author.split(',')[0].trim());

    const res = await fetch(`https://api.crossref.org/works?${params}`, {
      headers: { 'User-Agent': CROSSREF_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = await res.json() as CrossRefResponse;
    const items = data.message?.items ?? [];
    if (items.length === 0) return null;

    for (const item of items) {
      const returnedTitle = item.title?.[0] ?? '';
      const sim = titleSimilarity(title, returnedTitle);
      if (sim < 0.65) continue; // title must match well

      // Year check — allow ±1 year if we have a year
      if (year && item.published?.['date-parts']?.[0]?.[0]) {
        const diff = Math.abs((item.published['date-parts'][0][0] as number) - year);
        if (diff > 2) continue;
      }

      const doi = item.DOI ?? null;
      const url = item.URL && item.URL.startsWith('http')
        ? item.URL
        : doi ? `https://doi.org/${doi}` : null;

      if (!url) continue;
      return { url, doi, confidence: sim };
    }
    return null;
  } catch {
    return null;
  }
}

// OpenLibrary for books (ISBN / title lookup)
async function openLibraryLookup(title: string, author?: string | null): Promise<{ url: string; doi: null; confidence: number } | null> {
  try {
    const q = [title, author].filter(Boolean).join(' ');
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=3&fields=title,author_name,key,isbn`, {
      headers: { 'User-Agent': CROSSREF_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { docs?: { title?: string; key?: string }[] };
    const docs = data.docs ?? [];
    for (const doc of docs) {
      const sim = titleSimilarity(title, doc.title ?? '');
      if (sim < 0.65) continue;
      if (!doc.key) continue;
      return { url: `https://openlibrary.org${doc.key}`, doi: null, confidence: sim };
    }
    return null;
  } catch {
    return null;
  }
}

export interface EnrichmentResult {
  sourceId:   string;
  title:      string;
  foundUrl:   string | null;
  foundDoi:   string | null;
  confidence: number;
  method:     string;
  error?:     string;
}

async function enrichSources(): Promise<EnrichmentResult[]> {
  // Find published/approved sources that have no URL and no doi
  const sources = await prisma.source.findMany({
    where: {
      status: 'approved',
      url: null,
    },
    select: {
      id: true, title: true, author: true, publicationYear: true,
      sourceType: true, publisher: true, journal: true, doi: true, isbn: true,
    },
    take: 100,
    orderBy: { createdAt: 'asc' },
  });

  const results: EnrichmentResult[] = [];

  for (const src of sources) {
    let found: { url: string; doi: string | null; confidence: number } | null = null;
    let method = '';

    // If DOI already exists but URL is missing, just construct doi.org URL
    if (src.doi) {
      found = { url: `https://doi.org/${src.doi}`, doi: src.doi, confidence: 1.0 };
      method = 'doi_to_url';
    } else if (['academic_paper', 'journal_article', 'conference_paper', 'preprint', 'thesis'].includes(src.sourceType)) {
      found = await crossrefLookup(src.title, src.author, src.publicationYear);
      method = 'crossref';
    } else if (['book', 'book_chapter'].includes(src.sourceType)) {
      // Try CrossRef first, then OpenLibrary
      found = await crossrefLookup(src.title, src.author, src.publicationYear);
      method = 'crossref';
      if (!found) {
        found = await openLibraryLookup(src.title, src.author);
        method = 'openlibrary';
      }
    }
    // For website, documentary, news_article — skip (can't reliably find URLs without hallucinating)

    if (found && found.confidence >= 0.65) {
      try {
        await prisma.source.update({
          where: { id: src.id },
          data: {
            url: found.url,
            ...(found.doi && !src.doi ? { doi: found.doi } : {}),
          },
        });
        results.push({
          sourceId: src.id, title: src.title,
          foundUrl: found.url, foundDoi: found.doi,
          confidence: found.confidence, method,
        });
      } catch (e) {
        results.push({
          sourceId: src.id, title: src.title,
          foundUrl: null, foundDoi: null,
          confidence: 0, method,
          error: e instanceof Error ? e.message : 'DB update failed',
        });
      }
    } else {
      results.push({
        sourceId: src.id, title: src.title,
        foundUrl: null, foundDoi: null,
        confidence: found?.confidence ?? 0, method: method || 'skipped',
      });
    }

    // Polite delay between CrossRef requests
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

// GET — preview: how many sources need enrichment
export async function GET() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const [noUrl, hasDoi] = await Promise.all([
    prisma.source.count({ where: { status: 'approved', url: null } }),
    prisma.source.count({ where: { status: 'approved', url: null, doi: { not: null } } }),
  ]);

  return NextResponse.json({ sourcesWithoutUrl: noUrl, withDoiOnly: hasDoi });
}

// POST — run enrichment in background
export async function POST() {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  after(async () => {
    try {
      await enrichSources();
    } catch (e) {
      console.error('[source-enrichment]', e);
    }
  });

  return NextResponse.json({ started: true });
}
