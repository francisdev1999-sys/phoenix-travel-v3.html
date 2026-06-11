'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, Plus, Copy, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

const GROUPS = [
  'researcher','archaeologist','historian','ufo_researcher',
  'skeptic','journalist','student','curious',
] as const;

interface Redemption {
  id: string; redeemedAt: string;
  user: { id: string; name: string | null; email: string | null };
}
interface Invite {
  id: string; code: string; email: string | null; group: string;
  maxUses: number; usedCount: number; expiresAt: string | null;
  notes: string | null; createdAt: string;
  redemptions: Redemption[];
}

function InviteCard({ invite }: { invite: Invite }) {
  const [open, setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);
  const isExpired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
  const full      = invite.usedCount >= invite.maxUses;

  const copy = () => {
    navigator.clipboard.writeText(invite.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isExpired || full ? 'border-slate-700/30 opacity-60' : 'border-purple-900/30'
    }`}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <Ticket size={11} className="text-purple-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs font-bold text-purple-300 tracking-wider">{invite.code}</code>
            <span className="text-[9px] text-slate-500 capitalize">{invite.group.replace(/_/g, ' ')}</span>
            {invite.email && <span className="text-[9px] text-slate-600">→ {invite.email}</span>}
          </div>
          <p className="text-[9px] text-slate-600 mt-0.5">
            {invite.usedCount}/{invite.maxUses} uses · {new Date(invite.createdAt).toLocaleDateString()}
            {isExpired && ' · EXPIRED'}
            {full && !isExpired && ' · FULL'}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={copy} className="p-1 text-slate-500 hover:text-purple-300 transition-colors" title="Copy code">
            {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
          </button>
          {invite.redemptions.length > 0 && (
            <button onClick={() => setOpen(o => !o)} className="p-0.5 text-slate-500 hover:text-white">
              {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && invite.redemptions.length > 0 && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-3 pb-2 border-t border-purple-900/15 pt-1.5 space-y-1">
              {invite.redemptions.map(r => (
                <p key={r.id} className="text-[9px] text-slate-400">
                  {r.user.name ?? r.user.email ?? r.user.id} · {new Date(r.redeemedAt).toLocaleDateString()}
                </p>
              ))}
              {invite.notes && (
                <p className="text-[9px] text-slate-600 italic pt-1">{invite.notes}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BetaInviteManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newGroup,     setNewGroup]     = useState<string>('researcher');
  const [newEmail,     setNewEmail]     = useState('');
  const [newMaxUses,   setNewMaxUses]   = useState(1);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [newNotes,     setNewNotes]     = useState('');
  const [groupFilter,  setGroupFilter]  = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = groupFilter ? `?group=${groupFilter}` : '';
    fetch(`/api/admin/beta/invites${params}`)
      .then(r => r.json())
      .then(setInvites)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [groupFilter]);

  useEffect(load, [load]);

  const create = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/beta/invites', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          group:     newGroup,
          email:     newEmail.trim() || undefined,
          maxUses:   newMaxUses,
          expiresAt: newExpiresAt || undefined,
          notes:     newNotes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to create invite');
      }
      setCreating(false);
      setNewEmail(''); setNewMaxUses(1); setNewExpiresAt(''); setNewNotes('');
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const activeInvites  = invites.filter(i => !i.expiresAt || new Date(i.expiresAt) >= new Date());
  const expiredInvites = invites.filter(i => i.expiresAt && new Date(i.expiresAt) < new Date());
  const totalRedeemed  = invites.reduce((a, i) => a + i.usedCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Ticket size={16} className="text-purple-400" /> Beta Invites
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {invites.length} invites · {totalRedeemed} redeemed
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold">Refresh</button>
          <button onClick={() => setCreating(c => !c)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-purple-700 hover:bg-purple-600">
            <Plus size={10} /> New Invite
          </button>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-900/10 space-y-3">
              <p className="text-xs font-bold text-white">Create Invite</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Group</label>
                  <select value={newGroup} onChange={e => setNewGroup(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/40">
                    {GROUPS.map(g => <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Max Uses</label>
                  <input type="number" min={1} max={100} value={newMaxUses} onChange={e => setNewMaxUses(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/40" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Email (optional)</label>
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Expires (optional)</label>
                  <input type="date" value={newExpiresAt} onChange={e => setNewExpiresAt(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/40" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Notes (optional)</label>
                <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)}
                  placeholder="Invite context…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/40" />
              </div>
              {saveError && <p className="text-[10px] text-red-400">{saveError}</p>}
              <div className="flex gap-2">
                <button onClick={create} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-700 hover:bg-purple-600 disabled:opacity-50">
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                  Generate
                </button>
                <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter */}
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setGroupFilter('')}
          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${!groupFilter ? 'bg-purple-900/40 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}>
          All
        </button>
        {GROUPS.map(g => (
          <button key={g} onClick={() => setGroupFilter(g)}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium capitalize transition-all ${groupFilter === g ? 'bg-purple-900/40 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}>
            {g.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-400" size={20} /></div>
      ) : invites.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-8">No invites yet. Create one above.</p>
      ) : (
        <div className="space-y-3">
          {activeInvites.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active ({activeInvites.length})</p>
              {activeInvites.map(inv => <InviteCard key={inv.id} invite={inv} />)}
            </div>
          )}
          {expiredInvites.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Expired ({expiredInvites.length})</p>
              {expiredInvites.map(inv => <InviteCard key={inv.id} invite={inv} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
