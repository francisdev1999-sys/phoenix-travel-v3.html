'use client';
import { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { MessageSquare, Rabbit, X, Globe2, Network } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import NavBar from '@/components/layout/NavBar';
import LandingPage from '@/components/sections/LandingPage';
import FeedbackWidget from '@/components/beta/FeedbackWidget';
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
import Breadcrumb from '@/components/navigation/Breadcrumb';
import CommandPalette from '@/components/navigation/CommandPalette';

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
  const { navigateToUniverse, navigateToGalaxy } = useUserStore();
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
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={navigateToUniverse}
          className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-sm transition-all"
        >
          <Globe2 size={16} />
          Browse Galaxies
        </button>
        <button
          onClick={() => navigateToGalaxy('ancient-civilizations', 'Ancient Civilizations')}
          className="flex items-center justify-center gap-2 w-full px-5 py-3.5 rounded-xl border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold text-sm transition-all"
        >
          Start Exploring
        </button>
      </div>
      <p className="text-xs text-slate-600">Rotate to landscape or open on desktop for the full graph experience.</p>
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
  const isLanding = currentView === 'landing';
  const prevChainLenRef = useRef(rabbitHoleChain.length);

  // Global Ctrl+K shortcut opens command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-open the rabbit hole panel the moment a rabbit hole is started
  useEffect(() => {
    if (rabbitHoleChain.length > 0 && prevChainLenRef.current === 0) {
      setSidePanel('rabbit');
    }
    if (rabbitHoleChain.length === 0) {
      prevChainLenRef.current = 0;
    } else {
      prevChainLenRef.current = rabbitHoleChain.length;
    }
  }, [rabbitHoleChain.length]);

  // Auto-close side panel when the user navigates to a different view
  useEffect(() => {
    setSidePanel(null);
  }, [currentView]);

  // Beta usage tracking — fire-and-forget on view change
  const sessionIdRef = useRef<string>(
    typeof window !== 'undefined'
      ? (sessionStorage.getItem('nexus_sid') ?? (() => {
          const s = Math.random().toString(36).slice(2);
          sessionStorage.setItem('nexus_sid', s);
          return s;
        })())
      : ''
  );
  const track = useCallback((eventType: string, meta?: Record<string, unknown>) => {
    void fetch('/api/beta/track', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ eventType, page: currentView, sessionId: sessionIdRef.current, meta }),
    }).catch(() => {/* fire-and-forget */});
  }, [currentView]);

  const VIEW_TO_EVENT: Record<string, string> = {
    graph:          'graph_view',
    timeline:       'timeline_view',
    globe:          'globe_view',
    sources:        'source_view',
    universe:       'universe_view',
    'evidence-board': 'evidence_view',
    'rabbit-hole':  'rabbit_hole',
  };
  const prevViewRef = useRef<string>('');
  useEffect(() => {
    if (currentView === prevViewRef.current || currentView === 'landing') return;
    prevViewRef.current = currentView;
    const eventType = VIEW_TO_EVENT[currentView];
    if (eventType) track(eventType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const isInitialMountRef = useRef(true);

  // Sync currentView → browser history so back/forward navigate within the app
  useEffect(() => {
    const hash = currentView === 'landing' ? '' : `#${currentView}`;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      window.history.replaceState({ view: currentView }, '', hash || '/');
      return;
    }

    // If hash already matches, this render was triggered by popstate — skip push
    if (window.location.hash === hash) return;

    window.history.pushState({ view: currentView }, '', hash || '/');
  }, [currentView]);

  // Intercept browser back/forward — keep navigation within the SPA
  useEffect(() => {
    const validViews = [
      'landing', 'graph', 'theory', 'universe',
      'galaxy', 'cluster', 'node', 'research-graph',
      'timeline', 'evidence-board', 'globe', 'dashboard',
      'diagnostics', 'sources', 'admin', 'rabbit-hole',
    ];

    const handlePopState = (e: PopStateEvent) => {
      const view = e.state?.view;
      setCurrentView(validViews.includes(view) ? view : 'landing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setCurrentView]);

  return (
    <MotionConfig reducedMotion={researchMode ? 'always' : 'user'}>
    <div
      className="min-h-screen bg-[#000005] text-slate-200 overflow-hidden"
      style={{ maxWidth: '100vw', overflowX: 'hidden' }}
      data-research={researchMode ? 'true' : undefined}
    >
      {/* Global particle field — suppressed in research mode */}
      {!isLanding && !researchMode && <Suspense fallback={null}><ParticleField /></Suspense>}

      {/* Landing Page */}
      <AnimatePresence mode="wait">
        {isLanding && (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <LandingPage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App */}
      <AnimatePresence>
        {!isLanding && (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 flex flex-col"
          >
            <NavBar />

            {/* Below-navbar wrapper — accounts for the fixed NavBar height */}
            <div className="flex-1 flex flex-col overflow-hidden pt-14 sm:pt-16">
              {/* Breadcrumb — only visible on galaxy hierarchy views */}
              {(['galaxy','cluster','node','research-graph'] as string[]).includes(currentView) && (
                <div className="flex-shrink-0 px-4 py-1.5 border-b border-purple-900/15 bg-black/20">
                  <Breadcrumb />
                </div>
              )}

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Core view */}
              <div className="flex-1 overflow-hidden relative">
                <Suspense fallback={<LoadingSpinner />}>
                  <AnimatePresence mode="wait">
                    {currentView === 'graph' && (
                      <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                        {isMobile ? <MobileGraphFallback /> : <KnowledgeGraph />}
                      </motion.div>
                    )}
                    {currentView === 'universe' && (
                      <motion.div key="universe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
                        <GalaxyView />
                      </motion.div>
                    )}
                    {currentView === 'galaxy' && (
                      <motion.div key="galaxy" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="absolute inset-0 overflow-y-auto">
                        <GalaxyView />
                      </motion.div>
                    )}
                    {currentView === 'cluster' && (
                      <motion.div key="cluster" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="absolute inset-0 overflow-y-auto">
                        <ClusterView />
                      </motion.div>
                    )}
                    {currentView === 'timeline' && (
                      <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
                        <TimelineExplorer />
                      </motion.div>
                    )}
                    {currentView === 'evidence-board' && (
                      <motion.div key="evidence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                        <EvidenceBoard />
                      </motion.div>
                    )}
                    {currentView === 'globe' && (
                      <motion.div key="globe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                        <AncientGlobe />
                      </motion.div>
                    )}
                    {currentView === 'dashboard' && (
                      <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
                        <Dashboard />
                      </motion.div>
                    )}
                    {currentView === 'diagnostics' && (
                      <motion.div key="diagnostics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
                        <GraphDiagnostics />
                      </motion.div>
                    )}
                    {currentView === 'sources' && (
                      <motion.div key="sources" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
                        <SourceIngestion />
                      </motion.div>
                    )}
                    {currentView === 'admin' && (
                      <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
                        <AdminPanel />
                      </motion.div>
                    )}
                    {currentView === 'rabbit-hole' && (
                      <motion.div key="rabbit-hole" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
                        <RabbitHoleView />
                      </motion.div>
                    )}
                    {currentView === 'node' && (
                      <motion.div key="node" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="absolute inset-0 overflow-y-auto">
                        <NodeView />
                      </motion.div>
                    )}
                    {currentView === 'intel-feed' && (
                      <motion.div key="intel-feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 overflow-y-auto">
                        <IntelFeed />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Suspense>
              </div>

              {/* Side panel — full-screen overlay on mobile, 340px sidebar on sm+ */}
              <AnimatePresence>
                {sidePanel && (
                  <>
                  {/* Tap backdrop — closes panel on mobile */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 sm:hidden bg-black/40"
                    onClick={() => setSidePanel(null)}
                  />
                  <motion.div
                    initial={{ x: '100%', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute inset-y-0 right-0 w-full sm:w-[340px] z-30 glass-dark border-l border-purple-900/20 overflow-hidden flex flex-col"
                  >
                    {/* Mobile-only close button for AI panel */}
                    {sidePanel === 'ai' && (
                      <button
                        onClick={() => setSidePanel(null)}
                        className="sm:hidden absolute top-3 right-3 z-10 p-2 glass rounded-lg text-slate-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <Suspense fallback={<LoadingSpinner />}>
                      {sidePanel === 'ai' && <AIAssistant />}
                      {sidePanel === 'rabbit' && (
                        <div className="flex flex-col h-full">
                          <div className="p-4 border-b border-purple-900/20 flex items-center justify-between">
                            <div className="text-sm font-bold text-white flex items-center gap-2">
                              <Rabbit size={16} className="text-purple-400" />
                              Rabbit Hole Mode
                            </div>
                            <button onClick={() => setSidePanel(null)} className="text-slate-500 hover:text-white">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex-1 overflow-y-auto">
                            <RabbitHoleMode />
                          </div>
                        </div>
                      )}
                    </Suspense>
                  </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            </div> {/* end below-navbar wrapper */}

            {/* Floating action buttons — above disclaimer banner */}
            <div className="fixed bottom-12 right-4 flex flex-col gap-3 z-40">
              {/* Beta Feedback button */}
              <FeedbackWidget currentView={currentView} />
              {/* Rabbit Hole button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidePanel(sidePanel === 'rabbit' ? null : 'rabbit')}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
                  sidePanel === 'rabbit'
                    ? 'bg-purple-600 glow-purple'
                    : 'glass border border-purple-500/30 hover:border-purple-500/60'
                }`}
                title="Rabbit Hole Mode"
              >
                <Rabbit size={18} className="text-purple-300" />
                {rabbitHoleChain.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                    {rabbitHoleChain.length}
                  </div>
                )}
              </motion.button>

              {/* AI Assistant button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSidePanel(sidePanel === 'ai' ? null : 'ai')}
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all ${
                  sidePanel === 'ai'
                    ? 'bg-cyan-700 glow-cyan'
                    : 'glass border border-cyan-500/30 hover:border-cyan-500/60'
                }`}
                title="AI Research Assistant"
              >
                <MessageSquare size={18} className="text-cyan-300" />
              </motion.button>
            </div>

            {/* Command Palette */}
            <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

            {/* Disclaimer banner */}
            <div className="fixed bottom-0 left-0 right-0 z-30 text-center py-1 bg-black/40 border-t border-purple-900/10">
              <p className="text-xs text-slate-600">
                All content is presented as theories, claims, and open questions — not established facts. Critical thinking is encouraged.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
