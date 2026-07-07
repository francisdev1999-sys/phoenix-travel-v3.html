'use client';
/**
 * Compare — side-by-side comparison of two topics.
 *
 * Pick Topic A and Topic B; each is rendered as an accent-tinted card with a
 * dense comparison table (category, region, evidence, era, location, claim /
 * criticism / connection / source counts, tags, confidence). Numeric rows
 * highlight the higher value between the two. Below, a Relationship panel shows
 * any direct edge, a Connect hand-off when there is none, and shared neighbours.
 *
 * Runs entirely on the client graph store (static + DB-merged nodes/edges).
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Link2, GitBranch, ArrowRight, Share2 } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { useNodes, useEdges } from '@/lib/graph/useNodes';
import type { GraphNode, GraphEdge, EvidenceLevel } from '@/lib/graph/types';

// ── Design tokens ─────────────────────────────────────────────────────────────

const VIOLET = '#7c3aed';
const CYAN   = '#22d3ee';
const HIGHER = '#22c55e';

const EVIDENCE_COLORS: Record<EvidenceLevel, string> = {
  verified:        '#22c55e',
  strong_evidence: '#06b6d4',
  debated:         '#eab308',
  speculative:     '#f59e0b',
  mythological:    '#ef4444',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  historical:              '#f59e0b',
  textual:                 '#6366f1',
  geographical:            '#22c55e',
  influence:               '#06b6d4',
  thematic:                '#a855f7',
  contradictory:           '#ef4444',
  alternative_explanation: '#f97316',
  criticism:               '#fb7185',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function humanize(s: string): string {
  return s.replace(/_/g, ' ');
}

function formatEra(year: number | undefined): string {
  if (year === undefined || year === null) return '—';
  if (year < 0) return `${Math.abs(year).toLocaleString()} BCE`;
  return `${year} CE`;
}

function formatLocation(coords: [number, number] | undefined): string {
  if (!coords) return 'Non-geographic';
  return `${coords[0].toFixed(1)}, ${coords[1].toFixed(1)}`;
}

function EvidenceChip({ level }: { level: EvidenceLevel }) {
  const color = EVIDENCE_COLORS[level] ?? '#8b91ab';
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap"
      style={{ background: `${color}22`, color }}
    >
      {humanize(level)}
    </span>
  );
}

// ── Comparison rows ───────────────────────────────────────────────────────────

type CompareState = 'a' | 'b' | 'neutral';

function higherOf(a: number, b: number): { a: CompareState; b: CompareState } {
  if (a > b) return { a: 'a', b: 'neutral' };
  if (b > a) return { a: 'neutral', b: 'b' };
  return { a: 'neutral', b: 'neutral' };
}

interface RowProps {
  label: string;
  a: React.ReactNode;
  b: React.ReactNode;
  highlightA?: boolean;
  highlightB?: boolean;
  mono?: boolean;
}

function CompareRow({ label, a, b, highlightA, highlightB, mono }: RowProps) {
  const valueClass = `text-[13px] ${mono ? 'font-mono' : ''}`;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-2 border-b border-white/[0.05] last:border-b-0">
      <div
        className={valueClass}
        style={{ color: highlightA ? HIGHER : '#d7dbe7', fontWeight: highlightA ? 700 : 400 }}
      >
        {a}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-center text-[#6b7290] whitespace-nowrap">
        {label}
      </div>
      <div
        className={`${valueClass} text-right`}
        style={{ color: highlightB ? HIGHER : '#d7dbe7', fontWeight: highlightB ? 700 : 400 }}
      >
        {b}
      </div>
    </div>
  );
}

function TagChips({ tags, align }: { tags: string[]; align: 'left' | 'right' }) {
  if (tags.length === 0) return <span className="text-[13px] text-[#6b7290]">—</span>;
  return (
    <div className={`flex flex-wrap gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
      {tags.slice(0, 4).map(t => (
        <span
          key={t}
          className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-[#8b91ab] whitespace-nowrap"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

// ── Topic card header ─────────────────────────────────────────────────────────

function CardHeader({ node, accent, onOpen }: { node: GraphNode; accent: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full text-left group">
      <div className="flex items-center gap-2 mb-1">
        {node.icon && <span className="text-xl leading-none">{node.icon}</span>}
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: `${accent}cc` }}>
          {node.category}
        </span>
      </div>
      <h2
        className="text-[20px] font-extrabold leading-tight text-white transition-colors"
        style={{ fontWeight: 800 }}
      >
        <span className="group-hover:underline decoration-2 underline-offset-4">{node.title}</span>
      </h2>
    </button>
  );
}

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ score, accent }: { score: number; accent: string }) {
  const pct = Math.round((score ?? 0) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
      </div>
      <span className="font-mono text-[11px] text-[#8b91ab] w-9 text-right">{pct}%</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CompareView() {
  const { navigateToNode, setCurrentView } = useUserStore();
  const nodes = useNodes();
  const edges = useEdges();

  const sortedNodes = useMemo(
    () => [...nodes].sort((x, y) => x.title.localeCompare(y.title)),
    [nodes],
  );

  const [aId, setAId] = useState<string>('');
  const [bId, setBId] = useState<string>('');

  // Per-node degree + neighbour sets, memoized on the graph.
  const { degree, neighbours } = useMemo(() => {
    const deg = new Map<string, number>();
    const nbr = new Map<string, Set<string>>();
    for (const e of edges) {
      deg.set(e.from, (deg.get(e.from) ?? 0) + 1);
      deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
      if (!nbr.has(e.from)) nbr.set(e.from, new Set());
      if (!nbr.has(e.to)) nbr.set(e.to, new Set());
      nbr.get(e.from)!.add(e.to);
      nbr.get(e.to)!.add(e.from);
    }
    return { degree: deg, neighbours: nbr };
  }, [edges]);

  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  // Resolve selections, defaulting to the first two available nodes.
  const resolvedA = (aId && byId.get(aId)) || sortedNodes[0];
  const resolvedB = (bId && byId.get(bId)) || sortedNodes[1] || sortedNodes[0];

  const directEdge = useMemo<GraphEdge | undefined>(() => {
    if (!resolvedA || !resolvedB || resolvedA.id === resolvedB.id) return undefined;
    return edges.find(
      e =>
        (e.from === resolvedA.id && e.to === resolvedB.id) ||
        (e.from === resolvedB.id && e.to === resolvedA.id),
    );
  }, [edges, resolvedA, resolvedB]);

  const sharedNeighbours = useMemo<GraphNode[]>(() => {
    if (!resolvedA || !resolvedB || resolvedA.id === resolvedB.id) return [];
    const na = neighbours.get(resolvedA.id);
    const nb = neighbours.get(resolvedB.id);
    if (!na || !nb) return [];
    const out: GraphNode[] = [];
    for (const id of na) {
      if (id !== resolvedB.id && id !== resolvedA.id && nb.has(id)) {
        const n = byId.get(id);
        if (n) out.push(n);
      }
    }
    return out;
  }, [neighbours, byId, resolvedA, resolvedB]);

  const swap = () => {
    const curA = resolvedA?.id ?? '';
    const curB = resolvedB?.id ?? '';
    setAId(curB);
    setBId(curA);
  };

  // ── Empty / loading ──
  if (sortedNodes.length === 0 || !resolvedA || !resolvedB) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-[13px] text-[#8b91ab]">Loading the archive…</p>
      </div>
    );
  }

  const sameTopic = resolvedA.id === resolvedB.id;

  // Numeric comparisons.
  const aClaims = resolvedA.claims.length;
  const bClaims = resolvedB.claims.length;
  const aCrit = resolvedA.criticisms.length;
  const bCrit = resolvedB.criticisms.length;
  const aConn = degree.get(resolvedA.id) ?? 0;
  const bConn = degree.get(resolvedB.id) ?? 0;
  const aSrc = resolvedA.sources?.length ?? 0;
  const bSrc = resolvedB.sources?.length ?? 0;
  const aConf = resolvedA.confidence_score ?? 0;
  const bConf = resolvedB.confidence_score ?? 0;

  const hClaims = higherOf(aClaims, bClaims);
  const hCrit = higherOf(aCrit, bCrit);
  const hConn = higherOf(aConn, bConn);
  const hSrc = higherOf(aSrc, bSrc);
  const hConf = higherOf(aConf, bConf);

  const relColor = directEdge ? RELATIONSHIP_COLORS[directEdge.relationship_type] ?? '#8b91ab' : '#8b91ab';

  return (
    <div className="min-h-full text-slate-200 pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-8">
        {/* Head */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-white mb-1">Compare</h1>
          <p className="text-[13px] text-[#8b91ab] mb-5">
            Weigh two topics side by side — and see how they relate.
          </p>

          {/* Selectors */}
          <div className="flex items-stretch gap-2">
            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: `${VIOLET}cc` }}>
                Topic A
              </label>
              <select
                value={resolvedA.id}
                onChange={e => setAId(e.target.value)}
                className="w-full rounded-[12px] bg-white/[0.03] border px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#7c3aed] transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              >
                {sortedNodes.map(n => (
                  <option key={n.id} value={n.id} className="bg-slate-900">
                    {n.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end pb-1">
              <button
                onClick={swap}
                title="Swap A and B"
                className="p-2.5 rounded-[12px] bg-white/[0.03] border hover:bg-white/[0.06] transition-colors text-[#d7dbe7]"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <ArrowLeftRight size={16} />
              </button>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: `${CYAN}cc` }}>
                Topic B
              </label>
              <select
                value={resolvedB.id}
                onChange={e => setBId(e.target.value)}
                className="w-full rounded-[12px] bg-white/[0.03] border px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#22d3ee] transition-colors"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              >
                {sortedNodes.map(n => (
                  <option key={n.id} value={n.id} className="bg-slate-900">
                    {n.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {sameTopic && (
          <div className="mt-4 p-3 rounded-[12px] bg-white/[0.03] border text-[13px] text-[#8b91ab] text-center"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            Pick two different topics to compare them.
          </div>
        )}

        {/* Cards */}
        <div className="mt-5 grid md:grid-cols-2 gap-4">
          {/* Topic A card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[12px] border p-4"
            style={{ borderColor: `${VIOLET}66`, background: `${VIOLET}0d` }}
          >
            <CardHeader node={resolvedA} accent={VIOLET} onOpen={() => navigateToNode(resolvedA.id, resolvedA.title)} />
          </motion.div>

          {/* Topic B card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[12px] border p-4"
            style={{ borderColor: `${CYAN}66`, background: `${CYAN}0d` }}
          >
            <CardHeader node={resolvedB} accent={CYAN} onOpen={() => navigateToNode(resolvedB.id, resolvedB.title)} />
          </motion.div>
        </div>

        {/* Comparison table */}
        <div
          className="mt-4 rounded-[12px] border px-4 py-1"
          style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
        >
          <CompareRow label="Category" a={resolvedA.category} b={resolvedB.category} />
          <CompareRow
            label="Region"
            a={resolvedA.region ?? resolvedA.country ?? '—'}
            b={resolvedB.region ?? resolvedB.country ?? '—'}
          />
          <CompareRow
            label="Evidence"
            a={<EvidenceChip level={resolvedA.evidence_level} />}
            b={
              <span className="inline-flex justify-end w-full">
                <EvidenceChip level={resolvedB.evidence_level} />
              </span>
            }
          />
          <CompareRow label="Era" a={formatEra(resolvedA.year)} b={formatEra(resolvedB.year)} mono />
          <CompareRow
            label="Location"
            a={formatLocation(resolvedA.coordinates)}
            b={formatLocation(resolvedB.coordinates)}
            mono
          />
          <CompareRow
            label="Claims"
            a={aClaims}
            b={bClaims}
            highlightA={hClaims.a === 'a'}
            highlightB={hClaims.b === 'b'}
            mono
          />
          <CompareRow
            label="Criticisms"
            a={aCrit}
            b={bCrit}
            highlightA={hCrit.a === 'a'}
            highlightB={hCrit.b === 'b'}
            mono
          />
          <CompareRow
            label="Connections"
            a={aConn}
            b={bConn}
            highlightA={hConn.a === 'a'}
            highlightB={hConn.b === 'b'}
            mono
          />
          <CompareRow
            label="Sources"
            a={aSrc}
            b={bSrc}
            highlightA={hSrc.a === 'a'}
            highlightB={hSrc.b === 'b'}
            mono
          />
          <CompareRow
            label="Tags"
            a={<TagChips tags={resolvedA.tags} align="left" />}
            b={<TagChips tags={resolvedB.tags} align="right" />}
          />
          <CompareRow
            label="Confidence"
            a={<ConfidenceBar score={aConf} accent={hConf.a === 'a' ? HIGHER : VIOLET} />}
            b={<ConfidenceBar score={bConf} accent={hConf.b === 'b' ? HIGHER : CYAN} />}
            highlightA={hConf.a === 'a'}
            highlightB={hConf.b === 'b'}
          />
        </div>

        {/* Relationship panel */}
        {!sameTopic && (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8b91ab] mb-3">
              <Share2 size={13} className="text-cyan-400" /> Relationship
            </div>

            {directEdge ? (
              <div
                className="rounded-[12px] border p-4"
                style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={14} style={{ color: relColor }} />
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: `${relColor}22`, color: relColor }}
                  >
                    {humanize(directEdge.relationship_type)}
                  </span>
                </div>
                {directEdge.explanation && (
                  <p className="text-[13px] text-[#d7dbe7] leading-relaxed">{directEdge.explanation}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => setCurrentView('connect')}
                className="w-full flex items-center justify-between gap-3 rounded-[12px] border p-4 text-left hover:bg-white/[0.05] transition-colors group"
                style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.03)' }}
              >
                <span className="flex items-center gap-2 text-[13px] text-[#d7dbe7]">
                  <GitBranch size={14} className="text-cyan-400" />
                  No direct link. Trace the paths between them
                </span>
                <ArrowRight size={15} className="text-[#6b7290] group-hover:text-cyan-400 transition-colors" />
              </button>
            )}

            {/* Shared neighbours */}
            {sharedNeighbours.length > 0 && (
              <div className="mt-4">
                <div className="text-[10px] uppercase tracking-widest text-[#6b7290] mb-2">Both connect to</div>
                <div className="flex flex-wrap gap-2">
                  {sharedNeighbours.map(n => (
                    <button
                      key={n.id}
                      onClick={() => navigateToNode(n.id, n.title)}
                      className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-full bg-white/[0.03] border hover:bg-white/[0.06] hover:border-cyan-700/50 transition-colors text-[#d7dbe7]"
                      style={{ borderColor: 'rgba(255,255,255,0.07)' }}
                    >
                      {n.icon && <span>{n.icon}</span>}
                      {n.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
