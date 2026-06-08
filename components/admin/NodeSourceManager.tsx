'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { BookMarked, Plus, Trash2, Loader2, Search, X, FilePlus } from 'lucide-react';
import { SOURCE_TYPES } from '@/lib/validation/enums';

interface SourceSummary {
  id:               string;
  title:            string;
  sourceType:       string;
  author:           string | null;
  publicationYear:  number | null;
  credibilityScore: number;
  status:           string;
}

interface SourceLink {
  id:       string;
  linkType: string;
  source:   SourceSummary;
}

interface SearchResult {
  id:               string;
  title:            string;
  sourceType:       string;
  author:           string | null;
  publicationYear:  number | null;
  credibilityScore: number;
  status:           string;
}

interface Props {
  nodeId: string;
}

const LINK_TYPES = ['supports', 'contradicts', 'context', 'primary'];

const CREDIBILITY_COLOR = (score: number) => {
  if (score >= 0.75) return 'text-emerald-400';
  if (score >= 0.5)  return 'text-amber-400';
  return 'text-red-400';
};

export default function NodeSourceManager({ nodeId }: Props) {
  const [links,      setLinks]      = useState<SourceLink[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [adding,     setAdding]     = useState<string | null>(null);
  const [removing,   setRemoving]   = useState<string | null>(null);
  const [linkType,   setLinkType]   = useState('supports');
  const [showSearch, setShowSearch] = useState(false);
  const [mode,       setMode]       = useState<'search' | 'create'>('search');
  const searchTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create-form state
  const [newTitle,   setNewTitle]   = useState('');
  const [newType,    setNewType]    = useState(SOURCE_TYPES[0] as string);
  const [newAuthor,  setNewAuthor]  = useState('');
  const [newYear,    setNewYear]    = useState('');
  const [newUrl,     setNewUrl]     = useState('');
  const [creating,   setCreating]   = useState(false);
  const [createErr,  setCreateErr]  = useState('');

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
      // No status filter — admins can link any source regardless of approval state
      fetch(`/api/sources?q=${encodeURIComponent(query)}&limit=8`)
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sourceId, linkType }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error ?? 'Failed to link source');
        return;
      }
      setQuery(''); setResults([]); setShowSearch(false);
      loadLinks();
    } catch { alert('Request failed'); }
    finally   { setAdding(null); }
  };

  const removeLink = async (linkId: string) => {
    setRemoving(linkId);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/sources`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ linkId }),
      });
      if (!res.ok) { alert('Failed to unlink source'); return; }
      loadLinks();
    } catch { alert('Request failed'); }
    finally   { setRemoving(null); }
  };

  const createAndLink = async () => {
    if (!newTitle.trim()) { setCreateErr('Title is required'); return; }
    setCreating(true); setCreateErr('');
    try {
      // 1. Create the source
      const createRes = await fetch('/api/sources', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:           newTitle.trim(),
          sourceType:      newType,
          author:          newAuthor.trim() || undefined,
          publicationYear: newYear ? Number(newYear) : undefined,
          url:             newUrl.trim()   || undefined,
        }),
      });
      if (!createRes.ok) {
        const d = await createRes.json();
        setCreateErr(d.error ?? 'Failed to create source');
        return;
      }
      const created = await createRes.json();

      // 2. Link it to the node
      const linkRes = await fetch(`/api/nodes/${nodeId}/sources`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sourceId: created.id, linkType }),
      });
      if (!linkRes.ok) {
        const d = await linkRes.json();
        setCreateErr(d.error ?? 'Source created but link failed');
        return;
      }

      // Reset form and reload
      setNewTitle(''); setNewType(SOURCE_TYPES[0] as string);
      setNewAuthor(''); setNewYear(''); setNewUrl('');
      setShowSearch(false); setMode('search');
      loadLinks();
    } catch { setCreateErr('Request failed'); }
    finally   { setCreating(false); }
  };

  const openSearch = () => { setShowSearch(true); setMode('search'); };
  const closePanel = () => { setShowSearch(false); setMode('search'); setQuery(''); setResults([]); setCreateErr(''); };

  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <BookMarked size={10} />Sources ({links.length})
        </span>
        <div className="flex items-center gap-1">
          {!showSearch && (
            <>
              <button
                onClick={openSearch}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-purple-400 hover:bg-purple-900/20 transition-colors"
              >
                <Search size={10} />Search
              </button>
              <button
                onClick={() => { setShowSearch(true); setMode('create'); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-emerald-400 hover:bg-emerald-900/20 transition-colors"
              >
                <FilePlus size={10} />New
              </button>
            </>
          )}
          {showSearch && (
            <button
              onClick={closePanel}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={10} />Cancel
            </button>
          )}
        </div>
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
                <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500">
                  <span>{link.source.sourceType}</span>
                  {link.source.author && <span>· {link.source.author}</span>}
                  {link.source.publicationYear && <span>· {link.source.publicationYear}</span>}
                  <span className={`font-mono ${CREDIBILITY_COLOR(link.source.credibilityScore)}`}>
                    cred {Math.round(link.source.credibilityScore * 100)}%
                  </span>
                  <span className="px-1 py-0.5 rounded bg-slate-800 text-[9px] capitalize">{link.linkType}</span>
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

      {/* Panel */}
      {showSearch && (
        <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-purple-900/30 bg-slate-900/30">
          {/* Link type selector — shared by both modes */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">Classification:</span>
            <div className="flex gap-1 flex-wrap">
              {LINK_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setLinkType(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors ${
                    linkType === t
                      ? 'bg-purple-800 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-1 border-b border-slate-800/60 pb-1">
            <button
              onClick={() => setMode('search')}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${mode === 'search' ? 'text-purple-300 bg-purple-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Search existing
            </button>
            <button
              onClick={() => setMode('create')}
              className={`text-[10px] px-2 py-1 rounded transition-colors ${mode === 'create' ? 'text-emerald-300 bg-emerald-900/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Create new
            </button>
          </div>

          {/* Search mode */}
          {mode === 'search' && (
            <>
              <div className="relative">
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search all sources…"
                  className="w-full pl-7 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60"
                />
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
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span>{s.sourceType}</span>
                            {s.author && <span>· {s.author}</span>}
                            {s.publicationYear && <span>· {s.publicationYear}</span>}
                            <span className={`font-mono ${CREDIBILITY_COLOR(s.credibilityScore)}`}>
                              {Math.round(s.credibilityScore * 100)}%
                            </span>
                            {s.status !== 'approved' && (
                              <span className="px-1 py-0.5 rounded bg-amber-900/30 text-amber-400 text-[9px]">{s.status}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => addLink(s.id)}
                          disabled={alreadyLinked || adding === s.id}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-emerald-400 hover:bg-emerald-900/20 transition-colors disabled:opacity-40 flex-shrink-0"
                        >
                          {adding === s.id ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                          {alreadyLinked ? 'Linked' : 'Attach'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {!searching && query.trim() && results.length === 0 && (
                <div className="flex flex-col items-center gap-1.5 py-2">
                  <p className="text-[10px] text-slate-600 text-center">No sources match &ldquo;{query}&rdquo;.</p>
                  <button
                    onClick={() => { setMode('create'); setNewTitle(query); }}
                    className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    + Create &ldquo;{query}&rdquo; as new source
                  </button>
                </div>
              )}
            </>
          )}

          {/* Create mode */}
          {mode === 'create' && (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Title *"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60"
              />
              <select
                value={newType}
                onChange={e => setNewType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-slate-300 focus:outline-none"
              >
                {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newAuthor}
                  onChange={e => setNewAuthor(e.target.value)}
                  placeholder="Author"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60"
                />
                <input
                  value={newYear}
                  onChange={e => setNewYear(e.target.value)}
                  placeholder="Year"
                  type="number"
                  min="1"
                  max="2099"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60"
                />
              </div>
              <input
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="URL (optional)"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/50 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-700/60"
              />
              {createErr && <p className="text-[10px] text-red-400">{createErr}</p>}
              <button
                onClick={createAndLink}
                disabled={creating || !newTitle.trim()}
                className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 transition-colors disabled:opacity-40"
              >
                {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                {creating ? 'Creating & linking…' : 'Create & attach'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
