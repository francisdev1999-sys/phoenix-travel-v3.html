/**
 * Free academic and reference APIs used for autonomous source discovery.
 * No API keys required — only rate-limit-aware polite headers.
 */

const UA = 'NexusArchive/1.0 (research archive; mailto:admin@nexusarchive.app)';

export interface DiscoveredRaw {
  title:           string;
  url:             string;
  domain:          string;
  sourceType:      string;
  author:          string | null;
  publicationYear: number | null;
  journal:         string | null;
  doi:             string | null;
  abstract:        string | null;
  discoveryApi:    string;
}

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// ── CrossRef ─────────────────────────────────────────────────────────────────
// Best for academic papers with DOIs; excellent metadata quality.

export async function searchCrossRef(query: string, maxResults = 5): Promise<DiscoveredRaw[]> {
  const params = new URLSearchParams({
    query: query, rows: String(maxResults),
    select: 'DOI,URL,title,author,container-title,published,abstract,type',
    mailto: 'admin@nexusarchive.app',
  });
  try {
    const res = await fetch(`https://api.crossref.org/works?${params}`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const data = await res.json() as { message?: { items?: Record<string, unknown>[] } };
    return (data.message?.items ?? []).map(w => {
      const doiUrl = w.DOI ? `https://doi.org/${w.DOI}` : (w.URL as string ?? '');
      return {
        title:           (Array.isArray(w.title) ? w.title[0] : w.title ?? '') as string,
        url:             doiUrl,
        domain:          extractDomain(doiUrl),
        sourceType:      crossRefTypeMap(w.type as string),
        author:          formatAuthors(w.author as Array<{family?:string;given?:string}> | undefined),
        publicationYear: extractYear(w.published),
        journal:         (Array.isArray(w['container-title']) ? (w['container-title'] as string[])[0] : null),
        doi:             w.DOI as string ?? null,
        abstract:        w.abstract ? stripXml(w.abstract as string).slice(0, 600) : null,
        discoveryApi:    'crossref',
      };
    }).filter(r => r.title && r.url);
  } catch { return []; }
}

function crossRefTypeMap(t: string): string {
  const m: Record<string, string> = {
    'journal-article': 'academic_paper', 'proceedings-article': 'academic_paper',
    'book-chapter': 'book', 'book': 'book', 'report': 'official_report',
    'dissertation': 'academic_paper', 'dataset': 'scientific_dataset',
  };
  return m[t] ?? 'academic_paper';
}

// ── Semantic Scholar ─────────────────────────────────────────────────────────
// Open graph of 200M+ academic papers, free at 100 req/5min.

export async function searchSemanticScholar(query: string, maxResults = 5): Promise<DiscoveredRaw[]> {
  const params = new URLSearchParams({
    query, limit: String(maxResults),
    fields: 'title,authors,year,externalIds,abstract,venue,openAccessPdf',
  });
  try {
    const res = await fetch(`https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const data = await res.json() as { data?: Record<string, unknown>[] };
    return (data.data ?? []).map(p => {
      const ids = p.externalIds as Record<string, string> | undefined;
      const pdf = (p.openAccessPdf as { url?: string } | undefined)?.url;
      const doi = ids?.DOI ?? null;
      const url = doi ? `https://doi.org/${doi}` : (pdf ?? `https://www.semanticscholar.org/paper/${p.paperId}`);
      return {
        title:           p.title as string,
        url,
        domain:          extractDomain(url),
        sourceType:      'academic_paper',
        author:          formatAuthors(
          (p.authors as Array<{name:string}> | undefined)?.map(a => ({ family: a.name }))
        ),
        publicationYear: p.year as number ?? null,
        journal:         p.venue as string ?? null,
        doi,
        abstract:        p.abstract ? (p.abstract as string).slice(0, 600) : null,
        discoveryApi:    'semantic_scholar',
      };
    }).filter(r => r.title && r.url);
  } catch { return []; }
}

// ── arXiv ────────────────────────────────────────────────────────────────────
// Preprints in physics, maths, CS, quantitative biology. Free, no rate limit.

export async function searchArXiv(query: string, maxResults = 5): Promise<DiscoveredRaw[]> {
  const params = new URLSearchParams({
    search_query: `all:${query}`, max_results: String(maxResults), sortBy: 'relevance',
  });
  try {
    const res = await fetch(`https://export.arxiv.org/api/query?${params}`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseArXivXml(xml);
  } catch { return []; }
}

function parseArXivXml(xml: string): DiscoveredRaw[] {
  const entries = xml.split('<entry>').slice(1);
  return entries.map(e => {
    const getTag = (tag: string) => e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() ?? '';
    const id  = getTag('id');
    const abs = getTag('abstract');
    return {
      title:           getTag('title').replace(/\n/g, ' ').trim(),
      url:             id || '',
      domain:          'arxiv.org',
      sourceType:      'academic_paper',
      author:          e.match(/<name>([^<]+)<\/name>/)?.[1] ?? null,
      publicationYear: new Date(getTag('published')).getFullYear() || null,
      journal:         'arXiv preprint',
      doi:             null,
      abstract:        abs ? abs.replace(/\n/g, ' ').trim().slice(0, 600) : null,
      discoveryApi:    'arxiv',
    };
  }).filter(r => r.title && r.url.startsWith('http'));
}

// ── OpenAlex ─────────────────────────────────────────────────────────────────
// Free comprehensive academic database (200M+ works). 100k req/day, no auth.

export async function searchOpenAlex(query: string, maxResults = 5): Promise<DiscoveredRaw[]> {
  const params = new URLSearchParams({
    search: query, per_page: String(maxResults),
    select: 'id,title,doi,authorships,publication_year,primary_location,abstract_inverted_index,type',
    mailto: 'admin@nexusarchive.app',
  });
  try {
    const res = await fetch(`https://api.openalex.org/works?${params}`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const data = await res.json() as { results?: Record<string, unknown>[] };
    return (data.results ?? []).map(w => {
      const doi = w.doi as string ?? null;
      const url = doi ?? (w.id as string ?? '');
      const loc = w.primary_location as Record<string, unknown> | undefined;
      const src = loc?.source as Record<string, unknown> | undefined;
      // Reconstruct abstract from inverted index
      let abstract: string | null = null;
      const aii = w.abstract_inverted_index as Record<string, number[]> | null | undefined;
      if (aii) {
        const words: { word: string; pos: number }[] = [];
        for (const [word, positions] of Object.entries(aii)) {
          for (const pos of positions) words.push({ word, pos });
        }
        abstract = words.sort((a, b) => a.pos - b.pos).map(x => x.word).join(' ').slice(0, 600);
      }
      return {
        title:           w.title as string ?? '',
        url,
        domain:          extractDomain(url),
        sourceType:      openAlexTypeMap(w.type as string),
        author:          ((w.authorships as Array<{author:{display_name:string}}> | undefined)?.[0]?.author?.display_name) ?? null,
        publicationYear: w.publication_year as number ?? null,
        journal:         src?.display_name as string ?? null,
        doi,
        abstract,
        discoveryApi:    'openalex',
      };
    }).filter(r => r.title && r.url.startsWith('http'));
  } catch { return []; }
}

function openAlexTypeMap(t: string): string {
  const m: Record<string, string> = {
    article: 'academic_paper', book: 'book', 'book-chapter': 'book',
    dataset: 'scientific_dataset', report: 'official_report', dissertation: 'academic_paper',
  };
  return m[t] ?? 'academic_paper';
}

// ── Wikipedia ────────────────────────────────────────────────────────────────
// Background / encyclopedic context. Free, no rate limit.

export async function searchWikipedia(query: string, maxResults = 3): Promise<DiscoveredRaw[]> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${maxResults}&format=json&origin=*`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8_000) }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json() as { query?: { search?: Array<{title: string; snippet: string}> } };
    const results = searchData.query?.search ?? [];

    return results.map(r => ({
      title:           r.title,
      url:             `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
      domain:          'en.wikipedia.org',
      sourceType:      'wikipedia',
      author:          null,
      publicationYear: null,
      journal:         'Wikipedia — The Free Encyclopedia',
      doi:             null,
      abstract:        stripHtml(r.snippet).slice(0, 400) || null,
      discoveryApi:    'wikipedia',
    }));
  } catch { return []; }
}

// ── PubMed ───────────────────────────────────────────────────────────────────
// NIH biomedical literature database. Free, 3 req/sec without key.

export async function searchPubMed(query: string, maxResults = 5): Promise<DiscoveredRaw[]> {
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&tool=nexusarchive&email=admin@nexusarchive.app`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
    const ids = searchData.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];

    // Fetch summaries for found IDs
    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json&tool=nexusarchive&email=admin@nexusarchive.app`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10_000) }
    );
    if (!summaryRes.ok) return [];
    const summaryData = await summaryRes.json() as { result?: Record<string, Record<string, unknown>> };
    const result = summaryData.result ?? {};

    return ids.map(id => {
      const item = result[id] ?? {};
      const year = parseInt(String(item.pubdate ?? '').slice(0, 4)) || null;
      return {
        title:           String(item.title ?? '').replace(/\.$/, ''),
        url:             `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        domain:          'pubmed.ncbi.nlm.nih.gov',
        sourceType:      'academic_paper',
        author:          (item.lastauthor as string) ?? null,
        publicationYear: year,
        journal:         (item.fulljournalname as string) ?? null,
        doi:             null,
        abstract:        null,
        discoveryApi:    'pubmed',
      };
    }).filter(r => r.title);
  } catch { return []; }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAuthors(authors?: Array<{family?: string; given?: string; name?: string}>): string | null {
  if (!authors?.length) return null;
  return authors.slice(0, 3).map(a => a.name ?? [a.family, a.given].filter(Boolean).join(', ')).join('; ');
}

function extractYear(published?: unknown): number | null {
  if (!published) return null;
  const parts = (published as { 'date-parts'?: number[][] })['date-parts'];
  return parts?.[0]?.[0] ?? null;
}

function stripXml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
