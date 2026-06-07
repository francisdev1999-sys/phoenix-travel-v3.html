'use client';
import { Suspense, lazy, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Rabbit, X } from 'lucide-react';
import { useUserStore } from '@/lib/store/userStore';
import NavBar from '@/components/layout/NavBar';
import LandingPage from '@/components/sections/LandingPage';
import ParticleField from '@/components/effects/ParticleField';

const KnowledgeGraph = lazy(() => import('@/components/sections/KnowledgeGraph'));
const UniverseView = lazy(() => import('@/components/sections/UniverseView'));
const TimelineExplorer = lazy(() => import('@/components/sections/TimelineExplorer'));
const EvidenceBoard = lazy(() => import('@/components/sections/EvidenceBoard'));
const AncientGlobe = lazy(() => import('@/components/sections/AncientGlobe'));
const Dashboard = lazy(() => import('@/components/sections/Dashboard'));
const AIAssistant = lazy(() => import('@/components/sections/AIAssistant'));
const RabbitHoleMode = lazy(() => import('@/components/sections/RabbitHoleMode'));
const GraphDiagnostics = lazy(() => import('@/components/sections/GraphDiagnostics'));

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
  const { currentView, rabbitHoleChain, setCurrentView } = useUserStore();
  const [sidePanel, setSidePanel] = useState<'ai' | 'rabbit' | null>(null);
  const isLanding = currentView === 'landing';

  // Auto-close side panel when the user navigates to a different view
  useEffect(() => {
    setSidePanel(null);
  }, [currentView]);

  return (
    <div className="min-h-screen bg-[#000005] text-slate-200 overflow-hidden">
      {/* Global particle field for non-landing views */}
      {!isLanding && <ParticleField />}

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

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden mt-16 relative">
              {/* Core view */}
              <div className="flex-1 overflow-hidden relative">
                <Suspense fallback={<LoadingSpinner />}>
                  <AnimatePresence mode="wait">
                    {currentView === 'graph' && (
                      <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                        <KnowledgeGraph />
                      </motion.div>
                    )}
                    {currentView === 'universe' && (
                      <motion.div key="universe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                        <UniverseView />
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
                            <RabbitHoleMode onSelectTheory={() => setCurrentView('graph')} />
                          </div>
                        </div>
                      )}
                    </Suspense>
                  </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Floating action buttons — above disclaimer banner */}
            <div className="fixed bottom-12 right-4 flex flex-col gap-3 z-40">
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
  );
}
