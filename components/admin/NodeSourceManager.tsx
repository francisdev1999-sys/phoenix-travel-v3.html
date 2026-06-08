'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { BookMarked, Plus, Trash2, Loader2, Search, X } from 'lucide-react';

interface SourceSummary {
  id:              string;
  title:           string;
  sourceType:      string;
  author:          string | null;
  publicationYear: number | null;
  credibilityScore: number;
  status:          string;
}

interface SourceLink {
  id:       string;
  linkType: string;
  source:   SourceSummary;
}

interface SearchResult {
  id:         string;
  title:      string;
  sourceType: string;
  author:     string | null;
  publicationYear: number | null;
}

interface Props {
  nodeId: string;
}

const LINK_TYPES = ['supports', 'contradicts', 'references'];

export default function NodeSourceManager({ nodeId }: Props) {
  const [links,        setLinks]        = useState<SourceLink[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [query,        setQuery]        = useState('');
  const [results,      setResults]      = useState<SearchResult[]>([]);
  const [searching,    setSearching]    = useState(false);
  const [adding,       setAdding]       = useState<string | null>(null);
  const [removing,     setRemoving]     = useState<string | null>(null);
  const [linkType,     setLinkType]     = useState('supports');
  const [showSearch,   setShowSearch]   = useState(false);
  const searchTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLinks = useCallback(() => {
    setLoading(true);
    fetch(`/api/nodes/${nodeId}/sources`)
      .then(r => r.json())
      .then(d => setLinks(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [nodeId]);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      fetch(`/api/sources?q=${encodeURIComponent(query)}&limit=8&status=approved`)
        .then(r => r.json())
        .then(d => setResults(d.sources ?? []))
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 350);
  }, [query]);

  const addLink = async (sourceId: string) => {
    setAdding(sourceId);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, linkType }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? 'Failed to link source');
        return;
      }
      setQuery(''); setResults([]); setShowSearch(false);
      loadLinks();
    } catch { alert('Request failed'); }
    finally { setAdding(null); }
  };

  const removeLink = async (linkId: string) => {
    setRemoving(linkId);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/sources`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkId }),
      });
      if (!res.ok) { alert('Failed to unlink source'); return; }
      loadLinks();
    } catch { alert('Request failed'); }
    finally { setRemoving(null); }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <BookMarked size={10} />Sources ({links.length})
        </span>
        <button
          onClick={() => setShowSearch(s => !s)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-purple-400 hover:bg-purple-900/20 transition-colors"
        >
          {showSearch ? <X size={10} /> : <Plus size={10} />}
          {showSearch ? 'Cancel' : 'Add source'}
        </button>
      </div>

      {/* Linked sources */}
      {loading ? (
        <div className="flex justify-center py-3"><Loader2 size={14} className="animate-spin text-purple-400" /></div>
      ) : links.length === 0 ? (
        <p className="text-[10px] text-slate-600 italic">No sources linked yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {links.map(link => (
            <div key={link.id} className="flex items-start justify-between gap-2 px-2.5 py-2 rounded-lg bg-slate-900/50 border border-slate-800/50">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] text-white font-medium truncate">{link.source.title}</span>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <span>{link.source.sourceType}</span>
                  {link.source.author && <span>· {link.source.author}</span>}
                  {link.source.publicationYear && <span>· {link.source.publicationYear}</span>}
                  <span className="px-1 py-0.5 rounded bg-slate-800 text-[9px]">{link.linkType}</span>
                </div>
              </div>
              <button
                onClick={() => removeLink(link.id)}
                disabled={removing === link.id}
                className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40"
              >
                {removing === link.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search panel */}
      {showSearch && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-purple-900/30 bg-slate-900/30">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search approved sources…"
                className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60"
              />
            </div>
            <select
              value={linkType}
              onChange={e => setLinkType(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-700/50 rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none"
            >
              {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {searching && (
            <div className="flex justify-center py-2"><Loader2 size={12} className="animate-spin text-purple-400" /></div>
          )}

          {!searching && results.length > 0 && (
            <div className="flex flex-col gap-1">
              {results.map(s => {
                const alreadyLinked = links.some(l => l.source.id === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/40">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[11px] text-white truncate">{s.title}</span>
                      <span className="text-[10px] text-slate-500">{s.sourceType}{s.author ? ` · ${s.author}` : ''}{s.publicationYear ? ` · ${s.publicationYear}` : ''}</span>
                    </div>
                    <button
                      onClick={() => addLink(s.id)}
                      disabled={alreadyLinked || adding === s.id}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-emerald-400 hover:bg-emerald-900/20 transition-colors disabled:opacity-40 flex-shrink-0"
                    >
                      {adding === s.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                      {alreadyLinked ? 'Linked' : 'Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!searching && query.trim() && results.length === 0 && (
            <p className="text-[10px] text-slate-600 text-center py-1">No approved sources match &ldquo;{query}&rdquo;.</p>
          )}
        </div>
      )}
    </div>
  );
}
