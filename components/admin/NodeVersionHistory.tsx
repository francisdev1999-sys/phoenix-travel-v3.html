'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface NodeVersion {
  id:         string;
  version:    number;
  snapshot:   Record<string, unknown>;
  changedBy:  string | null;
  changeNote: string | null;
  createdAt:  string;
}

interface Props {
  nodeId: string;
}

// Compute a field-level diff between two JSON snapshots.
// Returns an array of changed field entries.
function diffSnapshots(older: Record<string, unknown>, newer: Record<string, unknown>) {
  const allKeys = Array.from(new Set([...Object.keys(older), ...Object.keys(newer)]));
  const changes: { key: string; oldVal: string; newVal: string }[] = [];

  for (const key of allKeys) {
    const oldRaw = older[key];
    const newRaw = newer[key];
    const oldStr = Array.isArray(oldRaw) ? JSON.stringify(oldRaw) : String(oldRaw ?? '');
    const newStr = Array.isArray(newRaw) ? JSON.stringify(newRaw) : String(newRaw ?? '');
    if (oldStr !== newStr) {
      changes.push({ key, oldVal: oldStr, newVal: newStr });
    }
  }

  return changes;
}

function truncate(s: string, n = 80) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export default function NodeVersionHistory({ nodeId }: Props) {
  const [versions,  setVersions]  = useState<NodeVersion[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/nodes/${nodeId}/versions`)
      .then(r => r.json())
      .then(d => setVersions(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [nodeId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 size={14} className="animate-spin text-purple-400" /></div>;
  }

  if (versions.length === 0) {
    return <p className="text-[10px] text-slate-600 italic">No version history.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
        <History size={10} />Version History ({versions.length})
      </span>

      {versions.map((ver, idx) => {
        const prev  = versions[idx + 1]; // older version (list is newest-first)
        const diff  = prev ? diffSnapshots(
          prev.snapshot as Record<string, unknown>,
          ver.snapshot  as Record<string, unknown>,
        ) : [];
        const isOpen = expanded === ver.id;

        return (
          <div key={ver.id} className="rounded-xl border border-slate-800/50 overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : ver.id)}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-bold text-purple-400 flex-shrink-0">v{ver.version}</span>
                <span className="text-[10px] text-slate-400 truncate">{ver.changeNote ?? 'No note'}</span>
                {diff.length > 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 flex-shrink-0">
                    {diff.length} change{diff.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[9px] text-slate-600">{new Date(ver.createdAt).toLocaleString()}</span>
                {isOpen ? <ChevronUp size={11} className="text-slate-500" /> : <ChevronDown size={11} className="text-slate-500" />}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 flex flex-col gap-2 border-t border-slate-800/50">
                    {/* Snapshot raw summary */}
                    <div className="pt-2">
                      {ver.changedBy && (
                        <p className="text-[10px] text-slate-500 mb-1">by {ver.changedBy}</p>
                      )}
                    </div>

                    {/* Diff vs previous version */}
                    {prev && diff.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <p className="text-[9px] text-slate-600 uppercase tracking-wide">Changes from v{prev.version}</p>
                        {diff.map(({ key, oldVal, newVal }) => (
                          <div key={key} className="flex flex-col gap-0.5 p-2 rounded-lg bg-slate-900/60 text-[10px]">
                            <span className="font-medium text-slate-400">{key}</span>
                            <span className="text-red-400 line-through opacity-70 font-mono break-all">
                              {truncate(oldVal)}
                            </span>
                            <span className="text-emerald-400 font-mono break-all">
                              {truncate(newVal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {prev && diff.length === 0 && (
                      <p className="text-[10px] text-slate-600 italic">No field changes recorded in this snapshot.</p>
                    )}

                    {!prev && (
                      <p className="text-[10px] text-slate-600 italic">Initial version — no previous snapshot to diff.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
