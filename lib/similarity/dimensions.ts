import { GraphNode, GraphEdge, EvidenceLevel } from '@/lib/graph/types';

export interface DimensionScore {
  score:    number; // 0–1
  rationale: string;
}

const EVIDENCE_RANK: Record<EvidenceLevel, number> = {
  verified:        5,
  strong_evidence: 4,
  debated:         3,
  speculative:     2,
  mythological:    1,
};

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  a.forEach(x => { if (b.has(x)) inter++; });
  return inter / (a.size + b.size - inter);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CATEGORY_GROUPS: string[][] = [
  ['Ancient Civilization', 'Ancient Site', 'Artifact', 'Ancient Text', 'Ancient Technology', 'Forbidden Archaeology', 'Alternative History', 'Lost Knowledge'],
  ['Religion', 'Mythology', 'Symbolism', 'Esoterica'],
  ['UFO / UAP', 'Extraterrestrial Hypothesis'],
  ['Government Program', 'Government Secrecy', 'Intelligence Operation', 'Secret Project'],
  ['Conspiracy Theory', 'Historical Controversy', 'Whistleblower'],
  ['Disease & Pandemic', 'Unexplained Phenomenon', 'Modern Mystery'],
];

function categorySim(catA: string, catB: string): number {
  if (catA === catB) return 1.0;
  for (const g of CATEGORY_GROUPS) {
    if (g.includes(catA) && g.includes(catB)) return 0.5;
  }
  return 0.1;
}

const STOP = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','is','was','are','were','be','been','that','this','it','its','by','from','as','have','had','not','which','who','their','they','has','would','could','when','where','what','how','also','into','more','most','some','other','about','than','then','so','such','may','can','being','these','those','while','during','after','before']);

function keywords(desc: string): Set<string> {
  return new Set(
    desc.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 4 && !STOP.has(w)),
  );
}

// ── 1. Thematic ────────────────────────────────────────────────────────────────

export function thematicSimilarity(a: GraphNode, b: GraphNode): DimensionScore {
  const cat  = categorySim(a.category, b.category);
  const tagA = new Set(a.tags.map(t => t.toLowerCase()));
  const tagB = new Set(b.tags.map(t => t.toLowerCase()));
  const tags = jaccard(tagA, tagB);
  const kw   = jaccard(keywords(a.description), keywords(b.description));
  const score = cat * 0.4 + tags * 0.4 + kw * 0.2;
  const rationale =
    cat === 1.0
      ? `Same category (${a.category}); tag overlap ${Math.round(tags * 100)}%`
      : cat > 0.1
      ? `Related categories; tag overlap ${Math.round(tags * 100)}%`
      : `Different categories; keyword overlap ${Math.round(kw * 100)}%`;
  return { score, rationale };
}

// ── 2. Timeline ────────────────────────────────────────────────────────────────

export function timelineSimilarity(a: GraphNode, b: GraphNode): DimensionScore {
  const aS = a.date_start ?? a.year;
  const aE = a.date_end ?? a.year;
  const bS = b.date_start ?? b.year;
  const bE = b.date_end ?? b.year;

  if (aS === undefined || bS === undefined) {
    return { score: 0.3, rationale: 'Insufficient temporal data for comparison' };
  }

  const aEnd = aE ?? aS;
  const bEnd = bE ?? bS;
  const oStart = Math.max(aS, bS);
  const oEnd   = Math.min(aEnd, bEnd);

  if (oStart <= oEnd) {
    const overlapYrs = oEnd - oStart;
    const spanMin    = Math.max(1, Math.min(Math.abs(aEnd - aS), Math.abs(bEnd - bS)));
    const ratio      = Math.min(1, overlapYrs / spanMin);
    return { score: Math.min(1, 0.6 + ratio * 0.4), rationale: `~${overlapYrs} year overlap` };
  }

  const gapYrs = oStart - oEnd;
  const score  = Math.max(0, 1 - gapYrs / 5000);
  const label  = gapYrs >= 100 ? `${Math.round(gapYrs / 100)} centuries apart` : `${gapYrs} year gap`;
  return { score, rationale: label };
}

// ── 3. Geographic ──────────────────────────────────────────────────────────────

export function geographicSimilarity(a: GraphNode, b: GraphNode): DimensionScore {
  if (a.coordinates && b.coordinates) {
    const km    = haversineKm(a.coordinates[0], a.coordinates[1], b.coordinates[0], b.coordinates[1]);
    const score = Math.max(0, 1 - km / 10000);
    return { score, rationale: `${Math.round(km).toLocaleString()} km apart` };
  }
  if (a.country && b.country && a.country.toLowerCase() === b.country.toLowerCase()) {
    return { score: 0.7, rationale: `Same country (${a.country})` };
  }
  if (a.region && b.region && a.region.toLowerCase() === b.region.toLowerCase()) {
    return { score: 0.6, rationale: `Same region (${a.region})` };
  }
  if (a.country && b.country) {
    return { score: 0.1, rationale: `Different countries (${a.country} vs ${b.country})` };
  }
  return { score: 0.3, rationale: 'Insufficient geographic data' };
}

// ── 4. Source ──────────────────────────────────────────────────────────────────

export function sourceSimilarity(a: GraphNode, b: GraphNode): DimensionScore {
  const sA = a.sources ?? [];
  const sB = b.sources ?? [];
  if (sA.length === 0 && sB.length === 0) {
    return { score: 0.3, rationale: 'Neither node has catalogued sources' };
  }
  const typesA = new Set(sA.map(s => s.source_type));
  const typesB = new Set(sB.map(s => s.source_type));
  const typeJ  = jaccard(typesA, typesB);
  const authA  = new Set(sA.filter(s => s.author).map(s => s.author!.toLowerCase().trim()));
  const authB  = new Set(sB.filter(s => s.author).map(s => s.author!.toLowerCase().trim()));
  const authJ  = authA.size + authB.size > 0 ? jaccard(authA, authB) : 0;
  const score  = typeJ * 0.6 + authJ * 0.4;
  const shared = [...authA].filter(x => authB.has(x));
  const rationale = shared.length > 0
    ? `Source type overlap ${Math.round(typeJ * 100)}%; shared authors: ${shared.slice(0, 2).join(', ')}`
    : `Source type overlap ${Math.round(typeJ * 100)}%`;
  return { score, rationale };
}

// ── 5. Evidence ────────────────────────────────────────────────────────────────

export function evidenceSimilarity(a: GraphNode, b: GraphNode): DimensionScore {
  const rA = EVIDENCE_RANK[a.evidence_level] ?? 3;
  const rB = EVIDENCE_RANK[b.evidence_level] ?? 3;
  const levelScore = 1 - Math.abs(rA - rB) / 4;
  const confScore  = 1 - Math.abs(a.confidence_score - b.confidence_score) * 0.3;
  const score      = levelScore * 0.7 + confScore * 0.3;
  const rationale  =
    rA === rB
      ? `Same evidence level (${a.evidence_level}); confidence delta ${Math.round(Math.abs(a.confidence_score - b.confidence_score) * 100)}%`
      : `${Math.abs(rA - rB)} level(s) apart (${a.evidence_level} vs ${b.evidence_level})`;
  return { score, rationale };
}

// ── 6. Entity ──────────────────────────────────────────────────────────────────

export function entitySimilarity(a: GraphNode, b: GraphNode): DimensionScore {
  const eA = new Set([
    ...a.tags.map(t => t.toLowerCase()),
    ...(a.country ? [a.country.toLowerCase()] : []),
    ...(a.region  ? [a.region.toLowerCase()]  : []),
  ]);
  const eB = new Set([
    ...b.tags.map(t => t.toLowerCase()),
    ...(b.country ? [b.country.toLowerCase()] : []),
    ...(b.region  ? [b.region.toLowerCase()]  : []),
  ]);
  const score  = jaccard(eA, eB);
  const shared = [...eA].filter(x => eB.has(x));
  const rationale = shared.length > 0
    ? `Shared entities: ${shared.slice(0, 3).join(', ')}`
    : 'No shared named entities';
  return { score, rationale };
}

// ── 7. Relationship ────────────────────────────────────────────────────────────

export function relationshipSimilarity(a: GraphNode, b: GraphNode, edges: GraphEdge[]): DimensionScore {
  const nA = new Set<string>();
  const nB = new Set<string>();
  for (const e of edges) {
    if (e.from === a.id) nA.add(e.to);
    if (e.to   === a.id) nA.add(e.from);
    if (e.from === b.id) nB.add(e.to);
    if (e.to   === b.id) nB.add(e.from);
  }
  nA.delete(b.id);
  nB.delete(a.id);

  if (nA.size === 0 && nB.size === 0) {
    return { score: 0.1, rationale: 'Neither node has graph connections' };
  }

  const score   = jaccard(nA, nB);
  const shared  = [...nA].filter(id => nB.has(id)).length;
  const rationale = shared > 0
    ? `${shared} shared neighbor(s) in knowledge graph`
    : `No shared neighbors (${nA.size} vs ${nB.size} connections)`;
  return { score, rationale };
}
