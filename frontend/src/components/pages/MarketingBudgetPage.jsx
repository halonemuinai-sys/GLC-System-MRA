'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  Wallet,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  Coins,
  TrendingUp,
  Clock,
  History,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  HandCoins,
  Undo2,
  Save
} from 'lucide-react';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/apiClient';
import SearchableSelect from '@/components/ui/SearchableSelect';
import InlineHelp from '@/components/ui/InlineHelp';
import MarketingBudgetShiftDrawer from './MarketingBudgetShiftDrawer';
import MarketingBudgetShiftHistoryModal from './MarketingBudgetShiftHistoryModal';

const THIS_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2].map(String);
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIOD_TABS = [['ALL', 'Full year'], ['Q1', 'Q1 · Jan–Mar'], ['Q2', 'Q2 · Apr–Jun'], ['Q3', 'Q3 · Jul–Sep'], ['Q4', 'Q4 · Oct–Dec']];
const PLAN_STATUS = {
  DRAFT: ['Draft', 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'],
  PENDING_APPROVAL: ['Pending', 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'],
  APPROVED: ['Approved', 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'],
  COMPLETED: ['Completed', 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'],
  REJECTED: ['Rejected', 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'],
};

const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
const shortRupiah = (v) => {
  const abs = Math.abs(v || 0);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1).replace('.0', '')}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1).replace('.0', '')}M`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}K`;
  return `${sign}${Math.round(abs)}`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const monthHasEnded = (fy, month) => new Date() >= new Date(Number(fy), month, 1);

function CountUp({ value, format = (v) => formatRupiah(v) }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.9, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{format(display)}</>;
}

export default function MarketingBudgetPage() {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  // Process-first: the budget is fetched only after Load data; later filter changes reload.
  const [processed, setProcessed] = useState(false);
  const [metadata, setMetadata] = useState({ brands: [], lobs: [], companies: [] });
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [filter, setFilter] = useState({ company_id: '', brand_id: '', lob_id: '', fiscal_year: String(THIS_YEAR) });
  const [activeBudget, setActiveBudget] = useState(null);
  const [companyBudgets, setCompanyBudgets] = useState([]);
  const [userRole, setUserRole] = useState('');
  useEffect(() => { setUserRole((Cookies.get('glc_user_role') || '').toLowerCase()); }, []);
  const isFinanceRole = ['finance', 'admin', 'superadmin'].includes(userRole);
  const isValidated = activeBudget?.validation_status === 'VALIDATED';
  const canEditLimits = isFinanceRole && activeBudget && !activeBudget.is_locked;

  const [serverMonthly, setServerMonthly] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [quarterlyData, setQuarterlyData] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [relatedPlans, setRelatedPlans] = useState([]);
  const [shifts, setShifts] = useState([]);

  const [showDrawer, setShowDrawer] = useState(false);
  const [showShiftDrawer, setShowShiftDrawer] = useState(false);
  const [showShiftHistoryModal, setShowShiftHistoryModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({ company_id: '', brand_id: '', lob_id: '', fiscal_year: String(THIS_YEAR), total_budget: '' });

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };
  // True once the user explicitly picks a brand/LOB; until then the page jumps to the
  // first budget registered for the company so it never opens on an empty combination.
  const comboPickedRef = useRef(false);
  const brandsForCompany = useMemo(() => {
    const own = metadata.brands.filter(b => String(b.company_id) === String(filter.company_id));
    return own.length ? own : metadata.brands;
  }, [metadata.brands, filter.company_id]);
  const changeCompany = (val) => {
    comboPickedRef.current = false;
    const firstBrand = metadata.brands.find(b => String(b.company_id) === String(val));
    setFilter(prev => ({ ...prev, company_id: val, brand_id: firstBrand ? String(firstBrand.id) : prev.brand_id }));
  };
  const changeCombo = (key, val) => { comboPickedRef.current = true; setFilter(prev => ({ ...prev, [key]: val })); };

  // Metadata + sensible default filter.
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.get('/api/marketing/metadata');
        setMetadata({ brands: res?.brands || [], lobs: res?.lobs || [], companies: res?.companies || [] });
        if (res?.companies?.length) {
          const company = res.companies.find(c => c.name.toLowerCase().includes('mogems')) || res.companies[0];
          const brand = (res.brands || []).find(b => b.company_id === company.id) || res.brands?.[0];
          setFilter(prev => ({
            ...prev,
            company_id: String(company.id),
            brand_id: brand ? String(brand.id) : '',
            lob_id: res.lobs?.length ? String(res.lobs[0].id) : ''
          }));
        }
      } catch (err) {
        setError(err.message || 'Failed to load metadata.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadBudget = useCallback(async () => {
    if (!filter.company_id || !filter.brand_id || !filter.lob_id || !filter.fiscal_year) return;
    setProcessing(true);
    setError(null);
    try {
      const [check, budgets, perCompany] = await Promise.all([
        apiClient.get('/api/marketing/budgets/check', { params: filter }),
        apiClient.get('/api/marketing/budgets', { params: filter }),
        apiClient.get('/api/marketing/budgets', { params: { company_id: filter.company_id, fiscal_year: filter.fiscal_year } }).catch(() => []),
      ]);
      const budget = budgets?.[0] || null;
      if (!budget && perCompany?.length && !comboPickedRef.current) {
        comboPickedRef.current = true;
        setFilter(prev => ({ ...prev, brand_id: String(perCompany[0].brand_id), lob_id: String(perCompany[0].lob_id) }));
        return;
      }
      setActiveBudget(budget);
      setCompanyBudgets(perCompany || []);
      setShifts(budget ? await apiClient.get(`/api/marketing/budgets/${budget.id}/shifts`).catch(() => []) : []);
      setServerMonthly(check.monthly || []);
      setMonthlyData(check.monthly || []);
      setQuarterlyData(check.quarterly || []);
      setRelatedPlans(check.related_plans || []);
    } catch (err) {
      setError(err.message || 'Failed to load the budget.');
    } finally {
      setProcessing(false);
    }
  }, [filter]);

  useEffect(() => { if (processed) loadBudget(); }, [processed, loadBudget]);

  // Unsaved limit edits.
  const dirtyMonths = useMemo(() => monthlyData.filter(m => {
    const original = serverMonthly.find(o => o.month === m.month);
    return original && original.limit !== m.limit;
  }).map(m => m.month), [monthlyData, serverMonthly]);
  const isDirty = dirtyMonths.length > 0;

  const handleLimitChange = (monthNum, value) => {
    if (!canEditLimits) return;
    const clean = parseFloat(String(value).replace(/[^0-9]/g, '')) || 0;
    setMonthlyData(prev => prev.map(m => m.month === monthNum ? { ...m, limit: clean, available: clean - m.committed, over_committed: m.committed > clean } : m));
  };

  const handleSaveLimits = async () => {
    if (!activeBudget || !isDirty) return;
    if (isValidated && !confirm('This budget was validated by Finance. Changing limits resets it to Draft and it must be validated again. Continue?')) return;
    setProcessing(true);
    try {
      await apiClient.put(`/api/marketing/budgets/${activeBudget.id}`, {
        monthly_limits: monthlyData.filter(m => dirtyMonths.includes(m.month)).map(m => ({ period_month: m.month, budget_limit: m.limit }))
      });
      flash(`Limits saved for ${dirtyMonths.length} ${dirtyMonths.length === 1 ? 'month' : 'months'}.`);
      await loadBudget();
    } catch (err) {
      setError(err.message || 'Failed to save budget changes.');
      setProcessing(false);
    }
  };

  const runAction = async (fn, message) => {
    setProcessing(true);
    setError(null);
    try {
      await fn();
      if (message) flash(message);
      await loadBudget();
    } catch (err) {
      setError(err.message || 'Action failed.');
      setProcessing(false);
    }
  };

  const handleValidate = () => {
    const note = window.prompt('Validate this annual cap and monthly allocation as Finance?\nValidation note (optional):', '');
    if (note === null) return;
    runAction(() => apiClient.put(`/api/marketing/budgets/${activeBudget.id}/validate`, { note }), 'Budget validated by Finance.');
  };
  const handleToggleLock = () => {
    const action = activeBudget.is_locked ? 'unlock' : 'lock';
    runAction(() => apiClient.put(`/api/marketing/budgets/${activeBudget.id}/${action}`), action === 'lock' ? 'Budget locked.' : 'Budget unlocked.');
  };
  const handleCloseMonth = (monthNum) => {
    if (!confirm(`Close the books for ${MONTH_NAMES[monthNum - 1]}? The remaining allocation is held and does not roll over to the next month.`)) return;
    runAction(() => apiClient.post(`/api/marketing/budgets/${activeBudget.id}/close-month`, { period_month: monthNum }), `${MONTH_NAMES[monthNum - 1]} closed.`);
  };
  const handleReopenMonth = (monthNum) => {
    if (!confirm(`Reopen the books for ${MONTH_NAMES[monthNum - 1]}?`)) return;
    runAction(() => apiClient.post(`/api/marketing/budgets/${activeBudget.id}/reopen-month`, { period_month: monthNum }), `${MONTH_NAMES[monthNum - 1]} reopened.`);
  };

  const handleOpenCreate = () => {
    setFormData({ company_id: filter.company_id, brand_id: filter.brand_id, lob_id: filter.lob_id, fiscal_year: filter.fiscal_year, total_budget: '' });
    setFormError(null);
    setShowDrawer(true);
  };
  const createTotal = parseInt(String(formData.total_budget).replace(/[^0-9]/g, ''), 10) || 0;
  const handleCreateSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.company_id || !formData.brand_id || !formData.lob_id) { setFormError('Company, brand and line of business are required.'); return; }
    if (createTotal <= 0) { setFormError('Enter an annual cap greater than 0.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      // Server splits the annual cap into whole-rupiah months (remainder in December).
      await apiClient.post('/api/marketing/budgets', {
        company_id: parseInt(formData.company_id, 10),
        brand_id: parseInt(formData.brand_id, 10),
        lob_id: parseInt(formData.lob_id, 10),
        fiscal_year: parseInt(formData.fiscal_year, 10),
        total_budget: createTotal
      });
      setShowDrawer(false);
      setFilter({ company_id: formData.company_id, brand_id: formData.brand_id, lob_id: formData.lob_id, fiscal_year: formData.fiscal_year });
      flash('Budget created.');
    } catch (err) {
      setFormError(err.message || 'Failed to create the budget.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayedMonthly = activeTab === 'ALL' ? monthlyData : monthlyData.filter(m => `Q${m.quarter}` === activeTab);
  const currentQuarterConfig = quarterlyData.find(q => `Q${q.quarter}` === activeTab);
  const totals = displayedMonthly.reduce((acc, m) => ({
    limit: acc.limit + m.limit,
    committed: acc.committed + m.committed,
    actual: acc.actual + (m.actual || 0),
    available: acc.available + m.available,
    over: acc.over + (m.over_committed ? 1 : 0),
  }), { limit: 0, committed: 0, actual: 0, available: 0, over: 0 });
  const pct = (v) => totals.limit > 0 ? (v / totals.limit) * 100 : 0;
  const maxBar = Math.max(1, ...displayedMonthly.map(m => Math.max(m.limit, m.committed, m.actual || 0)));
  const pendingShifts = shifts.filter(s => s.status === 'PENDING').length;
  const nameOf = (list, id) => list.find(x => String(x.id) === String(id))?.name || '—';

  const summaryCards = [
    { label: 'Cap (limit)', help: 'Total marketing spending limit for the selected period (12 months or the active quarter) for this company, brand and LOB. Set by Finance; it is the ceiling for committed costs.', value: totals.limit, sub: activeTab === 'ALL' ? '12 months' : activeTab, icon: Coins, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Committed (plan)', help: 'Budget of marketing plan items that are Pending, Approved or Completed for this brand & LOB. Draft and Rejected plans are excluded.', value: totals.committed, sub: `${pct(totals.committed).toFixed(1)}% of cap`, icon: Clock, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Actuals (paid)', help: 'Spending actually paid (payment requests marked Paid) for plan items of this brand & LOB.', value: totals.actual, sub: `${pct(totals.actual).toFixed(1)}% of cap`, icon: TrendingUp, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { label: totals.available < 0 ? 'Over-commit' : 'Remaining quota', help: 'Cap minus committed, for months that are still open. A negative value means submitted plans exceed the limit (over-commit). Closed months count as 0; their remainder is held.', value: totals.available, sub: totals.over ? `${totals.over} ${totals.over === 1 ? 'month' : 'months'} over the limit` : `${pct(totals.available).toFixed(1)}% free`, icon: totals.available < 0 ? AlertTriangle : HandCoins, tone: totals.available < 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  ];

  const btn = 'inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer';
  const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
  const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-40 text-xs text-slate-400"><Loader2 className="h-6 w-6 animate-spin text-blue-500" />Loading budget...</div>;
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><Wallet className="h-4 w-4" />Marketing budget control</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Marketing Budget Control</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Monthly caps per company, brand and LOB: what plans have committed, what has been paid, and the remaining quota.</p>
            {activeBudget && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${activeBudget.is_locked ? 'bg-rose-500/20 text-rose-200' : 'bg-white/10 text-slate-200'}`}>{activeBudget.is_locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}{activeBudget.is_locked ? 'Locked' : 'Unlocked'}</span>
                <span title={isValidated ? `Validated by ${activeBudget.validated_by || 'Finance'} ${fmtDate(activeBudget.validated_at)}${activeBudget.validation_note ? ` — ${activeBudget.validation_note}` : ''}` : 'Not validated by Finance'} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${isValidated ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}><ShieldCheck className="h-3 w-3" />{isValidated ? 'Validated by Finance' : 'Not validated by Finance'}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {processed && activeBudget ? (
              <>
                <button type="button" onClick={() => setShowShiftHistoryModal(true)} title="Budget shift history" className={`${btn} relative border border-white/20 bg-white/5 text-white hover:bg-white/10`}>
                  <History className="h-3.5 w-3.5" />History
                  {shifts.length > 0 && <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${pendingShifts ? 'bg-amber-400 text-slate-900' : 'bg-white/20'}`}>{pendingShifts || shifts.length}</span>}
                </button>
                {!isValidated && isFinanceRole && (
                  <button type="button" onClick={handleValidate} disabled={processing || isDirty} title={isDirty ? 'Save limit changes first' : 'Validate the annual cap and monthly allocation'} className={`${btn} border border-emerald-300/30 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25`}><ShieldCheck className="h-3.5 w-3.5" />Finance validation</button>
                )}
                {isFinanceRole && (
                  <button type="button" onClick={handleToggleLock} disabled={processing || isDirty || (!activeBudget.is_locked && !isValidated)} title={activeBudget.is_locked ? 'Unlock to change limits' : !isValidated ? 'Finance must validate before locking' : 'Lock limits against changes'} className={`${btn} border border-white/20 bg-white/5 text-white hover:bg-white/10`}>
                    {activeBudget.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{activeBudget.is_locked ? 'Unlock' : 'Lock budget'}
                  </button>
                )}
                <button type="button" onClick={() => setShowShiftDrawer(true)} disabled={activeBudget.is_locked || isDirty} title={activeBudget.is_locked ? 'Budget is locked' : 'Request a reallocation between months (same quarter: FC · across quarters: Marketing Manager + FC)'} className={`${btn} bg-white text-slate-900 hover:bg-blue-50`}><ArrowRightLeft className="h-3.5 w-3.5" />Request shift</button>
              </>
            ) : processed && isFinanceRole && (
              <button type="button" onClick={handleOpenCreate} className={`${btn} bg-white text-slate-900 hover:bg-blue-50`}><Plus className="h-3.5 w-3.5" />Initialize budget</button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
          <div><span className={label}>Company</span><SearchableSelect value={filter.company_id} onChange={changeCompany} options={metadata.companies} placeholder="Select company..." searchPlaceholder="Search company..." /></div>
          <div><span className={label}>Brand</span><SearchableSelect value={filter.brand_id} onChange={val => changeCombo('brand_id', val)} options={brandsForCompany} placeholder="Select brand..." searchPlaceholder="Search brand..." /></div>
          <div><span className={label}>Line of business</span><SearchableSelect value={filter.lob_id} onChange={val => changeCombo('lob_id', val)} options={metadata.lobs} placeholder="Select LOB..." searchPlaceholder="Search LOB..." /></div>
          <div><span className={label}>Fiscal year</span><select value={filter.fiscal_year} onChange={e => { comboPickedRef.current = false; setFilter(prev => ({ ...prev, fiscal_year: e.target.value })); }} className={`${fieldClass} w-full`}>{FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}</select></div>
          <div className="flex items-end"><button type="button" onClick={() => (processed ? loadBudget() : setProcessed(true))} disabled={processing} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"><RefreshCw className={`h-3.5 w-3.5 ${processing ? 'animate-spin' : ''}`} />{processed ? 'Reload' : 'Load data'}</button></div>
        </div>
        {companyBudgets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Registered budgets FY {filter.fiscal_year}:</span>
            {companyBudgets.map(b => {
              const active = String(b.brand_id) === filter.brand_id && String(b.lob_id) === filter.lob_id;
              return (
                <button key={b.id} type="button" onClick={() => { comboPickedRef.current = true; setFilter(prev => ({ ...prev, brand_id: String(b.brand_id), lob_id: String(b.lob_id) })); }} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${active ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                  {b.is_locked && <Lock className="h-3 w-3" />}{b.brand?.name || '—'} · {b.lob?.name || '—'}<span className="text-slate-400">{shortRupiah(Number(b.total_budget))}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{notice}</motion.div>}
      </AnimatePresence>
      {error && <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" aria-label="Close" onClick={() => setError(null)} className="cursor-pointer"><X className="h-3.5 w-3.5" /></button></div>}

      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Wallet className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load budget control</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Pick a company, brand, line of business and fiscal year above, then click Load data. If the combination has no budget, the first registered budget of that company opens.</p>
          <button type="button" onClick={() => setProcessed(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Load data</button>
        </motion.div>
      ) : !activeBudget && !processing ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Wallet className="h-5 w-5" /></span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">No budget for this combination yet</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">{nameOf(metadata.companies, filter.company_id)} · {nameOf(metadata.brands, filter.brand_id)} · {nameOf(metadata.lobs, filter.lob_id)} · FY {filter.fiscal_year}. {isFinanceRole ? 'Initialize the annual cap to get started.' : 'Ask Finance to initialize the cap.'}</p>
          {isFinanceRole && <button type="button" onClick={handleOpenCreate} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Plus className="h-3.5 w-3.5" />Initialize budget</button>}
        </motion.div>
      ) : (
        <>
          {/* Period tabs */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
              {PERIOD_TABS.map(([key, text]) => (
                <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => setActiveTab(key)} className={`relative rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${activeTab === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                  {activeTab === key && <motion.span layoutId="budget-period-tab" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                  <span className="relative">{text}</span>
                </button>
              ))}
            </div>
            {activeTab !== 'ALL' && currentQuarterConfig && (
              <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] ${currentQuarterConfig.is_deadline_passed ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                <Calendar className="h-3.5 w-3.5" />Batas pengajuan {activeTab}: <strong className="font-semibold">{currentQuarterConfig.deadline}</strong>{currentQuarterConfig.is_deadline_passed ? ' · lewat H-3' : ' · sesuai jadwal H-3'}
              </span>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(({ label: name, help, value, sub, icon: Icon, tone }, i) => (
              <motion.div key={name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="-my-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><InlineHelp summary={name} label={`Penjelasan ${name}`}><span className="normal-case tracking-normal">{help}</span></InlineHelp></div>
                  <p className={`mt-0.5 truncate text-base font-semibold tabular-nums ${value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}><CountUp value={value} /></p>
                  <p className="truncate text-[10px] text-slate-400">{sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Utilization + chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="font-semibold uppercase tracking-wider text-slate-400"><InlineHelp summary="Cap usage" label="About cap usage"><span className="normal-case tracking-normal">Amber bar = share of the cap committed by plans. Blue bar = share already paid. Red means committed exceeds the cap. The chart below compares the limit (dashed), committed and paid per month.</span></InlineHelp></span>
              <span className="tabular-nums text-slate-500">{pct(totals.committed).toFixed(1)}% committed · {pct(totals.actual).toFixed(1)}% paid</span>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct(totals.committed))}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} className={`absolute inset-y-0 left-0 rounded-full ${totals.committed > totals.limit ? 'bg-rose-400' : 'bg-amber-300 dark:bg-amber-400/70'}`} />
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct(totals.actual))}%` }} transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }} className="absolute inset-y-0 left-0 rounded-full bg-blue-600" />
            </div>

            <div className="mt-5 grid items-end gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${displayedMonthly.length || 1}, minmax(0, 1fr))` }}>
              {displayedMonthly.map((m, i) => {
                const h = (v) => `${Math.max(v ? 3 : 0, (v / maxBar) * 100)}%`;
                return (
                  <div key={m.month} title={`${MONTH_NAMES[m.month - 1]} · limit ${formatRupiah(m.limit)} · committed ${formatRupiah(m.committed)} · paid ${formatRupiah(m.actual)}`} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-semibold tabular-nums ${m.over_committed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>{shortRupiah(m.available)}</span>
                    <div className="relative flex h-32 w-full items-end justify-center rounded-md bg-slate-50 dark:bg-slate-800/50">
                      <motion.div initial={{ height: 0 }} animate={{ height: h(m.limit) }} transition={{ delay: i * 0.03, duration: 0.5 }} className="absolute bottom-0 w-full rounded-md border border-dashed border-slate-300 dark:border-slate-600" />
                      <motion.div initial={{ height: 0 }} animate={{ height: h(m.committed) }} transition={{ delay: 0.1 + i * 0.03, duration: 0.5 }} className={`absolute bottom-0 w-3/5 rounded-t-md ${m.over_committed ? 'bg-rose-400' : 'bg-amber-300 dark:bg-amber-400/70'}`} />
                      <motion.div initial={{ height: 0 }} animate={{ height: h(m.actual || 0) }} transition={{ delay: 0.2 + i * 0.03, duration: 0.5 }} className="absolute bottom-0 w-2/5 rounded-t-md bg-blue-600" />
                      {m.is_closed && <Lock className="absolute top-1.5 h-3 w-3 text-slate-400" />}
                    </div>
                    <span className="text-[10px] text-slate-400">{MONTH_SHORT[m.month - 1]}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm border border-dashed border-slate-400" />Limit</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-300" />Committed</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue-600" />Paid</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-400" />Over-commit</span>
              <span className="ml-auto">Value above each bar = remaining quota</span>
            </div>
          </div>

          {/* Monthly table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Monthly allocation <span className="ml-1 font-normal text-slate-400">{activeTab === 'ALL' ? '12 months' : activeTab}</span></p>
              {!canEditLimits && activeBudget && <span className="text-[10px] text-slate-400">{activeBudget.is_locked ? 'Budget locked — limits cannot be changed' : 'Only Finance/Admin can change limits'}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] table-fixed text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                  <tr>
                    <th className="w-[15%] px-4 py-2.5 font-semibold"><InlineHelp summary="Month" label="About month"><span className="normal-case tracking-normal">Fiscal month and its quarter. Amber notes show budget shifts still waiting for approval.</span></InlineHelp></th>
                    <th className="w-[17%] px-3 py-2.5 text-right font-semibold"><InlineHelp summary="Limit" label="About limit"><span className="normal-case tracking-normal">Spending cap for the month. Finance/Admin can change it while the budget is unlocked and the month is open. Save changes with the bar at the bottom of the screen.</span></InlineHelp></th>
                    <th className="w-[13%] px-3 py-2.5 text-right font-semibold"><InlineHelp summary="Committed" label="About committed"><span className="normal-case tracking-normal">Total budget of plan items (Pending, Approved, Completed) falling in this month.</span></InlineHelp></th>
                    <th className="w-[13%] px-3 py-2.5 text-right font-semibold"><InlineHelp summary="Paid" label="About paid"><span className="normal-case tracking-normal">Payments recorded as Paid for plan items in this month.</span></InlineHelp></th>
                    <th className="w-[14%] px-3 py-2.5 text-right font-semibold"><InlineHelp summary="Remaining" label="About remaining quota"><span className="normal-case tracking-normal">Limit minus committed. Red = over-commit. Once a month is closed the remainder becomes 0 and is held (it does not roll over automatically).</span></InlineHelp></th>
                    <th className="w-[15%] px-3 py-2.5 font-semibold"><InlineHelp summary="Usage" label="About usage"><span className="normal-case tracking-normal">Committed as a percentage of the limit. The blue bar inside shows the share already paid.</span></InlineHelp></th>
                    <th className="w-[13%] px-3 py-2.5 text-right font-semibold"><InlineHelp summary="Close books" label="About closing books"><span className="normal-case tracking-normal">Finance/Admin can close a month after it ends. A closed month cannot change its limit or receive shifts.</span></InlineHelp></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {displayedMonthly.map((m, i) => {
                    const usage = m.limit > 0 ? (m.committed / m.limit) * 100 : (m.committed > 0 ? 100 : 0);
                    const paidPct = m.limit > 0 ? ((m.actual || 0) / m.limit) * 100 : 0;
                    const dirty = dirtyMonths.includes(m.month);
                    const ended = monthHasEnded(filter.fiscal_year, m.month);
                    return (
                      <motion.tr key={m.month} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className={`transition-colors ${dirty ? 'bg-blue-50/50 dark:bg-blue-500/5' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'}`}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 dark:text-slate-200">{MONTH_NAMES[m.month - 1]}</span>
                            <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Q{m.quarter}</span>
                          </div>
                          {(m.pending_shift_in > 0 || m.pending_shift_out > 0) && (
                            <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">Pending shift: {m.pending_shift_in > 0 && `+${shortRupiah(m.pending_shift_in)}`}{m.pending_shift_in > 0 && m.pending_shift_out > 0 && ' / '}{m.pending_shift_out > 0 && `-${shortRupiah(m.pending_shift_out)}`}</p>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {canEditLimits && !m.is_closed ? (
                            <div className="relative ml-auto max-w-[160px]">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                              <input aria-label={`Limit ${MONTH_NAMES[m.month - 1]}`} inputMode="numeric" value={m.limit.toLocaleString('id-ID')} onChange={e => handleLimitChange(m.month, e.target.value)} className={`h-8 w-full rounded-lg border bg-slate-50 pl-7 pr-2.5 text-right text-[11px] font-medium tabular-nums text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:bg-slate-950 dark:text-slate-100 ${dirty ? 'border-blue-400 dark:border-blue-500' : 'border-slate-200 dark:border-slate-700'}`} />
                            </div>
                          ) : <span className="font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatRupiah(m.limit)}</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{formatRupiah(m.committed)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500 dark:text-slate-400">{formatRupiah(m.actual || 0)}</td>
                        <td className="px-3 py-2 text-right">
                          {m.is_closed ? (
                            <>
                              <span className="tabular-nums text-slate-400">Rp 0</span>
                              {m.unspent > 0 && <p className="text-[10px] text-amber-600 dark:text-amber-400">Held {formatRupiah(m.unspent)}</p>}
                            </>
                          ) : (
                            <>
                              <span className={`font-medium tabular-nums ${m.over_committed ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatRupiah(m.available)}</span>
                              {m.over_committed && <p className="text-[10px] text-rose-500">Over-commit</p>}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, usage)}%` }} transition={{ duration: 0.6 }} className={`absolute inset-y-0 left-0 rounded-full ${usage > 100 ? 'bg-rose-400' : 'bg-amber-300 dark:bg-amber-400/70'}`} />
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, paidPct)}%` }} transition={{ duration: 0.6, delay: 0.1 }} className="absolute inset-y-0 left-0 rounded-full bg-blue-600" />
                            </div>
                            <span className={`w-11 text-right text-[10px] font-semibold tabular-nums ${usage > 100 ? 'text-rose-600 dark:text-rose-400' : usage > 80 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>{usage.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {m.is_closed ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <span title={m.closed_at ? `Closed ${fmtDate(m.closed_at)}${m.closed_by ? ` by ${m.closed_by}` : ''}` : ''} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Lock className="h-2.5 w-2.5" />Closed</span>
                              {isFinanceRole && <button type="button" onClick={() => handleReopenMonth(m.month)} disabled={processing} className="rounded-md px-1.5 py-1 text-[10px] font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-amber-500/10 cursor-pointer">Reopen</button>}
                            </div>
                          ) : isFinanceRole ? (
                            <button type="button" onClick={() => handleCloseMonth(m.month)} disabled={processing || !ended || dirty} title={!ended ? 'Month has not ended' : dirty ? 'Save limit changes first' : 'Close the books for this month'} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-rose-500/10 cursor-pointer"><Lock className="h-2.5 w-2.5" />Close books</button>
                          ) : <span className="text-[10px] text-slate-400">Open</span>}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Related plans */}
          {relatedPlans.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Related marketing plans <span className="ml-1 font-normal text-slate-400">{relatedPlans.length} {relatedPlans.length === 1 ? 'plan' : 'plans'}</span></p>
                <span className="text-[10px] text-slate-400">Plans with items in this brand & LOB</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] table-fixed text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                    <tr><th className="w-[38%] px-4 py-2.5 font-semibold">Plan</th><th className="w-[12%] px-3 py-2.5 font-semibold">Status</th><th className="w-[16%] px-3 py-2.5 text-right font-semibold">Total budget</th><th className="w-[20%] px-3 py-2.5 font-semibold">Period</th><th className="px-3 py-2.5 font-semibold">Created by</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {relatedPlans.map(plan => {
                      const [statusText, statusCls] = PLAN_STATUS[plan.status] || PLAN_STATUS.DRAFT;
                      return (
                        <tr key={plan.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2"><p className="text-[10px] text-slate-400">#{plan.id}</p><p title={plan.title} className="truncate font-medium text-slate-800 dark:text-slate-200">{plan.title}</p></td>
                          <td className="px-3 py-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCls}`}><span className="h-1 w-1 rounded-full bg-current" />{statusText}</span></td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatRupiah(plan.total_budget)}</td>
                          <td className="px-3 py-2 tabular-nums text-slate-500 dark:text-slate-400">{fmtDate(plan.start_date)} – {fmtDate(plan.end_date)}</td>
                          <td className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{plan.creator?.name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Sticky save bar for unsaved limit edits */}
      <AnimatePresence>
        {isDirty && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(640px,calc(100%-2rem))] items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="min-w-0 text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-100">{dirtyMonths.length} {dirtyMonths.length === 1 ? 'month' : 'months'} changed</p>
              <p className="truncate text-[10px] text-slate-400">New annual cap {formatRupiah(monthlyData.reduce((s, m) => s + m.limit, 0))}{isValidated ? ' · Finance validation will be reset' : ''}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => setMonthlyData(serverMonthly)} disabled={processing} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"><Undo2 className="h-3.5 w-3.5" />Discard</button>
              <button type="button" onClick={handleSaveLimits} disabled={processing} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save limits</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create budget drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDrawer(false)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Initialize budget</h3>
                  <p className="mt-0.5 text-[11px] text-slate-400">The annual cap is split evenly over 12 months (rounding goes to December). Monthly limits can be changed afterwards.</p>
                </div>
                <button type="button" aria-label="Close" onClick={() => setShowDrawer(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleCreateSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div><span className={label}>PT / Company</span><SearchableSelect value={formData.company_id} onChange={val => setFormData(prev => ({ ...prev, company_id: val }))} options={metadata.companies} placeholder="Select company..." searchPlaceholder="Search company..." /></div>
                <div><span className={label}>Brand</span><SearchableSelect value={formData.brand_id} onChange={val => setFormData(prev => ({ ...prev, brand_id: val }))} options={metadata.brands} placeholder="Select brand..." searchPlaceholder="Search brand..." /></div>
                <div><span className={label}>Line of business</span><SearchableSelect value={formData.lob_id} onChange={val => setFormData(prev => ({ ...prev, lob_id: val }))} options={metadata.lobs} placeholder="Select LOB..." searchPlaceholder="Search LOB..." /></div>
                <div><span className={label}>Fiscal year</span><select value={formData.fiscal_year} onChange={e => setFormData(prev => ({ ...prev, fiscal_year: e.target.value }))} className={`${fieldClass} w-full`}>{FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}</select></div>
                <div>
                  <span className={label}>Annual cap *</span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Rp</span>
                    <input inputMode="numeric" placeholder="1.000.000.000" value={formData.total_budget} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setFormData(prev => ({ ...prev, total_budget: v ? parseInt(v, 10).toLocaleString('id-ID') : '' })); }} className={`${fieldClass} w-full pl-9`} />
                  </div>
                </div>
                {createTotal > 0 && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <p className="font-medium">Monthly preview</p>
                    <p className="mt-1 tabular-nums">Jan–Nov: {formatRupiah(Math.floor(createTotal / 12))} · Des: {formatRupiah(createTotal - Math.floor(createTotal / 12) * 11)}</p>
                  </motion.div>
                )}
                {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{formError}</div>}
              </form>
              <div className="flex gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                <button type="button" onClick={() => setShowDrawer(false)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="button" onClick={handleCreateSubmit} disabled={submitting} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Initialize</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <MarketingBudgetShiftDrawer isOpen={showShiftDrawer} onClose={() => setShowShiftDrawer(false)} activeBudget={activeBudget} monthlyData={monthlyData} onShiftSuccess={loadBudget} />
      <MarketingBudgetShiftHistoryModal isOpen={showShiftHistoryModal} onClose={() => setShowShiftHistoryModal(false)} shifts={shifts} onDecisionSuccess={loadBudget} />
    </div>
  );
}
