'use client';
import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { SourceRecord } from '@/lib/source-types';
import SourceCard from './SourceCard';
import SourceDetailPanel from './SourceDetailPanel';

export default function SourceReviewQueue() {
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SourceRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sources?status=pending&page=1');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReview = (sourceId: string, action: string) => {
    setSources(prev => prev.filter(s => s.id !== sourceId));
    if (selected?.id === sourceId) setSelected(null);
  };

  if (selected) {
    return (
      <SourceDetailPanel
        source={selected}
        isAdmin
        onClose={() => setSelected(null)}
        onReview={(id, action) => handleReview(id, action)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Review Queue</h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1 text-yellow-400">
            <AlertCircle size={10} />
            {sources.length} pending
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/3 border border-purple-900/20">
        <Stat icon={<CheckCircle size={14} className="text-green-400" />} label="Approve" color="#22c55e" />
        <Stat icon={<AlertCircle size={14} className="text-yellow-400" />} label="Revise" color="#eab308" />
        <Stat icon={<XCircle size={14} className="text-red-400" />} label="Reject" color="#ef4444" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-purple-400" />
        </div>
      ) : sources.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Queue is empty — all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sources.map(s => (
            <SourceCard key={s.id} source={s} onClick={() => setSelected(s)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className="text-[10px]" style={{ color }}>{label}</span>
    </div>
  );
}
