export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse, after } from 'next/server';
import { computeRabbitHoleFromDB } from '@/lib/retrieval/rabbit-hole';
import { nodes as staticNodes, edges as staticEdges } from '@/lib/graph';
import { computeRabbitHole } from '@/lib/rabbit-hole';
import { getOrGenerateNarrative } from '@/lib/ai/rabbit-hole-narrative';
import type { GraphNode, NodeCategory, EvidenceLevel, DatePrecision, ResearchSource } from '@/lib/graph/types';
import type { SourceRecord } from '@/lib/source-types';

const STATIC_DATE = '2024-01-01T00:00:00.000Z';

function staticSourcesToRecords(nodeId: string, sources: ResearchSource[]): SourceRecord[] {
  return sources.map(s => ({
    id:               `static:${nodeId}:${s.id}`,
    title:            s.title,
    sourceType:       s.source_type,
    author:           s.author ?? null,
    publicationYear:  s.publication_year ?? null,
    publisher:        null,
    journal:          null,
    volume:           null,
    issue:            null,
    pages:            null,
    url:              s.url ?? null,
    doi:              null,
    isbn:             null,
    abstract:         null,
    notes:            s.notes ?? null,
    language:         'en',
    credibilityScore: s.credibility_score,
    status:           'approved',
    reviewNotes:      null,
    reviewedAt:       null,
    submittedBy:      null,
    reviewedBy:       null,
    createdAt:        STATIC_DATE,
    updatedAt:        STATIC_DATE,
    links:            [],
    submitter:        null,
  }));
}

type Params = { params: Promise<{ nodeId: string }> };

// Build a lookup once per request from the static node array.
// When a DB node is missing fields the frontend expects (category,
// evidence_level snake_case, description, etc.) we fall back to the
// matching static node, or synthesise safe defaults.
function makeNodeMap(): Map<string, GraphNode> {
  return new Map(staticNodes.map(n => [n.id, n]));
}

function normaliseNode(raw: unknown, map: Map<string, GraphNode>): GraphNode {
  const n = raw as Record<string, unknown>;
  const staticNode = map.get(n.id as string);
  if (staticNode) return staticNode;
  // DB-only node: map camelCase → snake_case and fill missing fields
  return {
    id:              n.id as string,
    title:           (n.title ?? n.id) as string,
    category:        (n.category ?? 'Global Mysteries') as NodeCategory,
    description:     (n.description ?? '') as string,
    evidence_level:  (n.evidence_level ?? n.evidenceLevel ?? 'speculative') as EvidenceLevel,
    confidence_score:(n.confidence_score ?? n.confidenceScore ?? 0.5) as number,
    color:           (n.color ?? '#7c3aed') as string,
    icon:            (n.icon ?? '◈') as string,
    tags:            (n.tags ?? []) as string[],
    claims:          (n.claims ?? []) as string[],
    criticisms:      (n.criticisms ?? []) as string[],
    open_questions:  (n.open_questions ?? []) as string[],
    mainstream_view: (n.mainstream_view ?? '') as string,
    coordinates:     n.lat != null ? [n.lat as number, n.lon as number] : undefined,
    region:          n.region as string | undefined,
    country:         n.country as string | undefined,
    year:            n.year as number | undefined,
    date_start:      (n.date_start ?? n.dateStart) as number | undefined,
    date_end:        (n.date_end ?? n.dateEnd) as number | undefined,
    date_precision:  n.date_precision as DatePrecision | undefined,
    sources:         [] as GraphNode['sources'],
  };
}

// Walk the RabbitHoleData object and replace every node reference with
// a fully-normalised GraphNode so the frontend never sees missing fields.
function enrichResponse(data: unknown, map: Map<string, GraphNode>): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as Record<string, unknown>;

  const result: Record<string, unknown> = { ...d };

  if (d.node) result.node = normaliseNode(d.node, map);

  if (Array.isArray(d.connections)) {
    result.connections = d.connections.map((c: unknown) => {
      const conn = c as Record<string, unknown>;
      return { ...conn, node: normaliseNode(conn.node, map) };
    });
  }

  if (Array.isArray(d.locations)) {
    result.locations = d.locations.map((l: unknown) => {
      const loc = l as Record<string, unknown>;
      return { ...loc, node: normaliseNode(loc.node, map) };
    });
  }

  if (Array.isArray(d.timelines)) {
    result.timelines = d.timelines.map((t: unknown) => {
      const tl = t as Record<string, unknown>;
      return { ...tl, node: normaliseNode(tl.node, map) };
    });
  }

  if (Array.isArray(d.paths)) {
    result.paths = d.paths.map((p: unknown) => {
      const path = p as Record<string, unknown>;
      if (!Array.isArray(path.steps)) return path;
      return {
        ...path,
        steps: path.steps.map((s: unknown) => {
          const step = s as Record<string, unknown>;
          return { ...step, node: normaliseNode(step.node, map) };
        }),
      };
    });
  }

  return result;
}

async function buildNarrative(
  nodeId: string,
  nodeData: GraphNode,
  rawData: unknown,
): Promise<string | null> {
  try {
    const d = rawData as Record<string, unknown>;
    const connections: Array<{ title: string; relationshipType: string; explanation: string }> = [];

    if (Array.isArray(d.connections)) {
      for (const c of d.connections as Array<Record<string, unknown>>) {
        const n = c.node as Record<string, unknown> | undefined;
        if (n?.title && c.relationship_type) {
          connections.push({
            title:            String(n.title),
            relationshipType: String(c.relationship_type),
            explanation:      String(c.explanation ?? '').slice(0, 150),
          });
        }
      }
    }

    return await getOrGenerateNarrative({
      nodeId,
      title:         nodeData.title,
      description:   nodeData.description,
      evidenceLevel: nodeData.evidence_level,
      connections,
    });
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { nodeId } = await params;
  const nodeMap = makeNodeMap();

  // If the node exists in the static graph, always serve static data.
  // Static data has all 58 edges fully connected; the DB may have the node
  // published but edges unpublished (seeding lag), which would yield empty
  // connections from the DB path.  Static is always authoritative for the
  // 42 bundled nodes.
  const memData = computeRabbitHole(nodeId, staticNodes, staticEdges);
  if (memData) {
    // Seed sources from the static graph first so they always appear.
    const staticNode = nodeMap.get(nodeId);
    const staticSources: SourceRecord[] = staticNode?.sources?.length
      ? staticSourcesToRecords(nodeId, staticNode.sources)
      : [];

    // Also attempt to attach sources from DB, but don't fail if DB is down.
    let dbSources: unknown[] = [];
    let sourceCountMap: Record<string, number> = {};
    try {
      const dbData = await computeRabbitHoleFromDB(nodeId);
      if (dbData) {
        const d = dbData as unknown as Record<string, unknown>;
        dbSources      = d.sources as unknown[] ?? [];
        sourceCountMap = d.sourceCountMap as Record<string, number> ?? {};
      }
    } catch {
      // DB unavailable — serve static without DB sources
    }

    // DB sources first (user-submitted & reviewed), then static curated sources.
    // Deduplicate by id so a source that was also added via the DB form doesn't appear twice.
    const dbIds = new Set((dbSources as Array<{ id?: string }>).map(s => s.id));
    const mergedSources = [
      ...dbSources,
      ...staticSources.filter(s => !dbIds.has(s.id)),
    ];

    // Update sourceCountMap to reflect static sources for neighbour nodes too.
    for (const n of staticNodes) {
      if (n.sources?.length && !(n.id in sourceCountMap)) {
        sourceCountMap[n.id] = n.sources.length;
      }
    }

    const enriched = enrichResponse({ ...memData, sources: mergedSources, sourceCountMap }, nodeMap);
    if (staticNode) after(() => void buildNarrative(nodeId, staticNode, enriched));
    return NextResponse.json(enriched as object);
  }

  // Node is not in the static graph — try DB (DB-only nodes, future additions)
  let dbData = null;
  try {
    dbData = await computeRabbitHoleFromDB(nodeId);
  } catch (err) {
    console.warn('[rabbit-hole] DB unavailable, falling back to 404:', err);
  }

  if (dbData) {
    const enriched = enrichResponse(dbData, nodeMap);
    const nodeData = (enriched as Record<string, unknown>).node as GraphNode | undefined;
    if (nodeData) after(() => void buildNarrative(nodeId, nodeData, enriched));
    return NextResponse.json(enriched as object);
  }

  return NextResponse.json({ error: 'Node not found' }, { status: 404 });
}
