'use client';
import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Network, GitBranch, BookMarked, Activity, FileWarning, Plus, Loader2, Package, InboxIcon, Sparkles, Users, BarChart3, AlertOctagon, Brain, ShieldAlert, Search, Link2, MessageSquarePlus, Ticket, TrendingUp, ClipboardList, Database, CheckCircle2, Cpu, AlertCircle } from 'lucide-react';
import AdminStats from '@/components/admin/AdminStats';
import ProposedNodeCard from '@/components/admin/ProposedNodeCard';
import ProposedEdgeCard from '@/components/admin/ProposedEdgeCard';
import ProposeNodeForm from '@/components/admin/ProposeNodeForm';
import ProposeEdgeForm from '@/components/admin/ProposeEdgeForm';
import AdminReports from '@/components/admin/AdminReports';
import SourceReviewQueue from '@/components/sources/SourceReviewQueue';
import GraphDiagnostics from '@/components/sections/GraphDiagnostics';
import ImportBatchList from '@/components/admin/ImportBatchList';
import ImportBatchDetail from '@/components/admin/ImportBatchDetail';
import DraftNodeQueue from '@/components/admin/DraftNodeQueue';
import RelationshipSuggestions from '@/components/admin/RelationshipSuggestions';
import UserManagement from '@/components/admin/UserManagement';
import ModerationQueue from '@/components/admin/ModerationQueue';
import PlatformHealthDashboard from '@/components/admin/PlatformHealthDashboard';
import UserIntelligenceDashboard from '@/components/admin/UserIntelligenceDashboard';
import ArchiveBiasAudit from '@/components/admin/ArchiveBiasAudit';
import SimilarityAudit from '@/components/similarity/SimilarityAudit';
import AiActivityDashboard from '@/components/admin/AiActivityDashboard';
import ArchiveAuditDashboard from '@/components/admin/ArchiveAuditDashboard';
import SourceLinkEnrichment from '@/components/admin/SourceLinkEnrichment';
import BetaFeedbackAdmin from '@/components/admin/BetaFeedbackAdmin';
import BetaInviteManager from '@/components/admin/BetaInviteManager';
import BetaAnalytics from '@/components/admin/BetaAnalytics';
import CROAuditDashboard from '@/components/admin/CROAuditDashboard';
import SourceIntelligenceDashboard from '@/components/admin/SourceIntelligenceDashboard';

type Tab = 'overview' | 'nodes' | 'edges' | 'sources' | 'diagnostics' | 'reports' | 'imports' | 'drafts' | 'suggestions' | 'users' | 'moderation' | 'platform' | 'intelligence' | 'integrity' | 'similarity' | 'ai-activity' | 'ai-audit' | 'source-enrichment' | 'beta-feedback' | 'beta-invites' | 'beta-analytics' | 'cro-audit' | 'source-intel';

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const role    = (session?.user as { role?: string })?.role ?? 'user';
  const isAdmin = role === 'owner' || role === 'admin';
  const isOwner = role === 'owner';
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [proposingNode, setProposingNode] = useState(false);
  const [proposingEdge, setProposingEdge] = useState(false);
  const [nodes, setNodes] = useState<unknown[]>([]);
  const [edges, setEdges] = useState<unknown[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [loadingEdges, setLoadingEdges] = useState(false);
  const [nodeFilter, setNodeFilter] = useState<string>('pending');
  const [edgeFilter, setEdgeFilter] = useState<string>('pending');
  const [seeding, setSeeding]       = useState(false);
  const [seedMsg, setSeedMsg]       = useState<string | null>(null);
  const [embStats, setEmbStats]     = useState<{ totalPublished: number; hasEmbedding: number; missing: number; coveragePct: number; hasOpenAiKey: boolean } | null>(null);
  const [embGenerating, setEmbGenerating] = useState(false);
  const [embMsg, setEmbMsg]         = useState<string | null>(null);
  const [scanning,  setScanning]    = useState(false);
  const [scanMsg,   setScanMsg]     = useState<string | null>(null);

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

  useEffect(() => {
    fetch('/api/admin/embeddings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEmbStats(d); })
      .catch(() => {});
  }, []);

  const generateEmbeddings = async () => {
    setEmbGenerating(true);
    setEmbMsg(null);
    try {
      const r = await fetch('/api/admin/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-all' }),
      });
      const d = await r.json() as { message?: string; error?: string; started?: boolean };
      if (!r.ok) {
        setEmbMsg(d.error ?? 'Failed to start embedding generation.');
      } else {
        setEmbMsg(d.message ?? 'Embedding generation started.');
        setTimeout(() => {
          fetch('/api/admin/embeddings').then(r => r.json()).then(setEmbStats).catch(() => {});
        }, 5000);
      }
    } catch {
      setEmbMsg('Request failed.');
    } finally {
      setEmbGenerating(false);
    }
  };

  const runSeed = async () => {
    setSeeding(true);
    setSeedMsg(null);
    try {
      const r = await fetch('/api/admin/seed', { method: 'POST' });
      const d = await r.json();
      setSeedMsg(d.message ?? 'Seed started — reload in ~30s.');
    } catch {
      setSeedMsg('Seed request failed.');
    } finally {
      setSeeding(false);
    }
  };

  const runFullArchiveScan = async () => {
    setScanning(true);
    setScanMsg(null);
    try {
      const r = await fetch('/api/admin/discovery-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', maxNodes: 9999 }),
      });
      const d = await r.json() as { nodesChecked?: number; sourcesFound?: number; autoApproved?: number; pendingReview?: number; error?: string };
      if (!r.ok) { setScanMsg(d.error ?? `Error ${r.status}`); return; }
      setScanMsg(`Done — ${d.nodesChecked} nodes scanned, ${d.sourcesFound} sources found (${d.autoApproved} auto-approved, ${d.pendingReview} pending review)`);
    } catch (e) {
      setScanMsg(`Scan failed: ${String(e)}`);
    } finally {
      setScanning(false);
    }
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-purple-400" size={24} /></div>;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        <ShieldCheck size={36} className="text-purple-400" />
        <p className="text-sm font-bold text-white">Admin access required</p>
        <button onClick={() => signIn('google')} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600">
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

  const allTabs: { id: Tab; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
    { id: 'overview',          label: 'Overview',        icon: <ShieldCheck size={13} /> },
    { id: 'drafts',            label: 'Draft Queue',     icon: <InboxIcon size={13} />   },
    { id: 'imports',           label: 'Imports',         icon: <Package size={13} />     },
    { id: 'nodes',             label: 'Nodes',           icon: <Network size={13} />     },
    { id: 'edges',             label: 'Relationships',   icon: <GitBranch size={13} />   },
    { id: 'sources',           label: 'Sources',         icon: <BookMarked size={13} />  },
    { id: 'suggestions',       label: 'Suggestions',     icon: <Sparkles size={13} />    },
    { id: 'integrity',         label: 'Bias Audit',      icon: <ShieldAlert size={13} /> },
    { id: 'similarity',        label: 'Similarity',      icon: <Search size={13} />      },
    { id: 'ai-audit',          label: 'Archive Audit',   icon: <ShieldCheck size={13} /> },
    { id: 'cro-audit',         label: 'CRO Audit',       icon: <ClipboardList size={13} /> },
    { id: 'source-enrichment', label: 'Link Enrichment', icon: <Link2 size={13} />       },
    { id: 'source-intel',      label: 'Source Intel',   icon: <Cpu size={13} />          },
    { id: 'users',             label: 'Users',           icon: <Users size={13} />       },
    { id: 'moderation',        label: 'Moderation',      icon: <AlertOctagon size={13} />},
    { id: 'diagnostics',       label: 'Diagnostics',     icon: <Activity size={13} />    },
    { id: 'reports',           label: 'Reports',         icon: <FileWarning size={13} /> },
    { id: 'beta-feedback',      label: 'Beta Feedback',   icon: <MessageSquarePlus size={13} /> },
    { id: 'beta-invites',       label: 'Beta Invites',    icon: <Ticket size={13} /> },
    { id: 'beta-analytics',     label: 'Beta Analytics',  icon: <TrendingUp size={13} /> },
    { id: 'platform',          label: 'Platform',        icon: <BarChart3 size={13} />,  ownerOnly: true },
    { id: 'intelligence',      label: 'User Intel',      icon: <Brain size={13} />,      ownerOnly: true },
    { id: 'ai-activity',       label: 'AI Activity',     icon: <Sparkles size={13} />,   ownerOnly: true },
  ];
  const tabs = allTabs.filter(t => !t.ownerOnly || isOwner);

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
            <div className="flex flex-col gap-6">
              {/* Seed Database */}
              <div className="p-4 rounded-xl border border-purple-900/30 bg-purple-950/20 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <Database size={16} className="text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">Seed Database</p>
                    <p className="text-xs text-slate-500">Populate the archive from static source data. Safe to run multiple times (upserts only).</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {seedMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle2 size={13} />
                      <span className="max-w-xs truncate">{seedMsg}</span>
                    </div>
                  )}
                  <button
                    onClick={runSeed}
                    disabled={seeding}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {seeding ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                    {seeding ? 'Starting…' : 'Run Seed'}
                  </button>
                </div>
              </div>
              {/* Embeddings */}
              <div className="p-4 rounded-xl border border-cyan-900/30 bg-cyan-950/10 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Cpu size={16} className="text-cyan-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">Vector Embeddings</p>
                    <p className="text-xs text-slate-500">
                      {embStats
                        ? embStats.missing === 0
                          ? `${embStats.hasEmbedding}/${embStats.totalPublished} nodes embedded (100%)`
                          : `${embStats.hasEmbedding}/${embStats.totalPublished} embedded — ${embStats.missing} missing (${embStats.coveragePct}%)`
                        : 'Loading coverage…'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {embMsg && (
                    <div className={`flex items-center gap-1.5 text-xs ${embMsg.includes('failed') || embMsg.includes('error') || embMsg.includes('OPENAI') ? 'text-red-400' : 'text-cyan-400'}`}>
                      {embMsg.includes('failed') || embMsg.includes('OPENAI') ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
                      <span className="max-w-xs">{embMsg}</span>
                    </div>
                  )}
                  {embStats && !embStats.hasOpenAiKey && (
                    <span className="text-[11px] text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded">OPENAI_API_KEY not set</span>
                  )}
                  <button
                    onClick={generateEmbeddings}
                    disabled={embGenerating || (embStats?.missing === 0) || !embStats?.hasOpenAiKey}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {embGenerating ? <Loader2 size={12} className="animate-spin" /> : <Cpu size={12} />}
                    {embGenerating ? 'Starting…' : embStats?.missing === 0 ? 'All Embedded' : `Generate ${embStats?.missing ?? '…'} Embeddings`}
                  </button>
                </div>
              </div>

              {/* Full Archive Source Scan */}
              <div className="p-4 rounded-xl border border-emerald-900/30 bg-emerald-950/10 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <Search size={16} className="text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">Full Archive Source Scan</p>
                    <p className="text-xs text-slate-500">
                      Search CrossRef, Semantic Scholar, arXiv, OpenAlex, Wikipedia & PubMed for every published node.
                      Auto-approves high-credibility academic/government sources. Others go to Source Intel for review.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {scanMsg && (
                    <div className={`flex items-center gap-1.5 text-xs max-w-xs ${scanMsg.startsWith('Done') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {scanMsg.startsWith('Done') ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      <span>{scanMsg}</span>
                    </div>
                  )}
                  <button
                    onClick={runFullArchiveScan}
                    disabled={scanning}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
                  >
                    {scanning ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                    {scanning ? 'Scanning…' : 'Run Full Scan'}
                  </button>
                </div>
              </div>

              <AdminStats onTabSelect={t => setTab(t as Tab)} />
            </div>
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

          {tab === 'drafts' && <DraftNodeQueue />}

          {tab === 'imports' && (
            selectedBatchId
              ? <ImportBatchDetail batchId={selectedBatchId} onBack={() => setSelectedBatchId(null)} />
              : <ImportBatchList onSelectBatch={id => setSelectedBatchId(id)} />
          )}

          {tab === 'sources' && <SourceReviewQueue />}

          {tab === 'suggestions'       && <RelationshipSuggestions />}
          {tab === 'integrity'         && <ArchiveBiasAudit />}
          {tab === 'similarity'        && <SimilarityAudit />}
          {tab === 'ai-audit'          && <ArchiveAuditDashboard />}
          {tab === 'cro-audit'         && <CROAuditDashboard />}
          {tab === 'source-enrichment' && <SourceLinkEnrichment />}
          {tab === 'source-intel'      && <SourceIntelligenceDashboard />}
          {tab === 'diagnostics'       && <GraphDiagnostics />}
          {tab === 'users'             && <UserManagement />}
          {tab === 'moderation'        && <ModerationQueue />}
          {tab === 'platform'          && <PlatformHealthDashboard />}
          {tab === 'reports'           && <AdminReports />}
          {tab === 'beta-feedback'     && <BetaFeedbackAdmin />}
          {tab === 'beta-invites'      && <BetaInviteManager />}
          {tab === 'beta-analytics'    && <BetaAnalytics />}
          {tab === 'intelligence'      && isOwner && <UserIntelligenceDashboard />}
          {tab === 'ai-activity'       && isOwner && <AiActivityDashboard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
