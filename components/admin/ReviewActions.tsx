'use client';
import { useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  endpoint: string;
  onDone: (action: string) => void;
}

export default function ReviewActions({ endpoint, onDone }: Props) {
  const [action, setAction] = useState<'approved' | 'rejected' | 'needs_revision'>('approved');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNotes: notes }),
      });
      if (res.ok) onDone(action);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900/60 border border-purple-900/30">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admin Decision</p>
      <div className="flex gap-2">
        {([
          { id: 'approved',       label: 'Approve',  icon: <CheckCircle size={12} />,  cls: 'text-green-300  border-green-500/40  bg-green-900/20  data-[active]:bg-green-700  data-[active]:border-green-400' },
          { id: 'needs_revision', label: 'Revise',   icon: <RefreshCw size={12} />,    cls: 'text-yellow-300 border-yellow-500/40 bg-yellow-900/20 data-[active]:bg-yellow-700 data-[active]:border-yellow-400' },
          { id: 'rejected',       label: 'Reject',   icon: <XCircle size={12} />,      cls: 'text-red-300    border-red-500/40    bg-red-900/20    data-[active]:bg-red-700    data-[active]:border-red-400' },
        ] as const).map(opt => (
          <button
            key={opt.id}
            data-active={action === opt.id ? true : undefined}
            onClick={() => setAction(opt.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-all ${opt.cls}`}
          >
            {opt.icon}{opt.label}
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Review notes (optional — sent to submitter)"
        rows={2}
        className="nexus-input text-xs resize-none"
      />
      <button
        onClick={submit}
        disabled={loading}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-40 transition-all"
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        Submit decision
      </button>
    </div>
  );
}
