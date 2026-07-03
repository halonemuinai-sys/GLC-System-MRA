'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  Calendar,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { apiClient } from '@/lib/apiClient';

const formatIDR = (val) => {
  if (!val && val !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
};

const formatIDRCompact = (val) => {
  const n = Number(val || 0);
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}Rb`;
  return `Rp ${n}`;
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const STATUS_CONFIG = {
  APPROVED: { label: 'Approved', color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/60', icon: CheckCircle },
  PENDING_APPROVAL: { label: 'Pending', color: '#f59e0b', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200/60', icon: Clock },
  REJECTED: { label: 'Rejected', color: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200/60', icon: XCircle },
  DRAFT: { label: 'Draft', color: '#94a3b8', bg: 'bg-neutral-500/10', text: 'text-neutral-500', border: 'border-neutral-200/60', icon: Info },
};

const GANTT_COLORS = {
  APPROVED: { bar: 'bg-emerald-500', light: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300' },
  PENDING_APPROVAL: { bar: 'bg-amber-500', light: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-700 dark:text-amber-300' },
  REJECTED: { bar: 'bg-red-400', light: 'bg-red-400/10', border: 'border-red-400/30', text: 'text-red-600 dark:text-red-400' },
  DRAFT: { bar: 'bg-neutral-400', light: 'bg-neutral-400/10', border: 'border-neutral-300/30', text: 'text-neutral-500' },
};

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

// ── Gantt Tooltip (floating, fixed positioning to avoid container clipping) ──────
function GanttTooltip({ plan, position }) {
  if (!plan) return null;
  const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;

  const startLabel = plan.event_start_date
    ? new Date(plan.event_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
  const endLabel = plan.event_end_date
    ? new Date(plan.event_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 4, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="fixed z-[9999] pointer-events-none w-[260px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/40 p-3.5 space-y-2"
      style={{ top: position.y, left: position.x }}
    >
      <div>
        <p className="text-[11px] font-black text-neutral-900 dark:text-white leading-tight line-clamp-2">{plan.title}</p>
        <p className="text-[10px] text-neutral-400 mt-0.5">{plan.company?.name}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          <StatusIcon className="w-2.5 h-2.5" />
          {cfg.label}
        </span>
        {plan.pipeline && (
          <span className="text-[9px] text-neutral-400 font-bold">
            Step {plan.pipeline.currentStep}/{plan.pipeline.totalSteps || '?'}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div>
          <p className="text-neutral-400 font-medium">Mulai</p>
          <p className="font-bold text-neutral-700 dark:text-neutral-300">{startLabel}</p>
        </div>
        <div>
          <p className="text-neutral-400 font-medium">Selesai</p>
          <p className="font-bold text-neutral-700 dark:text-neutral-300">{endLabel}</p>
        </div>
        <div className="col-span-2">
          <p className="text-neutral-400 font-medium">Total Anggaran</p>
          <p className="font-black text-indigo-600 dark:text-indigo-400">{formatIDR(plan.total_budget)}</p>
        </div>
      </div>
      {plan.creator && (
        <p className="text-[9px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2">
          Diajukan oleh <span className="font-bold text-neutral-600 dark:text-neutral-300">{plan.creator.name}</span>
        </p>
      )}
    </motion.div>
  );
}

// ── Gantt Chart ────────────────────────────────────────────────────────────────
function GanttChart({ plans, fiscalYear }) {
  const [tooltip, setTooltip] = useState({ plan: null, x: 0, y: 0 });
  const containerRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);
  const scrollRef = useRef(null);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' });

  const sorted = useMemo(() => {
    return [...plans].sort((a, b) => {
      const aStart = a.event_start_date || a.start_date || '';
      const bStart = b.event_start_date || b.start_date || '';
      return aStart.localeCompare(bStart);
    });
  }, [plans]);

  const TOOLTIP_W = 276;
  const TOOLTIP_H = 200; // approx height

  const showTooltip = (e, plan) => {
    // Use fixed viewport coordinates so the tooltip is never clipped by containers
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = e.clientX + 14;
    let y = e.clientY - 10;
    if (x + TOOLTIP_W > vw - 8) x = e.clientX - TOOLTIP_W - 10;
    if (y + TOOLTIP_H > vh - 8) y = vh - TOOLTIP_H - 8;
    if (y < 8) y = 8;
    setTooltip({ plan, x, y });
  };
  const hideTooltip = () => setTooltip({ plan: null, x: 0, y: 0 });

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4.5 h-4.5 text-indigo-500" />
          <h2 className="text-sm font-extrabold text-neutral-850 dark:text-white">
            Campaign Timeline — Gantt Chart {fiscalYear}
          </h2>
          <span className="text-[10px] font-bold text-neutral-400 ml-1">({sorted.length} campaign)</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-[10px] font-bold text-neutral-400">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cfg.color }} />
                {cfg.label}
              </span>
            ))}
          </div>
          {/* Scroll controls */}
          <div className="flex items-center gap-1">
            <button onClick={scrollLeft} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={scrollRight} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-neutral-400">
          <Calendar className="w-8 h-8 opacity-30" />
          <p className="text-xs font-medium">Belum ada campaign untuk tahun {fiscalYear}</p>
        </div>
      ) : (
        <div ref={containerRef} className="relative">
          <div className="flex">
            {/* Fixed left: campaign names */}
            <div className="flex-shrink-0 w-[200px] border-r border-neutral-100 dark:border-neutral-800">
              {/* Month header spacer */}
              <div className="h-10 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/30" />
              {/* Campaign name rows */}
              {sorted.map((plan, idx) => (
                <div
                  key={plan.id}
                  className="h-11 flex items-center px-3 border-b border-neutral-100/60 dark:border-neutral-800/40 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                >
                  <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate leading-tight">
                    {plan.title}
                  </p>
                </div>
              ))}
            </div>

            {/* Scrollable right: months + bars */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto scrollbar-thin" onScroll={e => setScrollX(e.target.scrollLeft)}>
              <div className="min-w-[700px]">
                {/* Month header */}
                <div className="grid grid-cols-12 h-10 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/30">
                  {MONTHS_SHORT.map((m, i) => {
                    const isCurrent = Number(fiscalYear) === CURRENT_YEAR && (i + 1) === CURRENT_MONTH;
                    return (
                      <div key={m} className={`flex items-center justify-center text-[10px] font-extrabold uppercase tracking-wide border-r border-neutral-100 dark:border-neutral-800 last:border-r-0 ${isCurrent ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-500/10' : 'text-neutral-400'}`}>
                        {m}
                        {isCurrent && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />}
                      </div>
                    );
                  })}
                </div>

                {/* Campaign rows */}
                {sorted.map((plan) => {
                  const startDate = plan.event_start_date || plan.start_date;
                  const endDate = plan.event_end_date || plan.end_date;
                  const startMonth = startDate ? new Date(startDate).getMonth() + 1 : 1;
                  const endMonth = endDate ? new Date(endDate).getMonth() + 1 : 12;
                  const colStart = Math.max(1, startMonth);
                  const colEnd = Math.min(12, endMonth);
                  const span = colEnd - colStart + 1;
                  const cfg = GANTT_COLORS[plan.status] || GANTT_COLORS.DRAFT;

                  return (
                    <div key={plan.id} className="grid grid-cols-12 h-11 relative border-b border-neutral-100/60 dark:border-neutral-800/40 hover:bg-neutral-50/30 dark:hover:bg-neutral-800/10 transition-colors">
                      {/* Current month highlight column */}
                      {Number(fiscalYear) === CURRENT_YEAR && (
                        <div
                          className="absolute inset-y-0 bg-indigo-50/40 dark:bg-indigo-500/[0.04] pointer-events-none"
                          style={{ left: `${((CURRENT_MONTH - 1) / 12) * 100}%`, width: `${(1 / 12) * 100}%` }}
                        />
                      )}
                      {/* Column grid lines */}
                      {Array.from({ length: 12 }).map((_, ci) => (
                        <div key={ci} className="border-r border-neutral-100/40 dark:border-neutral-800/30 last:border-r-0" />
                      ))}
                      {/* Gantt bar */}
                      <div
                        className="absolute inset-y-0 flex items-center px-1"
                        style={{
                          left: `${((colStart - 1) / 12) * 100}%`,
                          width: `${(span / 12) * 100}%`,
                        }}
                        onMouseMove={(e) => showTooltip(e, plan)}
                        onMouseLeave={hideTooltip}
                      >
                        <motion.div
                          initial={{ scaleX: 0, originX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                          className={`w-full h-7 rounded-xl border ${cfg.light} ${cfg.border} flex items-center px-2.5 gap-2 cursor-pointer group overflow-hidden`}
                          title={plan.title}
                        >
                          {/* Status dot */}
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.bar} shadow-sm`} />
                          {/* Budget label if wide enough */}
                          {span >= 2 && (
                            <span className={`text-[9px] font-black truncate ${cfg.text}`}>
                              {formatIDRCompact(plan.total_budget)}
                            </span>
                          )}
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Tooltip rendered outside scroll/overflow containers via fixed positioning */}
      {tooltip.plan && (
        <GanttTooltip plan={tooltip.plan} position={{ x: tooltip.x, y: tooltip.y }} />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketingOverviewPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(String(CURRENT_YEAR));

  const FISCAL_YEAR_OPTIONS = useMemo(() => Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i)), []);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/marketing/plans', { params: { fiscal_year: fiscalYear } });
      setPlans(res || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let totalBudget = 0, totalActual = 0, approved = 0, pending = 0, rejected = 0;
    plans.forEach(p => {
      totalBudget += Number(p.total_budget || 0);
      if (p.items) p.items.forEach(it => { totalActual += Number(it.actual_amount || 0); });
      if (p.status === 'APPROVED') approved++;
      else if (p.status === 'PENDING_APPROVAL') pending++;
      else if (p.status === 'REJECTED') rejected++;
    });
    const burnRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    return { totalBudget, totalActual, burnRate, approved, pending, rejected, total: plans.length };
  }, [plans]);

  // ── Charts ────────────────────────────────────────────────────────────────
  const monthlyTrend = useMemo(() => {
    const data = MONTHS_SHORT.map((name, i) => ({ name, Budget: 0, Realisasi: 0 }));
    plans.forEach(p => {
      if (!p.items) return;
      p.items.forEach(it => {
        const m = Number(it.period_month) - 1;
        if (m >= 0 && m < 12) {
          data[m].Budget += Number(it.budget_amount || 0);
          data[m].Realisasi += Number(it.actual_amount || 0);
        }
      });
    });
    return data;
  }, [plans]);

  const brandBreakdown = useMemo(() => {
    const map = {};
    plans.forEach(p => {
      if (!p.items) return;
      p.items.forEach(it => {
        const name = it.m_brand?.name || 'Lain-lain';
        map[name] = (map[name] || 0) + Number(it.budget_amount || 0);
      });
    });
    return Object.entries(map)
      .map(([name, Budget]) => ({ name, Budget }))
      .sort((a, b) => b.Budget - a.Budget)
      .slice(0, 8);
  }, [plans]);

  const statusPieData = useMemo(() => [
    { name: 'Approved', value: kpis.approved, color: '#10b981' },
    { name: 'Pending', value: kpis.pending, color: '#f59e0b' },
    { name: 'Rejected', value: kpis.rejected, color: '#ef4444' },
  ].filter(d => d.value > 0), [kpis]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/25 shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Overview & Analytics
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
              Dashboard visual campaign — Gantt timeline, tren anggaran, dan distribusi realisasi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fiscalYear}
            onChange={e => setFiscalYear(e.target.value)}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none shadow-sm"
          >
            {FISCAL_YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>Tahun {y}</option>
            ))}
          </select>
          <button
            onClick={loadPlans}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 hover:text-indigo-500 shadow-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Memuat data overview...</span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Anggaran', value: formatIDRCompact(kpis.totalBudget), sub: `${kpis.total} campaign`, color: 'indigo', icon: DollarSign },
              { label: 'Realisasi Terbayar', value: formatIDRCompact(kpis.totalActual), sub: `${kpis.burnRate.toFixed(1)}% burn rate`, color: 'emerald', icon: TrendingUp },
              { label: 'Sisa Anggaran', value: formatIDRCompact(kpis.totalBudget - kpis.totalActual), sub: 'belum terserap', color: 'blue', icon: TrendingDown },
              { label: 'Status Campaign', value: `${kpis.approved} Approved`, sub: `${kpis.pending} pending · ${kpis.rejected} ditolak`, color: 'violet', icon: Layers },
            ].map(({ label, value, sub, color, icon: Icon }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group`}
              >
                <div className={`absolute -right-4 -top-4 w-20 h-20 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-colors`} />
                <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-${color}-500`} />
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-${color}-500/15 to-${color}-500/5 border border-${color}-500/20 flex items-center justify-center text-${color}-500 shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{label}</p>
                    <h3 className="text-base font-black text-neutral-850 dark:text-white truncate">{value}</h3>
                    <p className="text-[10px] text-neutral-400 mt-0.5 truncate">{sub}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Gantt Chart */}
          <GanttChart plans={plans} fiscalYear={fiscalYear} />

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly trend */}
            <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-extrabold text-neutral-850 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
                Tren Anggaran Bulanan vs Realisasi
              </h2>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ovGradBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="ovGradActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}Jt`} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => active && payload?.length ? (
                        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl text-[11px] space-y-1">
                          <p className="font-bold text-neutral-800 dark:text-white">{label}</p>
                          <p className="text-indigo-500">Anggaran: {formatIDR(payload[0]?.value)}</p>
                          <p className="text-emerald-500">Realisasi: {formatIDR(payload[1]?.value)}</p>
                        </div>
                      ) : null}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Budget" name="Anggaran" stroke="#6366f1" strokeWidth={2} fill="url(#ovGradBudget)" />
                    <Area type="monotone" dataKey="Realisasi" name="Realisasi" stroke="#10b981" strokeWidth={2} fill="url(#ovGradActual)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status pie + brand bar stacked */}
            <div className="space-y-4">
              {/* Status distribution pie */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-neutral-850 dark:text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4.5 h-4.5 text-indigo-500" />
                  Distribusi Status
                </h2>
                {statusPieData.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">Belum ada data</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="h-28 w-28 flex-shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={3} dataKey="value">
                            {statusPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            content={({ active, payload }) => active && payload?.length ? (
                              <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg shadow-xl text-[10px] font-bold">
                                <p style={{ color: payload[0].payload.color }}>{payload[0].name}: {payload[0].value}</p>
                              </div>
                            ) : null}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      {statusPieData.map(d => (
                        <div key={d.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-400">{d.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-neutral-800 dark:text-neutral-200">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top brand by budget */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-neutral-850 dark:text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4.5 h-4.5 text-indigo-500" />
                  Top Brand by Budget
                </h2>
                {brandBreakdown.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-4">Belum ada data</p>
                ) : (
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={brandBreakdown} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={v => `${(v / 1_000_000).toFixed(0)}Jt`} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={64} />
                        <RechartsTooltip
                          content={({ active, payload, label }) => active && payload?.length ? (
                            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2 rounded-lg shadow-xl text-[10px] font-bold">
                              <p className="text-neutral-800 dark:text-white">{label}</p>
                              <p className="text-indigo-500 mt-0.5">{formatIDR(payload[0].value)}</p>
                            </div>
                          ) : null}
                        />
                        <Bar dataKey="Budget" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={10} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
