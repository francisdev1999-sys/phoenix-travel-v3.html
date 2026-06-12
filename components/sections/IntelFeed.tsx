'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, ExternalLink, RefreshCw, Search, X,
  Eye, Siren, FileSearch, Microscope, UserX, Globe2,
  FlaskConical, Scroll, Bug, Sparkles,
} from 'lucide-react';

interface NewsItem {
  id:          string;
  title:       string;
  description: string | null;
  url:         string;
  source:      string;
  sourceUrl:   string;
  category:    string;
  publishedAt: string;
  imageUrl:    string | null;
}

interface FeedResponse {
  items:          NewsItem[];
  nextCursor:     string | null;
  categoryCounts: Record<string, number>;
}

const CATEGORIES = [
  { id: 'all',         label: 'All Intel',    icon: Globe2,       color: '#a78bfa' },
  { id: 'ufo',         label: 'UFO / UAP',    icon: Eye,          color: '#38bdf8' },
  { id: 'government',  label: 'Gov & FOIA',   icon: FileSearch,   color: '#fb923c' },
  { id: 'conspiracy',  label: 'Conspiracy',   icon: Siren,        color: '#f472b6' },
  { id: 'archaeology', label: 'Archaeology',  icon: Scroll,       color: '#d97706' },
  { id: 'science',     label: 'Science',      icon: Microscope,   color: '#4ade80' },
  { id: 'missing',     label: 'Missing',      icon: UserX,        color: '#facc15' },
  { id: 'pandemic',    label: 'Pandemic',     icon: Bug,          color: '#f87171' },
  { id: 'esoterica',   label: 'Esoterica',    icon: Sparkles,     color: '#c084fc' },
];

const CAT_COLOR: Record<string, string> = {
  ufo:         '#38bdf8',
  government:  '#fb923c',
  conspiracy:  '#f472b6',
  archaeology: '#d97706',
  science:     '#4ade80',
  missing:     '#facc15',
  pandemic:    '#f87171',
  esoterica:   '#c084fc',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function IntelFeed() {
  const [category,  setCategory]  = useState('all');
  const [query,     setQuery]     = useState('');
  const [items,     setItems]     = useState<NewsItem[]>([]);
  const [cursor,    setCursor]    = useState<string | null>(null);
  const [counts,    setCounts]    = useState<Record<string, number>>({});
  const [loading,   setLoading]   = useState(false);
  const [refreshing,setRefreshing]= useState(false);
  const [hasMore,   setHasMore]   = useState(false);
  const [empty,     setEmpty]     = useState(false);
  const loaderRef  = useRef<HTMLDivElement>(null);
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (opts: {
    cat?: string; q?: string; reset?: boolean; cur?: string | null;
  } = {}) => {
    const cat    = opts.cat  ?? category;
    const search = opts.q    ?? query;
    const cur    = opts.reset ? undefined : (opts.cur ?? cursor ?? undefined);

    if (loading && !opts.reset) return;
    setLoading(true);

    const params = new URLSearchParams({ category: cat });
    if (search) params.set('q', search);
    if (cur)    params.set('cursor', cur);

    try {
      const res = await fetch(`/api/intel-feed?${params}`);
      if (!res.ok) return;
      const data: FeedResponse = await res.json();

      setItems(prev => opts.reset ? data.items : [...prev, ...data.items]);
      setCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
      setCounts(data.categoryCounts);
      setEmpty(opts.reset ? data.items.length === 0 : false);
    } catch {
      // network error — keep existing items
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, query, cursor, loading]);

  // Initial load
  useEffect(() => { load({ reset: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Category change
  const handleCategory = (cat: string) => {
    setCategory(cat);
    setItems([]);
    setCursor(null);
    load({ cat, reset: true });
  };

  // Search debounce
  const handleSearch = (val: string) => {
    setQuery(val);
    if (queryTimer.current) clearTimeout(queryTimer.current);
    queryTimer.current = setTimeout(() => {
      setItems([]);
      setCursor(null);
      load({ q: val, reset: true });
    }, 400);
  };

  // Refresh
  const refresh = () => {
    setRefreshing(true);
    setItems([]);
    setCursor(null);
    load({ reset: true });
  };

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !loading) load();
    }, { threshold: 0.5 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, load]);

  const totalCount = counts.all ?? Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col h-full bg-black/20 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex-none px-6 pt-6 pb-4 border-b border-purple-900/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-purple-900/40 border border-purple-700/40 flex items-center justify-center">
            <Radio size={17} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Intel Feed</h1>
            <p className="text-[11px] text-slate-500">
              UFO · Gov Docs · Archaeology · Conspiracy · Science · Missing
              {totalCount > 0 && <span className="ml-2 text-purple-400">{totalCount} items</span>}
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="ml-auto w-8 h-8 rounded-lg bg-white/4 border border-white/8 flex items-center justify-center hover:bg-white/8 transition-colors"
          >
            <RefreshCw size={13} className={`text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search intel..."
            className="w-full bg-white/4 border border-white/8 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-600/60"
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map(cat => {
            const Icon    = cat.icon;
            const count   = cat.id === 'all'
              ? totalCount
              : (counts[cat.id] ?? 0);
            const active  = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategory(cat.id)}
                className={`flex-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                  active
                    ? 'border-purple-600/60 bg-purple-900/40 text-white'
                    : 'border-white/6 bg-white/3 text-slate-500 hover:text-slate-300 hover:bg-white/6'
                }`}
              >
                <Icon size={11} style={{ color: active ? cat.color : undefined }} />
                {cat.label}
                {count > 0 && (
                  <span className={`text-[9px] px-1 rounded ${active ? 'bg-purple-700/60 text-purple-200' : 'bg-white/8 text-slate-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Feed list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => (
            <motion.a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.3) }}
              className="group block p-3.5 rounded-xl bg-white/3 border border-white/6 hover:bg-white/6 hover:border-purple-800/40 transition-all"
            >
              <div className="flex gap-3">
                {/* Colour stripe */}
                <div
                  className="flex-none w-0.5 rounded-full self-stretch"
                  style={{ backgroundColor: CAT_COLOR[item.category] ?? '#a78bfa' }}
                />

                <div className="flex-1 min-w-0">
                  {/* Meta row */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        color:            CAT_COLOR[item.category] ?? '#a78bfa',
                        backgroundColor:  `${CAT_COLOR[item.category] ?? '#a78bfa'}18`,
                      }}
                    >
                      {item.category.replace('-', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">{item.source}</span>
                    <span className="text-[10px] text-slate-700 ml-auto">{timeAgo(item.publishedAt)}</span>
                  </div>

                  {/* Title */}
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white leading-snug line-clamp-2 mb-1 transition-colors">
                    {item.title}
                  </p>

                  {/* Description */}
                  {item.description && (
                    <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={9} className="text-purple-400" />
                    <span className="text-[9px] text-purple-400">Read full article</span>
                  </div>
                </div>

                {/* Thumbnail */}
                {item.imageUrl && (
                  <div className="flex-none w-14 h-14 rounded-lg overflow-hidden border border-white/6 bg-white/4 self-start">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            </motion.a>
          ))}
        </AnimatePresence>

        {/* ── Loader / empty states ── */}
        {loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Radio size={28} className="text-purple-800 animate-pulse" />
            <p className="text-xs text-slate-600">Scanning feeds...</p>
          </div>
        )}

        {empty && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Radio size={28} className="text-slate-700" />
            <p className="text-sm text-slate-600">No intel found</p>
            <p className="text-xs text-slate-700">
              {query ? 'Try a different search term' : 'Run the cron job to populate the feed'}
            </p>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && (
          <div ref={loaderRef} className="flex justify-center py-4">
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <RefreshCw size={11} className="animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
