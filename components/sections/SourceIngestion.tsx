'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { Plus, Search, Clock, ShieldCheck, LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import type { SourceRecord } from '@/lib/source-types';
import SourceSubmitForm from '@/components/sources/SourceSubmitForm';
import SourceBrowse from '@/components/sources/SourceBrowse';
import SourceDetailPanel from '@/components/sources/SourceDetailPanel';
import SourceReviewQueue from '@/components/sources/SourceReviewQueue';

type Tab = 'browse' | 'submit' | 'mine' | 'review';

export default function SourceIngestion() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAuthed = status === 'authenticated';

  const [tab, setTab] = useState<Tab>('browse');
  const [selected, setSelected] = useState<SourceRecord | null>(null);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; authRequired?: boolean; adminRequired?: boolean }[] = [
    { id: 'browse',  label: 'Browse',      icon: <Search size={13} /> },
    { id: 'submit',  label: 'Submit',      icon: <Plus size={13} />,       authRequired: true },
    { id: 'mine',    label: 'My Sources',  icon: <Clock size={13} />,      authRequired: true },
    { id: 'review',  label: 'Review Queue',icon: <ShieldCheck size={13} />, adminRequired: true },
  ];

  const visibleTabs = tabs.filter(t => {
    if (t.adminRequired && !isAdmin) return false;
    return true;
  });

  const handleSubmitted = (src: SourceRecord) => {
    setTab('mine');
    setSelected(src);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-purple-900/20 flex-shrink-0">
        <h1 className="text-lg font-bold text-white tracking-tight">Source Archive</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Contribute research sources that support, contradict, or reference nodes in the knowledge graph.
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-3 pb-0 flex-shrink-0">
        <div className="flex gap-1 border-b border-purple-900/20">
          {visibleTabs.map(t => (
            <button
              key={t.id}
              onClick={() => {
                if (t.authRequired && !isAuthed) { signIn('github'); return; }
                setTab(t.id);
                setSelected(null);
              }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px ${
                tab === t.id
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        <AnimatePresence mode="wait">
          {/* Left pane */}
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className={`${selected ? 'hidden sm:flex' : 'flex'} flex-col flex-1 min-w-0 overflow-y-auto p-6`}
          >
            {tab === 'browse' && (
              <SourceBrowse onSelect={src => setSelected(src)} />
            )}

            {tab === 'submit' && !isAuthed && (
              <NotSignedIn />
            )}
            {tab === 'submit' && isAuthed && (
              <SourceSubmitForm
                onSuccess={handleSubmitted}
                onCancel={() => setTab('browse')}
              />
            )}

            {tab === 'mine' && !isAuthed && (
              <NotSignedIn />
            )}
            {tab === 'mine' && isAuthed && (
              <SourceBrowse onSelect={src => setSelected(src)} mineOnly />
            )}

            {tab === 'review' && isAdmin && (
              <SourceReviewQueue />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Right detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '360px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="flex-shrink-0 border-l border-purple-900/20 overflow-hidden sm:flex flex-col hidden"
              style={{ minWidth: 0 }}
            >
              <SourceDetailPanel
                source={selected}
                isAdmin={isAdmin}
                onClose={() => setSelected(null)}
                onReview={(id, action) => {
                  setSelected(prev => prev ? { ...prev, status: action } : null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile full-screen detail */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="sm:hidden absolute inset-0 z-10 bg-[#000005] flex flex-col overflow-hidden"
            >
              <SourceDetailPanel
                source={selected}
                isAdmin={isAdmin}
                onClose={() => setSelected(null)}
                onReview={(id, action) => {
                  setSelected(prev => prev ? { ...prev, status: action } : null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NotSignedIn() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <LogIn size={32} className="text-purple-400" />
      <p className="text-sm font-bold text-white">Sign in to continue</p>
      <p className="text-xs text-slate-400 text-center">You need to be signed in to submit or view your sources.</p>
      <button
        onClick={() => signIn('github')}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}
