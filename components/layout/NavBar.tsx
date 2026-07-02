'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Globe, BarChart3, Clock, MapPin, Grid3X3, User,
  Volume2, VolumeX, Menu, X, LogIn, LogOut, Activity, BookMarked,
  ShieldCheck, Rabbit, Loader2, MoreHorizontal, Wrench, Trophy, UserCheck, Eye,
  ScanText, Radio,
} from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { useSession, signIn, signOut } from 'next-auth/react';
import { CATEGORY_COLORS } from '@/lib/graph/colors';

type LightNode = { id: string; title: string; category: string; description?: string; tags?: string[]; icon?: string; evidence_level?: string };
let _staticNodes: LightNode[] | null = null;
async function lazyStaticNodes(): Promise<LightNode[]> {
  if (_staticNodes) return _staticNodes;
  const mod = await import('@/lib/graph/nodes');
  _staticNodes = mod.nodes as unknown as LightNode[];
  return _staticNodes;
}
import UserProfilePanel from '@/components/sections/UserProfilePanel';
import { usePerformanceStore, getEffectiveMode, type PerfMode } from '@/lib/store/performanceStore';

const NAV_PRIMARY = [
  { id: 'search',         label: 'Search',          icon: Search },
  { id: 'universe',       label: 'Universe',        icon: Globe },
  { id: 'timeline',       label: 'Timeline',        icon: Clock },
  { id: 'globe',          label: 'Nexus Globe',     icon: MapPin },
  { id: 'evidence-board', label: 'Evidence Board',  icon: BarChart3 },
  { id: 'rabbit-hole',    label: 'Rabbit Hole',     icon: Rabbit },
  { id: 'dashboard',      label: 'Dashboard',       icon: User },
  { id: 'graph',          label: 'Research Graph',  icon: Grid3X3 },
];
// Always-visible tools (no auth required)
const NAV_TOOLS_BASE = [
  { id: 'intel-feed',  label: 'Intel Feed',  icon: Radio },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  { id: 'sources',     label: 'Sources',     icon: BookMarked },
];
const NAV_ADMIN = { id: 'admin', label: 'Admin Panel', icon: ShieldCheck };
// Keep NAV_BASE alias for mobile menu
const NAV_BASE = [...NAV_PRIMARY, ...NAV_TOOLS_BASE];

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

async function searchStatic(q: string): Promise<SearchResult[]> {
  const lq = q.toLowerCase();
  const nodes = await lazyStaticNodes();
  return nodes
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

// ── Sign-in modal ─────────────────────────────────────────────────────────────
function SignInModal({ onClose, onGuest }: { onClose: () => void; onGuest: () => void }) {
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogle = async () => {
    setSigningIn(true);
    try {
      await signIn('google', { callbackUrl: window.location.href });
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
        className="relative w-full max-w-sm bg-slate-950 border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-purple-900/20">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border border-purple-500 flex items-center justify-center">
                <span className="text-purple-400 text-xs font-bold">N</span>
              </div>
              <span className="text-sm font-bold tracking-widest text-purple-300">NEXUS ARCHIVE</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all">
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Explore ancient mysteries, hidden connections, and unexplained phenomena.</p>
        </div>

        {/* Options */}
        <div className="p-6 flex flex-col gap-3">
          {/* Google sign in */}
          <button
            onClick={handleGoogle}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm transition-all shadow-lg disabled:opacity-60"
          >
            {signingIn ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-slate-600 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Guest */}
          <button
            onClick={onGuest}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 text-slate-300 font-medium text-sm transition-all"
          >
            <Eye size={16} className="text-slate-400" />
            Browse as Guest
          </button>

          {/* Permissions */}
          <div className="mt-1 grid grid-cols-2 gap-2">
            <div className="px-3 py-2.5 rounded-lg bg-green-900/15 border border-green-500/20">
              <p className="text-[10px] font-bold text-green-400 mb-1.5 flex items-center gap-1">
                <UserCheck size={10} /> Signed In
              </p>
              <ul className="text-[10px] text-green-300 space-y-0.5">
                <li>✓ View everything</li>
                <li>✓ Submit theories</li>
                <li>✓ Propose connections</li>
                <li>✓ Track progress</li>
              </ul>
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30">
              <p className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center gap-1">
                <Eye size={10} /> Guest
              </p>
              <ul className="text-[10px] text-slate-500 space-y-0.5">
                <li>✓ View everything</li>
                <li>✗ Submit theories</li>
                <li>✗ Propose connections</li>
                <li>✗ Track progress</li>
              </ul>
            </div>
          </div>

          <p className="text-[10px] text-slate-600 text-center">
            By signing in you agree to keep exploration thoughtful and respectful.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── NavBar ────────────────────────────────────────────────────────────────────
export default function NavBar() {
  const {
    currentView, setCurrentView, audioEnabled, toggleAudio,
    progress, setPendingRabbitHoleNodeId, guestMode, setGuestMode,
    researchMode, toggleResearchMode,
  } = useUserStore();
  const { data: session, status } = useSession();
  const { mode: perfMode, setMode: setPerfMode } = usePerformanceStore();
  const effectivePerf = getEffectiveMode(perfMode);
  const [mobileOpen, setMobileOpen]       = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [showSignIn, setShowSignIn]       = useState(false);
  const [toolsOpen, setToolsOpen]         = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [query, setQuery]                 = useState('');
  const [results, setResults]             = useState<SearchResult[]>([]);
  const [searching, setSearching]         = useState(false);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  const role    = (session?.user as { role?: string })?.role ?? 'user';
  const isAdmin = role === 'owner' || role === 'admin';
  const navItems = isAdmin ? [...NAV_BASE, NAV_ADMIN] : NAV_BASE;
  const toolsItems = isAdmin ? [...NAV_TOOLS_BASE, NAV_ADMIN] : NAV_TOOLS_BASE;

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
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
    } catch { /* fall through */ }
    setResults(await searchStatic(q));
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

  const handleGuest = () => {
    setGuestMode(true);
    setShowSignIn(false);
  };

  const handleSignOut = () => {
    setUserMenuOpen(false);
    setGuestMode(false);
    signOut();
  };

  const isAuthenticated = status === 'authenticated' && session?.user;

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-purple-900/30"
        style={{ maxWidth: '100vw' }}
      >
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">

          {/* Logo */}
          <button
            onClick={() => setCurrentView('landing')}
            className="flex items-center gap-2 flex-shrink-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-purple-500 flex items-center justify-center relative">
              <span className="text-purple-400 text-xs font-bold">N</span>
              <div className="absolute inset-0 rounded-full animate-pulse-glow border border-purple-500/30" />
            </div>
            <span className="font-bold text-xs sm:text-sm tracking-widest text-purple-300 hidden sm:block">
              NEXUS ARCHIVE
            </span>
          </button>

          {/* Desktop Nav — primary views + Tools dropdown */}
          <div className="hidden lg:flex items-center gap-0.5 xl:gap-1 flex-shrink-0">
            {NAV_PRIMARY.map((item) => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-1 xl:gap-1.5 px-2 xl:px-2.5 py-2 rounded-lg text-[11px] xl:text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    active
                      ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden 2xl:inline">{item.label}</span>
                  <span className="hidden xl:inline 2xl:hidden">{item.label.split(' ')[0]}</span>
                </button>
              );
            })}

            {/* Tools dropdown — Diagnostics, Sources, Admin */}
            <div ref={toolsRef} className="relative">
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className={`flex items-center gap-1 xl:gap-1.5 px-2 xl:px-2.5 py-2 rounded-lg text-[11px] xl:text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                  toolsItems.some(t => t.id === currentView) || toolsOpen
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
                title="Tools"
              >
                <Wrench size={13} />
                <span className="hidden xl:inline">Tools</span>
                <MoreHorizontal size={10} className="opacity-50" />
              </button>
              <AnimatePresence>
                {toolsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-10 w-44 glass-dark border border-purple-900/40 rounded-xl shadow-2xl z-50 py-1"
                  >
                    {toolsItems.map((item) => {
                      const Icon = item.icon;
                      const active = currentView === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => { handleNav(item.id); setToolsOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors text-left ${
                            active
                              ? 'text-purple-300 bg-purple-900/30'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <Icon size={13} />
                          {item.label}
                          {item.id === 'admin' && (
                            <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300 uppercase font-bold">
                              Owner
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 flex-shrink-0">

            {/* Search */}
            <div ref={containerRef} className="relative flex items-center">
              <AnimatePresence>
                {searchOpen && (
                  <motion.input
                    ref={inputRef}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'min(180px, 40vw)', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    value={query}
                    onChange={handleQueryChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Search theories..."
                    className="nexus-input text-xs h-8 !py-1 pr-6"
                  />
                )}
              </AnimatePresence>
              {searchOpen && searching && (
                <Loader2 size={12} className="absolute right-8 text-purple-400 animate-spin pointer-events-none" />
              )}
              <button
                onClick={searchOpen ? closeSearch : openSearch}
                aria-label={searchOpen ? 'Close search' : 'Search'}
                className="p-2 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-900/30 transition-all"
              >
                {searchOpen ? <X size={15} /> : <Search size={15} />}
              </button>

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

            {/* XP — desktop only */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-purple-900/20 border border-purple-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-purple-300 font-medium">{progress.xp} XP</span>
            </div>

            {/* Performance mode — desktop only */}
            <button
              onClick={() => {
                const idx = PERF_CYCLE.indexOf(perfMode);
                setPerfMode(PERF_CYCLE[(idx + 1) % PERF_CYCLE.length]);
              }}
              className="hidden xl:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all border-white/10 hover:border-purple-500/40 hover:bg-purple-900/20"
              style={{ color: effectivePerf === 'high' ? '#22c55e' : effectivePerf === 'performance' ? '#f59e0b' : '#ef4444' }}
              title={`Performance: ${PERF_LABELS[perfMode]}`}
            >
              <Activity size={12} />
              <span>{PERF_LABELS[perfMode]}</span>
            </button>

            {/* Research Mode toggle */}
            <button
              onClick={toggleResearchMode}
              title={researchMode ? 'Exit Research Mode' : 'Research Mode — hides particles & reduces animations'}
              className={`hidden sm:flex items-center gap-1 p-2 rounded-lg transition-all ${
                researchMode
                  ? 'text-amber-300 bg-amber-900/30 border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-400 hover:bg-amber-900/20'
              }`}
            >
              <ScanText size={15} />
              {researchMode && <span className="text-[10px] font-bold hidden xl:inline">Focus</span>}
            </button>

            {/* Audio — hidden on xs */}
            <button
              onClick={toggleAudio}
              className="hidden sm:flex p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-900/30 transition-all"
            >
              {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* ── Auth section ── */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all"
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
                  <span className="text-xs text-slate-300 hidden xl:block max-w-[70px] truncate">
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
                        <Trophy size={12} />My Profile
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-all"
                      >
                        <LogOut size={12} />Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : guestMode ? (
              /* Guest indicator */
              <button
                onClick={() => setShowSignIn(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/50 hover:border-purple-500/50 text-slate-400 hover:text-purple-300 transition-all"
              >
                <Eye size={12} />
                <span className="hidden sm:inline">Guest</span>
                <span className="text-purple-400 ml-0.5">·</span>
                <LogIn size={11} className="text-purple-400" />
              </button>
            ) : (
              /* Sign-in CTA — always visible, always labeled */
              <button
                onClick={() => setShowSignIn(true)}
                disabled={status === 'loading'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/40 transition-all shadow-lg shadow-purple-900/40 disabled:opacity-50"
              >
                <LogIn size={13} />
                <span>Sign In</span>
              </button>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              {mobileOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-14 sm:top-16 left-0 right-0 z-40 glass-dark border-b border-purple-900/30 lg:hidden max-h-[calc(100vh-56px)] overflow-y-auto"
          >
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      active
                        ? 'bg-purple-900/60 text-purple-300 border border-purple-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Mobile extras */}
            <div className="px-3 pb-3 flex items-center gap-2 border-t border-purple-900/20 pt-2 flex-wrap">
              <button
                onClick={toggleAudio}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-cyan-400 bg-white/5 hover:bg-cyan-900/20 transition-all"
              >
                {audioEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                {audioEnabled ? 'Mute' : 'Sound'}
              </button>
              <button
                onClick={() => {
                  const idx = PERF_CYCLE.indexOf(perfMode);
                  setPerfMode(PERF_CYCLE[(idx + 1) % PERF_CYCLE.length]);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/10 transition-all"
                style={{ color: effectivePerf === 'high' ? '#22c55e' : effectivePerf === 'performance' ? '#f59e0b' : '#ef4444' }}
              >
                <Activity size={13} />
                {PERF_LABELS[perfMode]}
              </button>
              <button
                onClick={toggleResearchMode}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all ${
                  researchMode
                    ? 'text-amber-300 bg-amber-900/30 border border-amber-500/30'
                    : 'text-slate-400 bg-white/5 border border-white/10 hover:text-amber-400'
                }`}
              >
                <ScanText size={13} />
                {researchMode ? 'Focus On' : 'Focus'}
              </button>
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-500/20 ml-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-xs text-purple-300 font-medium">{progress.xp} XP</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign-in modal */}
      <AnimatePresence>
        {showSignIn && (
          <SignInModal
            onClose={() => setShowSignIn(false)}
            onGuest={handleGuest}
          />
        )}
      </AnimatePresence>

      <UserProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
