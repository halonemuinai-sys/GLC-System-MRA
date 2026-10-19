'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Search, X, Plus, Edit3, Trash2, Eye, ExternalLink, ChevronLeft, ChevronRight, RefreshCw, Database, Loader2, AlertTriangle, CalendarClock, Wallet } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getUserRoles, canAccess } from '@/lib/userRoles';
import InlineHelp from '@/components/ui/InlineHelp';
import SearchableSelect from '@/components/ui/SearchableSelect';
import {
  InsuranceDetailDrawer, InsuranceFormDrawer, DeleteInsuranceModal, StatePill, LineIcon,
  formatIDR, formatUSD, formatDate, premiumText, insuredObject, daysLeft
} from './GaInsuranceDrawers';

const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
const STATE_FILTERS = [['', 'All'], ['active', 'Active'], ['expiring', 'Expiring'], ['expired', 'Expired'], ['inactive', 'Inactive']];
const EMPTY_OPTIONS = { types: [], coverages: [], insurers: [] };

// Short money for KPI cards: B / M / K.
const compactIDR = (v) => {
  const n = Number(v || 0);
  if (n >= 1e9) return `Rp ${(n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })} B`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 })} M`;
  return formatIDR(n);
};

function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-US') }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.8, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{format(display)}</>;
}

export default function GaInsurancesPage() {
  const searchParams = useSearchParams();
  const [roles, setRoles] = useState([]);
  const canWrite = canAccess(roles, ['ga', 'legal', 'legal_compliance']);

  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [summary, setSummary] = useState(null);
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [companies, setCompanies] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [state, setState] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [detail, setDetail] = useState(null);
  const [formTarget, setFormTarget] = useState(null); // null closed, {} new, {insurance} edit
  const [toDelete, setToDelete] = useState(null);
  const deepLinkOpened = useRef(false);

  useEffect(() => { setRoles(getUserRoles()); }, []);

  // Debounced server search.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/legal/insurances', { params: { page, limit: pageSize, search: search || undefined, state: state || undefined, companyId: companyId || undefined, type: lineFilter || undefined } });
      setRows(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, totalPages: 1 });
      setSummary(res.summary || null);
      setOptions(res.options || EMPTY_OPTIONS);
      const linked = searchParams.get('search');
      if (linked && !deepLinkOpened.current && res.data?.length === 1) { deepLinkOpened.current = true; setDetail(res.data[0]); }
    } catch (err) {
      setError(err.message || 'Failed to load insurance policies.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, state, companyId, lineFilter, searchParams]);

  const loadLookups = useCallback(async () => {
    const [comps, vehs] = await Promise.all([
      apiClient.get('/api/master/companies/all').catch(() => []),
      apiClient.get('/api/legal/insurances/vehicle-options').catch(() => []),
    ]);
    setCompanies(Array.isArray(comps) ? comps : comps?.data || []);
    setVehicles(Array.isArray(vehs) ? vehs : []);
  }, []);

  // Reload when filters change, but only after the first Load data.
  useEffect(() => { if (processed) load(); }, [processed, load]);

  // A link with ?search= (from notifications / dashboard) loads straight away.
  useEffect(() => {
    const linked = searchParams.get('search');
    if (linked) { setSearchInput(linked); setSearch(linked); setProcessed(true); loadLookups(); }
  }, [searchParams, loadLookups]);

  const handleProcess = () => { setProcessed(true); loadLookups(); };
  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };
  const resetFilters = () => { setSearchInput(''); setSearch(''); setState(''); setCompanyId(''); setLineFilter(''); setPage(1); };
  const filtered = !!(search || state || companyId || lineFilter);

  const byState = summary?.byState || {};
  const cards = summary ? [
    { name: 'Policies in force', help: 'Active policies whose end date has not passed, including those ending within 30 days.', value: summary.activeCount, sub: `${summary.totalCount} policies · ${summary.uniqueCompaniesCount} ${summary.uniqueCompaniesCount === 1 ? 'company' : 'companies'}`, icon: ShieldCheck, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { name: 'Expiring in 30 days', help: 'Renew these soon. Policies set to Inactive are not counted.', value: summary.expiringCount, sub: summary.expiringCount ? 'Plan the renewal' : 'Nothing due this month', icon: CalendarClock, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { name: 'Expired', help: 'Still marked Active but the end date has passed. Record the renewal or set the policy to Inactive.', value: summary.expiredCount, sub: summary.expiredCount ? 'Needs follow-up' : 'All up to date', icon: ShieldAlert, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
    { name: 'Premium in force', help: 'Total premium of policies in force for the current filter. IDR and USD are shown separately.', value: summary.totalPremiumIdr, money: true, sub: summary.totalPremiumUsd > 0 ? `+ ${formatUSD(summary.totalPremiumUsd)}` : `Sum insured ${compactIDR(summary.totalCoverageIdr)}`, icon: Wallet, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  ] : [];

  const start = (meta.page - 1) * pageSize;
  const lineOptions = options.types.map(t => ({ id: t, name: t }));

  return (
    <div className="space-y-5 pb-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><ShieldCheck className="h-4 w-4" />General Affairs · Legal</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Insurance Policies</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Policies for buildings, inventory, vehicles and liability across the group, with renewal dates in one place.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {processed && (
              <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-60 cursor-pointer">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Reload
              </button>
            )}
            {canWrite && (
              <button type="button" onClick={() => { if (!companies.length) loadLookups(); setFormTarget({}); }} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 hover:bg-blue-50 cursor-pointer">
                <Plus className="h-4 w-4" />Add policy
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {notice && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</motion.p>}
      </AnimatePresence>

      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Database className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load insurance policies</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Click Load data to see every policy, renewal dates and premiums. Filters apply right away afterwards.</p>
          <button type="button" onClick={handleProcess} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Database className="h-3.5 w-3.5" />Load data</button>
        </motion.div>
      ) : (
        <>
          {/* KPI */}
          {summary && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(({ name, help, value, money, sub, icon: Icon, tone }, i) => (
                <motion.div key={name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <div className="-my-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><InlineHelp summary={name} label={`About ${name}`}><span className="normal-case tracking-normal">{help}</span></InlineHelp></div>
                    <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100"><CountUp value={value} format={money ? compactIDR : undefined} /></p>
                    <p className="truncate text-[10px] text-slate-400">{sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" />{error}</span>
              <button type="button" onClick={load} className="font-semibold underline cursor-pointer">Try again</button>
            </div>
          )}

          {/* List */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
              <div className="relative min-w-56 flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input aria-label="Search policies" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search policy no., insurer, company, broker, PIC..." className={`${fieldClass} w-full bg-slate-50 pl-9 pr-9 dark:bg-slate-950`} />
                {searchInput && <button type="button" aria-label="Clear search" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <div className="w-56"><SearchableSelect value={companyId} onChange={(id) => { setCompanyId(id ? String(id) : ''); setPage(1); }} options={companies} placeholder="All companies" allOptionLabel="All companies" searchPlaceholder="Type to search..." emptyText="No company found" /></div>
              <div className="w-48"><SearchableSelect value={lineFilter} onChange={(id) => { setLineFilter(id || ''); setPage(1); }} options={lineOptions} placeholder="All lines" allOptionLabel="All lines" searchPlaceholder="Type to search..." emptyText="No line found" /></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
              <div className="flex flex-wrap gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                {STATE_FILTERS.map(([key, text]) => {
                  const count = key ? byState[key] : summary?.totalCount;
                  return (
                    <button key={key || 'all'} type="button" aria-pressed={state === key} onClick={() => { setState(key); setPage(1); }} className={`relative rounded-md px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${state === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                      {state === key && <motion.span layoutId="insurance-state" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                      <span className="relative">{text} <span className={state === key ? 'opacity-70' : key === 'expired' && count ? 'text-rose-500' : 'text-slate-400'}>{count ?? 0}</span></span>
                    </button>
                  );
                })}
              </div>
              <span aria-live="polite" className="flex items-center gap-2 text-[11px] text-slate-400">
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                {meta.total} {meta.total === 1 ? 'policy' : 'policies'}
                {filtered && <button type="button" onClick={resetFilters} className="text-blue-600 hover:underline dark:text-blue-400 cursor-pointer">Reset filters</button>}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] table-fixed text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                  <tr>
                    <th className="w-[21%] px-4 py-2.5 font-semibold">Policy</th>
                    <th className="w-[15%] px-3 py-2.5 font-semibold">Company</th>
                    <th className="w-[15%] px-3 py-2.5 font-semibold">Line / Coverage</th>
                    <th className="w-[14%] px-3 py-2.5 font-semibold">Insured object</th>
                    <th className="w-[11%] px-3 py-2.5 text-right font-semibold">Premium</th>
                    <th className="w-[12%] px-3 py-2.5 font-semibold"><InlineHelp summary="Period" label="About the period">Policies are sorted by end date, soonest first. Expiring = ends within 30 days.</InlineHelp></th>
                    <th className="w-[12%] px-3 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {!loading && !rows.length && (
                    <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400">
                      {filtered ? <>No policy matches these filters. <button type="button" onClick={resetFilters} className="text-blue-600 hover:underline cursor-pointer">Reset filters</button></> : 'No insurance policy yet.'}
                    </td></tr>
                  )}
                  {loading && !rows.length && <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
                  <AnimatePresence initial={false}>
                    {rows.map((ins, i) => {
                      const left = daysLeft(ins.end_date);
                      return (
                        <motion.tr key={ins.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }} className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${loading ? 'opacity-60' : ''}`}>
                          <td className="px-4 py-2.5">
                            <button type="button" onClick={() => setDetail(ins)} className="block max-w-full text-left cursor-pointer">
                              <p title={ins.policy_number} className="truncate font-mono font-medium text-slate-800 hover:text-blue-600 dark:text-slate-200">{ins.policy_number}</p>
                              <p title={ins.insurance_company} className="truncate text-[10px] text-slate-400">{ins.insurance_company}</p>
                            </button>
                          </td>
                          <td className="px-3 py-2.5"><p title={ins.m_company?.name} className="truncate text-slate-600 dark:text-slate-300">{ins.m_company?.name || '—'}</p></td>
                          <td className="px-3 py-2.5">
                            <p className="flex items-center gap-1.5 truncate text-slate-700 dark:text-slate-200"><LineIcon ins={ins} className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate" title={ins.insurance_type}>{ins.insurance_type || '—'}</span></p>
                            {ins.category && <p title={ins.category} className="truncate pl-5 text-[10px] text-slate-400">{ins.category}</p>}
                          </td>
                          <td className="px-3 py-2.5"><p title={insuredObject(ins)} className="truncate text-slate-600 dark:text-slate-300">{insuredObject(ins) || <span className="text-slate-300 dark:text-slate-600">—</span>}</p></td>
                          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{premiumText(ins)}</td>
                          <td className="px-3 py-2.5">
                            <p className="tabular-nums text-slate-600 dark:text-slate-300">{formatDate(ins.end_date)}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <StatePill state={ins.state} />
                              {left !== null && ['active', 'expiring'].includes(ins.state) && left <= 60 && <span className="text-[10px] tabular-nums text-slate-400">{left}d</span>}
                            </div>
                          </td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-end gap-0.5">
                              {ins.doc_url && <a href={ins.doc_url} target="_blank" rel="noopener noreferrer" title="Open policy document" aria-label={`Open document of ${ins.policy_number}`} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><ExternalLink className="h-3.5 w-3.5" /></a>}
                              <button type="button" title="View details" aria-label={`View ${ins.policy_number}`} onClick={() => setDetail(ins)} className={`${actionClass} hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800`}><Eye className="h-3.5 w-3.5" /></button>
                              {canWrite && <>
                                <button type="button" title="Edit policy" aria-label={`Edit ${ins.policy_number}`} onClick={() => setFormTarget({ insurance: ins })} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                                <button type="button" title="Delete policy" aria-label={`Delete ${ins.policy_number}`} onClick={() => setToDelete(ins)} className={`${actionClass} hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10`}><Trash2 className="h-3.5 w-3.5" /></button>
                              </>}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
              <label className="flex items-center gap-2">Rows per page
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}</select>
              </label>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{meta.total ? `${start + 1}–${Math.min(start + pageSize, meta.total)}` : '0'} of {meta.total}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Previous page" disabled={meta.page <= 1 || loading} onClick={() => setPage(meta.page - 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-10 text-center tabular-nums">{meta.page} / {meta.totalPages}</span>
                  <button type="button" aria-label="Next page" disabled={meta.page >= meta.totalPages || loading} onClick={() => setPage(meta.page + 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {detail && (
          <InsuranceDetailDrawer
            key="detail"
            insurance={detail}
            canWrite={canWrite}
            onClose={() => setDetail(null)}
            onEdit={() => { setFormTarget({ insurance: detail }); setDetail(null); }}
            onDelete={() => setToDelete(detail)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formTarget && (
          <InsuranceFormDrawer
            key="form"
            insurance={formTarget.insurance}
            companies={companies}
            vehicles={vehicles}
            options={options}
            onClose={() => setFormTarget(null)}
            onSaved={(saved, editing) => {
              setFormTarget(null);
              flash(editing ? `Policy ${saved.policy_number} updated.` : `Policy ${saved.policy_number} added.`);
              if (processed) load(); else handleProcess();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toDelete && (
          <DeleteInsuranceModal
            key="delete"
            insurance={toDelete}
            onClose={() => setToDelete(null)}
            onDeleted={(ins) => {
              setToDelete(null);
              if (detail?.id === ins.id) setDetail(null);
              flash(`Policy ${ins.policy_number} deleted.`);
              if (rows.length === 1 && page > 1) setPage(page - 1); else load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
