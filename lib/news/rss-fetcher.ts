export interface RssItem {
  title:       string;
  url:         string;
  description: string;
  publishedAt: Date;
  imageUrl:    string | null;
}

// ── Tiny RSS / Atom parser (no dependencies) ──────────────────────────────────

function stripCDATA(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m  = xml.match(re);
  return m ? stripCDATA(m[1]).trim() : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
  const m  = xml.match(re);
  return m ? m[1] : '';
}

function parseDate(raw: string): Date {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseItems(xml: string): RssItem[] {
  const itemTag = xml.includes('<entry>') ? 'entry' : 'item';
  const blocks  = xml.split(new RegExp(`<${itemTag}[\\s>]`)).slice(1);

  return blocks.map(block => {
    const title = stripHtml(extractTag(block, 'title'));

    let url = extractTag(block, 'link').trim();
    if (!url || url.startsWith('<')) url = extractAttr(block, 'link', 'href');

    const desc = stripHtml(
      extractTag(block, 'description') ||
      extractTag(block, 'content:encoded') ||
      extractTag(block, 'summary') ||
      extractTag(block, 'content')
    );

    const pubRaw =
      extractTag(block, 'pubDate') ||
      extractTag(block, 'published') ||
      extractTag(block, 'updated') ||
      extractTag(block, 'dc:date');

    let imageUrl: string | null =
      extractAttr(block, 'media:thumbnail', 'url') ||
      extractAttr(block, 'enclosure', 'url') ||
      extractAttr(block, 'media:content', 'url') ||
      null;
    if (imageUrl && !imageUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)) imageUrl = null;

    return { title, url, description: desc, publishedAt: parseDate(pubRaw), imageUrl };
  }).filter(i => i.title && i.url.startsWith('http'));
}

// ── Feed definitions ──────────────────────────────────────────────────────────

interface FeedDef {
  name:     string;
  url:      string;
  siteUrl:  string;
  category: string;
  keywords: string[] | null;
}

// Categories mirror the archive's node categories for cross-linking
const FEEDS: FeedDef[] = [

  // ══ UFO / UAP ══
  {
    name: 'The War Zone',
    url: 'https://www.thedrive.com/the-war-zone/rss',
    siteUrl: 'https://www.thedrive.com/the-war-zone',
    category: 'ufo',
    keywords: null,
  },
  {
    name: 'Open Minds UFO',
    url: 'https://www.openminds.tv/feed/',
    siteUrl: 'https://www.openminds.tv',
    category: 'ufo',
    keywords: null,
  },
  {
    name: 'Space.com',
    url: 'https://www.space.com/feeds/all',
    siteUrl: 'https://www.space.com',
    category: 'ufo',
    keywords: ['ufo', 'uap', 'alien', 'extraterrestrial', 'oumuamua', 'seti', 'signal',
               'interstellar', 'anomaly', 'unexplained', 'pentagon', 'fermi'],
  },

  // ══ Government / FOIA / Intelligence ══
  {
    name: 'The Black Vault',
    url: 'https://www.theblackvault.com/documentarchive/feed/',
    siteUrl: 'https://www.theblackvault.com',
    category: 'government',
    keywords: null,
  },
  {
    name: 'MuckRock',
    url: 'https://www.muckrock.com/news/feed/',
    siteUrl: 'https://www.muckrock.com',
    category: 'government',
    keywords: null,
  },
  {
    name: 'The Intercept',
    url: 'https://theintercept.com/feed/?rss=1',
    siteUrl: 'https://theintercept.com',
    category: 'government',
    keywords: ['cia', 'nsa', 'fbi', 'surveillance', 'classified', 'intelligence', 'whistleblower',
               'secret', 'pentagon', 'military', 'ufo', 'uap', 'conspiracy', 'cover', 'covert',
               'operation', 'declassified'],
  },
  {
    name: 'Bellingcat',
    url: 'https://www.bellingcat.com/feed/',
    siteUrl: 'https://www.bellingcat.com',
    category: 'government',
    keywords: ['intelligence', 'secret', 'classified', 'operation', 'spy', 'military',
               'surveillance', 'cover-up', 'disinformation', 'propaganda'],
  },

  // ══ Conspiracy / Deep State ══
  {
    name: 'Mysterious Universe',
    url: 'https://mysteriousuniverse.org/feed/',
    siteUrl: 'https://mysteriousuniverse.org',
    category: 'conspiracy',
    keywords: null,
  },
  {
    name: 'Activist Post',
    url: 'https://www.activistpost.com/feed',
    siteUrl: 'https://www.activistpost.com',
    category: 'conspiracy',
    keywords: ['surveillance', 'deep state', 'secret', 'cover-up', 'conspiracy', 'government',
               'agenda', 'hidden', 'control', 'censored', 'suppressed', 'elite'],
  },

  // ══ Ancient Civilizations / Archaeology ══
  {
    name: 'Ancient Origins',
    url: 'https://www.ancient-origins.net/rss.xml',
    siteUrl: 'https://www.ancient-origins.net',
    category: 'archaeology',
    keywords: null,
  },
  {
    name: 'Archaeology Magazine',
    url: 'https://www.archaeology.org/rss/news',
    siteUrl: 'https://www.archaeology.org',
    category: 'archaeology',
    keywords: null,
  },
  {
    name: 'HeritageDaily',
    url: 'https://www.heritagedaily.com/feed',
    siteUrl: 'https://www.heritagedaily.com',
    category: 'archaeology',
    keywords: null,
  },
  {
    name: 'ScienceDaily',
    url: 'https://www.sciencedaily.com/rss/top/science.xml',
    siteUrl: 'https://www.sciencedaily.com',
    category: 'archaeology',
    keywords: ['ancient', 'archaeology', 'civilization', 'fossil', 'prehistoric', 'neolithic',
               'bronze age', 'artifact', 'ruins', 'discovery', 'tomb', 'burial', 'pyramid',
               'megalith', 'migration', 'genome', 'dna', 'extinct'],
  },

  // ══ Science Mysteries / Phenomena ══
  {
    name: 'LiveScience',
    url: 'https://www.livescience.com/feeds/all',
    siteUrl: 'https://www.livescience.com',
    category: 'science',
    keywords: ['ufo', 'uap', 'mystery', 'unexplained', 'missing', 'ancient', 'paranormal',
               'alien', 'extraterrestrial', 'bizarre', 'strange', 'anomaly', 'phenomenon',
               'consciousness', 'quantum', 'dark matter', 'simulation', 'multiverse',
               'near death', 'ball lightning', 'havana syndrome'],
  },
  {
    name: 'New Scientist',
    url: 'https://www.newscientist.com/feed/home/',
    siteUrl: 'https://www.newscientist.com',
    category: 'science',
    keywords: ['mystery', 'unexplained', 'anomaly', 'quantum', 'consciousness', 'dark matter',
               'dark energy', 'fermi paradox', 'simulation', 'ufo', 'uap', 'alien life',
               'astrobiology', 'ancient dna', 'pandemic', 'virus'],
  },

  // ══ Missing Persons / Whistleblowers ══
  {
    name: 'The Guardian',
    url: 'https://www.theguardian.com/world/rss',
    siteUrl: 'https://www.theguardian.com',
    category: 'missing',
    keywords: ['missing scientist', 'missing researcher', 'disappeared', 'found dead',
               'whistleblower', 'suicide', 'mysterious death', 'assassinated', 'journalist killed',
               'poisoned', 'arkancide', 'cover-up death'],
  },

  // ══ Disease & Pandemics ══
  {
    name: 'ScienceDaily Health',
    url: 'https://www.sciencedaily.com/rss/health_medicine/infectious_disease.xml',
    siteUrl: 'https://www.sciencedaily.com',
    category: 'pandemic',
    keywords: null,
  },
  {
    name: 'STAT News',
    url: 'https://www.statnews.com/feed/',
    siteUrl: 'https://www.statnews.com',
    category: 'pandemic',
    keywords: ['outbreak', 'pandemic', 'virus', 'pathogen', 'lab leak', 'bioweapon',
               'long covid', 'gain of function', 'origin', 'cover-up', 'suppressed'],
  },

  // ══ Symbolism / Esoterica / Religion ══
  {
    name: 'Mysterious Universe',
    url: 'https://mysteriousuniverse.org/category/esoterica/feed/',
    siteUrl: 'https://mysteriousuniverse.org',
    category: 'esoterica',
    keywords: null,
  },
];

// ── Keyword relevance filter ──────────────────────────────────────────────────

export function isRelevant(item: RssItem, keywords: string[] | null): boolean {
  if (!keywords) return true;
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  return keywords.some(k => haystack.includes(k));
}

// ── Fetch one feed with timeout ───────────────────────────────────────────────

export interface FetchedItem extends RssItem {
  source:   string;
  siteUrl:  string;
  category: string;
}

async function fetchFeed(feed: FeedDef): Promise<FetchedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(feed.url, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'NexusArchive/1.0 RSS Reader (+https://nexusarchive.up.railway.app)' },
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[news] ${feed.name} responded ${res.status}`);
      return [];
    }

    const xml   = await res.text();
    const items = parseItems(xml);

    return items
      .filter(i => isRelevant(i, feed.keywords))
      .map(i => ({ ...i, source: feed.name, siteUrl: feed.siteUrl, category: feed.category }));
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[news] ${feed.name} fetch failed: ${msg}`);
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchAllFeeds(): Promise<FetchedItem[]> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all: FetchedItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  const seen = new Set<string>();
  return all.filter(i => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });
}
