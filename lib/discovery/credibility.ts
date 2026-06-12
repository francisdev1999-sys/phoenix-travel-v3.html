import { prisma } from '@/lib/db';

// ── Domain reputation seeds — loaded once per process ────────────────────────

// These are seeded into the DB on first use. Admins can override them.
export const DOMAIN_SEEDS: Record<string, { score: number; type: string; status: string }> = {
  // Government & official
  'gov':           { score: 0.92, type: 'government',  status: 'trusted' },
  'mil':           { score: 0.90, type: 'government',  status: 'trusted' },
  'foia.gov':      { score: 0.95, type: 'government',  status: 'trusted' },
  'archives.gov':  { score: 0.95, type: 'government',  status: 'trusted' },
  'cia.gov':       { score: 0.90, type: 'government',  status: 'trusted' },
  'fbi.gov':       { score: 0.90, type: 'government',  status: 'trusted' },
  'nsa.gov':       { score: 0.90, type: 'government',  status: 'trusted' },
  'nasa.gov':      { score: 0.95, type: 'government',  status: 'trusted' },
  'loc.gov':       { score: 0.95, type: 'government',  status: 'trusted' },
  // Academic TLDs
  'edu':           { score: 0.87, type: 'university',  status: 'trusted' },
  'ac.uk':         { score: 0.87, type: 'university',  status: 'trusted' },
  'ac.au':         { score: 0.85, type: 'university',  status: 'trusted' },
  // High-credibility publishers
  'doi.org':              { score: 0.90, type: 'journal',   status: 'trusted' },
  'nature.com':           { score: 0.96, type: 'journal',   status: 'trusted' },
  'science.org':          { score: 0.96, type: 'journal',   status: 'trusted' },
  'thelancet.com':        { score: 0.95, type: 'journal',   status: 'trusted' },
  'nejm.org':             { score: 0.95, type: 'journal',   status: 'trusted' },
  'cell.com':             { score: 0.95, type: 'journal',   status: 'trusted' },
  'pnas.org':             { score: 0.94, type: 'journal',   status: 'trusted' },
  'plos.org':             { score: 0.88, type: 'journal',   status: 'trusted' },
  'arxiv.org':            { score: 0.82, type: 'journal',   status: 'trusted' },
  'pubmed.ncbi.nlm.nih.gov': { score: 0.93, type: 'government', status: 'trusted' },
  'ncbi.nlm.nih.gov':     { score: 0.92, type: 'government', status: 'trusted' },
  'semanticscholar.org':  { score: 0.85, type: 'journal',   status: 'trusted' },
  'crossref.org':         { score: 0.90, type: 'journal',   status: 'trusted' },
  'openalex.org':         { score: 0.88, type: 'journal',   status: 'trusted' },
  // Museums & cultural institutions
  'si.edu':               { score: 0.93, type: 'museum',    status: 'trusted' },
  'britishmuseum.org':    { score: 0.93, type: 'museum',    status: 'trusted' },
  'louvre.fr':            { score: 0.92, type: 'museum',    status: 'trusted' },
  'metmuseum.org':        { score: 0.93, type: 'museum',    status: 'trusted' },
  // Encyclopedia / reference
  'britannica.com':       { score: 0.82, type: 'other',     status: 'normal'  },
  'wikipedia.org':        { score: 0.65, type: 'other',     status: 'normal'  },
  // Investigative journalism
  'theintercept.com':     { score: 0.75, type: 'news',      status: 'normal'  },
  'propublica.org':       { score: 0.82, type: 'news',      status: 'normal'  },
  'muckrock.com':         { score: 0.80, type: 'news',      status: 'normal'  },
  'bellingcat.com':       { score: 0.78, type: 'news',      status: 'normal'  },
  'reuters.com':          { score: 0.85, type: 'news',      status: 'normal'  },
  'apnews.com':           { score: 0.85, type: 'news',      status: 'normal'  },
  'bbc.co.uk':            { score: 0.83, type: 'news',      status: 'normal'  },
  'bbc.com':              { score: 0.83, type: 'news',      status: 'normal'  },
  'theguardian.com':      { score: 0.80, type: 'news',      status: 'normal'  },
  'nytimes.com':          { score: 0.82, type: 'news',      status: 'normal'  },
};

// Source-type scoring — used when domain lookup fails or as a secondary signal
const SOURCE_TYPE_SCORES: Record<string, number> = {
  academic_paper:          0.85,
  government_document:     0.88,
  declassified_document:   0.88,
  court_record:            0.87,
  museum_archive:          0.86,
  university_publication:  0.84,
  archaeological_report:   0.85,
  scientific_dataset:      0.84,
  official_report:         0.83,
  peer_reviewed_journal:   0.86,
  book:                    0.72,
  documentary:             0.58,
  news_article:            0.62,
  wikipedia:               0.55,
  blog:                    0.30,
  forum:                   0.20,
  social_media:            0.15,
};

// Green-lane source types that qualify for auto-approval
export const GREEN_LANE_TYPES = new Set([
  'academic_paper', 'government_document', 'declassified_document', 'court_record',
  'museum_archive', 'university_publication', 'scientific_dataset',
  'archaeological_report', 'official_report', 'peer_reviewed_journal',
]);

// ── Domain lookup (DB first, seed fallback) ──────────────────────────────────

export async function getDomainScore(domain: string): Promise<number> {
  // Try exact domain match
  const row = await prisma.sourceDomainReputation.findUnique({ where: { domain } }).catch(() => null);
  if (row) {
    if (row.status === 'blocked') return 0.0;
    return row.reputationScore;
  }

  // TLD / suffix match
  const parts = domain.split('.');
  for (let i = 1; i < parts.length; i++) {
    const suffix = parts.slice(i).join('.');
    const seed = DOMAIN_SEEDS[suffix];
    if (seed) return seed.score;
  }

  // Exact seed match
  const exact = DOMAIN_SEEDS[domain];
  if (exact) return exact.score;

  return 0.50; // unknown domain — neutral
}

// ── Credibility scorer ───────────────────────────────────────────────────────

export interface CredibilityResult {
  credibilityScore:  number;
  relevanceScore:    number;
  riskScore:         number;
  credibilityClass:  string;
  autoApprove:       boolean;
}

export async function scoreSource(opts: {
  domain:          string;
  sourceType:      string;
  doi?:            string | null;
  abstract?:       string | null;
  publicationYear?: number | null;
  nodeTitle:       string;
  nodeDescription: string;
  title:           string;
}): Promise<CredibilityResult> {
  const domainScore = await getDomainScore(opts.domain);
  const typeScore   = SOURCE_TYPE_SCORES[opts.sourceType] ?? 0.45;

  // Metadata completeness (0–1)
  let meta = 0;
  if (opts.doi)             meta += 0.35;
  if (opts.abstract)        meta += 0.30;
  if (opts.publicationYear) meta += 0.20;
  if (opts.title.length > 20) meta += 0.15;

  const credibilityScore = Math.min(1, domainScore * 0.45 + typeScore * 0.35 + meta * 0.20);

  // Relevance: simple keyword overlap between source title/abstract and node title/description
  const nodeWords  = new Set(`${opts.nodeTitle} ${opts.nodeDescription}`.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const srcWords   = `${opts.title} ${opts.abstract ?? ''}`.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const overlap    = srcWords.filter(w => nodeWords.has(w)).length;
  const relevanceScore = Math.min(1, overlap / Math.max(nodeWords.size * 0.3, 1));

  // Risk: inversely proportional to credibility, penalise unknown domain
  const riskScore = Math.max(0, 1 - credibilityScore - relevanceScore * 0.15);

  const credibilityClass =
    credibilityScore >= 0.85 ? 'trusted'
    : credibilityScore >= 0.70 ? 'likely_trusted'
    : credibilityScore >= 0.50 ? 'uncertain'
    : credibilityScore >= 0.30 ? 'weak'
    : 'suspicious';

  const autoApprove =
    credibilityScore  >= 0.85 &&
    relevanceScore    >= 0.75 &&
    riskScore         <= 0.15 &&
    GREEN_LANE_TYPES.has(opts.sourceType);

  return { credibilityScore, relevanceScore, riskScore, credibilityClass, autoApprove };
}

// ── Seed known domains on first use ─────────────────────────────────────────

export async function seedDomainReputations() {
  const existing = await prisma.sourceDomainReputation.count();
  if (existing > 0) return; // Already seeded

  const rows = Object.entries(DOMAIN_SEEDS).map(([domain, d]) => ({
    domain,
    institutionType: d.type,
    reputationScore: d.score,
    status:          d.status,
    notes:           'auto-seeded',
  }));

  await prisma.sourceDomainReputation.createMany({ data: rows, skipDuplicates: true });
}
