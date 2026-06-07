'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, BarChart3, Clock, MapPin, Grid3X3, User, Volume2, VolumeX, Menu, X, LogIn, LogOut, Activity, BookMarked } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import { useSession, signIn, signOut } from 'next-auth/react';

const navItems = [
  { id: 'graph', label: 'Knowledge Graph', icon: Grid3X3 },
  { id: 'universe', label: 'Universe View', icon: Globe },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'globe', label: 'Ancient Sites', icon: MapPin },
  { id: 'evidence-board', label: 'Evidence Board', icon: BarChart3 },
  { id: 'dashboard', label: 'Dashboard', icon: User },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
  { id: 'sources',     label: 'Sources',     icon: BookMarked },
];

export default function NavBar() {
  const { currentView, setCurrentView, audioEnabled, toggleAudio, progress, setSearchQuery, searchQuery } = useUserStore();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleNav = (id: string) => {
    setCurrentView(id as Parameters<typeof setCurrentView>[0]);
    setMobileOpen(false);
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
            {/* Search */}
            <AnimatePresence>
              {searchOpen && (
                <motion.input
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'min(160px, 40vw)', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search theories..."
                  className="nexus-input text-xs h-8 !py-1"
                  autoFocus
                />
              )}
            </AnimatePresence>
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-900/30 transition-all"
            >
              <Search size={16} />
            </button>

            {/* XP indicator */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-900/20 border border-purple-500/20">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs text-purple-300 font-medium">{progress.xp} XP</span>
            </div>

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
                        </div>
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
                <button
                  onClick={() => signIn('github')}
                  disabled={status === 'loading'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-700/50 hover:bg-purple-600/60 text-purple-200 border border-purple-500/30 transition-all disabled:opacity-50"
                >
                  <LogIn size={12} />
                  <span className="hidden sm:block">Sign In</span>
                </button>
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
    </>
  );
}
