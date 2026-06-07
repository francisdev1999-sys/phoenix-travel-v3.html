'use client';
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Network, GitBranch, BookMarked, Activity, FileWarning, Plus, Loader2 } from 'lucide-react';
import AdminStats from '@/components/admin/AdminStats';
import ProposedNodeCard from '@/components/admin/ProposedNodeCard';
import ProposedEdgeCard from '@/components/admin/ProposedEdgeCard';
import ProposeNodeForm from '@/components/admin/ProposeNodeForm';
import ProposeEdgeForm from '@/components/admin/ProposeEdgeForm';
import AdminReports from '@/components/admin/AdminReports';
import SourceReviewQueue from '@/components/sources/SourceReviewQueue';
import GraphDiagnostics from '@/components/sections/GraphDiagnostics';

type Tab = 'overview' | 'nodes' | 'edges' | 'sources' | 'diagnostics' | 'reports';

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const [tab, setTab] = useState<Tab>('overview');
  const [proposingNode, setProposingNode] = useState(false);
  const [proposingEdge, setProposingEdge] = useState(false);
  const [nodes, setNodes] = useState<unknown[]>([]);
  const [edges, setEdges] = useState<unknown[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingEdges, setLoadingEdges] = useState(false);
  const [nodeFilter, setNodeFilter] = useState<string>('pending');
  const [edgeFilter, setEdgeFilter] = useState<string>('pending');

  useEffect(() => {
    if (tab === 'nodes') {
      setLoadingNodes(true);
      fetch(`/api/nodes/propose?status=${nodeFilter}`)
        .then(r => r.json()).then(setNodes).finally(() => setLoadingNodes(false));
    }
  }, [tab, nodeFilter]);

  useEffect(() => {
    if (tab === 'edges') {
      setLoadingEdges(true);
      fetch(`/api/edges/propose?status=${edgeFilter}`)
        .then(r => r.json()).then(setEdges).finally(() => setLoadingEdges(false));
    }
  }, [tab, edgeFilter]);

  const refreshNodes = () => {
    setProposingNode(false);
    setLoadingNodes(true);
    fetch(`/api/nodes/propose?status=${nodeFilter}`)
      .then(r => r.json()).then(setNodes).finally(() => setLoadingNodes(false));
  };

  const refreshEdges = () => {
    setProposingEdge(false);
    setLoadingEdges(true);
    fetch(`/api/edges/propose?status=${edgeFilter}`)
      .then(r => r.json()).then(setEdges).finally(() => setLoadingEdges(false));
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-purple-400" size={24} /></div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <ShieldCheck size={36} className="text-purple-400" />
        <p className="text-sm font-bold text-white">Admin access required</p>
        <button onClick={() => signIn('github')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600">
          Sign in
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <ShieldCheck size={36} className="text-red-400" />
        <p className="text-sm font-bold text-white">Access denied</p>
        <p className="text-xs text-slate-400">This area is restricted to administrators.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',     label: 'Overview',      icon: <ShieldCheck size={13} /> },
    { id: 'nodes',        label: 'Nodes',          icon: <Network size={13} /> },
    { id: 'edges',        label: 'Relationships',  icon: <GitBranch size={13} /> },
    { id: 'sources',      label: 'Sources',        icon: <BookMarked size={13} /> },
    { id: 'diagnostics',  label: 'Diagnostics',    icon: <Activity size={13} /> },
    { id: 'reports',      label: 'Reports',        icon: <FileWarning size={13} /> },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-purple-900/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-purple-400" />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Admin Research Dashboard</h1>
            <p className="text-xs text-slate-500">No changes reach the graph without your approval.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-3 pb-0 flex-shrink-0 border-b border-purple-900/20">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px whitespace-nowrap ${
                tab === t.id ? 'border-purple-500 text-purple-300' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.15 }}
          className="flex-1 overflow-y-auto p-6"
        >
          {tab === 'overview' && (
            <AdminStats onTabSelect={t => setTab(t as Tab)} />
          )}

          {tab === 'nodes' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2">
                  {['pending', 'approved', 'rejected', 'needs_revision'].map(s => (
                    <button key={s} onClick={() => setNodeFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        nodeFilter === s ? 'bg-purple-900/50 text-purple-300' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >{s.replace('_', ' ')}</button>
                  ))}
                </div>
                <button onClick={() => setProposingNode(!proposingNode)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-600">
                  <Plus size={12} />Propose node
                </button>
              </div>

              <AnimatePresence>
                {proposingNode && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-900/10">
                      <ProposeNodeForm onSuccess={refreshNodes} onCancel={() => setProposingNode(false)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {loadingNodes ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
              ) : (nodes as unknown[]).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No {nodeFilter.replace('_', ' ')} nodes.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(nodes as Parameters<typeof ProposedNodeCard>[0]['node'][]).map((n) => (
                    <ProposedNodeCard key={(n as {id:string}).id} node={n as Parameters<typeof ProposedNodeCard>[0]['node']}
                      onReviewed={(id, action) => {
                        setNodes(prev => (prev as {id:string}[]).map(x => x.id === id ? { ...x, status: action } : x));
                      }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'edges' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2">
                  {['pending', 'approved', 'rejected', 'needs_revision'].map(s => (
                    <button key={s} onClick={() => setEdgeFilter(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        edgeFilter === s ? 'bg-purple-900/50 text-purple-300' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >{s.replace('_', ' ')}</button>
                  ))}
                </div>
                <button onClick={() => setProposingEdge(!proposingEdge)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-600">
                  <Plus size={12} />Propose relationship
                </button>
              </div>

              <AnimatePresence>
                {proposingEdge && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-900/10">
                      <ProposeEdgeForm onSuccess={refreshEdges} onCancel={() => setProposingEdge(false)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {loadingEdges ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
              ) : (edges as unknown[]).length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No {edgeFilter.replace('_', ' ')} relationships.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(edges as Parameters<typeof ProposedEdgeCard>[0]['edge'][]).map((e) => (
                    <ProposedEdgeCard key={(e as {id:string}).id} edge={e as Parameters<typeof ProposedEdgeCard>[0]['edge']}
                      onReviewed={(id, action) => {
                        setEdges(prev => (prev as {id:string}[]).map(x => x.id === id ? { ...x, status: action } : x));
                      }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'sources' && <SourceReviewQueue />}

          {tab === 'diagnostics' && <GraphDiagnostics />}

          {tab === 'reports' && <AdminReports />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
