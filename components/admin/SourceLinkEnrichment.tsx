'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link2, Search, RefreshCw, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

interface Stats {
  total: number;
  withUrl: number;
  noUrl: number;
  approvedWithoutUrl: number;
}

interface Preview {
  sourcesWithoutUrl: number;
  withDoiOnly: number;
}

export default function SourceLinkEnrichment() {
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [preview,  setPreview]  = useState<Preview | null>(null);
  const [running,  setRunning]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [before,   setBefore]   = useState<Stats | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    const [s, p] = await Promise.all([
      fetch('/api/admin/source-enrichment/status').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/source-enrichment').then(r => r.ok ? r.json() : null),
    ]);
    if (s) setStats(s as Stats);
    if (p) setPreview(p as Preview);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const runEnrichment = async () => {
    setRunning(true);
    setDone(false);
    setError(null);
    setBefore(stats);

    const r = await fetch('/api/admin/source-enrichment', { method: 'POST' });
    if (!r.ok) {
      const j = await r.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? `Server error ${r.status}`);
      setRunning(false);
      return;
    }

    // Poll status until withUrl count stabilises
    let stableCount = 0;
    let lastCount = stats?.withUrl ?? 0;
    const poll = setInterval(async () => {
      await loadStats();
      setStats(s => {
        if (s && s.withUrl === lastCount) {
          stableCount++;
          if (stableCount >= 4) {
            clearInterval(poll);
            setRunning(false);
            setDone(true);
          }
        } else {
          stableCount = 0;
          lastCount = s?.withUrl ?? lastCount;
        }
        return s;
      });
    }, 3000);

    // Hard timeout: stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(poll);
      setRunning(false);
      setDone(true);
    }, 300_000);
  };

  const enrichable = preview?.sourcesWithoutUrl ?? 0;
  const doiReady   = preview?.withDoiOnly ?? 0;
  const pct        = stats ? Math.round((stats.withUrl / Math.max(stats.total, 1)) * 100) : 0;
  const gained     = done && before && stats ? stats.withUrl - before.withUrl : 0;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Link2 size={14} className="text-cyan-400" />
          Source Link Enrichment
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Automatically finds and adds missing URLs for academic sources using the CrossRef and OpenLibrary APIs.
          Only adds links when title similarity is ≥ 65%. Never hallucinates — sources without a confident match are left unchanged.
        </p>
      </div>

      {/* Coverage bar */}
      {stats && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Sources with URLs</span>
            <span className="text-slate-200 font-semibold">{stats.withUrl} / {stats.total} ({pct}%)</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="text-center">
              <p className="text-lg font-bold text-red-400">{stats.noUrl}</p>
              <p className="text-[9px] text-slate-500 uppercase font-semibold">Missing URL</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-400">{stats.approvedWithoutUrl}</p>
              <p className="text-[9px] text-slate-500 uppercase font-semibold">Approved, No URL</p>
            </div>
          </div>
        </div>
      )}

      {/* What will be searched */}
      {preview && enrichable > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-lg p-3 space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Will search</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Approved sources without URL</span>
            <span className="font-semibold text-slate-100">{enrichable}</span>
          </div>
          {doiReady > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Have DOI → instant URL resolution</span>
              <span className="font-semibold text-green-400">{doiReady} instant</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300">Need CrossRef / OpenLibrary lookup</span>
            <span className="font-semibold text-cyan-400">{enrichable - doiReady} searched</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            Academic papers → CrossRef · Books → CrossRef then OpenLibrary · Websites / news → skipped (can't reliably source)
          </p>
        </div>
      )}

      {preview && enrichable === 0 && (
        <div className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-700/40 rounded-lg">
          <CheckCircle size={14} className="text-green-400" />
          <p className="text-xs text-green-300">All approved sources already have URLs.</p>
        </div>
      )}

      {/* Success result */}
      {done && gained > 0 && (
        <div className="flex items-center gap-2 p-3 bg-cyan-900/20 border border-cyan-700/40 rounded-lg">
          <CheckCircle size={14} className="text-cyan-400 flex-shrink-0" />
          <p className="text-xs text-cyan-300">
            Added URLs to <strong className="text-white">{gained}</strong> source{gained !== 1 ? 's' : ''}. Sources with no confident match were left unchanged.
          </p>
        </div>
      )}
      {done && gained === 0 && (
        <div className="flex items-center gap-2 p-3 bg-slate-800/60 border border-slate-700 rounded-lg">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-xs text-slate-300">
            No new URLs found — either all sources already have links, or no confident matches were returned by CrossRef/OpenLibrary.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={runEnrichment}
          disabled={running || enrichable === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-700/50 hover:bg-cyan-700/80 text-cyan-300 text-xs font-semibold rounded transition-colors disabled:opacity-50"
        >
          {running ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
          {running ? 'Searching…' : 'Find & Add Missing Links'}
        </button>
        <button
          onClick={loadStats}
          className="p-1.5 hover:bg-slate-700 rounded transition-colors"
          title="Refresh counts"
        >
          <RefreshCw size={13} className="text-slate-400" />
        </button>
        <a
          href="https://www.crossref.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ExternalLink size={10} />
          CrossRef API
        </a>
        <a
          href="https://openlibrary.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ExternalLink size={10} />
          OpenLibrary API
        </a>
      </div>

      {running && (
        <p className="text-[11px] text-slate-500 animate-pulse">
          Processing in background… page will update automatically. ~200ms delay between requests to respect API rate limits.
        </p>
      )}
    </div>
  );
}
