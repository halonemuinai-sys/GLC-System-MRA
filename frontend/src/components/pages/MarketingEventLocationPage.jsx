'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Search, Plus, X, Edit3, Trash2, Loader2, ChevronLeft, ChevronRight,
  AlertTriangle, RefreshCw, LockKeyhole, Link2, CircleDashed
} from 'lucide-react';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';

const USAGE_FILTERS = [['all', 'All'], ['used', 'Used in plans'], ['unused', 'Unused']];

export default function MarketingEventLocationPage() {
  const [loading, setLoading] = useState(false);
  // Process-first: nothing is fetched until Load data.
  const [processed, setProcessed] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [canWrite, setCanWrite] = useState(false);
  useEffect(() => { setCanWrite(['admin', 'marketing'].includes((Cookies.get('glc_user_role') || '').toLowerCase())); }, []);

  const [search, setSearch] = useState('');
  const [usageFilter, setUsageFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await apiClient.get('/api/marketing/event-locations')) || []);
    } catch (err) {
      setError(err.message || 'Failed to load event locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (processed) fetchData(); }, [processed, fetchData]);

  const isUsed = (item) => item.usage_locked + item.usage_draft > 0;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(item =>
      (!q || item.name.toLowerCase().includes(q)) &&
      (usageFilter === 'all' || (usageFilter === 'used' ? isUsed(item) : !isUsed(item)))
    );
  }, [data, search, usageFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  // Live duplicate hint while typing (server enforces it too, case-insensitive).
  const duplicate = useMemo(() => {
    const n = name.trim().replace(/\s+/g, ' ').toLowerCase();
    return n ? data.find(item => item.name.toLowerCase() === n && item.id !== editingItem?.id) : null;
  }, [name, data, editingItem]);

  const stats = [
    { label: 'Total locations', value: data.length, icon: MapPin, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Used in plans', value: data.filter(isUsed).length, icon: Link2, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { label: 'Unused', value: data.filter(d => !isUsed(d)).length, icon: CircleDashed, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  ];

  const openForm = (item = null) => { setEditingItem(item); setName(item?.name || ''); setFormError(null); setShowDrawer(true); };
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim() || duplicate) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (editingItem) await apiClient.put(`/api/marketing/event-locations/${editingItem.id}`, { name });
      else await apiClient.post('/api/marketing/event-locations', { name });
      setShowDrawer(false);
      flash(editingItem ? 'Event location updated.' : 'Event location added.');
      if (processed) fetchData(); else setProcessed(true);
    } catch (err) {
      setFormError(err.message || 'Failed to save the event location.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/api/marketing/event-locations/${deleteTarget.id}${deleteTarget.usage_draft ? '?confirm_draft=1' : ''}`);
      setDeleteTarget(null);
      flash('Event location deleted.');
      fetchData();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete the event location.');
    } finally {
      setSubmitting(false);
    }
  };

  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><MapPin className="h-4 w-4" />Marketing master data</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Event Locations</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Venues where events take place (venue, mall, hotel), selected on Marketing Plan items.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2"><button type="button" onClick={() => (processed ? fetchData() : setProcessed(true))} disabled={loading} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60 cursor-pointer"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{processed ? 'Reload' : 'Load data'}</button>
          {canWrite && <button type="button" onClick={() => openForm()} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-blue-50 cursor-pointer"><Plus className="h-4 w-4" />Add location</button>}</div>
        </div>
      </motion.div>

      {processed && (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, tone }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</p></div>
          </motion.div>
        ))}
      </div>
      )}

      <AnimatePresence>
        {notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</motion.div>}
      </AnimatePresence>
      {error && <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={fetchData} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}

      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><MapPin className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load event locations</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Click Load data to see every event location, how often it is used in plans and which ones are locked from deletion.</p>
          <button type="button" onClick={() => setProcessed(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Load data</button>
        </motion.div>
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="relative min-w-48 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search event locations" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search location name..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
            {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="flex gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {USAGE_FILTERS.map(([key, text]) => (
              <button key={key} type="button" aria-pressed={usageFilter === key} onClick={() => { setUsageFilter(key); setPage(1); }} className={`relative rounded-md px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${usageFilter === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                {usageFilter === key && <motion.span layoutId="eventloc-usage-filter" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                <span className="relative">{text}</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={fetchData} disabled={loading} aria-label="Reload" className={`${actionClass} border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800`}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          <span aria-live="polite" className="text-[11px] text-slate-400">{filtered.length} {filtered.length === 1 ? 'location' : 'locations'}</span>
        </div>

        <div className="overflow-x-auto">
          {loading && !data.length ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Loading event locations...</div>
          ) : (
            <table className="w-full min-w-[560px] table-fixed text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                <tr><th className="w-[55%] px-4 py-2.5 font-semibold">Location name</th><th className="w-[28%] px-3 py-2.5 font-semibold">Usage</th><th className="w-[17%] px-3 py-2.5 text-right font-semibold">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {!rows.length && <tr><td colSpan={3} className="px-4 py-14 text-center text-slate-400"><MapPin className="mx-auto mb-2 h-8 w-8 opacity-30" />{data.length ? 'No locations match the filters.' : 'No event locations yet.'}</td></tr>}
                <AnimatePresence initial={false}>
                  {rows.map((item, i) => (
                    <motion.tr key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2"><div className="flex items-center gap-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><MapPin className="h-3.5 w-3.5" /></span><div className="min-w-0"><p title={item.name} className="truncate font-medium text-slate-800 dark:text-slate-200">{item.name}</p><p className="text-[10px] text-slate-400">#{item.id}</p></div></div></td>
                      <td className="px-3 py-2 text-[10px]">
                        {!isUsed(item) ? <span className="text-slate-400">Unused</span> : (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            {!item.can_delete && <LockKeyhole className="h-3 w-3 shrink-0 text-slate-400" />}
                            <InlineHelp summary={`${item.usage_locked + item.usage_draft} plan ${item.usage_locked + item.usage_draft === 1 ? 'item' : 'items'}`} label={`Usage of ${item.name}`}>
                              {item.usage_locked > 0 ? `${item.usage_locked} item(s) in submitted, approved or rejected plans — the location is locked from deletion to keep history.` : ''}
                              {item.usage_draft > 0 ? ` ${item.usage_draft} item(s) in Draft plans — the reference is cleared if the location is deleted.` : ''}
                            </InlineHelp>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {canWrite ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <button type="button" title={`Edit ${item.name}`} onClick={() => openForm(item)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                            <span title={item.can_delete ? `Delete ${item.name}` : 'Used in non-draft plans — cannot be deleted'}><button type="button" aria-label={`Delete ${item.name}`} disabled={!item.can_delete} onClick={() => { setDeleteTarget(item); setDeleteError(null); }} className={`${actionClass} enabled:hover:bg-rose-50 enabled:hover:text-rose-600 dark:enabled:hover:bg-rose-500/10`}><Trash2 className="h-3.5 w-3.5" /></button></span>
                          </div>
                        ) : <span className="block text-right text-[10px] text-slate-400">View only</span>}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
          <label className="flex items-center gap-2">Rows per page
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select>
          </label>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)}` : '0'} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-10 text-center tabular-nums">{currentPage} / {totalPages}</span>
              <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Form modal */}
      <AnimatePresence>
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDrawer(false)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.form onSubmit={handleSubmit} initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{editingItem ? 'Edit event location' : 'Add event location'}</h3><p className="mt-0.5 text-[11px] text-slate-400">Names are compared case-insensitively.</p></div>
                <button type="button" aria-label="Close" onClick={() => setShowDrawer(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <div>
                <label htmlFor="eventloc-name" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Location name *</label>
                <input id="eventloc-name" autoFocus maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The St. Regis Jakarta, Mall Gandaria City" className={`h-9 w-full rounded-lg border bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/10 dark:bg-slate-950 dark:text-slate-100 ${duplicate ? 'border-amber-400' : 'border-slate-200 focus:border-blue-400 dark:border-slate-700'}`} />
                {duplicate && <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">Location “{duplicate.name}” already exists.</p>}
                {editingItem && isUsed(editingItem) && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">Used in {editingItem.usage_locked + editingItem.usage_draft} plan item(s); the new name will show on those plans.</p>}
              </div>
              {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{formError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowDrawer(false)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting || !name.trim() || !!duplicate} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><Trash2 className="h-5 w-5" /></span>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Delete event location?</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">“{deleteTarget.name}” will be deleted permanently.{deleteTarget.usage_draft > 0 && ` Its reference on ${deleteTarget.usage_draft} Draft plan item(s) will be cleared.`}</p>
              </div>
              {deleteError && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{deleteError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="button" onClick={handleDeleteConfirm} disabled={submitting} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer">{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
