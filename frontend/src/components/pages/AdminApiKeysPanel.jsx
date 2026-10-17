'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, Plus, Search, X, Loader2, Eye, Lock, AlertTriangle, ShieldCheck, Clipboard, Check,
  Activity, Globe, Gauge, RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const STATUS_FILTERS = [['all', 'All'], ['active', 'Active'], ['revoked', 'Revoked']];
const fmtDateTime = (v) => v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
const relative = (v) => {
  if (!v) return 'Never';
  const m = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] font-medium text-slate-200 hover:bg-white/20 cursor-pointer">
      {copied ? <Check className="h-3 w-3" /> : <Clipboard className="h-3 w-3" />}{copied ? 'Copied' : label}
    </button>
  );
}

// API keys for external BI clients (Power BI, Looker Studio, custom dashboards).
export default function AdminApiKeysPanel() {
  const [keys, setKeys] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ label: '', scopes: ['ga'], rate_limit_hour: 1000 });
  const [formError, setFormError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [generated, setGenerated] = useState(null);

  const [detail, setDetail] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeConfirm, setRevokeConfirm] = useState('');
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState(null);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, scopeList] = await Promise.all([
        apiClient.get('/api/admin/bi-keys'),
        apiClient.get('/api/admin/bi-keys/scopes').catch(() => []),
      ]);
      setKeys(list || []);
      setScopes(scopeList || []);
    } catch (err) {
      setError(err.message || 'Failed to load API keys.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const scopeMap = useMemo(() => Object.fromEntries(scopes.map(s => [s.key, s])), [scopes]);
  // Server-normalized scopes (legacy aliases resolved), effective ones first.
  const scopesOf = (k) => [...(k.effective_scopes || []), ...(k.unknown_scopes || [])];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keys.filter(k =>
      (statusFilter === 'all' || (statusFilter === 'active' ? !k.revoked_at : !!k.revoked_at)) &&
      (!q || [k.label, k.created_by, ...(k.scopes || [])].some(v => String(v || '').toLowerCase().includes(q)))
    );
  }, [keys, search, statusFilter]);

  const active = keys.filter(k => !k.revoked_at);
  const lastUsed = keys.filter(k => k.last_used_at).sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))[0];
  const stats = [
    { label: 'Active keys', value: active.length, sub: `${keys.length - active.length} revoked`, icon: KeyRound, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { label: 'Requests this hour', value: active.reduce((s, k) => s + (k.usage_this_hour || 0), 0).toLocaleString('en-US'), sub: 'All active keys', icon: Activity, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { label: 'Near limit', value: active.filter(k => k.usage_this_hour >= k.rate_limit_hour * 0.8).length, sub: '≥ 80% of hourly quota', icon: Gauge, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Last used', value: relative(lastUsed?.last_used_at), sub: lastUsed?.label || '—', icon: Globe, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  ];

  const openCreate = () => {
    setForm({ label: '', scopes: scopes.length ? [scopes[0].key] : ['ga'], rate_limit_hour: 1000 });
    setFormError(null);
    setGenerated(null);
    setShowCreate(true);
  };
  const submitCreate = async (e) => {
    e?.preventDefault();
    if (!form.label.trim() || !form.scopes.length) return;
    setCreating(true);
    setFormError(null);
    try {
      const res = await apiClient.post('/api/admin/bi-keys', { ...form, label: form.label.trim(), rate_limit_hour: Number(form.rate_limit_hour) });
      setGenerated(res);
      load();
    } catch (err) {
      setFormError(err.message || 'Failed to create API key.');
    } finally {
      setCreating(false);
    }
  };

  const submitRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    setRevokeError(null);
    try {
      await apiClient.delete(`/api/admin/bi-keys/${revokeTarget.id}`);
      flash(`API key "${revokeTarget.label}" revoked; it stops working immediately.`);
      setRevokeTarget(null);
      setDetail(null);
      load();
    } catch (err) {
      setRevokeError(err.message || 'Failed to revoke API key.');
    } finally {
      setRevoking(false);
    }
  };

  const usageBar = (k) => {
    const pct = Math.min(100, ((k.usage_this_hour || 0) / (k.rate_limit_hour || 1)) * 100);
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className={`h-full rounded-full ${pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-blue-600'}`} />
        </div>
        <span className="w-24 text-right text-[10px] tabular-nums text-slate-500">{(k.usage_this_hour || 0).toLocaleString('en-US')} / {k.rate_limit_hour.toLocaleString('en-US')}</span>
      </div>
    );
  };
  const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label: name, value, sub, icon: Icon, tone }, i) => (
          <motion.div key={name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{name}</p><p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</p><p className="truncate text-[10px] text-slate-400">{sub}</p></div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</motion.div>}
      </AnimatePresence>
      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{error}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="relative min-w-48 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search API keys" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search label, creator, or scope..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="flex gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {STATUS_FILTERS.map(([key, text]) => (
              <button key={key} type="button" aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)} className={`relative rounded-md px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${statusFilter === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                {statusFilter === key && <motion.span layoutId="apikey-status-filter" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                <span className="relative">{text}</span>
              </button>
            ))}
          </div>
          <button type="button" aria-label="Reload" onClick={load} disabled={loading} className={`${actionClass} border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800`}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          <button type="button" onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Plus className="h-3.5 w-3.5" />Generate key</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
              <tr><th className="w-[24%] px-4 py-2.5 font-semibold">Label</th><th className="w-[14%] px-3 py-2.5 font-semibold">Scope</th><th className="w-[24%] px-3 py-2.5 font-semibold">Usage this hour</th><th className="w-[16%] px-3 py-2.5 font-semibold">Last used</th><th className="w-[10%] px-3 py-2.5 font-semibold">Status</th><th className="w-[12%] px-3 py-2.5 text-right font-semibold">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading && !keys.length && <tr><td colSpan={6} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-500" /></td></tr>}
              {!loading && !filtered.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-400"><KeyRound className="mx-auto mb-2 h-8 w-8 opacity-30" />{keys.length ? 'No keys match the filters.' : 'No API keys yet.'}</td></tr>}
              {filtered.map((k, i) => (
                <motion.tr key={k.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.02 }} className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${k.revoked_at ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-2"><p title={k.label} className="truncate font-medium text-slate-800 dark:text-slate-200">{k.label}</p><p className="truncate text-[10px] text-slate-400">#{k.id} · by {k.created_by || '—'} · {fmtDateTime(k.created_at)}</p></td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{scopesOf(k).map(s => <span key={s} title={scopeMap[s] ? scopeMap[s].label : 'Scope without endpoints — grants no access'} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${scopeMap[s] ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'bg-slate-100 text-slate-400 line-through dark:bg-slate-800'}`}>{s}</span>)}</div></td>
                  <td className="px-3 py-2">{k.revoked_at ? <span className="text-[10px] text-slate-400">—</span> : usageBar(k)}</td>
                  <td className="px-3 py-2"><p className="text-slate-600 dark:text-slate-300">{relative(k.last_used_at)}</p></td>
                  <td className="px-3 py-2">{k.revoked_at ? <span title={`Revoked ${fmtDateTime(k.revoked_at)}`} className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><span className="h-1 w-1 rounded-full bg-current" />Revoked</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><span className="h-1 w-1 rounded-full bg-current" />Active</span>}</td>
                  <td className="px-3 py-1.5"><div className="flex items-center justify-end gap-0.5">
                    <button type="button" title="Access details" onClick={() => setDetail(k)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Eye className="h-3.5 w-3.5" /></button>
                    {!k.revoked_at && <button type="button" title={`Revoke ${k.label}`} onClick={() => { setRevokeTarget(k); setRevokeConfirm(''); setRevokeError(null); }} className={`${actionClass} hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10`}><Lock className="h-3.5 w-3.5" /></button>}
                  </div></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-[10px] text-slate-400 dark:border-slate-800">Keys are hashed with SHA-256 before storage; the plaintext is shown only once at creation. Revocation is immediate. Usage is counted per calendar hour in the API process.</p>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">API key #{detail.id}</p><h3 className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{detail.label}</h3></div>
                <button type="button" aria-label="Close" onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  {[['Status', detail.revoked_at ? `Revoked ${fmtDateTime(detail.revoked_at)}` : 'Active'], ['Rate limit', `${detail.rate_limit_hour.toLocaleString('en-US')} / hour`], ['Created', `${fmtDateTime(detail.created_at)} · ${detail.created_by || '—'}`], ['Last used', fmtDateTime(detail.last_used_at) || 'Never']].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-[10px] text-slate-400">{k}</p><p className="mt-0.5 font-medium text-slate-800 dark:text-slate-100">{v}</p></div>
                  ))}
                </div>
                {!detail.revoked_at && <div><p className={label}>Usage this hour</p>{usageBar(detail)}</div>}
                <div>
                  <p className={label}>Accessible endpoints</p>
                  {scopesOf(detail).map(s => (
                    <div key={s} className="mb-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{s} <span className="font-normal text-slate-400">{scopeMap[s]?.label || '· no endpoints yet; this scope grants no access'}</span></p>
                      {scopeMap[s] && <ul className="mt-1.5 space-y-0.5 font-mono text-[10px] text-slate-500">{scopeMap[s].endpoints.map(ep => <li key={ep}>GET {ep}</li>)}</ul>}
                    </div>
                  ))}
                </div>
                <div>
                  <p className={label}>Example request</p>
                  <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-slate-200">{`GET ${typeof window !== 'undefined' ? window.location.origin : ''}/api/bi/ga/overview\nX-API-Key: <key>`}</pre>
                  <p className="mt-1.5 text-[10px] text-slate-400">Responses include X-RateLimit-Limit / Remaining / Reset headers. Over the limit → 429; wrong scope → 403; revoked key → 401.</p>
                </div>
              </div>
              {!detail.revoked_at && (
                <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                  <button type="button" onClick={() => { setRevokeTarget(detail); setRevokeConfirm(''); setRevokeError(null); }} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10 cursor-pointer"><Lock className="h-3.5 w-3.5" />Revoke this key</button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Revoke confirmation */}
      <AnimatePresence>
        {revokeTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !revoking && setRevokeTarget(null)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><Lock className="h-5 w-5" /></span>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Revoke API key?</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Every client using “{revokeTarget.label}” is rejected immediately (401). This cannot be undone — create a new key if access is still needed.</p>
              </div>
              <div>
                <label htmlFor="revoke-confirm" className={label}>Type the label to confirm</label>
                <input id="revoke-confirm" autoFocus value={revokeConfirm} onChange={e => setRevokeConfirm(e.target.value)} placeholder={revokeTarget.label} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-rose-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              </div>
              {revokeError && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{revokeError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setRevokeTarget(null)} disabled={revoking} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="button" onClick={submitRevoke} disabled={revoking || revokeConfirm.trim() !== revokeTarget.label} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-40 cursor-pointer">{revoking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Revoke</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Generate modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (!generated) setShowCreate(false); }} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              {!generated ? (
                <form onSubmit={submitCreate}>
                  <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Generate API key</h3><p className="mt-0.5 text-[11px] text-slate-400">For external BI clients (Power BI, Looker Studio, custom dashboards).</p></div>
                    <button type="button" aria-label="Close" onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="space-y-4 px-5 py-4">
                    <div><label htmlFor="key-label" className={label}>Label *</label><input id="key-label" autoFocus maxLength={100} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Power BI — Finance" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></div>
                    <div>
                      <span className={label}>Scope *</span>
                      <div className="space-y-1.5">
                        {scopes.map(s => (
                          <label key={s.key} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${form.scopes.includes(s.key) ? 'border-blue-300 bg-blue-50/50 dark:border-blue-500/40 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                            <input type="checkbox" checked={form.scopes.includes(s.key)} onChange={e => setForm(f => ({ ...f, scopes: e.target.checked ? [...f.scopes, s.key] : f.scopes.filter(x => x !== s.key) }))} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600" />
                            <span><span className="block text-xs font-medium text-slate-800 dark:text-slate-100">{s.label} <span className="font-mono text-[10px] text-slate-400">({s.key})</span></span><span className="block text-[10px] text-slate-400">{s.endpoints.length} read-only endpoints</span></span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10px] text-slate-400">Only scopes that already have endpoints are listed.</p>
                    </div>
                    <div><label htmlFor="key-rate" className={label}>Rate limit per hour</label><input id="key-rate" type="number" min={1} max={100000} step={1} value={form.rate_limit_hour} onChange={e => setForm(f => ({ ...f, rate_limit_hour: e.target.value }))} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /><p className="mt-1 text-[10px] text-slate-400">1–100,000. Over the limit → 429 until the next hour.</p></div>
                    {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{formError}</div>}
                  </div>
                  <div className="flex gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                    <button type="button" onClick={() => setShowCreate(false)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                    <button type="submit" disabled={creating || !form.label.trim() || !form.scopes.length} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Generate</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="border-b border-emerald-100 bg-emerald-50/60 px-5 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10"><h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><ShieldCheck className="h-4 w-4" />API key created</h3></div>
                  <div className="space-y-3 px-5 py-4">
                    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />Copy it now. This key will not be shown again after you close this dialog.</p>
                    <div className="rounded-xl bg-slate-900 p-3">
                      <p className="select-all break-all font-mono text-xs text-emerald-300">{generated.api_key}</p>
                      <div className="mt-2 flex justify-end"><CopyButton text={generated.api_key} label="Copy key" /></div>
                    </div>
                    <p className="text-[10px] text-slate-400">Scope: {generated.scopes?.join(', ')} · limit {Number(generated.rate_limit_hour).toLocaleString('en-US')}/hour · header <code>X-API-Key</code></p>
                  </div>
                  <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                    <button type="button" onClick={() => { setShowCreate(false); setGenerated(null); }} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"><Check className="h-3.5 w-3.5" />Copied, close</button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
