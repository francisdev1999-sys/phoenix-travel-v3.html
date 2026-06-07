'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { SOURCE_TYPES } from '@/lib/source-types';
import type { SourceRecord } from '@/lib/source-types';
import SourceCard from './SourceCard';

interface Props {
  onSelect: (source: SourceRecord) => void;
  mineOnly?: boolean;
}

const STATUS_OPTS = ['', 'pending', 'approved', 'rejected', 'needs_revision'];

export default function SourceBrowse({ onSelect, mineOnly }: Props) {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q)        params.set('q', q);
      if (type)     params.set('type', type);
      if (status)   params.set('status', status);
      if (mineOnly) params.set('mine', 'true');
      params.set('page', String(page));

      const res = await fetch(`/api/sources?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources);
        setTotal(data.total);
        setPages(data.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [q, type, status, page, mineOnly]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => { setPage(1); }, [q, type, status]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search sources…"
            className="nexus-input w-full pl-8 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 rounded-xl border text-xs font-medium transition-all ${
            showFilters || type || status
              ? 'bg-purple-900/40 border-purple-500/40 text-purple-300'
              : 'border-purple-900/30 text-slate-400 hover:text-white'
          }`}
        >
          <Filter size={14} />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="nexus-input text-xs flex-1 min-w-[140px]"
          >
            <option value="">All types</option>
            {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="nexus-input text-xs flex-1 min-w-[120px]"
          >
            {STATUS_OPTS.map(s => (
              <option key={s} value={s}>{s === '' ? 'All statuses' : s.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
      )}

      {/* Results */}
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{loading ? 'Loading…' : `${total} source${total !== 1 ? 's' : ''}`}</span>
        {pages > 1 && <span>Page {page} of {pages}</span>}
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {loading && sources.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-purple-400" />
          </div>
        ) : sources.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-12">No sources found.</p>
        ) : (
          sources.map(s => (
            <SourceCard key={s.id} source={s} onClick={() => onSelect(s)} />
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 flex-shrink-0">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-white/10"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-slate-400">{page} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 hover:bg-white/10"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
