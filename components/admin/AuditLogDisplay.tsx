'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, RefreshCw, Loader2 } from 'lucide-react';

interface AuditEntry {
  id:         string;
  action:     string;
  entityType: string;
  entityId:   string;
  userEmail:  string | null;
  detail:     Record<string, unknown> | null;
  createdAt:  string;
}

interface Props {
  entityType?: string;
  entityId?:   string;
  limit?:      number;
}

const ACTION_COLORS: Record<string, string> = {
  publish:       'text-emerald-400',
  unpublish:     'text-amber-400',
  archive:       'text-red-400',
  restore:       'text-blue-400',
  edit:          'text-blue-300',
  approve:       'text-emerald-400',
  reject:        'text-red-400',
  needs_revision:'text-amber-400',
  import:        'text-purple-400',
  rollback:      'text-red-500',
  bulk_approve:  'text-emerald-300',
  bulk_reject:   'text-red-300',
  bulk_publish:  'text-purple-300',
};

export default function AuditLogDisplay({ entityType, entityId, limit = 50 }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit) });
    if (entityType) params.set('entityType', entityType);
    if (entityId)   params.set('entityId',   entityId);
    fetch(`/api/audit-log?${params}`)
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entityType, entityId, limit]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Clock size={11} />Audit Log
        </h3>
        <button onClick={load} className="text-slate-600 hover:text-slate-400 transition-colors">
          <RefreshCw size={11} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-purple-400" size={16} /></div>
      ) : entries.length === 0 ? (
        <p className="text-[10px] text-slate-600 text-center py-3">No audit events.</p>
      ) : (
        <div className="flex flex-col">
          {entries.map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.02 }}
              className="flex items-start gap-2 py-2 border-b border-slate-800/40 last:border-0"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase ${ACTION_COLORS[entry.action] ?? 'text-slate-400'}`}>
                    {entry.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {entry.entityType}:{entry.entityId.slice(0, 12)}
                  </span>
                  {entry.userEmail && (
                    <span className="text-[10px] text-slate-600 truncate max-w-[120px]">{entry.userEmail}</span>
                  )}
                </div>
                {entry.detail && Object.keys(entry.detail).length > 0 && (
                  <p className="text-[10px] text-slate-600 mt-0.5 font-mono truncate">
                    {JSON.stringify(entry.detail).slice(0, 80)}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-slate-600 flex-shrink-0 whitespace-nowrap">
                {new Date(entry.createdAt).toLocaleTimeString()}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
