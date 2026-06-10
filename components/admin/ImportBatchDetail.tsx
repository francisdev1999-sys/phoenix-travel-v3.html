'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, Zap, ThumbsUp, ThumbsDown, ShieldCheck, RefreshCw } from 'lucide-react';
import type { BatchIntegrityReport, NodeIntegrityResult } from '@/app/api/import/batch/[batchId]/integrity/route';

interface NodeRecord {
  id:            string;
  title:         string;
  status:        string;
  evidenceLevel: string;
  confidenceScore: number;
  createdAt:     string;
}

interface BatchDetail {
  id:              string;
  createdAt:       string;
  status:          string;
  parsedCount:     number;
  acceptedCount:   number;
  rejectedCount:   number;
  warningCount:    number;
  validationReport: unknown;
  nodes:           NodeRecord[];
  edges:           { id: string; fromId: string; toId: string; relationshipType: string; status: string }[];
}

type BulkAction = 'approve_iqs_80' | 'reject_iqs_40' | 'publish_approved';

interface Props {
  batchId:  string;
  onBack:   () => void;
}

const FLAG_LABELS: Record<string, string> = {
  no_claims:          'No claims',
  no_criticisms:      'No criticisms',
  no_sources:         'No sources',
  no_mainstream_view: 'No mainstream view',
  evidence_mismatch:  'Evidence/confidence mismatch',
  incomplete_content: 'Short description',
};

const FLAG_SEVERITY: Record<string, 'critical' | 'warning'> = {
  no_claims:          'critical',
  no_criticisms:      'critical',
  evidence_mismatch:  'critical',
  no_sources:         'warning',
  no_mainstream_view: 'warning',
  incomplete_content: 'warning',
};

export default function ImportBatchDetail({ batchId, onBack }: Props) {
  const [batch,     setBatch]     = useState<BatchDetail | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [acting,    setActing]    = useState<BulkAction | null>(null);
  const [integrity, setIntegrity] = useState<BatchIntegrityReport | null>(null);
  const [loadingIntegrity, setLoadingIntegrity] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/import/batch/${batchId}`)
      .then(r => r.json())
      .then(setBatch)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batchId]);

  const loadIntegrity = useCallback(() => {
    setLoadingIntegrity(true);
    fetch(`/api/import/batch/${batchId}/integrity`)
      .then(r => r.json())
      .then((d: BatchIntegrityReport) => setIntegrity(d))
      .catch(console.error)
      .finally(() => setLoadingIntegrity(false));
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  const bulkAction = async (action: BulkAction) => {
    const labels: Record<BulkAction, string> = {
      approve_iqs_80:   'Mark all IQS ≥ 80 as ready-to-review?',
      reject_iqs_40:    'Mark all IQS < 40 as soft-rejected?',
      publish_approved: 'Publish all ready-to-review nodes? This makes them live immediately.',
    };
    if (!confirm(labels[action])) return;
    setActing(action);
    try {
      const res = await fetch(`/api/import/batch/${batchId}/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error ?? 'Action failed'); return; }
      alert(`Done — ${d.affected} nodes affected.`);
      load();
      // Auto-run integrity audit after publishing
      if (action === 'publish_approved') loadIntegrity();
    } catch { alert('Request failed'); }
    finally { setActing(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-400" size={20} /></div>;
  if (!batch)  return <div className="text-xs text-slate-500 py-8 text-center">Batch not found.</div>;

  const flaggedNodes = integrity?.nodes.filter(n => n.flags.length > 0) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <div>
          <h2 className="text-sm font-bold text-white">Batch {batchId.slice(0, 14)}…</h2>
          <p className="text-[10px] text-slate-500">{new Date(batch.createdAt).toLocaleString()} · {batch.status}</p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        <Pill icon={<CheckCircle2 size={11} />} label={`${batch.acceptedCount} accepted`}  color="emerald" />
        <Pill icon={<XCircle size={11} />}      label={`${batch.rejectedCount} rejected`}  color="red" />
        <Pill icon={<AlertTriangle size={11} />} label={`${batch.warningCount} warnings`} color="amber" />
      </div>

      {/* Bulk actions */}
      {batch.status !== 'rolledback' && (
        <div className="flex flex-wrap gap-2">
          <ActionBtn icon={<ThumbsUp size={11} />}   label="Approve IQS ≥ 80" action="approve_iqs_80"  acting={acting} onClick={bulkAction} color="emerald" />
          <ActionBtn icon={<ThumbsDown size={11} />}  label="Reject IQS < 40"  action="reject_iqs_40"  acting={acting} onClick={bulkAction} color="red" />
          <ActionBtn icon={<Zap size={11} />}         label="Publish approved" action="publish_approved" acting={acting} onClick={bulkAction} color="purple" />
        </div>
      )}

      {/* Integrity audit panel */}
      <div className="rounded-xl border border-purple-900/30 bg-white/3 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-purple-900/20">
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-purple-400" />
            <span className="text-xs font-bold text-white">Integrity Audit</span>
            {integrity && (
              <span className="text-[10px] text-slate-500">
                · {integrity.okCount} ok · {integrity.warningCount} warnings · {integrity.criticalCount} critical
              </span>
            )}
          </div>
          <button
            onClick={loadIntegrity}
            disabled={loadingIntegrity}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={10} className={loadingIntegrity ? 'animate-spin' : ''} />
            {integrity ? 'Re-run' : 'Run audit'}
          </button>
        </div>

        {loadingIntegrity && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-purple-400" />
          </div>
        )}

        {!loadingIntegrity && !integrity && (
          <p className="text-[10px] text-slate-600 text-center py-4 px-4">
            Run the integrity audit to check for missing claims, criticisms, sources, and evidence mismatches.
            Runs automatically after "Publish approved".
          </p>
        )}

        {!loadingIntegrity && integrity && (
          <div className="p-4 space-y-3">
            {/* Summary bars */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-lg bg-emerald-900/20 text-center">
                <p className="text-base font-black text-emerald-400">{integrity.okCount}</p>
                <p className="text-[9px] text-emerald-600">Clean</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-900/20 text-center">
                <p className="text-base font-black text-amber-400">{integrity.warningCount}</p>
                <p className="text-[9px] text-amber-600">Warnings</p>
              </div>
              <div className="p-2 rounded-lg bg-red-900/20 text-center">
                <p className="text-base font-black text-red-400">{integrity.criticalCount}</p>
                <p className="text-[9px] text-red-600">Critical</p>
              </div>
            </div>

            {flaggedNodes.length === 0 && (
              <p className="text-xs text-emerald-400 text-center py-2">All nodes pass integrity checks.</p>
            )}

            {flaggedNodes.length > 0 && (
              <div className="space-y-1.5">
                {flaggedNodes.map(node => (
                  <IntegrityNodeRow key={node.nodeId} node={node} />
                ))}
              </div>
            )}

            <p className="text-[9px] text-slate-600 border-t border-purple-900/10 pt-2 leading-relaxed">
              {integrity.disclaimer}
            </p>
          </div>
        )}
      </div>

      {/* Node records */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 mb-2">Nodes ({batch.nodes.length})</h3>
        <div className="flex flex-col gap-1.5">
          {batch.nodes.map(node => {
            const intNode = integrity?.nodes.find(n => n.nodeId === node.id);
            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800/50 bg-slate-900/40 text-xs"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium text-white truncate">{node.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{node.id}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-slate-500">{node.evidenceLevel}</span>
                  {intNode && intNode.flags.length > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      intNode.riskLevel === 'critical'
                        ? 'bg-red-900/40 text-red-400'
                        : 'bg-amber-900/30 text-amber-400'
                    }`}>
                      {intNode.flags.length} flag{intNode.flags.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <StatusBadge status={node.status} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Edge records */}
      {batch.edges.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 mb-2">Edges ({batch.edges.length})</h3>
          <div className="flex flex-col gap-1.5">
            {batch.edges.map(edge => (
              <div key={edge.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-800/50 bg-slate-900/40 text-xs">
                <span className="text-slate-400 font-mono truncate text-[10px]">{edge.fromId} → {edge.toId}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">{edge.relationshipType}</span>
                  <StatusBadge status={edge.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IntegrityNodeRow({ node }: { node: NodeIntegrityResult }) {
  const criticalFlags = node.flags.filter(f => FLAG_SEVERITY[f] === 'critical');
  const warningFlags  = node.flags.filter(f => FLAG_SEVERITY[f] === 'warning');
  return (
    <div className={`px-3 py-2 rounded-lg border text-xs ${
      node.riskLevel === 'critical'
        ? 'bg-red-900/10 border-red-500/20'
        : 'bg-amber-900/10 border-amber-500/20'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-white truncate">{node.title}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
          node.riskLevel === 'critical' ? 'text-red-400' : 'text-amber-400'
        }`}>
          {node.riskLevel}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {criticalFlags.map(f => (
          <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">
            {FLAG_LABELS[f] ?? f}
          </span>
        ))}
        {warningFlags.map(f => (
          <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-500">
            {FLAG_LABELS[f] ?? f}
          </span>
        ))}
      </div>
    </div>
  );
}

function Pill({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-900/30 text-emerald-400',
    red:     'bg-red-900/30 text-red-400',
    amber:   'bg-amber-900/30 text-amber-400',
  };
  return (
    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium ${colors[color]}`}>
      {icon}{label}
    </span>
  );
}

function ActionBtn({ icon, label, action, acting, onClick, color }: {
  icon: React.ReactNode; label: string; action: BulkAction;
  acting: BulkAction | null; onClick: (a: BulkAction) => void; color: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50',
    red:     'bg-red-900/30 text-red-400 hover:bg-red-900/50',
    purple:  'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50',
  };
  return (
    <button
      onClick={() => onClick(action)}
      disabled={acting !== null}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {acting === action ? <Loader2 size={10} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:     'bg-slate-800 text-slate-300',
    published: 'bg-emerald-900/50 text-emerald-400',
    archived:  'bg-slate-700 text-slate-400',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${map[status] ?? 'bg-slate-800 text-slate-400'}`}>
      {status}
    </span>
  );
}
