'use client';
/**
 * Explore — an endless, curiosity-driven feed for non-technical visitors.
 *
 * Instead of drilling Universe → Galaxy → Cluster, you just scroll: every card
 * opens with a hook (an open question or striking claim), shows how disputed
 * the topic is in plain language, and teases where it leads — with periodic
 * "hidden link" cards that spotlight a surprising connection between two
 * topics. Infinite scroll keeps the next mystery one flick away.
 *
 * Runs on the client graph store (static + autonomously grown content).
 */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Link2, ArrowRight, HelpCircle, Quote, Compass } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { useNodes, useEdges } from '@/lib/graph/useNodes';
import type { GraphNode, GraphEdge } from '@/lib/graph/types';

const BATCH = 8;

// Plain-language evidence labels for non-technical readers.
const EVIDENCE_PLAIN: Record<string, { label: string; cls: string }> = {
  verified:        { label: 'Well documented',    cls: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/40' },
  strong_evidence: { label: 'Strong evidence',    cls: 'bg-cyan-900/50 text-cyan-300 border-cyan-700/40' },
  debated:         { label: 'Actively debated',   cls: 'bg-amber-900/50 text-amber-300 border-amber-700/40' },
  speculative:     { label: 'Speculative theory', cls: 'bg-purple-900/50 text-purple-300 border-purple-700/40' },
  mythological:    { label: 'Myth & legend',      cls: 'bg-rose-900/50 text-rose-300 border-rose-700/40' },
};

type FeedItem =
  | { kind: 'topic'; node: GraphNode }
  | { kind: 'link'; edge: GraphEdge; a: GraphNode; b: GraphNode };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The hook line that makes someone stop scrolling. */
function hookFor(n: GraphNode): { icon: 'question' | 'claim'; text: string } | null {
  if (n.open_questions?.length) return { icon: 'question', text: n.open_questions[0] };
  if (n.claims.length) return { icon: 'claim', text: n.claims[0] };
  return null;
}

export default function ExploreFeed() {
  const { navigateToNode } = useUserStore();
  const nodes = useNodes();
  const edges = useEdges();
  const [count, setCount] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Build the shuffled feed once per visit: topic cards with a "hidden link"
  // spotlight woven in every few cards.
  const feed = useMemo<FeedItem[]>(() => {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const topicCards: FeedItem[] = shuffle(nodes).map(node => ({ kind: 'topic', node }));
    const strongEdges = shuffle(
      edges.filter(e => e.strength_score >= 0.6 && byId.has(e.from) && byId.has(e.to)),
    ).map<FeedItem>(e => ({ kind: 'link', edge: e, a: byId.get(e.from)!, b: byId.get(e.to)! }));

    const mixed: FeedItem[] = [];
    let li = 0;
    topicCards.forEach((card, i) => {
      mixed.push(card);
      if ((i + 1) % 4 === 0 && li < strongEdges.length) mixed.push(strongEdges[li++]);
    });
    return mixed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length]);

  const loadMore = useCallback(() => setCount(c => Math.min(c + BATCH, feed.length)), [feed.length]);

  // Infinite scroll — when the sentinel enters the viewport, add a batch.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '600px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const connectionsOf = useCallback((id: string) => {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const seen = new Set<string>();
    const out: GraphNode[] = [];
    for (const e of edges) {
      const otherId = e.from === id ? e.to : e.to === id ? e.from : null;
      if (!otherId || seen.has(otherId)) continue;
      const other = byId.get(otherId);
      if (!other) continue;
      seen.add(otherId);
      out.push(other);
      if (out.length >= 3) break;
    }
    return out;
  }, [nodes, edges]);

  const open = (n: GraphNode) => navigateToNode(n.id, n.title);

  return (
    <div className="min-h-full text-slate-200 pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-7 text-center">
          <div className="inline-flex items-center gap-2 text-purple-300 mb-2">
            <Compass size={18} />
            <h1 className="text-2xl font-black text-white">Explore</h1>
          </div>
          <p className="text-sm text-slate-400">
            Scroll through the archive's mysteries. Tap anything that pulls at you — every topic leads somewhere.
          </p>
        </motion.div>

        <div className="space-y-4">
          {feed.slice(0, count).map((item, i) => {
            if (item.kind === 'link') {
              return (
                <motion.div key={`link-${item.edge.id}-${i}`} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  className="rounded-2xl border border-cyan-800/40 bg-gradient-to-br from-cyan-950/40 to-black/40 p-5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-300 uppercase tracking-widest mb-3">
                    <Link2 size={12} /> Hidden connection
                  </div>
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <button onClick={() => open(item.a)} className="text-base font-bold text-white hover:text-cyan-300 transition-colors text-left">
                      {item.a.icon ? `${item.a.icon} ` : ''}{item.a.title}
                    </button>
                    <span className="text-cyan-500 font-black">↔</span>
                    <button onClick={() => open(item.b)} className="text-base font-bold text-white hover:text-cyan-300 transition-colors text-left">
                      {item.b.icon ? `${item.b.icon} ` : ''}{item.b.title}
                    </button>
                  </div>
                  <p className="text-[13px] text-slate-300 leading-relaxed">{item.edge.explanation}</p>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {item.edge.relationship_type.replace(/_/g, ' ')} · {Math.round(item.edge.strength_score * 100)}% strength
                  </div>
                </motion.div>
              );
            }

            const { node } = item;
            const hook = hookFor(node);
            const ev = EVIDENCE_PLAIN[node.evidence_level] ?? EVIDENCE_PLAIN.speculative;
            const conns = connectionsOf(node.id);
            return (
              <motion.div key={`${node.id}-${i}`} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="rounded-2xl border border-white/8 bg-white/[0.03] hover:border-purple-800/50 transition-colors overflow-hidden">
                <button onClick={() => open(node)} className="w-full text-left p-5 group">
                  {hook && (
                    <div className="flex items-start gap-2 mb-3">
                      {hook.icon === 'question'
                        ? <HelpCircle size={15} className="text-amber-400 mt-0.5 shrink-0" />
                        : <Quote size={15} className="text-purple-400 mt-0.5 shrink-0" />}
                      <p className="text-[15px] font-semibold text-slate-100 leading-snug">{hook.text}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-black text-white group-hover:text-purple-200 transition-colors">
                      {node.icon ? `${node.icon} ` : ''}{node.title}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${ev.cls}`}>{ev.label}</span>
                  </div>
                  <p className="text-[13px] text-slate-400 mt-1.5 line-clamp-3 leading-relaxed">{node.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-purple-300">
                    Dive in <ArrowRight size={12} />
                  </span>
                </button>
                {conns.length > 0 && (
                  <div className="border-t border-white/5 bg-black/20 px-5 py-2.5 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-bold shrink-0">Leads to</span>
                    {conns.map(c => (
                      <button key={c.id} onClick={() => open(c)}
                        className="text-[11px] px-2 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-cyan-300 hover:border-cyan-700/50 transition-colors">
                        {c.title}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Infinite-scroll sentinel */}
        <div ref={sentinelRef} className="h-10" />
        {count >= feed.length && feed.length > 0 && (
          <div className="text-center py-10">
            <Sparkles size={18} className="text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">You've scrolled the whole archive — for now.</p>
            <p className="text-[12px] text-slate-500 mt-1">It grows on its own every day. Come back tomorrow.</p>
          </div>
        )}
      </div>
    </div>
  );
}
