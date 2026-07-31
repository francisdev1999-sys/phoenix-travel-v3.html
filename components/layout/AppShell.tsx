'use client';
import { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { MessageSquare, Rabbit, X, Globe2, Network } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import AppSidebar from '@/components/layout/AppSidebar';
import AppTopbar from '@/components/layout/AppTopbar';
import LandingPage from '@/components/sections/LandingPage';
import FeedbackWidget from '@/components/beta/FeedbackWidget';
import EngagementSync from '@/components/engagement/EngagementSync';
import AchievementToasts from '@/components/engagement/AchievementToasts';
import OnboardingTour from '@/components/engagement/OnboardingTour';
const ParticleField = lazy(() => import('@/components/effects/ParticleField'));

const KnowledgeGraph = lazy(() => import('@/components/sections/KnowledgeGraph'));
const GalaxyView     = lazy(() => import('@/components/sections/GalaxyView'));
const ClusterView    = lazy(() => import('@/components/sections/ClusterView'));
const TimelineExplorer = lazy(() => import('@/components/sections/TimelineExplorer'));
const EvidenceBoard = lazy(() => import('@/components/sections/EvidenceBoard'));
const AncientGlobe = lazy(() => import('@/components/sections/AncientGlobe'));
const Dashboard = lazy(() => import('@/components/sections/Dashboard'));
const AIAssistant = lazy(() => import('@/components/sections/AIAssistant'));
const RabbitHoleMode = lazy(() => import('@/components/sections/RabbitHoleMode'));
const GraphDiagnostics  = lazy(() => import('@/components/sections/GraphDiagnostics'));
const SourceIngestion   = lazy(() => import('@/components/sections/SourceIngestion'));
const AdminPanel        = lazy(() => import('@/components/sections/AdminPanel'));
const RabbitHoleView    = lazy(() => import('@/components/sections/RabbitHoleView'));
const NodeView          = lazy(() => import('@/components/sections/NodeView'));
const IntelFeed         = lazy(() => import('@/components/sections/IntelFeed'));
const SearchExplorer    = lazy(() => import('@/components/sections/SearchExplorer'));
const ExploreFeed       = lazy(() => import('@/components/sections/ExploreFeed'));
const HomeView          = lazy(() => import('@/components/sections/HomeView'));
const ConnectView       = lazy(() => import('@/components/sections/ConnectView'));
const CompareView       = lazy(() => import('@/components/sections/CompareView'));
const ProfileView       = lazy(() => import('@/components/sections/ProfileView'));
const ProposeView       = lazy(() => import('@/components/sections/ProposeView'));
const MapExplorer       = lazy(() => import('@/components/sections/MapExplorer'));
import Breadcrumb from '@/components/navigation/Breadcrumb';
import CommandPalette from '@/components/navigation/CommandPalette';

const VALID_VIEWS = [
  'graph', 'universe', 'galaxy', 'cluster', 'node', 'research-graph',
  'timeline', 'evidence-board', 'globe', 'dashboard',
  'diagnostics', 'sources', 'admin', 'rabbit-hole', 'intel-feed', 'search', 'explore',
  'home', 'connect', 'compare', 'profile', 'propose', 'map',
] as const;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

function MobileGraphFallback() {
  const { navigateToUniverse } = useUserStore();
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-6">
      <div className="w-16 h-16 rounded-full border border-purple-500/40 bg-purple-950/30 flex items-center justify-center">
        <Network size={28} className="text-purple-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-white">Research Graph</h2>
        <p className="text-sm text-slate-400 max-w-xs">
          The interactive graph works best on a larger screen. On mobile, browse by topic instead.
        </p>
      </div>
      <button
        onClick={navigateToUniverse}
        className="flex items-center justify-center gap-2 w-full max-w-xs px-5 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm transition-all"
      >
        <Globe2 size={16} />
        Browse Galaxies
      </button>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto" />
        <div className="text-xs text-slate-500 tracking-widest">LOADING ARCHIVE...</div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { currentView, rabbitHoleChain, setCurrentView, researchMode } = useUserStore();
  const isMobile = useIsMobile();
  const [sidePanel, setSidePanel] = useState<'ai' | 'rabbit' | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isLanding = currentView === 'landing';
  const prevChainLenRef = useRef(rabbitHoleChain.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(o => !o); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (rabbitHoleChain.length > 0 && prevChainLenRef.current === 0) setSidePanel('rabbit');
    prevChainLenRef.current = rabbitHoleChain.length === 0 ? 0 : rabbitHoleChain.length;
  }, [rabbitHoleChain.length]);

  useEffect(() => { setSidePanel(null); setDrawerOpen(false); }, [currentView]);

  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const urlHash = window.location.hash.slice(1) as typeof VALID_VIEWS[number];
    if (urlHash && (VALID_VIEWS as readonly string[]).includes(urlHash)) setCurrentView(urlHash);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hash = currentView === 'landing' ? '' : `#${currentView}`;
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      window.history.replaceState({ view: currentView }, '', hash || '/');
      return;
    }
    if (window.location.hash === hash) return;
    window.history.pushState({ view: currentView }, '', hash || '/');
  }, [currentView]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const view = e.state?.view;
      setCurrentView((['landing', ...VALID_VIEWS] as string[]).includes(view) ? view : 'landing');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setCurrentView]);

  return (
    <MotionConfig reducedMotion={researchMode ? 'always' : 'user'}>
    <EngagementSync />
    <div
      className="min-h-screen bg-[#06060f] text-slate-200 overflow-hidden"
      style={{ maxWidth: '100vw', overflowX: 'hidden' }}
      data-research={researchMode ? 'true' : undefined}
    >
      {!isLanding && !researchMode && <Suspense fallback={null}><ParticleField /></Suspense>}

      {/* Landing */}
      <AnimatePresence mode="wait">
        {isLanding && (
          <motion.div key="landing" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="h-screen overflow-y-auto">
            <LandingPage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main app — sidebar + topbar shell */}
      <AnimatePresence>
        {!isLanding && (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="fixed inset-0 flex">
            {/* Sidebar — static ≥lg, drawer below */}
            <div className="hidden lg:block shrink-0 z-30"><AppSidebar /></div>
            <AnimatePresence>
              {drawerOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setDrawerOpen(false)} />
                  <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 26, stiffness: 240 }} className="lg:hidden fixed inset-y-0 left-0 z-50">
                    <AppSidebar onNavigate={() => setDrawerOpen(false)} />
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Main column */}
            <div className="flex-1 flex flex-col min-w-0">
              <AppTopbar onOpenMenu={() => setDrawerOpen(true)} />

              {(['galaxy','cluster','node','research-graph'] as string[]).includes(currentView) && (
                <div className="flex-shrink-0 px-4 py-1.5 border-b border-purple-900/15 bg-black/20">
                  <Breadcrumb />
                </div>
              )}

              <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 overflow-hidden relative">
                  <Suspense fallback={<LoadingSpinner />}>
                    <AnimatePresence mode="wait">
                      {currentView === 'home' && (
                        <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><HomeView /></motion.div>
                      )}
                      {currentView === 'connect' && (
                        <motion.div key="connect" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><ConnectView /></motion.div>
                      )}
                      {currentView === 'compare' && (
                        <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><CompareView /></motion.div>
                      )}
                      {currentView === 'profile' && (
                        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><ProfileView /></motion.div>
                      )}
                      {currentView === 'propose' && (
                        <motion.div key="propose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><ProposeView /></motion.div>
                      )}
                      {currentView === 'map' && (
                        <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><MapExplorer /></motion.div>
                      )}
                      {(currentView === 'graph' || currentView === 'research-graph') && (
                        <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                          {isMobile ? <MobileGraphFallback /> : <KnowledgeGraph />}
                        </motion.div>
                      )}
                      {currentView === 'universe' && (
                        <motion.div key="universe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><GalaxyView /></motion.div>
                      )}
                      {currentView === 'galaxy' && (
                        <motion.div key="galaxy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="absolute inset-0 overflow-y-auto"><GalaxyView /></motion.div>
                      )}
                      {currentView === 'cluster' && (
                        <motion.div key="cluster" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="absolute inset-0 overflow-y-auto"><ClusterView /></motion.div>
                      )}
                      {currentView === 'timeline' && (
                        <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><TimelineExplorer /></motion.div>
                      )}
                      {currentView === 'evidence-board' && (
                        <motion.div key="evidence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0"><EvidenceBoard /></motion.div>
                      )}
                      {currentView === 'globe' && (
                        <motion.div key="globe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0"><AncientGlobe /></motion.div>
                      )}
                      {currentView === 'dashboard' && (
                        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><Dashboard /></motion.div>
                      )}
                      {currentView === 'diagnostics' && (
                        <motion.div key="diagnostics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><GraphDiagnostics /></motion.div>
                      )}
                      {currentView === 'sources' && (
                        <motion.div key="sources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><SourceIngestion /></motion.div>
                      )}
                      {currentView === 'admin' && (
                        <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><AdminPanel /></motion.div>
                      )}
                      {currentView === 'rabbit-hole' && (
                        <motion.div key="rabbit-hole" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><RabbitHoleView /></motion.div>
                      )}
                      {currentView === 'node' && (
                        <motion.div key="node" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="absolute inset-0 overflow-y-auto"><NodeView /></motion.div>
                      )}
                      {currentView === 'intel-feed' && (
                        <motion.div key="intel-feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><IntelFeed /></motion.div>
                      )}
                      {currentView === 'search' && (
                        <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><SearchExplorer /></motion.div>
                      )}
                      {currentView === 'explore' && (
                        <motion.div key="explore" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto"><ExploreFeed /></motion.div>
                      )}
                    </AnimatePresence>
                  </Suspense>
                </div>

                {/* Side panel (AI / Rabbit) */}
                <AnimatePresence>
                  {sidePanel && (
                    <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 sm:hidden bg-black/40" onClick={() => setSidePanel(null)} />
                    <motion.div
                      initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="absolute inset-y-0 right-0 w-full sm:w-[340px] z-30 glass-dark border-l border-purple-900/20 overflow-hidden flex flex-col"
                    >
                      {sidePanel === 'ai' && (
                        <button onClick={() => setSidePanel(null)} className="sm:hidden absolute top-3 right-3 z-10 p-2 glass rounded-lg text-slate-400 hover:text-white"><X size={16} /></button>
                      )}
                      <Suspense fallback={<LoadingSpinner />}>
                        {sidePanel === 'ai' && <AIAssistant />}
                        {sidePanel === 'rabbit' && (
                          <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-purple-900/20 flex items-center justify-between">
                              <div className="text-sm font-bold text-white flex items-center gap-2"><Rabbit size={16} className="text-purple-400" />Rabbit Hole Mode</div>
                              <button onClick={() => setSidePanel(null)} className="text-slate-500 hover:text-white"><X size={14} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto"><RabbitHoleMode /></div>
                          </div>
                        )}
                      </Suspense>
                    </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* FABs */}
            <div className="fixed bottom-4 right-4 flex flex-col gap-3 z-40">
              <FeedbackWidget currentView={currentView} />
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                onClick={() => setSidePanel(sidePanel === 'rabbit' ? null : 'rabbit')}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${sidePanel === 'rabbit' ? 'bg-purple-600 glow-purple' : 'glass border border-purple-500/30 hover:border-purple-500/60'}`}
                title="Rabbit Hole Mode"
              >
                <Rabbit size={18} className="text-purple-300" />
                {rabbitHoleChain.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">{rabbitHoleChain.length}</div>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                onClick={() => setSidePanel(sidePanel === 'ai' ? null : 'ai')}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${sidePanel === 'ai' ? 'bg-cyan-700 glow-cyan' : 'glass border border-cyan-500/30 hover:border-cyan-500/60'}`}
                title="AI Research Assistant"
              >
                <MessageSquare size={18} className="text-cyan-300" />
              </motion.button>
            </div>

            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
            <AchievementToasts />
            <OnboardingTour />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
