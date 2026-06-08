'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Package, RefreshCw, ChevronRight, Loader2, RotateCcw } from 'lucide-react';

interface Batch {
  id:           string;
  createdAt:    string;
  status:       string;
  parsedCount:  number;
  acceptedCount: number;
  rejectedCount: number;
  warningCount: number;
  inputFormat:  string;
  rolledBackAt: string | null;
}

interface Props {
  onSelectBatch: (batchId: string) => void;
}

export default function ImportBatchList({ onSelectBatch }: Props) {
  const [batches, setBatches]   = useState<Batch[]>([]);
  const [loading, setLoading]   = useState(false);
  const [rolling, setRolling]   = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/import/batch')
      .then(r => r.json())
      .then(d => setBatches(Array.isArray(d) ? d : d.batches ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rollback = async (batchId: string) => {
    if (!confirm('Roll back this batch? This will delete all nodes/edges it created.')) return;
    setRolling(batchId);
    try {
      const res = await fetch(`/api/import/batch/${batchId}/rollback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? 'Rollback failed');
      } else {
        load();
      }
    } catch { alert('Rollback request failed'); }
    finally { setRolling(null); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Package size={14} className="text-purple-400" />Import Batches
        </h2>
        <button onClick={load} className="text-slate-500 hover:text-slate-300 transition-colors">
          <RefreshCw size={13} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
      ) : batches.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">No import batches yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {batches.map(batch => (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-xl border transition-colors ${
                batch.status === 'rolledback'
                  ? 'border-slate-700/50 bg-slate-900/30 opacity-60'
                  : 'border-purple-900/30 bg-slate-900/50 hover:border-purple-700/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 truncate">{batch.id.slice(0, 14)}…</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      batch.status === 'rolledback' ? 'bg-red-900/40 text-red-400' : 'bg-emerald-900/40 text-emerald-400'
                    }`}>{batch.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span>{new Date(batch.createdAt).toLocaleString()}</span>
                    <span className="text-emerald-500">{batch.acceptedCount} accepted</span>
                    <span className="text-red-500">{batch.rejectedCount} rejected</span>
                    {batch.warningCount > 0 && <span className="text-amber-500">{batch.warningCount} warnings</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {batch.status !== 'rolledback' && (
                    <button
                      onClick={() => rollback(batch.id)}
                      disabled={rolling === batch.id}
                      title="Roll back this batch"
                      className="p-1.5 rounded-lg text-red-500/70 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {rolling === batch.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    </button>
                  )}
                  <button
                    onClick={() => onSelectBatch(batch.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
