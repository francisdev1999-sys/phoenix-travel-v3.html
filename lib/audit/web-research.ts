import type { WebSource } from './types';

export interface ResearchResult {
  description?:   string;
  year?:          number;
  dateStart?:     number;
  dateEnd?:       number;
  datePrecision?: string;
  lat?:           number;
  lon?:           number;
  region?:        string;
  country?:       string;
  tags?:          string[];
  sources:        WebSource[];
  summary:        string;  // concatenated research text for AI context
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function jaccard(a: string, b: string): number {
  const sa = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const sb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}

async function fetchWikipedia(title: string): Promise<{ extract: string; url: string; coords?: { lat: number; lon: number } } | null> {
  try {
    const encoded = encodeURIComponent(title);
    // Search for the article
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srlimit=3&format=json&origin=*`,
      { headers: { 'User-Agent': 'NexusArchive/1.0 (research bot)' } },
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const hits = searchData?.query?.search ?? [];
    if (hits.length === 0) return null;
    // Pick the best match by title similarity
    const best = hits.reduce((a: {title:string}, b: {title:string}) =>
      jaccard(title, a.title) >= jaccard(title, b.title) ? a : b,
    );
    if (jaccard(title, best.title) < 0.3) return null;

    // Get extract + coordinates
    const pageTitle = encodeURIComponent(best.title);
    const extractRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${pageTitle}&prop=extracts|coordinates&exintro=true&explaintext=true&exsectionformat=plain&format=json&origin=*`,
      { headers: { 'User-Agent': 'NexusArchive/1.0 (research bot)' } },
    );
    if (!extractRes.ok) return null;
    const extractData = await extractRes.json();
    const pages = extractData?.query?.pages ?? {};
    const page  = Object.values(pages)[0] as { extract?: string; coordinates?: { lat: number; lon: number }[]; title?: string } | undefined;
    if (!page?.extract) return null;
    return {
      extract: page.extract.slice(0, 1200),
      url:     `https://en.wikipedia.org/wiki/${pageTitle}`,
      coords:  page.coordinates?.[0],
    };
  } catch { return null; }
}

async function fetchWikidata(title: string): Promise<{ year?: number; coords?: { lat: number; lon: number }; country?: string } | null> {
  try {
    const encoded = encodeURIComponent(title);
    const res = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encoded}&language=en&limit=3&format=json&origin=*`,
      { headers: { 'User-Agent': 'NexusArchive/1.0 (research bot)' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data?.search ?? [];
    if (results.length === 0) return null;
    const best = results.find((r: {label:string}) => jaccard(title, r.label) > 0.4);
    if (!best) return null;
    // Fetch entity details
    const entityRes = await fetch(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${best.id}&props=claims&format=json&origin=*`,
      { headers: { 'User-Agent': 'NexusArchive/1.0 (research bot)' } },
    );
    if (!entityRes.ok) return null;
    const entityData = await entityRes.json();
    const claims = entityData?.entities?.[best.id]?.claims ?? {};
    // P625 = coordinates, P571 = inception, P577 = publication date, P17 = country
    const coords   = claims['P625']?.[0]?.mainsnak?.datavalue?.value;
    const inception = claims['P571']?.[0]?.mainsnak?.datavalue?.value?.time;
    const pubDate   = claims['P577']?.[0]?.mainsnak?.datavalue?.value?.time;
    const timeStr   = inception ?? pubDate;
    let year: number | undefined;
    if (timeStr) {
      const m = timeStr.match(/^[+-]?(\d+)-/);
      if (m) {
        year = parseInt(m[1], 10) * (timeStr.startsWith('-') ? -1 : 1);
      }
    }
    return {
      year,
      coords: coords ? { lat: coords.latitude, lon: coords.longitude } : undefined,
    };
  } catch { return null; }
}

export async function researchNode(
  title: string,
  category: string,
): Promise<ResearchResult> {
  void category; // reserved for future category-specific logic
  const result: ResearchResult = { sources: [], summary: '' };
  const summaryParts: string[] = [];

  await sleep(100); // polite delay

  // Wikipedia lookup
  const wiki = await fetchWikipedia(title);
  if (wiki) {
    result.sources.push({ url: wiki.url, title: `Wikipedia: ${title}`, type: 'wikipedia', excerpt: wiki.extract.slice(0, 200) });
    summaryParts.push(`Wikipedia: ${wiki.extract}`);
    if (!result.description && wiki.extract.length > 100) {
      result.description = wiki.extract.slice(0, 800);
    }
    if (wiki.coords && !result.lat) {
      result.lat = wiki.coords.lat;
      result.lon = wiki.coords.lon;
    }
  }

  await sleep(150);

  // Wikidata lookup
  const wikidata = await fetchWikidata(title);
  if (wikidata) {
    if (wikidata.year != null && !result.year) result.year = wikidata.year;
    if (wikidata.coords && !result.lat) {
      result.lat = wikidata.coords.lat;
      result.lon = wikidata.coords.lon;
    }
    summaryParts.push(`Wikidata: year=${wikidata.year ?? 'unknown'}`);
  }

  result.summary = summaryParts.join('\n\n');
  return result;
}
