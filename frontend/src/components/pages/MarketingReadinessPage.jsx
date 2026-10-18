'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  Rocket, RefreshCw, Loader2, AlertTriangle, CheckCircle2, XCircle, CircleAlert, ChevronDown,
  Building2, Search, X, ArrowUpRight, Layers
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];
const STATUS = {
  READY: { label: 'Ready', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' },
  REVIEW: { label: 'Needs review', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' },
  BLOCKED: { label: 'Blocked', cls: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' },
};
const FILTERS = [['', 'All'], ['BLOCKED', 'Blocked'], ['REVIEW', 'Needs review'], ['READY', 'Ready']];
const SCOPE_LABEL = { company: 'Company', holding: 'Group', general: 'General', missing: 'Missing' };

function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.8, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{Math.round(display)}</>;
}

function CheckPill({ check }) {
  const Icon = check.ok ? CheckCircle2 : check.level === 'block' ? XCircle : CircleAlert;
  const tone = check.ok ? 'text-emerald-600 dark:text-emerald-400' : check.level === 'block' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400';
  return (
    <li className="flex items-start gap-2 py-1.5">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">{check.label}</p>
        <p className="text-[10px] leading-snug text-slate-400">{check.detail}</p>
      </div>
      {!check.ok && <Link href={check.fix} className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10">Fix<ArrowUpRight className="h-3 w-3" /></Link>}
    </li>
  );
}

export default function MarketingReadinessPage() {
  const [fiscalYear, setFiscalYear] = useState(String(THIS_YEAR));
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [brandOnly, setBrandOnly] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [openCompany, setOpenCompany] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/marketing/readiness', { params: { fiscal_year: fiscalYear } });
      setData(res);
      setOpenGroups(prev => (Object.keys(prev).length ? prev : Object.fromEntries((res.groups || []).map(g => [g.id ?? 'none', true]))));
    } catch (err) {
      setError(err.message || 'Failed to load the readiness check.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => { if (processed) load(); }, [processed, load]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.groups || []).map(g => ({
      ...g,
      companies: g.companies.filter(c =>
        (!statusFilter || c.status === statusFilter) &&
        (!q || c.company_name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)) &&
        (!brandOnly || c.checks.find(k => k.key === 'brand')?.ok)
      ),
    })).filter(g => g.companies.length);
  }, [data, statusFilter, search, brandOnly]);

  const s = data?.summary;
  const kpis = s ? [
    { label: 'Companies checked', value: s.companies, sub: `FY ${data.fiscal_year}`, icon: Building2, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Ready', value: s.ready, sub: 'All checks pass', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { label: 'Needs review', value: s.review, sub: 'Usable, with warnings', icon: CircleAlert, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Blocked', value: s.blocked, sub: 'Missing a required setup', icon: XCircle, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
  ] : [];

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><Rocket className="h-4 w-4" />Marketing settings</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Go-live Readiness</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">What each company group still needs before Marketing can plan, approve and pay end to end: brands, validated budgets, users, approval tiers and recipients.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select aria-label="Fiscal year" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="h-10 rounded-xl border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white outline-none [&>option]:text-slate-900">
              {YEARS.map(y => <option key={y} value={y}>FY {y}</option>)}
            </select>
            <button type="button" onClick={() => (processed ? load() : setProcessed(true))} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-blue-50 disabled:opacity-60 cursor-pointer"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{processed ? 'Reload' : 'Load data'}</button>
          </div>
        </div>
      </motion.div>

      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Rocket className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Check readiness</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Pick the fiscal year above, then click Load data to check every company you have access to.</p>
          <button type="button" onClick={() => setProcessed(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Load data</button>
        </motion.div>
      ) : (
        <>
          {kpis.length > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpis.map(({ label, value, sub, icon: Icon, tone }, i) => (
                <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100"><CountUp value={value} /></p><p className="truncate text-[10px] text-slate-400">{sub}</p></div>
                </motion.div>
              ))}
            </div>
          )}

          {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{error}</div>}

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="relative min-w-48 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search company or group" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search company or group..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950" />
              {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <div className="flex gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
              {FILTERS.map(([key, text]) => (
                <button key={key || 'all'} type="button" aria-pressed={statusFilter === key} onClick={() => setStatusFilter(key)} className={`relative rounded-md px-3 py-1 text-[11px] font-medium cursor-pointer ${statusFilter === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                  {statusFilter === key && <motion.span layoutId="readiness-filter" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                  <span className="relative">{text}</span>
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400"><input type="checkbox" checked={brandOnly} onChange={e => setBrandOnly(e.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />Only companies with a brand</label>
            <InlineHelp label="How readiness is judged">Blocked = a required setup is missing (brand, validated budget for the year, a Marketing user with access, or a payment approval tier). Needs review = usable, but recipients still come from the general list, nobody from Finance has access, or the company has no holding group.</InlineHelp>
          </div>

          {loading && !data ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Checking companies...</div>
          ) : !groups.length ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">No companies match the filters.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((g, gi) => {
                const key = g.id ?? 'none';
                const open = openGroups[key] !== false;
                return (
                  <motion.section key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(gi, 8) * 0.04 }} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <button type="button" aria-expanded={open} onClick={() => setOpenGroups(prev => ({ ...prev, [key]: !open }))} className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Layers className="h-4 w-4" /></span>
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{g.name}</span><span className="text-[11px] text-slate-400">{g.sector || 'No sector'} · {g.companies.length} {g.companies.length === 1 ? 'company' : 'companies'}</span></span>
                      </span>
                      <span className="flex items-center gap-2">
                        {g.ready > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS.READY.cls}`}>{g.ready} ready</span>}
                        {g.review > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS.REVIEW.cls}`}>{g.review} review</span>}
                        {g.blocked > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS.BLOCKED.cls}`}>{g.blocked} blocked</span>}
                        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden border-t border-slate-100 dark:border-slate-800">
                          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {g.companies.map(c => {
                              const expanded = openCompany === c.company_id;
                              const failed = c.checks.filter(k => !k.ok);
                              return (
                                <li key={c.company_id}>
                                  <button type="button" aria-expanded={expanded} onClick={() => setOpenCompany(expanded ? null : c.company_id)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer">
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-800 dark:text-slate-200">{c.company_name}</span>
                                    <span className="hidden text-[10px] text-slate-400 sm:inline">Tiers: plan {SCOPE_LABEL[c.plan_tier_scope]} · payment {SCOPE_LABEL[c.payment_tier_scope]}</span>
                                    <span className="text-[10px] text-slate-400">{c.plans} plan{c.plans === 1 ? '' : 's'}</span>
                                    <span className="flex gap-1">{failed.slice(0, 4).map(k => <span key={k.key} title={k.label} className={`h-1.5 w-4 rounded-full ${k.level === 'block' ? 'bg-rose-400' : 'bg-amber-400'}`} />)}</span>
                                    <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                  </button>
                                  <AnimatePresence initial={false}>
                                    {expanded && (
                                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-slate-50/60 dark:bg-slate-950/30">
                                        <div className="grid gap-4 px-5 py-3 md:grid-cols-2">
                                          <ul className="divide-y divide-slate-100 dark:divide-slate-800">{c.checks.map(k => <CheckPill key={k.key} check={k} />)}</ul>
                                          <div>
                                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Approval recipients</p>
                                            <ul className="space-y-1">
                                              {c.recipients.map(r => (
                                                <li key={r.role} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] dark:border-slate-800 dark:bg-slate-900">
                                                  <span className="font-medium text-slate-700 dark:text-slate-200">{r.role.replace(/_/g, ' ')}</span>
                                                  <span className="min-w-0 truncate text-slate-500 dark:text-slate-400" title={r.email || ''}>{r.email || '—'}</span>
                                                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${r.source === 'missing' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : r.source === 'general' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>{SCOPE_LABEL[r.source]}</span>
                                                </li>
                                              ))}
                                            </ul>
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
