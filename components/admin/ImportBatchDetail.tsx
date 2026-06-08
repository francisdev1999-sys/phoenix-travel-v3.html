'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, Zap, ThumbsUp, ThumbsDown } from 'lucide-react';

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

export default function ImportBatchDetail({ batchId, onBack }: Props) {
  const [batch,   setBatch]   = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting,  setActing]  = useState<BulkAction | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/import/batch/${batchId}`)
      .then(r => r.json())
      .then(setBatch)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  const bulkAction = async (action: BulkAction) => {
    const labels: Record<BulkAction, string> = {
      approve_iqs_80:  'Mark all IQS ≥ 80 as ready-to-review?',
      reject_iqs_40:   'Mark all IQS < 40 as soft-rejected?',
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
    } catch { alert('Request failed'); }
    finally { setActing(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-purple-400" size={20} /></div>;
  if (!batch)  return <div className="text-xs text-slate-500 py-8 text-center">Batch not found.</div>;

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
        <Pill icon={<CheckCircle2 size={11} />} label={`${batch.acceptedCount} accepted`} color="emerald" />
        <Pill icon={<XCircle size={11} />}      label={`${batch.rejectedCount} rejected`} color="red" />
        <Pill icon={<AlertTriangle size={11} />} label={`${batch.warningCount} warnings`} color="amber" />
      </div>

      {/* Bulk actions */}
      {batch.status !== 'rolledback' && (
        <div className="flex flex-wrap gap-2">
          <ActionBtn icon={<ThumbsUp size={11} />}  label="Approve IQS ≥ 80" action="approve_iqs_80" acting={acting} onClick={bulkAction} color="emerald" />
          <ActionBtn icon={<ThumbsDown size={11} />} label="Reject IQS < 40"  action="reject_iqs_40"   acting={acting} onClick={bulkAction} color="red" />
          <ActionBtn icon={<Zap size={11} />}        label="Publish approved" action="publish_approved" acting={acting} onClick={bulkAction} color="purple" />
        </div>
      )}

      {/* Node records */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 mb-2">Nodes ({batch.nodes.length})</h3>
        <div className="flex flex-col gap-1.5">
          {batch.nodes.map(node => (
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
                <StatusBadge status={node.status} />
              </div>
            </motion.div>
          ))}
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
