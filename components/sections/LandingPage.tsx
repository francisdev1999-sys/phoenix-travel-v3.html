'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search, ArrowRight, BookOpen, Network, Globe2,
  Landmark, Rocket, ShieldAlert, Scroll, Dna, Users, Atom,
  Star, Clock, TrendingUp, ChevronRight, LogIn, HelpCircle, Sparkles,
} from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { useNodes, useEdges } from '@/lib/graph/useNodes';
import { useSession, signIn } from 'next-auth/react';
import { trackEngagement } from '@/lib/engagement';

// ── Galaxy card styling, keyed by live galaxy slug ────────────────────────────
// Cards are built from the live /api/galaxies response (see `galaxies` state
// below) so navigation always targets a real galaxy — this map only supplies
// icon/color decoration. A galaxy slug missing here falls back to DEFAULT_STYLE.

const GALAXY_STYLE: Record<string, {
  icon: typeof Landmark; color: string; border: string; glow: string; desc: string;
}> = {
  'ancient-knowledge': {
    icon: Landmark, color: 'from-amber-900/50 to-amber-950/30', border: 'border-amber-700/30', glow: 'hover:shadow-amber-900/30',
    desc: 'Lost cities, megalithic structures, forgotten empires and forbidden archaeology.',
  },
  anomalies: {
    icon: Rocket, color: 'from-cyan-900/50 to-cyan-950/30', border: 'border-cyan-700/30', glow: 'hover:shadow-cyan-900/30',
    desc: 'UFO encounters, unexplained phenomena and modern mysteries that defy explanation.',
  },
  'government-power': {
    icon: ShieldAlert, color: 'from-slate-800/60 to-slate-900/40', border: 'border-slate-600/30', glow: 'hover:shadow-slate-700/30',
    desc: 'Classified programs, intelligence operations and the hidden machinery of power.',
  },
  'religion-mythology': {
    icon: Scroll, color: 'from-purple-900/50 to-purple-950/30', border: 'border-purple-700/30', glow: 'hover:shadow-purple-900/30',
    desc: 'Religious traditions, mythological narratives and sacred symbolism.',
  },
  'conspiracy-society': {
    icon: Network, color: 'from-rose-900/50 to-rose-950/30', border: 'border-rose-700/30', glow: 'hover:shadow-rose-900/30',
    desc: 'Contested theories, whistleblowers and hidden agendas in public life.',
  },
  'life-biology': {
    icon: Dna, color: 'from-red-900/50 to-red-950/30', border: 'border-red-700/30', glow: 'hover:shadow-red-900/30',
    desc: 'Disease outbreaks, pandemics and events at the frontier of human health.',
  },
  entities: {
    icon: Users, color: 'from-violet-900/50 to-violet-950/30', border: 'border-violet-700/30', glow: 'hover:shadow-violet-900/30',
    desc: 'Key individuals, agencies and institutions that shaped pivotal events.',
  },
  'technology-cosmos': {
    icon: Atom, color: 'from-green-900/50 to-green-950/30', border: 'border-green-700/30', glow: 'hover:shadow-green-900/30',
    desc: 'Emerging technology, space exploration and humanity’s place in the cosmos.',
  },
};

const DEFAULT_STYLE = {
  icon: Network, color: 'from-slate-800/60 to-slate-900/40', border: 'border-slate-600/30', glow: 'hover:shadow-slate-700/30',
  desc: '',
};

const HOW_IT_WORKS = [
  {
    icon:  Globe2,
    step:  '01',
    title: 'Browse Galaxies',
    desc:  'Enter a topic galaxy — Ancient Civilizations, UFO/UAP, Mythology — and discover all research nodes within it.',
  },
  {
    icon:  BookOpen,
    step:  '02',
    title: 'Read Research Nodes',
    desc:  'Every topic is a structured node: sources, claims, criticisms, timelines, maps and evidence ratings.',
  },
  {
    icon:  Network,
    step:  '03',
    title: 'Follow the Connections',
    desc:  'Hidden links connect topics across galaxies. Start a rabbit hole and see how deep it goes.',
  },
];

// ── Subtle starfield (CSS-only, no canvas) ────────────────────────────────────
// Positions pre-computed at module load time so SSR and client match exactly.

const STARS = Array.from({ length: 60 }, (_, i) => {
  // Use index-based deterministic values to avoid SSR/client mismatch
  const t = (i * 137.508) % 360; // golden-angle spread
  return {
    width:   ((i * 17 + 3) % 15) / 10 + 0.5,
    height:  ((i * 17 + 3) % 15) / 10 + 0.5,
    top:     (i * 137.508) % 100,
    left:    (i * 97.314 + 13) % 100,
    opacity: ((i * 7 + 5) % 40) / 100 + 0.05,
    t,
  };
});

function Starfield() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {STARS.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width:   s.width + 'px',
            height:  s.height + 'px',
            top:     s.top + '%',
            left:    s.left + '%',
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

// ── Live activity feed ────────────────────────────────────────────────────────
// Polls the public ArchiveEvent-backed feed (populated in near-real-time by
// lib/orchestration/emit() at the moment a node/edge/source actually goes
// live — not on a batch-cron delay) so visitors can see the archive growing.

interface ActivityItem {
  id:        string;
  type:      string;
  label:     string;
  createdAt: string;
}

interface LandingStats {
  nodeCount:    number;
  edgeCount:    number;
  galaxyCount:  number;
  yearsCovered: number;
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60)   return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const ACTIVITY_ICON: Record<string, string> = {
  'node.published': '🔵',
  'edge.published': '🔗',
  'source.approved': '📄',
};

function LiveActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fetchFeed = () => {
      fetch('/api/activity-feed')
        .then(r => r.ok ? r.json() : null)
        .then((data: { items: ActivityItem[] } | null) => {
          if (!cancelled && data?.items) setItems(data.items.slice(0, 6));
        })
        .catch(() => {});
    };
    fetchFeed();
    const interval = setInterval(fetchFeed, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="border-b border-white/5 bg-white/[0.02] py-5"
    >
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-2 mb-3 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Growing right now</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>{ACTIVITY_ICON[item.type] ?? '✦'}</span>
              <span className="text-slate-300">{item.label}</span>
              <span className="text-slate-600">· {relativeTime(item.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

// ── Today's Mystery ───────────────────────────────────────────────────────────
// One unresolved open question, rotating at UTC midnight — the daily-habit
// hook. Every visitor sees the same mystery; come back tomorrow for a new one.

interface DailyMystery {
  question:      string | null;
  nodeId?:       string;
  nodeTitle?:    string;
  icon?:         string | null;
  evidenceLevel?: string | null;
}

function DailyMysteryCard() {
  const { navigateToNode } = useUserStore();
  const [mystery, setMystery] = useState<DailyMystery | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/explore/daily-mystery')
      .then(r => (r.ok ? r.json() : null))
      .then((d: DailyMystery | null) => { if (!cancelled && d?.question) setMystery(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!mystery?.question || !mystery.nodeId) return null;

  const open = () => {
    trackEngagement('node_dive', mystery.nodeId!);
    navigateToNode(mystery.nodeId!, mystery.nodeTitle ?? '');
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.25 }}
      className="max-w-3xl mx-auto px-4 pt-10"
    >
      <button
        onClick={open}
        className="group w-full text-left p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/25 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-900/30 transition-all"
      >
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={14} className="text-indigo-400" />
          <span className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Today&apos;s Mystery</span>
          <span className="text-[10px] text-slate-600 ml-auto">changes daily</span>
        </div>
        <p className="text-base sm:text-lg font-semibold text-white leading-snug mb-3">
          {mystery.question}
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {mystery.icon && <span>{mystery.icon}</span>}
          <span className="text-slate-300">{mystery.nodeTitle}</span>
          <span className="flex items-center gap-1 text-indigo-400 font-semibold ml-auto group-hover:text-indigo-300 transition-colors">
            Dig into it <ArrowRight size={12} />
          </span>
        </div>
      </button>
    </motion.section>
  );
}

// ── "New since your last visit" banner ───────────────────────────────────────
// Shown only to returning visitors (≥6h gap) when the archive actually grew —
// proof the autonomous pipeline kept working while they were away.

const LAST_VISIT_KEY  = 'nexus_last_visit';
const MIN_VISIT_GAP_MS = 6 * 60 * 60 * 1000;

function NewSinceVisitBanner() {
  const { setCurrentView } = useUserStore();
  const [growth, setGrowth] = useState<{ newNodes: number; newConnections: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    try {
      const prev = Number(localStorage.getItem(LAST_VISIT_KEY));
      const now  = Date.now();
      localStorage.setItem(LAST_VISIT_KEY, String(now));
      if (!Number.isFinite(prev) || prev <= 0 || now - prev < MIN_VISIT_GAP_MS) return;

      fetch(`/api/stats/changes?since=${prev}`)
        .then(r => (r.ok ? r.json() : null))
        .then((d: { newNodes?: number; newConnections?: number } | null) => {
          if (cancelled || !d) return;
          if ((d.newNodes ?? 0) + (d.newConnections ?? 0) > 0) {
            setGrowth({ newNodes: d.newNodes ?? 0, newConnections: d.newConnections ?? 0 });
          }
        })
        .catch(() => {});
    } catch { /* localStorage unavailable — skip silently */ }
    return () => { cancelled = true; };
  }, []);

  if (!growth) return null;

  const parts: string[] = [];
  if (growth.newNodes > 0)       parts.push(`${growth.newNodes} new topic${growth.newNodes !== 1 ? 's' : ''}`);
  if (growth.newConnections > 0) parts.push(`${growth.newConnections} new connection${growth.newConnections !== 1 ? 's' : ''}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto px-4 pt-4"
    >
      <button
        onClick={() => setCurrentView('explore')}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/25 hover:border-emerald-400/50 text-xs text-emerald-300 font-semibold transition-all"
      >
        <Sparkles size={13} className="text-emerald-400" />
        While you were away: {parts.join(' and ')} joined the archive
        <ArrowRight size={12} />
      </button>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { navigateToUniverse, navigateToGalaxy, setCurrentView } = useUserStore();
  const nodes = useNodes();
  const edges = useEdges();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [galaxies, setGalaxies]       = useState<{ id: string; slug: string; name: string }[]>([]);
  const [stats, setStats]             = useState<LandingStats | null>(null);
  const interestRef = useRef<HTMLElement>(null);

  // Pre-warm the destination chunks while the visitor reads the hero, so the
  // first click doesn't sit on the "LOADING ARCHIVE..." spinner.
  useEffect(() => {
    const warm = () => {
      void import('@/components/sections/ExploreFeed');
      void import('@/components/sections/SearchExplorer');
      void import('@/components/sections/GalaxyView');
    };
    const w = window as unknown as { requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 1500);
  }, []);

  // Live headline stats — refreshed periodically so the numbers track the
  // autonomous growth pipeline instead of showing stale/hardcoded values.
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/stats/landing')
        .then(r => r.ok ? r.json() : null)
        .then((d: LandingStats | null) => { if (!cancelled && d) setStats(d); })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  // Fetch the live galaxy list — cards below are built from this, never from
  // a hardcoded slug, so a clicked card can never 404 into an empty galaxy page.
  useEffect(() => {
    fetch('/api/galaxies')
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; slug: string; name: string }[]) => {
        if (Array.isArray(data) && data.length > 0) setGalaxies(data);
      })
      .catch(() => {});
  }, []);

  const cards = galaxies.map(g => ({ ...(GALAXY_STYLE[g.slug] ?? DEFAULT_STYLE), slug: g.slug, name: g.name }));

  const handleCardClick = (slug: string, name: string) => navigateToGalaxy(slug, name);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Hand the query to the Search & Connections explorer — searching must
    // show results + what they're connected to, never dump into the Universe.
    useUserStore.getState().setSearchQuery(searchQuery.trim());
    setCurrentView('search');
  };

  const scrollToInterests = () => {
    interestRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fade = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen bg-[#000005] text-slate-200 overflow-x-hidden">
      <Starfield />

      {/* ── Minimal header ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3 bg-[#000005]/90 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 text-lg">✦</span>
          <span className="font-black text-white tracking-tight text-sm uppercase">Nexus Archive</span>
        </div>
        <div className="flex items-center gap-2">
          {!session ? (
            <button
              onClick={() => signIn('google')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 hover:border-slate-500 transition-all"
            >
              <LogIn size={13} />
              Sign In
            </button>
          ) : (
            <button
              onClick={navigateToUniverse}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-700 hover:bg-purple-600 text-white transition-all"
            >
              Enter Archive <ArrowRight size={12} />
            </button>
          )}
        </div>
      </header>

      <NewSinceVisitBanner />

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <motion.div {...fade} transition={{ duration: 0.6 }} className="space-y-6 max-w-3xl mx-auto">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-950/30 text-purple-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Research Archive · Open Access
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none text-white">
            The Nexus{' '}
            <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Archive
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 font-light max-w-2xl mx-auto leading-relaxed">
            Research-grade exploration of unexplained phenomena, ancient mysteries, and the hidden connections between them.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-lg mx-auto w-full">
            <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700 hover:border-slate-500 focus-within:border-purple-500 rounded-xl px-4 py-3 transition-all">
              <Search size={15} className="text-slate-500 shrink-0" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search theories, events, people, phenomena…"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold transition-all"
            >
              Search
            </button>
          </form>

          {/* Topic pills */}
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {cards.map(g => (
              <button
                key={g.slug}
                onClick={() => handleCardClick(g.slug, g.name)}
                className="px-3 py-1 rounded-full text-xs font-medium border border-slate-700 hover:border-purple-500/60 bg-slate-900/50 hover:bg-purple-950/40 text-slate-400 hover:text-purple-300 transition-all"
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm transition-all shadow-lg shadow-purple-900/40"
            >
              <Globe2 size={16} />
              Start Exploring
              <ArrowRight size={14} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={scrollToInterests}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-all"
            >
              Browse Topics
              <ChevronRight size={14} />
            </motion.button>
          </div>

          <p className="text-xs text-slate-600 max-w-md mx-auto">
            All content is presented as theories and open questions — not established facts. Critical thinking is encouraged.
          </p>
        </motion.div>
      </section>

      {/* ── Stats bar ── */}
      <motion.section
        {...fade}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="border-y border-white/5 bg-white/[0.02] py-6"
      >
        <div className="flex items-center justify-center flex-wrap gap-8 sm:gap-16 max-w-3xl mx-auto px-4">
          {[
            { icon: BookOpen, label: 'Research Nodes',  value: `${stats?.nodeCount ?? nodes.length}+` },
            { icon: Network,  label: 'Connections',     value: `${stats?.edgeCount ?? edges.length}+` },
            { icon: Star,     label: 'Topic Galaxies',  value: `${stats?.galaxyCount ?? (galaxies.length || 9)}` },
            { icon: Clock,    label: 'Years Covered',   value: (stats?.yearsCovered ?? 10000).toLocaleString() },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <Icon size={16} className="text-purple-400/60" />
              <div className="text-2xl font-black text-white">{value}</div>
              <div className="text-xs text-slate-500 tracking-wide">{label}</div>
            </div>
          ))}
        </div>
      </motion.section>

      <DailyMysteryCard />

      <LiveActivityFeed />

      {/* ── Galaxy grid ── */}
      <section className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
        <motion.div {...fade} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">Explore by Galaxy</h2>
              <p className="text-sm text-slate-500 mt-1">Each galaxy is a self-contained research domain</p>
            </div>
            <button
              onClick={navigateToUniverse}
              className="hidden sm:flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((g, i) => {
              const Icon = g.icon;
              return (
                <motion.button
                  key={g.slug}
                  onClick={() => handleCardClick(g.slug, g.name)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -2 }}
                  className={`group relative text-left p-4 rounded-xl bg-gradient-to-br ${g.color} border ${g.border} hover:shadow-lg ${g.glow} transition-all duration-200`}
                >
                  <Icon size={22} className="text-slate-400 group-hover:text-white mb-3 transition-colors" />
                  <div className="font-bold text-sm text-white mb-1.5 leading-snug">{g.name}</div>
                  <div className="text-xs text-slate-500 group-hover:text-slate-400 leading-relaxed transition-colors line-clamp-2">{g.desc}</div>
                  <ChevronRight size={13} className="absolute bottom-3 right-3 text-slate-600 group-hover:text-purple-400 transition-colors" />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── How it works ── */}
      <section className="border-t border-white/5 bg-white/[0.015] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-12">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-700/30">
                  <Icon size={18} className="text-purple-400" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-600 mb-1">{step}</div>
                  <div className="font-bold text-white text-base mb-2">{title}</div>
                  <div className="text-sm text-slate-400 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Interest picker (Phase 5 onboarding) ── */}
      <section ref={interestRef as React.RefObject<HTMLElement>} className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white mb-2">What interests you?</h2>
          <p className="text-sm text-slate-500">Select a topic to start your research journey</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map((g) => {
            const Icon = g.icon;
            return (
              <motion.button
                key={g.slug}
                onClick={() => handleCardClick(g.slug, g.name)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl bg-gradient-to-br ${g.color} border ${g.border} hover:shadow-lg ${g.glow} transition-all duration-200 text-center`}
              >
                <Icon size={28} className="text-slate-300" />
                <span className="text-xs font-semibold text-white leading-snug">{g.name}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center justify-center mt-10 gap-4">
          <button
            onClick={navigateToUniverse}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm transition-all"
          >
            <TrendingUp size={15} />
            Browse All Galaxies
          </button>
          <button
            onClick={() => setCurrentView('graph')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold text-sm transition-all"
          >
            <Network size={15} />
            Open Research Graph
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-purple-400">✦</span>
          <span className="text-sm font-bold text-slate-400">Nexus Archive</span>
        </div>
        <p className="text-xs text-slate-600 max-w-lg mx-auto">
          All content is presented as theories, claims, and open questions — not established facts.
          Sources are cited where available. Critical thinking and independent research are encouraged.
        </p>
      </footer>
    </div>
  );
}
