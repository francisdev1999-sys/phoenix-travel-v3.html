'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Globe, BarChart3, Clock, MapPin, Grid3X3, User,
  Volume2, VolumeX, Menu, X, LogIn, LogOut, Activity, BookMarked,
  ShieldCheck, Rabbit, Loader2, Trophy,
} from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { useSession, signIn, signOut } from 'next-auth/react';
import { nodes as staticNodes } from '@/lib/graph';
import { CATEGORY_COLORS, EVIDENCE_COLORS } from '@/lib/graph';
import UserProfilePanel from '@/components/sections/UserProfilePanel';
import { usePerformanceStore, getEffectiveMode, type PerfMode } from '@/lib/store/performanceStore';

const NAV_BASE = [
  { id: 'graph',          label: 'Knowledge Graph', icon: Grid3X3 },
  { id: 'universe',       label: 'Universe View',   icon: Globe },
  { id: 'timeline',       label: 'Timeline',        icon: Clock },
  { id: 'globe',          label: 'Ancient Sites',   icon: MapPin },
  { id: 'evidence-board', label: 'Evidence Board',  icon: BarChart3 },
  { id: 'rabbit-hole',    label: 'Rabbit Hole',     icon: Rabbit },
  { id: 'dashboard',      label: 'Dashboard',       icon: User },
  { id: 'diagnostics',    label: 'Diagnostics',     icon: Activity },
  { id: 'sources',        label: 'Sources',         icon: BookMarked },
];
const NAV_ADMIN = { id: 'admin', label: 'Admin', icon: ShieldCheck };

interface SearchResult {
  id: string;
  title: string;
  category: string;
  evidenceLevel: string;
  icon: string;
}

function normaliseDbNode(n: Record<string, unknown>): SearchResult {
  const cat = n.category as Record<string, unknown> | null;
  return {
    id: n.id as string,
    title: n.title as string,
    category: (cat?.name ?? n.category ?? 'Unknown') as string,
    evidenceLevel: ((n.evidenceLevel ?? n.evidence_level ?? 'speculative') as string).replace('_', ' '),
    icon: (n.icon ?? '◈') as string,
  };
}

function searchStatic(q: string): SearchResult[] {
  const lq = q.toLowerCase();
  return staticNodes
    .filter(n =>
      n.title.toLowerCase().includes(lq) ||
      n.description?.toLowerCase().includes(lq) ||
      n.tags?.some(t => t.toLowerCase().includes(lq)) ||
      n.category.toLowerCase().includes(lq)
    )
    .slice(0, 8)
    .map(n => ({
      id: n.id,
      title: n.title,
      category: n.category,
      evidenceLevel: (n.evidence_level ?? 'speculative').replace('_', ' '),
      icon: n.icon ?? '◈',
    }));
}

const PERF_LABELS: Record<PerfMode, string> = {
  auto: 'Auto', high: 'High', performance: 'Balanced', low: 'Low',
};
const PERF_CYCLE: PerfMode[] = ['auto', 'high', 'performance', 'low'];

export default function NavBar() {
  const { currentView, setCurrentView, audioEnabled, toggleAudio, progress, setPendingRabbitHoleNodeId } = useUserStore();
  const { data: session, status } = useSession();
  const { mode: perfMode, setMode: setPerfMode } = usePerformanceStore();
  const effectivePerf = getEffectiveMode(perfMode);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [searchOpen, setSearchOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<SearchResult[]>([]);
  const [searching, setSearching]       = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // Role is set server-side by lib/auth.ts; no client env var needed
  const role    = (session?.user as { role?: string })?.role ?? 'user';
  const isAdmin = role === 'owner' || role === 'admin';
  const navItems = isAdmin ? [...NAV_BASE, NAV_ADMIN] : NAV_BASE;

  // Detect whether Google OAuth is actually configured by checking the
  // /api/auth/providers endpoint once on mount.
  const [authAvailable, setAuthAvailable] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/auth/providers')
      .then(r => r.json())
      .then(d => setAuthAvailable(d && Object.keys(d).length > 0))
      .catch(() => setAuthAvailable(false));
  }, []);

  const handleNav = (id: string) => {
    setCurrentView(id as Parameters<typeof setCurrentView>[0]);
    setMobileOpen(false);
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setDropdownOpen(false);
    setQuery('');
    setResults([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setDropdownOpen(false); return; }
    setSearching(true);
    setDropdownOpen(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
      if (res.ok) {
        const data = await res.json() as { nodes: Record<string, unknown>[] };
        if (data.nodes?.length) {
          setResults(data.nodes.map(normaliseDbNode));
          setSearching(false);
          return;
        }
      }
    } catch {
      // DB down — fall through to static
    }
    // Static fallback
    setResults(searchStatic(q));
    setSearching(false);
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(q), 280);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') closeSearch();
  };

  const handleResultClick = (id: string) => {
    setPendingRabbitHoleNodeId(id);
    setCurrentView('rabbit-hole');
    closeSearch();
  };

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-purple-900/30"
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="w-8 h-8 rounded-full border border-purple-500 flex items-center justify-center relative">
              <span className="text-purple-400 text-xs font-bold">N</span>
              <div className="absolute inset-0 rounded-full animate-pulse-glow border border-purple-500/30" />
            </div>
            <span className="font-bold text-sm tracking-widest text-purple-300 hidden sm:block">
              NEXUS ARCHIVE
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    active
                      ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={13} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Search with live dropdown */}
            <div ref={containerRef} className="relative flex items-center">
              <AnimatePresence>
                {searchOpen && (
                  <motion.input
                    ref={inputRef}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'min(200px, 45vw)', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    value={query}
                    onChange={handleQueryChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Search theories..."
                    className="nexus-input text-xs h-8 !py-1 pr-6"
                  />
                )}
              </AnimatePresence>

              {/* Spinner inside input */}
              {searchOpen && searching && (
                <Loader2 size={12} className="absolute right-8 text-purple-400 animate-spin pointer-events-none" />
              )}

              <button
                onClick={searchOpen ? closeSearch : openSearch}
                className="p-2 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-900/30 transition-all"
              >
                {searchOpen ? <X size={16} /> : <Search size={16} />}
              </button>

              {/* Results dropdown */}
              <AnimatePresence>
                {dropdownOpen && results.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-10 w-72 max-h-80 overflow-y-auto glass-dark border border-purple-900/40 rounded-xl shadow-2xl z-50 py-1"
                  >
                    {results.map((r) => {
                      const catColor = CATEGORY_COLORS[r.category as keyof typeof CATEGORY_COLORS] ?? '#7c3aed';
                      return (
                        <button
                          key={r.id}
                          onClick={() => handleResultClick(r.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
                        >
                          <span className="text-base flex-shrink-0">{r.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{r.title}</p>
                            <p className="text-[10px] truncate" style={{ color: catColor }}>{r.category}</p>
                          </div>
                          <span className="text-[9px] text-slate-500 flex-shrink-0 capitalize">{r.evidenceLevel}</span>
                        </button>
                      );
                    })}
                    <div className="px-3 py-1.5 border-t border-purple-900/20 mt-1">
                      <p className="text-[9px] text-slate-600">Click to open in Rabbit Hole</p>
                    </div>
                  </motion.div>
                )}
                {dropdownOpen && !searching && results.length === 0 && query.length >= 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 top-10 w-64 glass-dark border border-purple-900/40 rounded-xl shadow-xl z-50 px-4 py-3"
                  >
                    <p className="text-xs text-slate-500">No results for &ldquo;{query}&rdquo;</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* XP indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-900/20 border border-purple-500/20">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-purple-300 font-medium">{progress.xp} XP</span>
            </div>

            {/* Performance mode toggle */}
            <button
              onClick={() => {
                const idx = PERF_CYCLE.indexOf(perfMode);
                setPerfMode(PERF_CYCLE[(idx + 1) % PERF_CYCLE.length]);
              }}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all border-white/10 hover:border-purple-500/40 hover:bg-purple-900/20"
              style={{ color: effectivePerf === 'high' ? '#22c55e' : effectivePerf === 'performance' ? '#f59e0b' : '#ef4444' }}
              title={`Performance: ${PERF_LABELS[perfMode]} (effective: ${effectivePerf}) — click to cycle`}
            >
              <Activity size={13} />
              <span>{PERF_LABELS[perfMode]}</span>
            </button>

            {/* Audio */}
            <button
              onClick={toggleAudio}
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-900/30 transition-all"
              title={audioEnabled ? 'Mute' : 'Enable ambient audio'}
            >
              {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Auth */}
            <div className="relative">
              {status === 'authenticated' && session?.user ? (
                <>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all"
                  >
                    {session.user.image ? (
                      <img src={session.user.image} alt="" className="w-6 h-6 rounded-full border border-purple-500/50" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-purple-700 flex items-center justify-center">
                        <span className="text-xs text-white font-bold">
                          {session.user.name?.[0]?.toUpperCase() ?? 'U'}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-slate-300 hidden sm:block max-w-[80px] truncate">
                      {session.user.name}
                    </span>
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        className="absolute right-0 top-10 w-44 glass-dark border border-purple-900/40 rounded-xl p-2 shadow-xl z-50"
                      >
                        <div className="px-3 py-2 border-b border-purple-900/30 mb-1">
                          <p className="text-xs text-slate-300 font-medium truncate">{session.user.name}</p>
                          <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                          {role !== 'user' && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-purple-900/50 text-purple-300">
                              {role}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => { setUserMenuOpen(false); setProfileOpen(true); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-purple-300 hover:bg-purple-900/20 transition-all"
                        >
                          <Trophy size={12} />
                          My Profile
                        </button>
                        <button
                          onClick={() => { setUserMenuOpen(false); signOut(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                        >
                          <LogOut size={12} />
                          Sign out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="relative group">
                  <button
                    onClick={() => {
                      if (authAvailable === false) return;
                      signIn('google', { callbackUrl: window.location.href });
                    }}
                    disabled={status === 'loading' || authAvailable === false}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-700/50 hover:bg-purple-600/60 text-purple-200 border border-purple-500/30 transition-all disabled:opacity-50"
                  >
                    <LogIn size={12} />
                    <span className="hidden sm:block">Sign In</span>
                  </button>
                  {authAvailable === false && (
                    <div className="absolute right-0 top-full mt-1.5 w-52 px-3 py-2 rounded-lg bg-slate-900 border border-red-800/50 text-[10px] text-red-400 shadow-xl z-50 hidden group-hover:block">
                      Google OAuth not configured.<br />
                      Set <span className="font-mono">AUTH_GOOGLE_ID</span> and <span className="font-mono">AUTH_GOOGLE_SECRET</span> env vars.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-40 glass-dark border-b border-purple-900/30 lg:hidden"
          >
            <div className="p-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-purple-900/50 text-purple-300'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UserProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
