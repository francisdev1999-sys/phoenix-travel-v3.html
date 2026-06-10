'use client';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface ReportRow {
  id: string; entityType: string; entityId: string; reason: string;
  detail: string | null; status: string; createdAt: string;
  submitter:    { id: string; name: string | null; email: string | null };
  reportedUser: { id: string; name: string | null; email: string | null } | null;
}

const REASON_LABEL: Record<string, string> = {
  spam: 'Spam', misinformation: 'Misinformation', fake_source: 'Fake Source',
  harassment: 'Harassment', low_quality: 'Low Quality', other: 'Other',
};

const STATUS_COLOR: Record<string, string> = {
  open:         'text-amber-400',
  investigating:'text-cyan-400',
  resolved:     'text-emerald-400',
  dismissed:    'text-slate-500',
};

export default function ModerationQueue() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [statusFilter, setStatusFilter] = useState('open');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resolving, setResolving] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/moderation/reports?status=${statusFilter}&page=${page}`)
      .then(r => r.json())
      .then(d => { setReports(d.reports ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); })
      .catch(() => setError('Failed to load reports'))
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id: string, status: string, note?: string) => {
    setResolving(id);
    await fetch(`/api/admin/moderation/reports/${id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status, resolveNote: note }),
    });
    load();
    setResolving('');
  };

  return (
    <div className="space-y-4">
      {error && <div className="text-xs text-red-400 p-3 bg-red-900/10 rounded-lg">{error}</div>}

      {/* Filter tabs */}
      <div className="flex gap-1">
        {['open', 'investigating', 'resolved', 'dismissed'].map(s => (
          <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium capitalize transition-all ${
              statusFilter === s ? 'bg-purple-900/50 text-purple-300' : 'text-slate-500 hover:text-slate-300'
            }`}>{s}</button>
        ))}
      </div>

      <div className="text-xs text-slate-500">{total} reports</div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map(r => (
            <div key={r.id} className="p-4 rounded-xl border border-purple-900/20 bg-black/20 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {REASON_LABEL[r.reason] ?? r.reason}
                      <span className="ml-2 text-slate-500 font-normal">on {r.entityType} {r.entityId.slice(0, 8)}…</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      by {r.submitter.name ?? r.submitter.email ?? r.submitter.id}
                      {r.reportedUser && <> · against {r.reportedUser.name ?? r.reportedUser.email}</>}
                      · {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-medium ${STATUS_COLOR[r.status] ?? 'text-slate-400'}`}>
                  {r.status}
                </span>
              </div>

              {r.detail && (
                <p className="text-xs text-slate-400 bg-black/20 rounded-lg p-2">{r.detail}</p>
              )}

              {r.status === 'open' && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => resolve(r.id, 'investigating')}
                    disabled={!!resolving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50"
                  >
                    <Eye size={11} /> Investigate
                  </button>
                  <button
                    onClick={() => resolve(r.id, 'resolved', 'Reviewed and resolved')}
                    disabled={!!resolving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                  >
                    <CheckCircle size={11} /> Resolve
                  </button>
                  <button
                    onClick={() => resolve(r.id, 'dismissed', 'No action required')}
                    disabled={!!resolving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-900/50 text-slate-400 hover:bg-slate-900/70"
                  >
                    <XCircle size={11} /> Dismiss
                  </button>
                  {resolving === r.id && <Loader2 size={14} className="animate-spin text-purple-400 self-center" />}
                </div>
              )}

              {r.status === 'investigating' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve(r.id, 'resolved', 'Investigation complete')}
                    disabled={!!resolving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-emerald-900/30 text-emerald-400"
                  >
                    <CheckCircle size={11} /> Mark Resolved
                  </button>
                  <button
                    onClick={() => resolve(r.id, 'dismissed')}
                    disabled={!!resolving}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-slate-900/50 text-slate-400"
                  >
                    <XCircle size={11} /> Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}

          {reports.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-8">No {statusFilter} reports.</div>
          )}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded-lg border border-purple-900/30 text-slate-400 hover:text-white disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-slate-500">Page {page} of {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-1.5 rounded-lg border border-purple-900/30 text-slate-400 hover:text-white disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
