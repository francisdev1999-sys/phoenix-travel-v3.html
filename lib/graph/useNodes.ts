'use client';
import { useState, useEffect } from 'react';
import { nodes as staticNodes } from '@/lib/graph/nodes';
import { edges as staticEdges } from '@/lib/graph/edges';
import type { GraphNode, GraphEdge } from '@/lib/graph/types';

// ── Module-level cache ───────────────────────────────────────────────────────
// One /api/graph fetch per browser session, shared across all hook instances.
// Initial renders always use static data (no loading flash), DB-approved nodes
// are merged in after the fetch and all mounted components re-render.

let cachedNodes: GraphNode[] | null = null;
let cachedEdges: GraphEdge[] | null = null;
let fetchState: 'idle' | 'loading' | 'done' = 'idle';
const nodeSubscribers = new Set<() => void>();
const edgeSubscribers = new Set<() => void>();

function mergeNodes(base: GraphNode[], dbNodes: GraphNode[]): GraphNode[] {
  const map = new Map(base.map(n => [n.id, n]));
  dbNodes.forEach(n => map.set(n.id, n)); // DB wins on conflict
  return [...map.values()];
}

function mergeEdges(base: GraphEdge[], dbEdges: GraphEdge[]): GraphEdge[] {
  const map = new Map(base.map(e => [e.id, e]));
  dbEdges.forEach(e => map.set(e.id, e));
  return [...map.values()];
}

function loadGraph() {
  if (fetchState !== 'idle') return;
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

    if (fetchState === 'idle') loadGraph();
    else if (fetchState === 'done' && cachedNodes) setNodes(cachedNodes);

    return () => { nodeSubscribers.delete(refresh); };
  }, []);

  return nodes;
}

export function useEdges(): GraphEdge[] {
  const [edges, setEdges] = useState<GraphEdge[]>(() => cachedEdges ?? staticEdges);

  useEffect(() => {
    const refresh = () => setEdges(cachedEdges ?? staticEdges);
    edgeSubscribers.add(refresh);

    if (fetchState === 'idle') loadGraph();
    else if (fetchState === 'done' && cachedEdges) setEdges(cachedEdges);

    return () => { edgeSubscribers.delete(refresh); };
  }, []);

  return edges;
}
