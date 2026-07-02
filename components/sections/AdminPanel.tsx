'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Network, GitBranch, BookMarked, Activity, FileWarning,
  Plus, Loader2, Package, InboxIcon, Sparkles, Users, BarChart3,
  AlertOctagon, Brain, ShieldAlert, Search, Link2, MessageSquarePlus,
  Ticket, TrendingUp, ClipboardList, Database, CheckCircle2, Cpu,
  AlertCircle, Radio, Clock, Zap, RefreshCw, Trash2, X, ChevronRight,
} from 'lucide-react';
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
import CleanupDashboard from '@/components/admin/CleanupDashboard';
import NeuralCore from '@/components/admin/NeuralCore';

type Tab =
  | 'overview' | 'nodes' | 'edges' | 'sources' | 'diagnostics' | 'reports'
  | 'imports' | 'drafts' | 'suggestions' | 'users' | 'moderation' | 'platform'
  | 'intelligence' | 'integrity' | 'similarity' | 'ai-activity' | 'ai-audit'
  | 'source-enrichment' | 'beta-feedback' | 'beta-invites' | 'beta-analytics'
  | 'cro-audit' | 'source-intel' | 'cleanup' | 'node-manager' | 'neural-core';

// ─────────────────────────────────────────────────────────────────────────────
// Cron job metadata
// ─────────────────────────────────────────────────────────────────────────────

const CRON_JOBS = [
  { id: 'news-feed',          label: 'Intel Feed',          desc: 'Fetch RSS feeds for UFO, gov docs, archaeology, conspiracy & science news' },
  { id: 'node-discovery',     label: 'Node Discovery',      desc: 'AI-searches Wikipedia to propose new archive-relevant nodes' },
  { id: 'source-discovery',   label: 'Source Discovery',    desc: 'Find academic sources for published nodes from CrossRef, arXiv & more' },
  { id: 'auto-relationships', label: 'Auto Relationships',  desc: 'AI generates relationship proposals between existing nodes' },
  { id: 'auto-similarity',    label: 'Auto Similarity',     desc: 'Compute semantic similarity scores between node pairs' },
  { id: 'auto-audit',         label: 'Auto Audit',          desc: 'Run daily AI cleanup audit (orphans, stale edges, missing fields)' },
  { id: 'research-maturity',  label: 'Research Maturity',   desc: 'Recalculate research maturity scores for all galaxies & clusters' },
  { id: 'lift-bans',          label: 'Lift Bans',           desc: 'Automatically lift temporary user bans that have expired' },
  { id: 'trust-pass',         label: 'Trust Pass',          desc: 'Recalculate trust scores and update user ranks' },
  { id: 'process-jobs',       label: 'Process Jobs',        desc: 'Drain the ingestion queue: embeddings, similarity, relationship suggestions' },
  { id: 'fix-invalid-dates',  label: 'Fix Invalid Dates',   desc: 'Clear out-of-range / reversed node dates (writes a version snapshot first)' },
  { id: 'learning-pass',      label: 'Learning Pass',       desc: 'Retrain the adaptive promotion model on approval/survival outcomes' },
  { id: 'news-discovery',     label: 'News Discovery',      desc: 'Turn fresh intel-feed headlines into discovery seeds — the archive reacts to world events' },
] as const;

interface CronJobHealth {
  job:                 string;
  lastStatus:          string | null;
  lastStartedAt:       string | null;
  lastDurationMs:      number | null;
  lastError:           string | null;
  consecutiveFailures: number;
  alerting:            boolean;
  successRate:         number | null;
  presumedStuck:       boolean;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never run';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type CronId = typeof CRON_JOBS[number]['id'];

// ─────────────────────────────────────────────────────────────────────────────
// Node Manager (owner-only)
// ─────────────────────────────────────────────────────────────────────────────

interface NodeResult {
  id:             string;
  title:          string;
  status:         string;
  evidenceLevel:  string;
  confidenceScore: number;
  createdAt:      string;
  category:       { name: string; color: string | null };
  _count:         { edgesFrom: number; sourceLinks: number };
}

function NodeManager() {
  const [query,      setQuery]      = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [results,    setResults]    = useState<NodeResult[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting,   setDeleting]   = useState(false);
  const [deleteMsg,  setDeleteMsg]  = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string, sf: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '40' });
    if (q.length >= 2) params.set('q', q);
    if (sf !== 'all') params.set('status', sf);
    fetch(`/api/admin/nodes/search?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { nodes: NodeResult[] }) => setResults(d.nodes))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { search('', 'all'); }, [search]);

  const handleQuery = (val: string) => {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => search(val, statusFilter), 350);
  };

  const handleStatus = (sf: string) => {
    setStatusFilter(sf);
    search(query, sf);
  };

  const confirmDelete = async () => {
    if (!deleteId || deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/nodes/${deleteId}`, { method: 'DELETE' });
      if (r.ok) {
        setResults(prev => prev.filter(n => n.id !== deleteId));
        setDeleteMsg('Node deleted successfully');
        setDeleteId(null);
        setDeleteConfirm('');
      } else {
        const d = await r.json();
        setDeleteMsg(d.error ?? 'Delete failed');
      }
    } catch {
      setDeleteMsg('Delete request failed');
    } finally {
      setDeleting(false);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    published: '#22c55e', draft: '#f59e0b', archived: '#64748b',
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => handleQuery(e.target.value)}
            placeholder="Search nodes by title or description…"
            className="w-full bg-white/5 border border-purple-900/40 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-600/60"
          />
          {query && (
            <button onClick={() => handleQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {['all', 'published', 'draft', 'archived'].map(s => (
            <button key={s} onClick={() => handleStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                statusFilter === s ? 'bg-purple-900/50 text-purple-300' : 'text-slate-500 hover:text-slate-300'
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {deleteMsg && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${deleteMsg.includes('success') ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
          {deleteMsg.includes('success') ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          {deleteMsg}
          <button onClick={() => setDeleteMsg(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
      ) : results.length === 0 ? (
        <div className="text-center py-10 text-xs text-slate-500">
          {query.length >= 2 ? 'No nodes matching your search' : 'Enter a search query or change the status filter'}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-slate-500 mb-1">{results.length} node{results.length !== 1 ? 's' : ''} found</p>
          {results.map(node => (
            <div key={node.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/6 hover:bg-white/5 transition-colors group"
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: STATUS_COLORS[node.status] ?? '#64748b' }} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white truncate">{node.title}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold capitalize"
                    style={{ background: (node.category.color ?? '#7c3aed') + '22', color: node.category.color ?? '#a855f7' }}>
                    {node.category.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span className="capitalize">{node.status}</span>
                  <span>·</span>
                  <span>{node._count.edgesFrom} connections</span>
                  <span>·</span>
                  <span>{node._count.sourceLinks} sources</span>
                  <span>·</span>
                  <span>{new Date(node.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {deleteId === node.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder='Type "DELETE"'
                    className="w-28 bg-red-950/30 border border-red-700/40 rounded-lg px-2 py-1 text-xs text-white placeholder-red-800 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={confirmDelete} disabled={deleteConfirm !== 'DELETE' || deleting}
                    className="px-2 py-1 rounded-lg text-xs font-bold text-white bg-red-700 hover:bg-red-600 disabled:opacity-40 flex items-center gap-1">
                    {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                    Confirm
                  </button>
                  <button onClick={() => { setDeleteId(null); setDeleteConfirm(''); }}
                    className="text-slate-500 hover:text-white"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => { setDeleteId(node.id); setDeleteConfirm(''); }}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-red-400 hover:text-white hover:bg-red-900/30 border border-red-800/30 transition-all flex-shrink-0">
                  <Trash2 size={11} />Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const role    = (session?.user as { role?: string })?.role ?? 'user';
  const isAdmin = role === 'owner' || role === 'admin';
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
  const [embStats, setEmbStats]     = useState<{
    totalPublished: number; hasEmbedding: number; missing: number;
    coveragePct: number; hasVoyageKey: boolean;
  } | null>(null);
  const [embGenerating, setEmbGenerating] = useState(false);
  const [embMsg, setEmbMsg]         = useState<string | null>(null);
  const embPollRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scanning,      setScanning]      = useState(false);
  const [scanMsg,       setScanMsg]       = useState<string | null>(null);
  const [nodeScanning,  setNodeScanning]  = useState(false);
  const [nodeScanMsg,   setNodeScanMsg]   = useState<string | null>(null);
  const [cronRunning,   setCronRunning]   = useState<Partial<Record<CronId, boolean>>>({});
  const [cronResults,   setCronResults]   = useState<Partial<Record<CronId, string>>>({});
  const [cronHealth,    setCronHealth]    = useState<Record<string, CronJobHealth>>({});

  const loadCronHealth = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/cron-health');
      if (!r.ok) return;
      const d = await r.json() as { jobs: CronJobHealth[] };
      setCronHealth(Object.fromEntries(d.jobs.map(j => [j.job, j])));
    } catch { /* non-fatal */ }
  }, []);

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

  const fetchEmbStats = useCallback(() => {
    fetch('/api/admin/embeddings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEmbStats(d); })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchEmbStats(); }, [fetchEmbStats]);
  useEffect(() => { loadCronHealth(); }, [loadCronHealth]);

  // Clean up polling on unmount
  useEffect(() => () => { if (embPollRef.current) clearInterval(embPollRef.current); }, []);

  const generateEmbeddings = async () => {
    setEmbGenerating(true);
    setEmbMsg('Starting embedding generation…');
    try {
      const r = await fetch('/api/admin/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-all' }),
      });
      const d = await r.json() as { message?: string; error?: string; started?: boolean };
      if (!r.ok) {
        setEmbMsg(d.error ?? 'Failed to start embedding generation.');
        setEmbGenerating(false);
        return;
      }
      setEmbMsg(d.message ?? 'Generating embeddings in background…');

      // Poll every 4 seconds until all nodes are embedded
      if (embPollRef.current) clearInterval(embPollRef.current);
      embPollRef.current = setInterval(async () => {
        try {
          const sr = await fetch('/api/admin/embeddings');
          if (!sr.ok) return;
          const stats = await sr.json() as typeof embStats;
          if (!stats) return;
          setEmbStats(stats);
          if (stats.missing === 0) {
            clearInterval(embPollRef.current!);
            embPollRef.current = null;
            setEmbGenerating(false);
            setEmbMsg(`All ${stats.hasEmbedding} nodes embedded successfully.`);
          } else {
            setEmbMsg(`Generating… ${stats.hasEmbedding}/${stats.totalPublished} embedded (${stats.missing} remaining)`);
          }
        } catch {}
      }, 4000);

      // Safety cap: stop polling after 15 minutes
      setTimeout(() => {
        if (embPollRef.current) {
          clearInterval(embPollRef.current);
          embPollRef.current = null;
          setEmbGenerating(false);
          fetchEmbStats();
          setEmbMsg('Embedding generation timed out. Refresh to check status.');
        }
      }, 15 * 60 * 1000);
    } catch {
      setEmbMsg('Request failed.');
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

  const runNodeDiscoveryScan = async () => {
    setNodeScanning(true);
    setNodeScanMsg(null);
    try {
      const r = await fetch('/api/admin/discovered-nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxNodes: 15 }),
      });
      const d = await r.json() as { nodesProposed?: number; seedsChecked?: number; skipped?: number; error?: string };
      if (!r.ok) { setNodeScanMsg(d.error ?? `Error ${r.status}`); return; }
      setNodeScanMsg(`Done — ${d.seedsChecked} seeds checked, ${d.nodesProposed} node proposals created`);
    } catch (e) {
      setNodeScanMsg(`Failed: ${String(e)}`);
    } finally {
      setNodeScanning(false);
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
      setScanMsg(`Done — ${d.nodesChecked} nodes scanned, ${d.sourcesFound} sources found (${d.autoApproved} auto-approved, ${d.pendingReview} pending)`);
    } catch (e) {
      setScanMsg(`Scan failed: ${String(e)}`);
    } finally {
      setScanning(false);
    }
  };

  const triggerCron = async (jobId: CronId) => {
    setCronRunning(prev => ({ ...prev, [jobId]: true }));
    setCronResults(prev => ({ ...prev, [jobId]: undefined }));
    try {
      const r = await fetch('/api/admin/cron/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: jobId }),
      });
      const d = await r.json() as { ok: boolean; httpStatus?: number; data?: Record<string, unknown>; error?: string };
      if (!r.ok) {
        // Trigger endpoint itself failed (400/502)
        setCronResults(prev => ({ ...prev, [jobId]: d.error ?? `Error ${r.status}` }));
      } else if (!d.ok) {
        // Trigger endpoint succeeded but the cron job returned an error
        const cronStatus = d.httpStatus ?? '?';
        const detail = d.data && typeof d.data === 'object'
          ? (d.data as { error?: string; message?: string }).error ?? (d.data as { error?: string; message?: string }).message
          : undefined;
        setCronResults(prev => ({ ...prev, [jobId]: detail ? `Error: ${detail}` : `Cron returned HTTP ${cronStatus}` }));
      } else {
        const data = d.data ?? {};
        const summary = Object.entries(data)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        setCronResults(prev => ({ ...prev, [jobId]: summary || 'Done' }));
      }
    } catch (e) {
      setCronResults(prev => ({ ...prev, [jobId]: `Failed: ${String(e)}` }));
    } finally {
      setCronRunning(prev => ({ ...prev, [jobId]: false }));
      loadCronHealth();
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
    { id: 'neural-core',       label: 'Neural Core',     icon: <Cpu size={13} /> },
    { id: 'node-manager',      label: 'Node Manager',    icon: <Search size={13} />,       ownerOnly: true },
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
    { id: 'source-intel',      label: 'Source Intel',    icon: <Cpu size={13} />         },
    { id: 'users',             label: 'Users',           icon: <Users size={13} />       },
    { id: 'moderation',        label: 'Moderation',      icon: <AlertOctagon size={13} />},
    { id: 'diagnostics',       label: 'Diagnostics',     icon: <Activity size={13} />    },
    { id: 'reports',           label: 'Reports',         icon: <FileWarning size={13} /> },
    { id: 'beta-feedback',     label: 'Beta Feedback',   icon: <MessageSquarePlus size={13} /> },
    { id: 'beta-invites',      label: 'Beta Invites',    icon: <Ticket size={13} /> },
    { id: 'beta-analytics',    label: 'Beta Analytics',  icon: <TrendingUp size={13} /> },
    { id: 'cleanup',           label: 'AI Cleanup',      icon: <AlertCircle size={13} />, ownerOnly: true },
    { id: 'platform',          label: 'Platform',        icon: <BarChart3 size={13} />,   ownerOnly: true },
    { id: 'intelligence',      label: 'User Intel',      icon: <Brain size={13} />,       ownerOnly: true },
    { id: 'ai-activity',       label: 'AI Activity',     icon: <Sparkles size={13} />,    ownerOnly: true },
  ];
  // The full control panel (all tabs) is open to the owner and admin roles alike.
  const tabs = allTabs.filter(t => !t.ownerOnly || isAdmin);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-purple-900/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-purple-400" />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Admin Master Control</h1>
            <p className="text-xs text-slate-500">Full system control — no changes reach the graph without your approval.</p>
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
            <div className="flex flex-col gap-5">

              {/* ── Database & Content ── */}
              <SectionHeading icon={<Database size={14} />} label="Database & Content" />

              {/* Seed Database */}
              <ControlCard
                color="purple"
                icon={<Database size={16} className="text-purple-400" />}
                title="Seed Database"
                desc="Populate the archive from static source data. Safe to run multiple times (upserts only)."
                msg={seedMsg}
                msgSuccess={!!seedMsg && !seedMsg.includes('fail')}
              >
                <button onClick={runSeed} disabled={seeding}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                  {seeding ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                  {seeding ? 'Running…' : 'Run Seed'}
                </button>
              </ControlCard>

              {/* ── AI & Embeddings ── */}
              <SectionHeading icon={<Cpu size={14} />} label="AI & Embeddings" />

              {/* Vector Embeddings */}
              <ControlCard
                color="cyan"
                icon={<Cpu size={16} className="text-cyan-400" />}
                title="Vector Embeddings"
                desc={embStats
                  ? embStats.missing === 0
                    ? `${embStats.hasEmbedding}/${embStats.totalPublished} nodes embedded — fully covered`
                    : `${embStats.hasEmbedding}/${embStats.totalPublished} embedded — ${embStats.missing} missing (${embStats.coveragePct}%)`
                  : 'Loading coverage…'}
                msg={embMsg}
                msgSuccess={!!embMsg && (embMsg.includes('success') || embMsg.includes('Generating'))}
              >
                {embStats && !embStats.hasVoyageKey && (
                  <span className="text-[11px] text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded">VOYAGE_API_KEY not set</span>
                )}
                <button onClick={generateEmbeddings}
                  disabled={embGenerating || (embStats?.missing === 0) || !embStats?.hasVoyageKey}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                  {embGenerating ? <Loader2 size={12} className="animate-spin" /> : <Cpu size={12} />}
                  {embGenerating ? 'Generating…' : embStats?.missing === 0 ? 'All Embedded' : `Generate ${embStats?.missing ?? '…'} Embeddings`}
                </button>
              </ControlCard>

              {/* Full Archive Scan */}
              <ControlCard
                color="emerald"
                icon={<Search size={16} className="text-emerald-400" />}
                title="Full Archive Source Scan"
                desc="Search CrossRef, Semantic Scholar, arXiv, OpenAlex, Wikipedia & PubMed for every published node. Auto-approves high-credibility academic sources."
                msg={scanMsg}
                msgSuccess={!!scanMsg && scanMsg.startsWith('Done')}
              >
                <button onClick={runFullArchiveScan} disabled={scanning}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                  {scanning ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                  {scanning ? 'Scanning…' : 'Run Full Scan'}
                </button>
              </ControlCard>

              {/* Node Discovery */}
              <ControlCard
                color="blue"
                icon={<Cpu size={16} className="text-blue-400" />}
                title="AI Node Discovery"
                desc="AI-searches Wikipedia for archive-relevant topics not yet in the graph. Proposals land in Source Intel for review before going live."
                msg={nodeScanMsg}
                msgSuccess={!!nodeScanMsg && nodeScanMsg.startsWith('Done')}
              >
                <button onClick={runNodeDiscoveryScan} disabled={nodeScanning}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap">
                  {nodeScanning ? <Loader2 size={12} className="animate-spin" /> : <Cpu size={12} />}
                  {nodeScanning ? 'Discovering…' : 'Discover Nodes'}
                </button>
              </ControlCard>

              {/* ── Scheduled Jobs ── */}
              {(() => {
                const alerting = Object.values(cronHealth).filter(h => h.alerting || h.presumedStuck);
                return (
                  <>
                    <SectionHeading icon={<Clock size={14} />} label="Scheduled Jobs — Autonomous Health" />
                    {alerting.length > 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-[11px] text-red-300">
                        <AlertOctagon size={14} className="flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>{alerting.length}</strong> job{alerting.length > 1 ? 's are' : ' is'} unhealthy:{' '}
                          {alerting.map(h => h.job).join(', ')}. Run manually to inspect the error.
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CRON_JOBS.map(job => {
                  const running = cronRunning[job.id as CronId];
                  const result  = cronResults[job.id as CronId];
                  const isError = result && !['Done', 'done'].some(s => result.startsWith(s)) && result.includes('Error') || result?.includes('fail') || result?.includes('Failed');
                  const health  = cronHealth[job.id];
                  const badge =
                    !health || health.lastStatus === null
                      ? { text: 'never run',                          cls: 'text-slate-500' }
                    : health.alerting
                      ? { text: `failing ×${health.consecutiveFailures}`, cls: 'text-red-400' }
                    : health.presumedStuck
                      ? { text: 'stuck',                              cls: 'text-amber-400' }
                    : health.lastStatus === 'failed'
                      ? { text: `failed · ${relativeTime(health.lastStartedAt)}`,  cls: 'text-red-400' }
                    : health.lastStatus === 'skipped'
                      ? { text: `skipped · ${relativeTime(health.lastStartedAt)}`, cls: 'text-slate-400' }
                    : health.lastStatus === 'running'
                      ? { text: 'running…',                           cls: 'text-purple-400' }
                      : { text: `ok · ${relativeTime(health.lastStartedAt)}`,      cls: 'text-green-400' };
                  return (
                    <div key={job.id}
                      className={`flex items-start gap-3 p-3.5 rounded-xl bg-white/3 border transition-all hover:border-purple-900/40 ${health?.alerting ? 'border-red-800/50' : health?.presumedStuck ? 'border-amber-800/40' : 'border-white/6'}`}>
                      <div className="w-7 h-7 rounded-lg bg-purple-900/30 border border-purple-700/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {running ? <Loader2 size={13} className="text-purple-400 animate-spin" /> : <Clock size={13} className="text-purple-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{job.label}</p>
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${badge.cls}`}>● {badge.text}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{job.desc}</p>
                        {health?.lastError && (health.alerting || health.lastStatus === 'failed') && (
                          <p className="text-[10px] mt-1 text-red-400/80 truncate" title={health.lastError}>↳ {health.lastError}</p>
                        )}
                        {result && (
                          <p className={`text-[10px] mt-1 ${isError ? 'text-red-400' : 'text-green-400'}`}>
                            {isError ? '✗ ' : '✓ '}{result}
                          </p>
                        )}
                      </div>
                      <button onClick={() => triggerCron(job.id as CronId)} disabled={!!running}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-purple-300 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-700/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 whitespace-nowrap">
                        {running ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                        Run
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* ── Stats ── */}
              <SectionHeading icon={<BarChart3 size={14} />} label="Archive Stats" />
              <AdminStats onTabSelect={t => setTab(t as Tab)} />
            </div>
          )}

          {tab === 'node-manager' && isAdmin && <NodeManager />}

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

          {tab === 'drafts'            && <DraftNodeQueue />}

          {tab === 'imports' && (
            selectedBatchId
              ? <ImportBatchDetail batchId={selectedBatchId} onBack={() => setSelectedBatchId(null)} />
              : <ImportBatchList onSelectBatch={id => setSelectedBatchId(id)} />
          )}

          {tab === 'sources'           && <SourceReviewQueue />}
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
          {tab === 'neural-core'       && isAdmin && <NeuralCore />}
          {tab === 'cleanup'           && isAdmin && <CleanupDashboard adminEmail={session.user?.email ?? ''} />}
          {tab === 'intelligence'      && isAdmin && <UserIntelligenceDashboard />}
          {tab === 'ai-activity'       && isAdmin && <AiActivityDashboard />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared small components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-slate-500">{icon}</span>
      <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">{label}</span>
      <div className="flex-1 h-px bg-purple-900/30" />
    </div>
  );
}

function ControlCard({
  color, icon, title, desc, msg, msgSuccess, children,
}: {
  color: 'purple' | 'cyan' | 'emerald' | 'blue' | 'amber';
  icon: React.ReactNode;
  title: string;
  desc: string;
  msg?: string | null;
  msgSuccess?: boolean;
  children: React.ReactNode;
}) {
  const borderColors = {
    purple: 'border-purple-900/30 bg-purple-950/20',
    cyan:   'border-cyan-900/30 bg-cyan-950/10',
    emerald:'border-emerald-900/30 bg-emerald-950/10',
    blue:   'border-blue-900/30 bg-blue-950/10',
    amber:  'border-amber-900/30 bg-amber-950/10',
  };
  return (
    <div className={`p-4 rounded-xl border ${borderColors[color]} flex items-start justify-between gap-4 flex-wrap`}>
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
          {msg && (
            <div className={`flex items-center gap-1.5 text-xs mt-1.5 ${msgSuccess ? 'text-green-400' : 'text-red-400'}`}>
              {msgSuccess ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              <span className="leading-snug">{msg}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        {children}
      </div>
    </div>
  );
}
