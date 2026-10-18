'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  ClipboardCheck,
  Search,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  CircleDashed,
  Link2,
  Database
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const THIS_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = [THIS_YEAR - 2, THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1].map(String);
const STATUS_TABS = [
  ['', 'All'],
  ['PENDING_APPROVAL', 'Pending'],
  ['APPROVED', 'Approved'],
  ['COMPLETED', 'Completed'],
  ['REJECTED', 'Rejected'],
  ['DRAFT', 'Draft'],
];
const STATUS_META = {
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  PENDING_APPROVAL: { label: 'Pending', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  COMPLETED: { label: 'Completed', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  REJECTED: { label: 'Rejected', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
};
const STEP_META = {
  APPROVED: { label: 'Approved', dot: 'bg-emerald-500 text-white', ring: 'border-emerald-500', icon: CheckCircle, iconCls: 'text-emerald-500' },
  REJECTED: { label: 'Rejected', dot: 'bg-rose-500 text-white', ring: 'border-rose-500', icon: XCircle, iconCls: 'text-rose-500' },
  PENDING: { label: 'Pending', dot: 'bg-amber-500 text-white', ring: 'border-amber-500', icon: Hourglass, iconCls: 'text-amber-500' },
  WAITING: { label: 'Not yet', dot: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300', ring: 'border-slate-200 dark:border-slate-700', icon: CircleDashed, iconCls: 'text-slate-300 dark:text-slate-600' },
};
const ROLE_LABELS = { MARKETING_MANAGER: 'Marketing Manager', FINANCE_CONTROLLER: 'Finance Controller', VP_DIRECTOR: 'VP Director', BU_DIRECTOR: 'BU Director', CFO_CEO: 'CFO / CEO' };

const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
const formatDate = (value, withTime = false) => value
  ? new Date(value).toLocaleString('en-GB', withTime ? { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
const daysSince = (value) => value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)) : null;
const ageTone = (days) => days > 7 ? 'text-rose-600 dark:text-rose-400' : days > 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400';
const roleLabel = (role) => ROLE_LABELS[role] || role || null;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTERS = [[1, 'Q1 (Jan–Mar)'], [2, 'Q2 (Apr–Jun)'], [3, 'Q3 (Jul–Sep)'], [4, 'Q4 (Oct–Dec)']];
const CURRENT_MONTH = new Date().getMonth() + 1;
// 'Jan–Mar' for consecutive months, otherwise 'Jan, Mar, Jun'.
const formatMonths = (months) => {
  if (!months?.length) return null;
  const consecutive = months.every((m, i) => i === 0 || m === months[i - 1] + 1);
  if (months.length === 1) return MONTH_NAMES[months[0] - 1];
  return consecutive ? `${MONTH_NAMES[months[0] - 1]}–${MONTH_NAMES[months[months.length - 1] - 1]}` : months.map(m => MONTH_NAMES[m - 1]).join(', ');
};

// Animated number for the summary cards.
function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-US') }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.8, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{format(display)}</>;
}

// Compact stepper: one dot per step with a progress track.
function MiniStepper({ steps }) {
  if (!steps?.length) return <span className="text-[10px] text-slate-400">—</span>;
  const done = steps.filter(s => s.status === 'APPROVED').length;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const meta = STEP_META[step.status] || STEP_META.WAITING;
          return (
            <React.Fragment key={step.step_number}>
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 400, damping: 22 }}
                title={`Step ${step.step_number}: ${step.approver_name || roleLabel(step.role) || '-'} (${meta.label})`}
                className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${meta.dot}`}
              >
                {step.status === 'PENDING' && <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/50" />}
                <span className="relative">{step.step_number}</span>
              </motion.span>
              {idx < steps.length - 1 && <span className={`h-0.5 w-3 rounded-full ${step.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </React.Fragment>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">{done}/{steps.length} steps</p>
    </div>
  );
}

export default function MarketingApprovalOverviewPage() {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  // Process-first: plans are fetched only after Load data; later filter changes reload.
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);

  const [companyId, setCompanyId] = useState('');
  const [fiscalYear, setFiscalYear] = useState(String(THIS_YEAR));
  const [statusTab, setStatusTab] = useState('');
  const [periodMode, setPeriodMode] = useState('all');
  const [periodMonth, setPeriodMonth] = useState(CURRENT_MONTH);
  const [periodQuarter, setPeriodQuarter] = useState(Math.ceil(CURRENT_MONTH / 3));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    apiClient.get('/api/marketing/metadata').then(res => setCompanies(res?.companies || [])).catch(() => setCompanies([]));
  }, []);

  // Status is filtered on the client so the tab counters always reflect the full set.
  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/marketing/approvals-overview', { params: { company_id: companyId || undefined, fiscal_year: fiscalYear } });
      setPlans(res || []);
      setLoadedAt(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load approval monitoring.');
    } finally {
      setLoading(false);
    }
  }, [companyId, fiscalYear]);

  useEffect(() => { if (processed) loadPlans(); }, [processed, loadPlans]);

  // Period filter by campaign month: a plan matches when any of its item months falls in the period.
  const periodPlans = useMemo(() => {
    if (periodMode === 'all') return plans;
    const wanted = periodMode === 'month' ? [periodMonth] : [1, 2, 3].map(i => (periodQuarter - 1) * 3 + i);
    return plans.filter(p => (p.months || []).some(m => wanted.includes(m)));
  }, [plans, periodMode, periodMonth, periodQuarter]);
  const periodLabel = periodMode === 'month' ? `${MONTH_NAMES[periodMonth - 1]} ${fiscalYear}` : periodMode === 'quarter' ? `Q${periodQuarter} ${fiscalYear}` : `FY ${fiscalYear}`;

  const statusCounts = useMemo(() => periodPlans.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {}), [periodPlans]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodPlans.filter(p =>
      (!statusTab || p.status === statusTab) &&
      (!q || [p.title, p.creator_name, p.company_name, String(p.id), p.waiting_on?.name].some(v => String(v || '').toLowerCase().includes(q)))
    );
  }, [periodPlans, statusTab, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  const kpis = useMemo(() => {
    const plans = periodPlans;
    const pending = plans.filter(p => p.status === 'PENDING_APPROVAL');
    const waits = pending.map(p => daysSince(p.waiting_on?.since)).filter(d => d !== null);
    return {
      total: plans.length,
      totalValue: plans.reduce((s, p) => s + (p.total_budget || 0), 0),
      pending: pending.length,
      pendingValue: pending.reduce((s, p) => s + (p.total_budget || 0), 0),
      stale: waits.filter(d => d > 3).length,
      avgWait: waits.length ? waits.reduce((a, b) => a + b, 0) / waits.length : 0,
      overBudget: plans.filter(p => p.is_over_budget).length,
      late: plans.filter(p => p.is_late_submission).length,
      approved: plans.filter(p => p.status === 'APPROVED' || p.status === 'COMPLETED').length,
      rejected: plans.filter(p => p.status === 'REJECTED').length,
    };
  }, [periodPlans]);

  const summaryCards = [
    { label: 'Total plans', value: kpis.total, sub: formatIDR(kpis.totalValue), icon: ClipboardCheck, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Awaiting approval', value: kpis.pending, sub: kpis.pending ? `Avg ${kpis.avgWait.toFixed(1)} days · ${kpis.stale} over 3 days` : 'Queue is empty', icon: Clock, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Over-budget / Late', value: kpis.overBudget + kpis.late, sub: `${kpis.overBudget} over budget · ${kpis.late} past H-3`, icon: AlertTriangle, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
    { label: 'Approved / Completed', value: kpis.approved, sub: `${kpis.rejected} rejected`, icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  ];

  const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><ClipboardCheck className="h-4 w-4" />Marketing approval</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Approval Monitoring</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Track where each marketing plan sits in its approval chain: who it is waiting on, for how long, and the state of each magic link.</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1.5 md:items-end">
            {processed && <button type="button" onClick={loadPlans} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60 cursor-pointer">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Reload
            </button>}
            {loadedAt && <span className="text-[10px] text-slate-400">Updated {loadedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>
      </motion.div>

      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><ClipboardCheck className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load approval monitoring</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Pick a company and fiscal year, then click Load data to see where each plan sits in its approval chain.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <select aria-label="Filter by company" value={companyId} onChange={e => setCompanyId(e.target.value)} className={`${fieldClass} max-w-60`}>
              <option value="">All companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select aria-label="Fiscal year" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className={fieldClass}>
              {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}
            </select>
            <button type="button" onClick={() => setProcessed(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Database className="h-3.5 w-3.5" />Load data</button>
          </div>
        </motion.div>
      ) : (<>
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(({ label, value, sub, icon: Icon, tone }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100"><CountUp value={value} /></p>
              <p className="truncate text-[10px] text-slate-400">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{error}</div>}

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search plans" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search ID, campaign, requester, company, or approver..." className={`${fieldClass} w-full bg-slate-50 pl-9 pr-9 dark:bg-slate-950`} />
              {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <select aria-label="Filter PT" value={companyId} onChange={e => { setCompanyId(e.target.value); setPage(1); }} className={`${fieldClass} max-w-60`}>
              <option value="">All companies</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select aria-label="Fiscal year" value={fiscalYear} onChange={e => { setFiscalYear(e.target.value); setPage(1); }} className={fieldClass}>
              {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}
            </select>
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
              {[['all', 'All periods'], ['month', 'Monthly'], ['quarter', 'Quarterly']].map(([key, text]) => (
                <button key={key} type="button" aria-pressed={periodMode === key} onClick={() => { setPeriodMode(key); setPage(1); }} className={`relative rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${periodMode === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                  {periodMode === key && <motion.span layoutId="approval-period-mode" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-blue-600 dark:bg-blue-400" />}
                  <span className="relative">{text}</span>
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait" initial={false}>
              {periodMode === 'month' && (
                <motion.select key="month" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} aria-label="Campaign month" value={periodMonth} onChange={e => { setPeriodMonth(Number(e.target.value)); setPage(1); }} className={fieldClass}>
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m} {fiscalYear}</option>)}
                </motion.select>
              )}
              {periodMode === 'quarter' && (
                <motion.select key="quarter" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} aria-label="Campaign quarter" value={periodQuarter} onChange={e => { setPeriodQuarter(Number(e.target.value)); setPage(1); }} className={fieldClass}>
                  {QUARTERS.map(([q, text]) => <option key={q} value={q}>{text}</option>)}
                </motion.select>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map(([key, label]) => {
              const count = key ? statusCounts[key] || 0 : periodPlans.length;
              const active = statusTab === key;
              return (
                <button key={key || 'all'} type="button" aria-pressed={active} onClick={() => { setStatusTab(key); setPage(1); }} className={`relative rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${active ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                  {active && <motion.span layoutId="approval-status-tab" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                  <span className="relative">{label} <span className={active ? 'opacity-70' : 'text-slate-400'}>{count}</span></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Loading approvals...</div>
          ) : (
            <table className="w-full min-w-[1000px] table-fixed text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="w-[26%] px-4 py-2.5 font-semibold">Campaign</th>
                  <th className="w-[15%] px-3 py-2.5 font-semibold">PT</th>
                  <th className="w-[13%] px-3 py-2.5 text-right font-semibold">Value</th>
                  <th className="w-[13%] px-3 py-2.5 font-semibold">Progress</th>
                  <th className="w-[16%] px-3 py-2.5 font-semibold">Waiting on</th>
                  <th className="w-[10%] px-3 py-2.5 font-semibold">Status</th>
                  <th className="w-[7%] px-3 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {!rows.length && <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400">{periodPlans.length ? 'No plans match the filters.' : `No marketing plans for ${periodLabel}.`}</td></tr>}
                <AnimatePresence initial={false}>
                  {rows.map((plan, i) => {
                    const meta = STATUS_META[plan.status] || STATUS_META.DRAFT;
                    const waitDays = daysSince(plan.waiting_on?.since);
                    return (
                      <motion.tr key={plan.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.025, duration: 0.2 }} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5">
                          <p className="text-[10px] text-slate-400">#{plan.id} · {plan.creator_name} · {formatDate(plan.submitted_at || plan.created_at)}{plan.months?.length ? ` · Period ${formatMonths(plan.months)}` : ''}</p>
                          <p title={plan.title} className="truncate font-medium text-slate-800 dark:text-slate-200">{plan.title}</p>
                          {(plan.is_over_budget || plan.is_late_submission) && (
                            <div className="mt-1 flex gap-1">
                              {plan.is_over_budget && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">Over-budget</span>}
                              {plan.is_late_submission && <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">Late H-3</span>}
                            </div>
                          )}
                        </td>
                        <td title={plan.company_name} className="truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">{plan.company_name}</td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(plan.total_budget)}</td>
                        <td className="px-3 py-2.5"><MiniStepper steps={plan.steps} /></td>
                        <td className="px-3 py-2.5">
                          {plan.waiting_on ? (
                            <>
                              <p title={plan.waiting_on.email || ''} className="truncate font-medium text-slate-700 dark:text-slate-200">{plan.waiting_on.name || roleLabel(plan.waiting_on.role) || '—'}</p>
                              <p className={`text-[10px] font-medium tabular-nums ${ageTone(waitDays)}`}>Step {plan.current_active_step} · {waitDays === null ? '—' : waitDays === 0 ? 'since today' : `${waitDays} ${waitDays === 1 ? 'day' : 'days'}`}</p>
                            </>
                          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}><span className="h-1 w-1 rounded-full bg-current" />{meta.label}</span></td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" title="View audit trail" onClick={() => setSelectedPlan(plan)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Eye className="h-4 w-4" /></button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
          <label className="flex items-center gap-2">Rows per page
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
            </select>
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

      </>)}

      <AnimatePresence>
        {selectedPlan && <AuditDrawer plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}
      </AnimatePresence>
    </div>
  );
}

function AuditDrawer({ plan, onClose }) {
  const meta = STATUS_META[plan.status] || STATUS_META.DRAFT;
  const waitDays = daysSince(plan.waiting_on?.since);
  const label = 'text-[10px] font-semibold uppercase tracking-wider text-slate-400';

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Audit trail · #{plan.id}</p>
            <h3 className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{plan.title}</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">{plan.company_name} · submitted by {plan.creator_name}, {formatDate(plan.submitted_at || plan.created_at)}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className={label}>Value</p><p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(plan.total_budget)}</p></div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className={label}>Status</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>{meta.label}</span></div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className={label}>Chain</p><p className="mt-0.5 text-xs font-medium text-slate-700 dark:text-slate-200">{plan.chain_source === 'NAMED' ? 'Named approvers' : 'Automatic tiers'}</p></div>
          </div>

          {plan.waiting_on && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Waiting on <strong>{plan.waiting_on.name || roleLabel(plan.waiting_on.role)}</strong>{plan.waiting_on.email ? ` (${plan.waiting_on.email})` : ''} at step {plan.current_active_step}{waitDays !== null ? ` for ${waitDays} ${waitDays === 1 ? 'day' : 'days'}` : ''}.</span>
            </div>
          )}
          {plan.is_over_budget && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-3.5 w-3.5" />Over-budget reason</p>
              <p className="mt-1">{plan.over_budget_reason || 'No reason provided.'}</p>
            </div>
          )}
          {plan.is_late_submission && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="flex items-center gap-1.5 font-semibold"><Clock className="h-3.5 w-3.5" />Late submission (less than H-3)</p>
              <p className="mt-1">{plan.late_submission_reason || 'No reason provided.'}</p>
            </div>
          )}

          <div>
            <p className={`${label} mb-3`}>Approval steps</p>
            {!plan.steps.length && <p className="text-xs text-slate-400">No approval steps yet.</p>}
            <ol className="relative ml-3 space-y-5 border-l border-slate-200 dark:border-slate-800">
              {plan.steps.map((step, idx) => {
                const sm = STEP_META[step.status] || STEP_META.WAITING;
                const Icon = sm.icon;
                const stepWait = daysSince(step.pending_since);
                return (
                  <motion.li key={step.step_number} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + idx * 0.07 }} className="relative pl-6">
                    <span className={`absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-950 ${sm.ring}`}>
                      <Icon className={`h-3.5 w-3.5 ${sm.iconCls} ${step.status === 'PENDING' ? 'animate-pulse' : ''}`} />
                    </span>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Step {step.step_number}: {step.approver_name || roleLabel(step.role) || '—'}</p>
                        <p className="truncate text-[10px] text-slate-400">{[roleLabel(step.role), step.approver_email].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_META[step.status === 'PENDING' ? 'PENDING_APPROVAL' : step.status]?.cls || STATUS_META.DRAFT.cls}`}>{sm.label}</span>
                    </div>
                    {(step.status === 'APPROVED' || step.status === 'REJECTED') && step.action_at && (
                      <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{step.status === 'APPROVED' ? 'Approved' : 'Rejected'} {formatDate(step.action_at, true)}</p>
                    )}
                    {step.status === 'PENDING' && stepWait !== null && <p className={`mt-1 text-[10px] font-medium ${ageTone(stepWait)}`}>Waiting since {formatDate(step.pending_since, true)} ({stepWait} {stepWait === 1 ? 'day' : 'days'})</p>}
                    {step.comment && <p className={`mt-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${step.status === 'REJECTED' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}>“{step.comment}”</p>}
                    {step.magic_links.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {step.magic_links.map((ml, mlIdx) => (
                          <p key={mlIdx} className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{ml.email}</span>
                            <span className={`shrink-0 rounded px-1.5 py-0.5 font-medium ${ml.used_at ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : ml.expired ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                              {ml.used_at ? `Used ${formatDate(ml.used_at)}` : ml.expired ? `Expired ${formatDate(ml.expires_at)}` : `Active until ${formatDate(ml.expires_at)}`}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    {!step.magic_links.length && step.status !== 'WAITING' && step.recipients.length > 0 && (
                      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400"><Mail className="h-3 w-3" />No magic link recorded</p>
                    )}
                  </motion.li>
                );
              })}
            </ol>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
