export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { computeRabbitHoleFromDB } from '@/lib/retrieval/rabbit-hole';
import { nodes as staticNodes, edges as staticEdges } from '@/lib/graph';
import { computeRabbitHole } from '@/lib/rabbit-hole';
import type { GraphNode, NodeCategory, EvidenceLevel, DatePrecision } from '@/lib/graph/types';

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
    // Also attempt to attach sources from DB, but don't fail if DB is down.
    let sources: unknown[] = [];
    let sourceCountMap: Record<string, number> = {};
    try {
      const dbData = await computeRabbitHoleFromDB(nodeId);
      if (dbData) {
        const d = dbData as unknown as Record<string, unknown>;
        sources       = d.sources as unknown[] ?? [];
        sourceCountMap = d.sourceCountMap as Record<string, number> ?? {};
      }
    } catch {
      // DB unavailable — serve static without sources
    }
    return NextResponse.json(
      enrichResponse({ ...memData, sources, sourceCountMap }, nodeMap)
    );
  }

  // Node is not in the static graph — try DB (DB-only nodes, future additions)
  let dbData = null;
  try {
    dbData = await computeRabbitHoleFromDB(nodeId);
  } catch (err) {
    console.warn('[rabbit-hole] DB unavailable, falling back to 404:', err);
  }

  if (dbData) return NextResponse.json(enrichResponse(dbData, nodeMap));

  return NextResponse.json({ error: 'Node not found' }, { status: 404 });
}
