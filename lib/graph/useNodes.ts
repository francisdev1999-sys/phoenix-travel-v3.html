'use client';
import { useState, useEffect } from 'react';
import { nodes as staticNodes } from '@/lib/graph';
import { edges as staticEdges } from '@/lib/graph/edges';
import type { GraphNode, GraphEdge } from '@/lib/graph/types';

// ── Module-level cache ───────────────────────────────────────────────────────
// Initial renders use static data (no loading flash).
// DB-approved nodes (including AI-discovered) are merged after fetch.
// Data is considered stale after STALE_MS — the next mount triggers a refetch
// so new nodes appear automatically without a full page reload.

const STALE_MS = 5 * 60 * 1000; // 5 minutes

let cachedNodes: GraphNode[] | null = null;
let cachedEdges: GraphEdge[] | null = null;
let fetchState: 'idle' | 'loading' | 'done' = 'idle';
let lastFetched = 0;
const nodeSubscribers = new Set<() => void>();
const edgeSubscribers = new Set<() => void>();

function mergeNodes(base: GraphNode[], dbNodes: GraphNode[]): GraphNode[] {
  const map = new Map(base.map(n => [n.id, n]));
  dbNodes.forEach(n => {
    if (map.has(n.id)) {
      // Enrich static node with DB metadata only — keep static rich-content fields
      // (claims, criticisms, description, etc.) since DB nodes are minimal snapshots
      const existing = map.get(n.id)!;
      map.set(n.id, {
        ...existing,
        // Only update fields the DB reliably tracks
        evidence_level:   n.evidence_level   ?? existing.evidence_level,
        confidence_score: n.confidence_score ?? existing.confidence_score,
        color:            n.color            ?? existing.color,
        icon:             n.icon             ?? existing.icon,
      });
    } else {
      // New DB-only node: spread DB data then enforce safe types for rich fields
      map.set(n.id, {
        ...n,
        claims:          Array.isArray(n.claims)     ? (n.claims as string[])     : [],
        criticisms:      Array.isArray(n.criticisms) ? (n.criticisms as string[]) : [],
        tags:            Array.isArray(n.tags)        ? (n.tags as string[])       : [],
        description:     typeof n.description === 'string' ? n.description : (n.title ?? ''),
        mainstream_view: typeof n.mainstream_view === 'string' ? n.mainstream_view : '',
        open_questions:  Array.isArray(n.open_questions) ? n.open_questions : undefined,
        sources:         Array.isArray(n.sources) ? n.sources : [],
      });
    }
  });
  return [...map.values()];
}

function mergeEdges(base: GraphEdge[], dbEdges: GraphEdge[]): GraphEdge[] {
  const map = new Map(base.map(e => [e.id, e]));
  dbEdges.forEach(e => map.set(e.id, e));
  return [...map.values()];
}

function loadGraph() {
  const now = Date.now();
  if (fetchState === 'loading') return;
  if (fetchState === 'done' && now - lastFetched < STALE_MS) return;
  fetchState = 'loading';

  fetch('/api/graph')
    .then(r => r.json())
    .then((data: { nodes?: GraphNode[]; edges?: GraphEdge[] }) => {
      if (data.nodes?.length) {
        cachedNodes = mergeNodes(staticNodes, data.nodes);
      }
      if (data.edges?.length) {
        cachedEdges = mergeEdges(staticEdges, data.edges);
      }
      lastFetched = Date.now();
      fetchState = 'done';
      nodeSubscribers.forEach(fn => fn());
      edgeSubscribers.forEach(fn => fn());
    })
    .catch(() => {
      fetchState = 'idle'; // allow retry on next mount
    });
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useNodes(): GraphNode[] {
  const [nodes, setNodes] = useState<GraphNode[]>(() => cachedNodes ?? staticNodes);

  useEffect(() => {
    const refresh = () => setNodes(cachedNodes ?? staticNodes);
    nodeSubscribers.add(refresh);

    loadGraph();
    if (fetchState === 'done' && cachedNodes) setNodes(cachedNodes);

    return () => { nodeSubscribers.delete(refresh); };
  }, []);

  return nodes;
}

export function useEdges(): GraphEdge[] {
  const [edges, setEdges] = useState<GraphEdge[]>(() => cachedEdges ?? staticEdges);

  useEffect(() => {
    const refresh = () => setEdges(cachedEdges ?? staticEdges);
    edgeSubscribers.add(refresh);

    loadGraph();
    if (fetchState === 'done' && cachedEdges) setEdges(cachedEdges);

    return () => { edgeSubscribers.delete(refresh); };
  }, []);

  return edges;
}
