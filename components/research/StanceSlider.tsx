'use client';
/**
 * Believer–Skeptic slider — frictionless participation on every topic page.
 * Drag once (no account needed) and the community distribution reveals itself.
 * One stance per anonymous visitor per topic; re-drag any time to update.
 */
import { useState, useEffect, useCallback } from 'react';
import { Scale } from 'lucide-react';

interface StanceData {
  buckets:  number[];
  count:    number;
  average:  number | null;
  myStance: number | null;
}

function anonId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('nexus_anon');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    localStorage.setItem('nexus_anon', id);
  }
  return id;
}

const BUCKET_LABELS = ['Skeptic', 'Doubtful', 'Undecided', 'Curious', 'Believer'];

export default function StanceSlider({ nodeId }: { nodeId: string }) {
  const [data, setData]     = useState<StanceData | null>(null);
  const [value, setValue]   = useState(50);
  const [voted, setVoted]   = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null); setVoted(false); setValue(50);
    fetch(`/api/nodes/${nodeId}/stance?anonId=${anonId()}`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: StanceData | null) => {
        if (cancelled || !d) return;
        setData(d);
        if (d.myStance != null) { setValue(d.myStance); setVoted(true); }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [nodeId]);

  const submit = useCallback(async (v: number) => {
    setSaving(true);
    try {
      const r = await fetch(`/api/nodes/${nodeId}/stance`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ value: v, anonId: anonId() }),
      });
      if (r.ok) { setData(await r.json()); setVoted(true); }
    } catch { /* non-fatal */ }
    finally { setSaving(false); }
  }, [nodeId]);

  const maxBucket = data ? Math.max(...data.buckets, 1) : 1;

  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
      <div className="flex items-center gap-2 mb-3">
        <Scale size={14} className="text-amber-400" />
        <span className="text-sm font-black text-white">Where do you land?</span>
        {data && data.count > 0 && (
          <span className="text-[11px] text-slate-500">{data.count} reader{data.count !== 1 ? 's' : ''} weighed in</span>
        )}
      </div>

      {/* The slider */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold text-slate-400 w-14 text-right">Skeptic</span>
        <input
          type="range" min={0} max={100} value={value} disabled={saving}
          onChange={e => setValue(Number(e.target.value))}
          onMouseUp={() => submit(value)}
          onTouchEnd={() => submit(value)}
          onKeyUp={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') submit(value); }}
          className="flex-1 h-1.5 accent-amber-400 cursor-pointer"
          aria-label="Your stance from skeptic to believer"
        />
        <span className="text-[11px] font-semibold text-slate-400 w-14">Believer</span>
      </div>

      {/* Community distribution — revealed after you vote */}
      {voted && data && data.count > 0 && (
        <div className="mt-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">How everyone else landed</div>
          <div className="flex items-end gap-1.5 h-14">
            {data.buckets.map((pct, i) => {
              const isMine = data.myStance != null &&
                Math.min(4, Math.floor(Math.min(100, Math.max(0, data.myStance)) / 20)) === i;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-slate-500">{pct}%</span>
                  <div
                    className={`w-full rounded-t ${isMine ? 'bg-amber-400' : 'bg-purple-500/50'}`}
                    style={{ height: `${(pct / maxBucket) * 100}%`, minHeight: 2 }}
                    title={isMine ? 'You are here' : undefined}
                  />
                  <span className={`text-[8px] leading-tight ${isMine ? 'text-amber-300 font-bold' : 'text-slate-600'}`}>
                    {BUCKET_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!voted && (
        <p className="text-[11px] text-slate-500 mt-2">Drag to vote — then see where everyone else landed.</p>
      )}
    </div>
  );
}
