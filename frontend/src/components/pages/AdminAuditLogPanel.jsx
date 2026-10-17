'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, Eye, Database } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import CampaignDateRangePicker from '@/components/ui/CampaignDateRangePicker';

const ACTION_TONE = {
  CREATE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  UPDATE: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  DELETE: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  PURGE_ALL: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  REVOKE: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  RESET_PW: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  ACCESS: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
const TABLE_LABELS = { m_user: 'Users', m_user_company_access: 'Company access', m_api_keys: 'API keys', assets: 'Assets' };
const fmt = (v) => v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

// Field-level diff for UPDATE-like rows; falls back to raw JSON.
function diffRows(oldData, newData) {
  if (!oldData || !newData || typeof oldData !== 'object' || typeof newData !== 'object') return null;
  const keys = [...new Set([...Object.keys(oldData), ...Object.keys(newData)])].filter(k => k !== 'actor_email');
  return keys.map(k => ({ key: k, before: oldData[k], after: newData[k] })).filter(r => JSON.stringify(r.before) !== JSON.stringify(r.after));
}
const show = (v) => v === undefined || v === null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);

export default function AdminAuditLogPanel() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [facets, setFacets] = useState({ actions: [], tables: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [table, setTable] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const h = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(h);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/admin/audit-logs', { params: { page, limit: pageSize, search: search || undefined, action: action || undefined, table: table || undefined, from: from || undefined, to: to || undefined } });
      setLogs(res?.data || []);
      setMeta(res?.meta || { total: 0, page: 1, totalPages: 1 });
      setFacets(res?.facets || { actions: [], tables: [] });
    } catch (err) {
      setError(err.message || 'Failed to load the audit log.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, action, table, from, to]);

  useEffect(() => { load(); }, [load]);

  const hasFilter = Boolean(search || action || table || from || to);
  const resetFilters = () => { setSearchInput(''); setSearch(''); setAction(''); setTable(''); setFrom(''); setTo(''); setPage(1); };
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
  const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
  const start = meta.total ? (meta.page - 1) * pageSize + 1 : 0;
  const diff = selected ? diffRows(selected.old_data, selected.new_data) : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      {error && <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search log" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search actor (name/email), table, or record ID..." className={`${fieldClass} w-full bg-slate-50 pl-9 pr-9 dark:bg-slate-950`} />
              {searchInput && <button type="button" aria-label="Clear search" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <select aria-label="Filter by action" value={action} onChange={e => { setAction(e.target.value); setPage(1); }} className={fieldClass}><option value="">All actions</option>{facets.actions.map(a => <option key={a.value} value={a.value}>{a.value} ({a.count})</option>)}</select>
            <select aria-label="Filter by table" value={table} onChange={e => { setTable(e.target.value); setPage(1); }} className={fieldClass}><option value="">All tables</option>{facets.tables.map(t => <option key={t.value} value={t.value}>{TABLE_LABELS[t.value] || t.value} ({t.count})</option>)}</select>
            <button type="button" aria-label="Reload" onClick={load} disabled={loading} className={`${actionClass} border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800`}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Period</span>
            <div className="w-full sm:w-72">
              <CampaignDateRangePicker
                startValue={from}
                endValue={to}
                placeholder="All dates"
                lang="en"
                onChange={({ start, end }) => {
                  setFrom(start || '');
                  // Until the end date is picked, the filter runs from the start date onward.
                  setTo(end || '');
                  setPage(1);
                }}
              />
            </div>
            {hasFilter && <button type="button" onClick={resetFilters} className="font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer">Reset filters</button>}
            <span aria-live="polite" className="ml-auto text-slate-400">{meta.total.toLocaleString('en-US')} {meta.total === 1 ? 'entry' : 'entries'}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full min-w-[860px] table-fixed text-left text-xs transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
              <tr><th className="w-[18%] px-4 py-2.5 font-semibold">Time</th><th className="w-[26%] px-3 py-2.5 font-semibold">Actor</th><th className="w-[12%] px-3 py-2.5 font-semibold">Action</th><th className="w-[18%] px-3 py-2.5 font-semibold">Record</th><th className="w-[18%] px-3 py-2.5 font-semibold">Summary</th><th className="w-[8%] px-3 py-2.5 text-right font-semibold">Detail</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading && !logs.length && <tr><td colSpan={6} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-500" /></td></tr>}
              {!loading && !logs.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-400"><Database className="mx-auto mb-2 h-8 w-8 opacity-30" />{hasFilter ? 'No log entries match the filters.' : 'No activity recorded yet.'}</td></tr>}
              {logs.map((log, i) => {
                const changes = diffRows(log.old_data, log.new_data);
                const actor = log.m_user?.full_name || log.new_data?.actor_email || 'System';
                return (
                  <motion.tr key={log.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40" onClick={() => setSelected(log)}>
                    <td className="px-4 py-2 tabular-nums text-slate-500 dark:text-slate-400">{fmt(log.created_at)}</td>
                    <td className="px-3 py-2"><p className="truncate font-medium text-slate-800 dark:text-slate-200">{actor}</p><p className="truncate text-[10px] text-slate-400">{log.m_user?.email || log.new_data?.actor_email || '—'}</p></td>
                    <td className="px-3 py-2"><span className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium ${ACTION_TONE[log.action] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{log.action || '—'}</span></td>
                    <td className="px-3 py-2"><p className="truncate text-slate-700 dark:text-slate-300">{TABLE_LABELS[log.table_name] || log.table_name || '—'}</p><p className="text-[10px] text-slate-400">{log.record_id ? `ID #${log.record_id}` : '—'}</p></td>
                    <td className="truncate px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">{changes?.length ? changes.map(c => c.key).join(', ') + ' changed' : log.new_data?.email || log.new_data?.label || log.old_data?.label || '—'}</td>
                    <td className="px-3 py-1.5 text-right"><button type="button" aria-label="View details" onClick={(e) => { e.stopPropagation(); setSelected(log); }} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Eye className="h-3.5 w-3.5" /></button></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
          <label className="flex items-center gap-2">Rows per page
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}</select>
          </label>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">{meta.total ? `${start}–${Math.min(meta.page * pageSize, meta.total)}` : '0'} of {meta.total.toLocaleString('en-US')}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-10 text-center tabular-nums">{meta.page} / {meta.totalPages}</span>
              <button type="button" aria-label="Next page" disabled={page >= meta.totalPages} onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Log #{selected.id}</p><h3 className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{selected.action} · {TABLE_LABELS[selected.table_name] || selected.table_name}{selected.record_id ? ` #${selected.record_id}` : ''}</h3><p className="mt-0.5 text-[11px] text-slate-400">{fmt(selected.created_at)} · {selected.m_user?.full_name || selected.new_data?.actor_email || 'System'}</p></div>
                <button type="button" aria-label="Close" onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs">
                {diff && diff.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Changes</p>
                    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full table-fixed text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-900"><tr><th className="w-1/4 px-3 py-2 font-semibold">Field</th><th className="px-3 py-2 font-semibold">Before</th><th className="px-3 py-2 font-semibold">After</th></tr></thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {diff.map(r => <tr key={r.key}><td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.key}</td><td className="break-words px-3 py-2 text-rose-600 dark:text-rose-400">{show(r.before)}</td><td className="break-words px-3 py-2 text-emerald-700 dark:text-emerald-400">{show(r.after)}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {[['Data before', selected.old_data], ['Data after', selected.new_data]].map(([title, value]) => (
                  <div key={title}>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
                    <pre className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-slate-200">{value ? JSON.stringify(value, null, 2) : '—'}</pre>
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
