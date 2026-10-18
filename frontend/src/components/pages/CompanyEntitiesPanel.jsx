'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Search, X, Plus, Edit3, Trash2, Power, Loader2, ChevronLeft, ChevronRight,
  AlertTriangle, RefreshCw, Eye, LockKeyhole, Check, MapPin, Hash, Calendar
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';

const STATUS_FILTERS = [['', 'All'], ['true', 'Active'], ['false', 'Inactive']];
const EMPTY = { code: '', name: '', npwp: '', address: '', company_master_id: '' };
const npwpDigits = (v) => String(v || '').replace(/\D/g, '').length;

// Legal entities (PT): list, create/edit, activate/deactivate, delete when unused.
export default function CompanyEntitiesPanel({ masters, onChanged, canWrite }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [holding, setHolding] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirm, setConfirm] = useState(null); // { type: 'delete' | 'status', company }
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };

  useEffect(() => {
    const h = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(h);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/master/companies', { params: { page, limit: pageSize, search: search || undefined, is_active: status || undefined, holding: holding || undefined } });
      setRows(res?.data || []);
      setMeta(res?.meta || { total: 0, page: 1, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load companies.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, holding]);

  useEffect(() => { load(); }, [load]);

  const refreshAll = () => { load(); onChanged?.(); };

  const openForm = (company = null) => {
    setEditing(company);
    setForm(company ? { code: company.code || '', name: company.name || '', npwp: company.npwp || '', address: company.address || '', company_master_id: company.company_master_id ? String(company.company_master_id) : '' } : EMPTY);
    setFormError(null);
    setFormOpen(true);
  };

  const npwpInvalid = form.npwp.trim() && ![15, 16].includes(npwpDigits(form.npwp));
  const canSave = form.name.trim() && !npwpInvalid && !saving;

  const submitForm = async (e) => {
    e?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, company_master_id: form.company_master_id ? Number(form.company_master_id) : null };
      if (editing) await apiClient.put(`/api/master/companies/${editing.id}`, payload);
      else await apiClient.post('/api/master/companies', payload);
      setFormOpen(false);
      flash(editing ? 'Company updated.' : 'Company created.');
      refreshAll();
    } catch (err) {
      setFormError(err.message || 'Failed to save company.');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (company) => {
    setDetail({ ...company, usage: null });
    setDetailLoading(true);
    try {
      setDetail(await apiClient.get(`/api/master/companies/${company.id}`));
    } catch {
      // keep the basic row data
    } finally {
      setDetailLoading(false);
    }
  };

  const runConfirm = async () => {
    const { type, company } = confirm;
    setBusy(true);
    setConfirmError(null);
    try {
      if (type === 'delete') await apiClient.delete(`/api/master/companies/${company.id}`);
      else await apiClient.put(`/api/master/companies/${company.id}`, { is_active: !company.is_active });
      flash(type === 'delete' ? `${company.name} deleted.` : `${company.name} ${company.is_active ? 'deactivated' : 'activated'}.`);
      setConfirm(null);
      setDetail(null);
      refreshAll();
    } catch (err) {
      setConfirmError(err.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const holdingName = useMemo(() => Object.fromEntries(masters.map(m => [m.id, m.name])), [masters]);
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
  const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
  const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';
  const start = meta.total ? (meta.page - 1) * pageSize + 1 : 0;
  const hasFilter = Boolean(search || status || holding);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      <AnimatePresence>
        {notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</motion.div>}
      </AnimatePresence>
      {error && <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="relative min-w-48 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search companies" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search name, code, or NPWP..." className={`${fieldClass} w-full bg-slate-50 pl-9 pr-9 dark:bg-slate-950`} />
            {searchInput && <button type="button" aria-label="Clear search" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select aria-label="Filter by holding" value={holding} onChange={e => { setHolding(e.target.value); setPage(1); }} className={`${fieldClass} max-w-56`}>
            <option value="">All holdings</option>
            <option value="none">No holding</option>
            {masters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="flex gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {STATUS_FILTERS.map(([key, text]) => (
              <button key={key || 'all'} type="button" aria-pressed={status === key} onClick={() => { setStatus(key); setPage(1); }} className={`relative rounded-md px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${status === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                {status === key && <motion.span layoutId="company-status-filter" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                <span className="relative">{text}</span>
              </button>
            ))}
          </div>
          <button type="button" aria-label="Reload" onClick={load} disabled={loading} className={`${actionClass} border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800`}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          {canWrite && <button type="button" onClick={() => openForm()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Plus className="h-3.5 w-3.5" />Add company</button>}
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full min-w-[920px] table-fixed text-left text-xs transition-opacity ${loading ? 'opacity-60' : ''}`}>
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <th className="w-[11%] px-4 py-2.5 font-semibold">Code</th>
                <th className="w-[29%] px-3 py-2.5 font-semibold">Company</th>
                <th className="w-[20%] px-3 py-2.5 font-semibold">Holding</th>
                <th className="w-[14%] px-3 py-2.5 font-semibold"><InlineHelp summary="Usage" label="About usage"><span className="normal-case tracking-normal">Number of records across all modules (assets, budgets, documents, plans, user access, ...) that reference this company. Used companies cannot be deleted — deactivate them instead.</span></InlineHelp></th>
                <th className="w-[11%] px-3 py-2.5 font-semibold">Status</th>
                <th className="w-[15%] px-3 py-2.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading && !rows.length && <tr><td colSpan={6} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-500" /></td></tr>}
              {!loading && !rows.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-400"><Building2 className="mx-auto mb-2 h-8 w-8 opacity-30" />{hasFilter ? 'No companies match the filters.' : 'No companies yet.'}</td></tr>}
              <AnimatePresence initial={false}>
                {rows.map((c, i) => (
                  <motion.tr key={c.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }} className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${c.is_active === false ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2"><span title={c.code || ''} className="inline-block max-w-full truncate whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 align-middle font-mono text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">{c.code || '—'}</span></td>
                    <td className="px-3 py-2"><p title={c.name} className="truncate font-medium text-slate-800 dark:text-slate-200">{c.name}</p><p className="truncate text-[10px] text-slate-400">{c.npwp ? `NPWP ${c.npwp}` : 'No NPWP'}</p></td>
                    <td className="px-3 py-2">{c.company_master_id ? <span title={c.m_company_master?.name} className="block truncate text-slate-600 dark:text-slate-300">{c.m_company_master?.name || holdingName[c.company_master_id]}</span> : <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3 w-3" />No holding</span>}</td>
                    <td className="px-3 py-2 text-[11px]">{c.usage_total ? <span className="inline-flex items-center gap-1 tabular-nums text-slate-600 dark:text-slate-300"><LockKeyhole className="h-3 w-3 text-slate-400" />{c.usage_total.toLocaleString('en-US')} {c.usage_total === 1 ? 'record' : 'records'}</span> : <span className="text-slate-400">Unused</span>}</td>
                    <td className="px-3 py-2">{c.is_active !== false ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><span className="h-1 w-1 rounded-full bg-current" />Active</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><span className="h-1 w-1 rounded-full bg-current" />Inactive</span>}</td>
                    <td className="px-3 py-1.5"><div className="flex items-center justify-end gap-0.5">
                      <button type="button" title="View details" onClick={() => openDetail(c)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Eye className="h-3.5 w-3.5" /></button>
                      {canWrite && <>
                        <button type="button" title={`Edit ${c.name}`} onClick={() => openForm(c)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                        <button type="button" title={c.is_active !== false ? `Deactivate ${c.name}` : `Activate ${c.name}`} onClick={() => { setConfirm({ type: 'status', company: c }); setConfirmError(null); }} className={`${actionClass} hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10`}><Power className="h-3.5 w-3.5" /></button>
                        <span title={c.can_delete ? `Delete ${c.name}` : 'Used by other records — deactivate instead'}><button type="button" aria-label={`Delete ${c.name}`} disabled={!c.can_delete} onClick={() => { setConfirm({ type: 'delete', company: c }); setConfirmError(null); }} className={`${actionClass} enabled:hover:bg-rose-50 enabled:hover:text-rose-600 dark:enabled:hover:bg-rose-500/10`}><Trash2 className="h-3.5 w-3.5" /></button></span>
                      </>}
                    </div></td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
          <label className="flex items-center gap-2">Rows per page
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}</select>
          </label>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">{meta.total ? `${start}–${Math.min(meta.page * pageSize, meta.total)}` : '0'} of {meta.total}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-10 text-center tabular-nums">{meta.page} / {meta.totalPages}</span>
              <button type="button" aria-label="Next page" disabled={page >= meta.totalPages} onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Form drawer */}
      <AnimatePresence>
        {formOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setFormOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{editing ? 'Edit company' : 'Add company'}</h3><p className="mt-0.5 text-[11px] text-slate-400">Codes are stored in upper case and must be unique.</p></div>
                <button type="button" aria-label="Close" onClick={() => setFormOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={submitForm} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-3 gap-3">
                  <div><label htmlFor="c-code" className={label}>Code</label><input id="c-code" maxLength={20} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))} placeholder="MRA" className={`${inputClass} font-mono`} /></div>
                  <div className="col-span-2"><label htmlFor="c-name" className={label}>Company name *</label><input id="c-name" autoFocus maxLength={150} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="PT Mugi Rekso Abadi" className={inputClass} /></div>
                </div>
                <div>
                  <label htmlFor="c-npwp" className={label}>NPWP</label>
                  <input id="c-npwp" maxLength={30} value={form.npwp} onChange={e => setForm(f => ({ ...f, npwp: e.target.value }))} placeholder="01.234.567.8-901.000" className={`${inputClass} ${npwpInvalid ? 'border-amber-400' : ''}`} />
                  <p className={`mt-1 text-[10px] ${npwpInvalid ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{npwpInvalid ? `NPWP must contain 15 or 16 digits (now ${npwpDigits(form.npwp)}).` : 'Optional. 15 or 16 digits; dots and dashes are fine.'}</p>
                </div>
                <div>
                  <label htmlFor="c-holding" className={label}>Holding</label>
                  <select id="c-holding" value={form.company_master_id} onChange={e => setForm(f => ({ ...f, company_master_id: e.target.value }))} className={inputClass}>
                    <option value="">— No holding —</option>
                    {masters.map(m => <option key={m.id} value={m.id}>{m.name} · {m.sector}</option>)}
                  </select>
                  {!form.company_master_id && <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">Without a holding, holding-level approval contacts will not apply to this company.</p>}
                </div>
                <div><label htmlFor="c-address" className={label}>Address</label><textarea id="c-address" rows={3} maxLength={1000} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" /></div>
                {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{formError}</div>}
              </form>
              <div className="flex gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                <button type="button" onClick={() => setFormOpen(false)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="button" onClick={submitForm} disabled={!canSave} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Detail drawer */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDetail(null)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="min-w-0"><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">{detail.code || 'No code'}</p><h3 className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{detail.name}</h3><p className="mt-0.5 text-[11px] text-slate-400">{detail.m_company_master?.name || 'No holding'}</p></div>
                <button type="button" aria-label="Close" onClick={() => setDetail(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-xs">
                <div className="space-y-2.5">
                  {[[Hash, 'NPWP', detail.npwp], [MapPin, 'Address', detail.address], [Calendar, 'Registered', detail.created_at ? new Date(detail.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null]].map(([Icon, name, value]) => (
                    <div key={name} className="flex items-start gap-2.5"><Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" /><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{name}</p><p className="mt-0.5 whitespace-pre-wrap text-slate-700 dark:text-slate-200">{value || '—'}</p></div></div>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Used by</p>
                  {detailLoading ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Counting records...</div>
                    : !detail.usage?.length ? <p className="text-slate-400">Not referenced anywhere — this company can be deleted.</p>
                    : (
                      <ul className="space-y-1.5">
                        {[...detail.usage].sort((a, b) => b.count - a.count).map(u => {
                          const max = Math.max(...detail.usage.map(x => x.count));
                          return (
                            <li key={u.key}>
                              <div className="flex justify-between text-[11px]"><span className="text-slate-600 dark:text-slate-300">{u.label}</span><span className="tabular-nums text-slate-500">{u.count.toLocaleString('en-US')}</span></div>
                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><motion.div initial={{ width: 0 }} animate={{ width: `${(u.count / max) * 100}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full bg-blue-600" /></div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                </div>
              </div>
              {canWrite && (
                <div className="flex gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                  <button type="button" onClick={() => { const c = detail; setDetail(null); openForm(c); }} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Edit3 className="h-3.5 w-3.5" />Edit</button>
                  <button type="button" onClick={() => { setConfirm({ type: 'status', company: detail }); setConfirmError(null); }} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"><Power className="h-3.5 w-3.5" />{detail.is_active !== false ? 'Deactivate' : 'Activate'}</button>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Confirm modal */}
      <AnimatePresence>
        {confirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && setConfirm(null)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${confirm.type === 'delete' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>{confirm.type === 'delete' ? <Trash2 className="h-5 w-5" /> : <Power className="h-5 w-5" />}</span>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{confirm.type === 'delete' ? 'Delete company?' : confirm.company.is_active !== false ? 'Deactivate company?' : 'Activate company?'}</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {confirm.type === 'delete' ? `“${confirm.company.name}” will be removed permanently.` : confirm.company.is_active !== false ? `“${confirm.company.name}” disappears from company dropdowns. Existing records stay intact and it can be reactivated.` : `“${confirm.company.name}” becomes selectable again.`}
                </p>
              </div>
              {confirmError && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{confirmError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirm(null)} disabled={busy} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="button" onClick={runConfirm} disabled={busy} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 cursor-pointer ${confirm.type === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{confirm.type === 'delete' ? 'Delete' : confirm.company.is_active !== false ? 'Deactivate' : 'Activate'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
