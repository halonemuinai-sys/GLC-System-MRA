'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Edit3, Trash2, Power, Loader2, AlertTriangle, RefreshCw, LockKeyhole, Check, Network, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';

export const SECTORS = [['GENERAL', 'General (holding)'], ['RETAIL', 'Retail'], ['FB', 'Food & beverage'], ['MEDIA', 'Media'], ['RADIO', 'Radio']];
const SECTOR_LABEL = Object.fromEntries(SECTORS);
const SECTOR_TONE = {
  GENERAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  RETAIL: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  FB: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  MEDIA: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  RADIO: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
};
const SectorPill = ({ sector }) => <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${SECTOR_TONE[sector] || 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{SECTOR_LABEL[sector] || sector || '—'}</span>;

const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
const labelClass = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';

function Notice({ notice, error, onRetry }) {
  return (
    <>
      <AnimatePresence>
        {notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</motion.div>}
      </AnimatePresence>
      {error && <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span>{onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Try again</button>}</div>}
    </>
  );
}

function ConfirmModal({ open, tone = 'rose', icon: Icon, title, body, actionLabel, busy, error, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onCancel()} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'rose' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}><Icon className="h-5 w-5" /></span>
            <div><h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{body}</p></div>
            {error && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={onCancel} disabled={busy} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
              <button type="button" onClick={onConfirm} disabled={busy} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 cursor-pointer ${tone === 'rose' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'}`}>{busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{actionLabel}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Holdings ────────────────────────────────────────────────────────────────
export function CompanyHoldingsPanel({ masters, loading, onChanged, canWrite }) {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', sector: 'GENERAL' });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [notice, setNotice] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return masters.filter(m => (!sector || m.sector === sector) && (!q || m.name.toLowerCase().includes(q)));
  }, [masters, search, sector]);
  const duplicate = useMemo(() => {
    const n = form.name.trim().toLowerCase();
    return n ? masters.find(m => m.name.toLowerCase() === n && m.id !== editing?.id) : null;
  }, [form.name, masters, editing]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };
  const openForm = (m = null) => { setEditing(m); setForm(m ? { name: m.name, sector: m.sector } : { name: '', sector: 'GENERAL' }); setFormError(null); setFormOpen(true); };
  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim() || duplicate) return;
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await apiClient.put(`/api/master/companies/master/${editing.id}`, form);
      else await apiClient.post('/api/master/companies/master', form);
      setFormOpen(false);
      flash(editing ? 'Holding updated.' : 'Holding created.');
      onChanged();
    } catch (err) {
      setFormError(err.message || 'Failed to save holding.');
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    setConfirmError(null);
    try {
      await apiClient.delete(`/api/master/companies/master/${target.id}`);
      flash(`${target.name} deleted.`);
      setTarget(null);
      onChanged();
    } catch (err) {
      setConfirmError(err.message || 'Failed to delete holding.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      <Notice notice={notice} />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="relative min-w-48 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search holdings" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search holding..." className={`${fieldClass} w-full bg-slate-50 pl-9 pr-9 dark:bg-slate-950`} />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select aria-label="Filter by sector" value={sector} onChange={e => setSector(e.target.value)} className={fieldClass}><option value="">All sectors</option>{SECTORS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
          <span aria-live="polite" className="text-[11px] text-slate-400">{rows.length} holdings</span>
          {canWrite && <button type="button" onClick={() => openForm()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Plus className="h-3.5 w-3.5" />Add holding</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] table-fixed text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
              <tr><th className="w-[34%] px-4 py-2.5 font-semibold">Holding</th><th className="w-[16%] px-3 py-2.5 font-semibold">Sector</th><th className="w-[12%] px-3 py-2.5 font-semibold">Companies</th><th className="w-[12%] px-3 py-2.5 font-semibold">Locations</th><th className="w-[14%] px-3 py-2.5 font-semibold"><InlineHelp summary="Contacts" label="About contacts"><span className="normal-case tracking-normal">Holding-level approval recipients (Approval Settings). Deleting a holding would remove them, so holdings with contacts are locked.</span></InlineHelp></th><th className="w-[12%] px-3 py-2.5 text-right font-semibold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading && !masters.length && <tr><td colSpan={6} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-500" /></td></tr>}
              {!loading && !rows.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-400"><Network className="mx-auto mb-2 h-8 w-8 opacity-30" />{masters.length ? 'No holdings match the filters.' : 'No holdings yet.'}</td></tr>}
              {rows.map((m, i) => (
                <motion.tr key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-2"><p title={m.name} className="truncate font-medium text-slate-800 dark:text-slate-200">{m.name}</p>{m.can_delete && <p className="text-[10px] text-amber-600 dark:text-amber-400">Empty — nothing attached</p>}</td>
                  <td className="px-3 py-2"><SectorPill sector={m.sector} /></td>
                  <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{m.company_count}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{m.branch_count}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{m.contact_count}</td>
                  <td className="px-3 py-1.5">{canWrite && <div className="flex items-center justify-end gap-0.5">
                    <button type="button" title={`Edit ${m.name}`} onClick={() => openForm(m)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                    <span title={m.can_delete ? `Delete ${m.name}` : 'Has companies, locations or contacts attached'}><button type="button" aria-label={`Delete ${m.name}`} disabled={!m.can_delete} onClick={() => { setTarget(m); setConfirmError(null); }} className={`${actionClass} enabled:hover:bg-rose-50 enabled:hover:text-rose-600 dark:enabled:hover:bg-rose-500/10`}>{m.can_delete ? <Trash2 className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}</button></span>
                  </div>}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setFormOpen(false)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.form onSubmit={submit} initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{editing ? 'Edit holding' : 'Add holding'}</h3><p className="mt-0.5 text-[11px] text-slate-400">Changing the sector also updates this holding’s locations.</p></div><button type="button" aria-label="Close" onClick={() => setFormOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button></div>
              <div><label htmlFor="h-name" className={labelClass}>Holding name *</label><input id="h-name" autoFocus maxLength={150} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`${inputClass} ${duplicate ? 'border-amber-400' : ''}`} />{duplicate && <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">“{duplicate.name}” already exists.</p>}</div>
              <div><label htmlFor="h-sector" className={labelClass}>Sector *</label><select id="h-sector" value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className={inputClass}>{SECTORS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
              {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{formError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormOpen(false)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving || !form.name.trim() || !!duplicate} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal open={!!target} icon={Trash2} title="Delete holding?" body={target ? `“${target.name}” has nothing attached and will be removed permanently.` : ''} actionLabel="Delete" busy={busy} error={confirmError} onCancel={() => setTarget(null)} onConfirm={remove} />
    </motion.div>
  );
}

// ─── Locations ───────────────────────────────────────────────────────────────
const STATUS_FILTERS = [['', 'All'], ['true', 'Active'], ['false', 'Inactive']];

export function CompanyLocationsPanel({ branches, masters, loading, error, onReload, onChanged, canWrite }) {
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [status, setStatus] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', location: '', sector: 'GENERAL', company_master_id: '' });
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState(null);
  const [notice, setNotice] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter(b =>
      (!sector || b.sector === sector) &&
      (status === '' || String(b.is_active !== false) === status) &&
      (!q || [b.name, b.location, b.m_company_master?.name].some(v => String(v || '').toLowerCase().includes(q)))
    );
  }, [branches, search, sector, status]);
  const selectedHolding = masters.find(m => String(m.id) === String(form.company_master_id));
  const duplicate = useMemo(() => {
    const n = form.name.trim().toLowerCase();
    const l = form.location.trim().toLowerCase();
    return n && l ? branches.find(b => b.name.toLowerCase() === n && b.location.toLowerCase() === l && b.id !== editing?.id) : null;
  }, [form.name, form.location, branches, editing]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };
  const openForm = (b = null) => {
    setEditing(b);
    setForm(b ? { name: b.name, location: b.location, sector: b.sector, company_master_id: b.company_master_id ? String(b.company_master_id) : '' } : { name: '', location: '', sector: 'GENERAL', company_master_id: '' });
    setFormError(null);
    setFormOpen(true);
  };
  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.location.trim() || duplicate) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form, company_master_id: form.company_master_id ? Number(form.company_master_id) : null };
      if (editing) await apiClient.put(`/api/master/companies/branch/${editing.id}`, payload);
      else await apiClient.post('/api/master/companies/branch', payload);
      setFormOpen(false);
      flash(editing ? 'Location updated.' : 'Location created.');
      onChanged();
    } catch (err) {
      setFormError(err.message || 'Failed to save location.');
    } finally {
      setSaving(false);
    }
  };
  const runConfirm = async () => {
    const { type, branch } = confirm;
    setBusy(true);
    setConfirmError(null);
    try {
      if (type === 'delete') await apiClient.delete(`/api/master/companies/branch/${branch.id}`);
      else await apiClient.put(`/api/master/companies/branch/${branch.id}`, { is_active: branch.is_active === false });
      flash(type === 'delete' ? 'Location deleted.' : `Location ${branch.is_active === false ? 'activated' : 'deactivated'}.`);
      setConfirm(null);
      onChanged();
    } catch (err) {
      setConfirmError(err.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      <Notice notice={notice} error={error} onRetry={onReload} />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="relative min-w-48 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search locations" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company, location, or holding..." className={`${fieldClass} w-full bg-slate-50 pl-9 pr-9 dark:bg-slate-950`} />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select aria-label="Filter by sector" value={sector} onChange={e => setSector(e.target.value)} className={fieldClass}><option value="">All sectors</option>{SECTORS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
          <div className="flex gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {STATUS_FILTERS.map(([key, text]) => (
              <button key={key || 'all'} type="button" aria-pressed={status === key} onClick={() => setStatus(key)} className={`relative rounded-md px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${status === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                {status === key && <motion.span layoutId="location-status-filter" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                <span className="relative">{text}</span>
              </button>
            ))}
          </div>
          <span aria-live="polite" className="text-[11px] text-slate-400">{rows.length} locations</span>
          {canWrite && <button type="button" onClick={() => openForm()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Plus className="h-3.5 w-3.5" />Add location</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
              <tr><th className="w-[22%] px-4 py-2.5 font-semibold">Company</th><th className="w-[20%] px-3 py-2.5 font-semibold">Location</th><th className="w-[13%] px-3 py-2.5 font-semibold">Sector</th><th className="w-[16%] px-3 py-2.5 font-semibold">Holding</th><th className="w-[13%] px-3 py-2.5 font-semibold"><InlineHelp summary="Usage" label="About location usage"><span className="normal-case tracking-normal">Assets, maintenance records and IT rentals placed at this location. Used locations cannot be deleted — deactivate them instead.</span></InlineHelp></th><th className="w-[8%] px-3 py-2.5 font-semibold">Status</th><th className="w-[8%] px-3 py-2.5 text-right font-semibold">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading && !branches.length && <tr><td colSpan={7} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-500" /></td></tr>}
              {!loading && !rows.length && <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400"><MapPin className="mx-auto mb-2 h-8 w-8 opacity-30" />{branches.length ? 'No locations match the filters.' : 'No locations yet.'}</td></tr>}
              {rows.map((b, i) => (
                <motion.tr key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }} className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${b.is_active === false ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-2"><p title={b.name} className="truncate font-medium text-slate-800 dark:text-slate-200">{b.name}</p></td>
                  <td className="px-3 py-2"><p title={b.location} className="truncate text-slate-600 dark:text-slate-300">{b.location}</p></td>
                  <td className="px-3 py-2"><SectorPill sector={b.sector} /></td>
                  <td className="px-3 py-2"><p className="truncate text-slate-500 dark:text-slate-400">{b.m_company_master?.name || '—'}</p></td>
                  <td className="px-3 py-2 text-[11px]">{b.usage_total ? <span title={`${b.asset_count} assets · ${b.maintenance_count} maintenance · ${b.rental_count} IT rentals`} className="inline-flex items-center gap-1 tabular-nums text-slate-600 dark:text-slate-300"><LockKeyhole className="h-3 w-3 text-slate-400" />{b.asset_count} assets{b.maintenance_count + b.rental_count ? ` +${b.maintenance_count + b.rental_count}` : ''}</span> : <span className="text-slate-400">Unused</span>}</td>
                  <td className="px-3 py-2">{b.is_active !== false ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><span className="h-1 w-1 rounded-full bg-current" />Active</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><span className="h-1 w-1 rounded-full bg-current" />Off</span>}</td>
                  <td className="px-3 py-1.5">{canWrite && <div className="flex items-center justify-end gap-0.5">
                    <button type="button" title={`Edit ${b.name}`} onClick={() => openForm(b)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                    <button type="button" title={b.is_active === false ? 'Activate' : 'Deactivate'} onClick={() => { setConfirm({ type: 'status', branch: b }); setConfirmError(null); }} className={`${actionClass} hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10`}><Power className="h-3.5 w-3.5" /></button>
                    <span title={b.can_delete ? 'Delete' : 'Used by assets/maintenance/rentals — deactivate instead'}><button type="button" aria-label={`Delete ${b.name}`} disabled={!b.can_delete} onClick={() => { setConfirm({ type: 'delete', branch: b }); setConfirmError(null); }} className={`${actionClass} enabled:hover:bg-rose-50 enabled:hover:text-rose-600 dark:enabled:hover:bg-rose-500/10`}><Trash2 className="h-3.5 w-3.5" /></button></span>
                  </div>}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setFormOpen(false)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.form onSubmit={submit} initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{editing ? 'Edit location' : 'Add location'}</h3><p className="mt-0.5 text-[11px] text-slate-400">Physical site used for assets, maintenance and IT rentals.</p></div><button type="button" aria-label="Close" onClick={() => setFormOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button></div>
              <div><label htmlFor="b-name" className={labelClass}>Company name *</label><input id="b-name" autoFocus maxLength={150} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mogems" className={inputClass} /></div>
              <div><label htmlFor="b-location" className={labelClass}>Location / branch *</label><input id="b-location" maxLength={200} value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Plaza Indonesia" className={`${inputClass} ${duplicate ? 'border-amber-400' : ''}`} />{duplicate && <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">This company and location already exist.</p>}</div>
              <div><label htmlFor="b-holding" className={labelClass}>Holding</label><select id="b-holding" value={form.company_master_id} onChange={e => setForm(f => ({ ...f, company_master_id: e.target.value }))} className={inputClass}><option value="">— No holding —</option>{masters.map(m => <option key={m.id} value={m.id}>{m.name} · {m.sector}</option>)}</select></div>
              <div>
                <label htmlFor="b-sector" className={labelClass}>Sector *</label>
                <select id="b-sector" value={selectedHolding ? selectedHolding.sector : form.sector} disabled={!!selectedHolding} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} className={`${inputClass} disabled:opacity-60`}>{SECTORS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
                {selectedHolding && <p className="mt-1 text-[10px] text-slate-400">Follows the holding’s sector.</p>}
              </div>
              {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{formError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setFormOpen(false)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving || !form.name.trim() || !form.location.trim() || !!duplicate} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!confirm}
        tone={confirm?.type === 'delete' ? 'rose' : 'amber'}
        icon={confirm?.type === 'delete' ? Trash2 : Power}
        title={confirm?.type === 'delete' ? 'Delete location?' : confirm?.branch.is_active === false ? 'Activate location?' : 'Deactivate location?'}
        body={confirm ? (confirm.type === 'delete' ? `“${confirm.branch.name} — ${confirm.branch.location}” will be removed permanently.` : `“${confirm.branch.name} — ${confirm.branch.location}” ${confirm.branch.is_active === false ? 'becomes selectable again.' : 'is hidden from new records; existing records keep it.'}`) : ''}
        actionLabel={confirm?.type === 'delete' ? 'Delete' : confirm?.branch.is_active === false ? 'Activate' : 'Deactivate'}
        busy={busy}
        error={confirmError}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
    </motion.div>
  );
}
