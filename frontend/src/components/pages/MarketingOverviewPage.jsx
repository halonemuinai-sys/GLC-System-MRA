'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  Info,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
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
const CURRENT_YEAR = new Date().getFullYear();

const STATUS_CONFIG = {
  APPROVED: { label: 'Approved', color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200/60', icon: CheckCircle },
  PENDING_APPROVAL: { label: 'Pending', color: '#f97316', bg: 'bg-amber-500/10', text: 'text-amber-655 dark:text-amber-400', border: 'border-amber-200/60', icon: Clock },
  REJECTED: { label: 'Rejected', color: '#f43f5e', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200/60', icon: XCircle },
  DRAFT: { label: 'Draft', color: '#64748b', bg: 'bg-neutral-500/10', text: 'text-neutral-500', border: 'border-neutral-200/60', icon: Info },
};

const GANTT_BAR_COLORS = {
  APPROVED: '#10b981',
  PENDING_APPROVAL: '#f97316',
  REJECTED: '#f43f5e',
  DRAFT: '#64748b',
};

// ── Gantt Hover Tooltip (compact card) ────────────────────────────────────────
function GanttTooltip({ plan, position }) {
  if (!plan) return null;
  const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;
  const fmt = d => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      className="fixed z-[9999] pointer-events-none w-[256px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl shadow-black/15 dark:shadow-black/40 p-3.5 space-y-2"
      style={{ top: position.y, left: position.x }}
    >
      <div>
        <p className="text-[11px] font-black text-neutral-900 dark:text-white leading-tight line-clamp-2">{plan.title}</p>
        {plan.company?.name && <p className="text-[10px] text-neutral-400 mt-0.5">{plan.company.name}</p>}
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
        <StatusIcon className="w-2.5 h-2.5" />{cfg.label}
      </span>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
        <div><p className="text-neutral-400 font-medium">Mulai</p><p className="font-bold text-neutral-700 dark:text-neutral-300">{fmt(plan.event_start_date)}</p></div>
        <div><p className="text-neutral-400 font-medium">Selesai</p><p className="font-bold text-neutral-700 dark:text-neutral-300">{fmt(plan.event_end_date)}</p></div>
        <div className="col-span-2"><p className="text-neutral-400 font-medium">Anggaran</p><p className="font-black text-indigo-600 dark:text-indigo-400">{formatIDR(plan.total_budget)}</p></div>
      </div>
      {plan.creator && (
        <p className="text-[9px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-1.5">
          Diajukan: <span className="font-bold text-neutral-600 dark:text-neutral-300">{plan.creator.name}</span>
        </p>
      )}
    </motion.div>
  );
}function GanttModal({ plans, fiscalYear, onClose }) {
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const scrollRef = useRef(null);

  const yr = Number(fiscalYear);
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayYear = today.getFullYear();
  const isCurrentYear = todayYear === yr;

  const MONTH_COL_W = 100;
  const ROW_H = 68;
  const HEADER_H = 64;
  const LEFT_W = 280;
  const MONTHS_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const totalTimelineW = 12 * MONTH_COL_W;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    if (isCurrentYear && scrollRef.current) {
      const target = Math.max(0, (todayMonth - 2.5) * MONTH_COL_W);
      setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollLeft = target; }, 80);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const brands = useMemo(() => {
    const set = new Set();
    plans.forEach(p => { if (p.brand?.name) set.add(p.brand.name); });
    return [...set].sort();
  }, [plans]);

  const filtered = useMemo(() => {
    let arr = [...plans].filter(p => {
      const s = p.event_start_date || p.start_date;
      const e = p.event_end_date || p.end_date;
      if (!s && !e) return false;
      const sY = s ? new Date(s).getFullYear() : yr;
      const eY = e ? new Date(e).getFullYear() : yr;
      return sY <= yr && eY >= yr;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(p => p.title?.toLowerCase().includes(q) || p.company?.name?.toLowerCase().includes(q));
    }
    if (brandFilter) arr = arr.filter(p => p.brand?.name === brandFilter);
    return arr.sort((a, b) => (a.event_start_date || a.start_date || '').localeCompare(b.event_start_date || b.start_date || ''));
  }, [plans, search, brandFilter, yr]);

  const kpis = useMemo(() => {
    let totalBudget = 0, totalActual = 0, approved = 0, pending = 0, rejected = 0, draft = 0;
    filtered.forEach(p => {
      totalBudget += Number(p.total_budget || 0);
      if (p.items) p.items.forEach(it => { totalActual += Number(it.actual_amount || 0); });
      if (p.status === 'APPROVED') approved++;
      else if (p.status === 'PENDING_APPROVAL') pending++;
      else if (p.status === 'REJECTED') rejected++;
      else draft++;
    });

    return { totalBudget, totalActual, approved, pending, rejected, draft, total: filtered.length };
  }, [filtered]);

  const getBarPos = (plan) => {
    const s = plan.event_start_date || plan.start_date;
    const e = plan.event_end_date || plan.end_date;
    if (!s || !e) return null;
    const sd = new Date(s);
    const ed = new Date(e);
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return null;
    const startFrac = sd.getFullYear() < yr ? 0 : Math.max(0, sd.getMonth() + (sd.getDate() - 1) / 31);
    const endFrac = ed.getFullYear() > yr ? 12 : Math.min(12, ed.getMonth() + ed.getDate() / 31);
    if (endFrac <= startFrac) return null;
    return { left: startFrac * MONTH_COL_W, width: Math.max(MONTH_COL_W * 0.22, (endFrac - startFrac) * MONTH_COL_W - 3) };
  };

  const getMsX = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    if (d.getFullYear() < yr) return 0;
    if (d.getFullYear() > yr) return totalTimelineW;
    return (d.getMonth() + (d.getDate() - 1) / 31) * MONTH_COL_W;
  };

  const scrollToToday = () => {
    if (scrollRef.current && isCurrentYear) {
      scrollRef.current.scrollTo({ left: Math.max(0, (todayMonth - 2.5) * MONTH_COL_W), behavior: 'smooth' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] flex items-stretch justify-center bg-black/60 backdrop-blur-md"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 15 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-screen h-screen flex flex-col bg-white dark:bg-neutral-950 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 dark:border-neutral-850 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-neutral-900 dark:text-white leading-tight">Campaign Timeline {fiscalYear}</p>
              <p className="text-[10px] text-neutral-450 dark:text-neutral-500 font-bold mt-0.5">{filtered.length} campaign · Esc untuk tutup</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4">
              {Object.entries(STATUS_CONFIG).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                  <span className="w-2.5 h-2.5 rounded-md flex-shrink-0" style={{ backgroundColor: c.color }} />
                  {c.label}
                </span>
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-550 dark:text-neutral-400 transition-colors flex items-center justify-center cursor-pointer flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div className="flex-shrink-0 flex items-center gap-2.5 px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-850 bg-neutral-50/70 dark:bg-neutral-900/10 overflow-x-auto">
          {[
            { label: 'Total Campaign', value: String(kpis.total), color: '#2563eb' },
            { label: 'Approved', value: String(kpis.approved), color: '#10b981' },
            { label: 'Pending', value: String(kpis.pending), color: '#f59e0b' },
            { label: 'Ditolak', value: String(kpis.rejected), color: '#ef4444' },
            { label: 'Draft', value: String(kpis.draft), color: '#94a3b8' },
            { label: 'Total Anggaran', value: formatIDRCompact(kpis.totalBudget), color: '#6366f1' },
            { label: 'Realisasi', value: formatIDRCompact(kpis.totalActual), color: '#10b981' },
            { label: 'Sisa', value: formatIDRCompact(kpis.totalBudget - kpis.totalActual), color: '#64748b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-shrink-0 flex items-center gap-2.5 bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 rounded-xl px-3.5 py-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div>
                <p className="text-[9px] text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider leading-none">{label}</p>
                <p className="text-xs text-neutral-850 dark:text-white font-black mt-1 leading-none">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-850 bg-white dark:bg-neutral-950">
          <div className="flex items-center gap-2.5 flex-1 max-w-lg">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                placeholder="Cari campaign atau perusahaan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 text-xs text-neutral-850 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {brands.length > 0 && (
              <select
                value={brandFilter}
                onChange={e => setBrandFilter(e.target.value)}
                className="h-9 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 text-xs text-neutral-800 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 min-w-[130px]"
              >
                <option value="">Semua Brand</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isCurrentYear && (
              <button
                onClick={scrollToToday}
                className="h-9 px-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/10 text-xs font-bold transition-all hover:bg-blue-100/70 cursor-pointer"
              >
                Hari Ini
              </button>
            )}
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: -MONTH_COL_W * 3, behavior: 'smooth' })}
              className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center text-neutral-550 dark:text-neutral-400 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: MONTH_COL_W * 3, behavior: 'smooth' })}
              className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center text-neutral-550 dark:text-neutral-400 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── CONTENT: scroll area ── */}
        <div ref={scrollRef} className="flex-1 overflow-auto relative bg-neutral-50/20 dark:bg-neutral-950/20">
          <div style={{ minWidth: LEFT_W + totalTimelineW + 1 }}>
            
            {/* Timeline Headers */}
            <div className="sticky top-0 z-10 flex h-16 bg-neutral-50 dark:bg-neutral-900 border-b-2 border-neutral-200 dark:border-neutral-800">
              {/* Sticky Top-Left Corner cell */}
              <div className="sticky left-0 z-12 w-[280px] flex-shrink-0 h-16 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-end px-5 pb-3">
                <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">Campaign / Detail</span>
              </div>

              {/* Top-Right scroll headers */}
              <div className="flex-1 min-w-[1200px] relative flex flex-col">
                {/* TODAY marker text tag */}
                {isCurrentYear && (
                  <div
                    className="absolute top-1 z-5 pointer-events-none"
                    style={{ left: (todayMonth - 0.5) * MONTH_COL_W, transform: 'translateX(-50%)' }}
                  >
                    <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full tracking-wider shadow">TODAY</span>
                  </div>
                )}
                
                {/* Quarters row */}
                <div className="flex h-8 items-center border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q, qidx) => (
                    <div
                      key={q}
                      className="flex-shrink-0 flex items-center justify-center text-[10px] font-black text-neutral-700 dark:text-neutral-300 border-r border-neutral-200 dark:border-neutral-800 last:border-r-0"
                      style={{ width: MONTH_COL_W * 3 }}
                    >
                      {q} · FY {fiscalYear}
                    </div>
                  ))}
                </div>

                {/* Months row */}
                <div className="flex h-8 items-center">
                  {MONTHS_FULL.map((m, i) => {
                    const isCur = isCurrentYear && i + 1 === todayMonth;
                    return (
                      <div
                        key={m}
                        className={`flex-shrink-0 flex items-center justify-center relative h-full text-[10px] font-extrabold border-r border-neutral-200 dark:border-neutral-800/60 last:border-r-0 ${
                          isCur ? 'text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-500/[0.04]' : 'text-neutral-400 dark:text-neutral-500'
                        }`}
                        style={{ width: MONTH_COL_W }}
                      >
                        {MONTHS_SHORT[i]}
                        {isCur && <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Vertical Today Line indicator */}
            {isCurrentYear && (
              <>
                <div
                  className="absolute bottom-0 pointer-events-none bg-blue-600/[0.03] dark:bg-blue-500/[0.01]"
                  style={{ top: HEADER_H, left: LEFT_W + (todayMonth - 1) * MONTH_COL_W, width: MONTH_COL_W, zIndex: 0 }}
                />
                <div
                  className="absolute bottom-0 pointer-events-none w-0.5 bg-blue-600/30 dark:bg-blue-500/20"
                  style={{ top: HEADER_H, left: LEFT_W + (todayMonth - 0.5) * MONTH_COL_W }}
                />
              </>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="py-24 flex flex-col items-center gap-3 text-neutral-400 dark:text-neutral-500">
                <Calendar className="w-12 h-12 opacity-35" />
                <p className="text-sm font-semibold">Tidak ada campaign ditemukan untuk filter saat ini.</p>
              </div>
            )}

            {/* Rows list */}
            {filtered.map((plan, idx) => {
              const color = GANTT_BAR_COLORS[plan.status] || GANTT_BAR_COLORS.DRAFT;
              const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT;
              const totalBudget = Number(plan.total_budget || 0);
              const totalActual = plan.items ? plan.items.reduce((s, it) => s + Number(it.actual_amount || 0), 0) : 0;
              const progress = totalBudget > 0 ? Math.min(100, (totalActual / totalBudget) * 100) : 0;
              const barPos = getBarPos(plan);
              const rowClass = idx % 2 === 0
                ? 'bg-white dark:bg-neutral-900'
                : 'bg-neutral-50/50 dark:bg-neutral-950/20';

              const fmtMs = d => d ? new Date(d).toLocaleDateString('id-ID', { day:'numeric', month:'short' }) : '';
              const milestones = [
                { key: 'cta', date: plan.start_date, label: 'CTA Mulai', color: '#6366f1' },
                { key: 'event', date: plan.event_start_date, label: 'Event Mulai', color: '#10b981' },
                { key: 'end', date: plan.event_end_date, label: 'Event Selesai', color: '#f59e0b' },
              ].filter(m => m.date && getMsX(m.date) !== null);

              return (
                <div key={plan.id} className={`flex h-[68px] border-b border-neutral-100 dark:border-neutral-850 hover:bg-neutral-100/30 dark:hover:bg-neutral-800/10 transition-colors relative ${rowClass}`}>
                  {/* Sticky left cell info */}
                  <div className={`sticky left-0 z-5 w-[280px] flex-shrink-0 px-5 flex flex-col justify-center gap-1.5 border-r border-neutral-200 dark:border-neutral-800 ${rowClass}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-md flex-shrink-0" style={{ backgroundColor: color }} />
                      <p className="text-xs font-bold text-neutral-850 dark:text-neutral-150 truncate leading-tight flex-1">{plan.title}</p>
                    </div>
                    {plan.company?.name && (
                      <p className="text-[10px] text-neutral-450 dark:text-neutral-500 pl-4.5 leading-none">{plan.company.name}</p>
                    )}
                    <div className="flex items-center gap-2 pl-4.5">
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '15', color }}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-400">
                        {formatIDRCompact(totalBudget)}
                      </span>
                      {totalBudget > 0 && (
                        <span className="text-[9px] font-bold text-neutral-400">{Math.round(progress)}%</span>
                      )}
                    </div>
                    {totalBudget > 0 && (
                      <div className="h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden ml-4.5 mt-0.5">
                        <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${progress}%` }} />
                      </div>
                    )}
                  </div>

                  {/* Scrollable timeline cell bar drawing */}
                  <div className="flex-1 min-w-[1200px] relative">
                    {/* Vertical grid lines */}
                    {Array.from({ length: 12 }).map((_, ci) => (
                      <div
                        key={ci}
                        className="absolute top-0 bottom-0 border-r border-neutral-100/60 dark:border-neutral-850/40 pointer-events-none"
                        style={{ left: ci * MONTH_COL_W, width: 1 }}
                      />
                    ))}
                    
                    {/* Gantt Bar */}
                    {barPos && (
                      <div
                        className="absolute top-3.5 z-3 group cursor-pointer"
                        style={{ left: barPos.left + 2, width: barPos.width, height: 28 }}
                      >
                        <div
                          className="w-full h-full rounded-xl overflow-hidden relative border transition-all"
                          style={{ backgroundColor: color + '12', borderColor: color + '48' }}
                        >
                          {progress > 0 && (
                            <div className="absolute inset-y-0 left-0" style={{ backgroundColor: color + '30', width: `${progress}%` }} />
                          )}
                          <div className="absolute inset-0 flex items-center px-3.5 pointer-events-none select-none">
                            <span className="text-[10px] font-black truncate" style={{ color }}>{plan.title}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Milestone markers */}
                    {milestones.map(ms => {
                      const x = getMsX(ms.date);
                      if (x === null) return null;
                      return (
                        <div
                          key={ms.key}
                          title={`${ms.label}: ${fmtMs(ms.date)}`}
                          className="absolute bottom-1.5 z-4 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-neutral-900 shadow cursor-default"
                          style={{ left: x - 5, backgroundColor: ms.color, boxShadow: `0 0 0 1px ${ms.color}` }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-neutral-200 dark:border-neutral-850 bg-neutral-50 dark:bg-neutral-950/40">
          <div className="flex items-center gap-3 text-[10px] text-neutral-450 dark:text-neutral-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Milestones:</span>
            {[{ label: 'CTA Mulai', color: '#6366f1' }, { label: 'Event Mulai', color: '#10b981' }, { label: 'Event Selesai', color: '#f59e0b' }].map(m => (
              <span key={m.label} className="flex items-center gap-1.5 normal-case font-medium text-neutral-600 dark:text-neutral-400">
                <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: m.color }} />
                {m.label}
              </span>
            ))}
          </div>
          <button
            onClick={() => {
              // Quick mockup action to alert user download is ready
              alert('Fungsi download timeline ke PDF/Image sedang disiapkan.');
            }}
            className="flex items-center gap-2 h-9 px-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Download Timeline
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Gantt Chart (compact inline card) ─────────────────────────────────────────
function GanttChart({ plans, fiscalYear }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltip, setTooltip] = useState({ plan: null, x: 0, y: 0 });
  const scrollRef = useRef(null);

  const COMPACT_MAX = 10;
  const CURRENT_YEAR_N = new Date().getFullYear();
  const CURRENT_MONTH_N = new Date().getMonth() + 1;

  const sorted = useMemo(() => {
    const yr = Number(fiscalYear);
    return [...plans]
      .filter(p => {
        const s = p.event_start_date || p.start_date;
        const e = p.event_end_date || p.end_date;
        if (!s && !e) return false;
        const sY = s ? new Date(s).getFullYear() : yr;
        const eY = e ? new Date(e).getFullYear() : yr;
        return sY <= yr && eY >= yr;
      })
      .sort((a, b) => (a.event_start_date || a.start_date || '').localeCompare(b.event_start_date || b.start_date || ''));
  }, [plans, fiscalYear]);

  const displayed = sorted.slice(0, COMPACT_MAX);
  const remaining = sorted.length - COMPACT_MAX;

  const showTooltip = (e, plan) => {
    const TW = 264, TH = 190;
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = e.clientX + 14, y = e.clientY - 10;
    if (x + TW > vw - 8) x = e.clientX - TW - 10;
    if (y + TH > vh - 8) y = vh - TH - 8;
    if (y < 8) y = 8;
    setTooltip({ plan, x, y });
  };
  const hideTooltip = () => setTooltip({ plan: null, x: 0, y: 0 });

  return (
    <>
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <h2 className="text-sm font-extrabold text-neutral-900 dark:text-white whitespace-nowrap">
              Campaign Timeline {fiscalYear}
            </h2>
            <span className="text-[10px] font-bold text-neutral-400 hidden sm:inline">({sorted.length} campaign)</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Legend (hidden on small) */}
            <div className="hidden xl:flex items-center gap-3 mr-2">
              {Object.entries(STATUS_CONFIG).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1 text-[10px] font-bold text-neutral-400">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: c.color }} />{c.label}
                </span>
              ))}
            </div>
            {/* Scroll */}
            <button onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            {/* Fullscreen */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-[10px] font-extrabold transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-500/20 ml-0.5"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">Fullscreen</span>
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-neutral-400">
            <Calendar className="w-8 h-8 opacity-30" />
            <p className="text-xs font-medium">Belum ada campaign untuk tahun {fiscalYear}</p>
          </div>
        ) : (
          <div className="flex">
            {/* Fixed left column */}
            <div className="flex-shrink-0 w-[192px] border-r border-neutral-100 dark:border-neutral-800">
              <div className="h-8 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50 flex items-center px-3">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-400">Campaign</span>
              </div>
              {displayed.map(plan => (
                <div key={plan.id} className="h-10 flex items-center px-3 border-b border-neutral-100/60 dark:border-neutral-800/40 gap-2 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: GANTT_BAR_COLORS[plan.status] || GANTT_BAR_COLORS.DRAFT }} />
                  <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200 truncate leading-tight">{plan.title}</p>
                </div>
              ))}
              {remaining > 0 && (
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="w-full h-10 flex items-center px-3 gap-2 text-[10px] font-bold text-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 transition-colors border-b border-neutral-100/60 dark:border-neutral-800/40 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  +{remaining} lainnya — buka fullscreen
                </button>
              )}
            </div>

            {/* Scrollable right */}
            <div ref={scrollRef} className="flex-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
              <div className="min-w-[680px]">
                {/* Month header */}
                <div className="grid grid-cols-12 h-8 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50">
                  {MONTHS_SHORT.map((m, i) => {
                    const isCur = Number(fiscalYear) === CURRENT_YEAR_N && (i + 1) === CURRENT_MONTH_N;
                    return (
                      <div key={m} className={`flex items-center justify-center text-[9px] font-extrabold uppercase tracking-wide border-r border-neutral-100/60 dark:border-neutral-800/50 last:border-r-0 ${isCur ? 'text-indigo-500' : 'text-neutral-400 dark:text-neutral-500'}`}>
                        {m}{isCur && <span className="ml-0.5 w-1 h-1 rounded-full bg-indigo-500 inline-block" />}
                      </div>
                    );
                  })}
                </div>

                {/* Rows */}
                {displayed.map(plan => {
                  const yr = Number(fiscalYear);
                  const s = plan.event_start_date || plan.start_date;
                  const e = plan.event_end_date || plan.end_date;
                  const sd = s ? new Date(s) : null;
                  const ed = e ? new Date(e) : null;
                  const colStart = sd ? (sd.getFullYear() < yr ? 1 : Math.max(1, sd.getMonth() + 1)) : 1;
                  const colEnd = ed ? (ed.getFullYear() > yr ? 12 : Math.min(12, ed.getMonth() + 1)) : 12;
                  const span = Math.max(1, colEnd - colStart + 1);
                  const color = GANTT_BAR_COLORS[plan.status] || GANTT_BAR_COLORS.DRAFT;
                  const totalBudget = Number(plan.total_budget || 0);
                  const totalActual = plan.items ? plan.items.reduce((sum, it) => sum + Number(it.actual_amount || 0), 0) : 0;
                  const progress = totalBudget > 0 ? Math.min(100, (totalActual / totalBudget) * 100) : 0;

                  return (
                    <div key={plan.id} className="relative grid grid-cols-12 h-10 border-b border-neutral-100/60 dark:border-neutral-800/40 hover:bg-neutral-50/30 dark:hover:bg-neutral-800/10 transition-colors">
                      {Number(fiscalYear) === CURRENT_YEAR_N && (
                        <div className="absolute inset-y-0 bg-blue-50/40 dark:bg-blue-500/[0.03] pointer-events-none" style={{ left: `${((CURRENT_MONTH_N - 1) / 12) * 100}%`, width: `${(1 / 12) * 100}%` }} />
                      )}
                      {Array.from({ length: 12 }).map((_, ci) => (
                        <div key={ci} className="border-r border-neutral-100/40 dark:border-neutral-800/30 last:border-r-0" />
                      ))}
                      <div
                        className="absolute inset-y-0 flex items-center px-1"
                        style={{ left: `${((colStart - 1) / 12) * 100}%`, width: `${(span / 12) * 100}%` }}
                        onMouseMove={e => showTooltip(e, plan)}
                        onMouseLeave={hideTooltip}
                      >
                        <div 
                          className="relative w-full rounded-xl overflow-hidden cursor-pointer transition-all hover:scale-[1.02] shadow-sm hover:shadow flex items-center px-2.5" 
                          style={{ height: 26, backgroundColor: color, border: `1px solid ${color}` }}
                        >
                          {progress > 0 && (
                            <div className="absolute inset-y-0 left-0 bg-black/15 pointer-events-none rounded-l-xl" style={{ width: `${progress}%` }} />
                          )}
                          <div className="relative z-10 flex items-center w-full justify-between pointer-events-none text-white text-[9px] font-black tracking-tight select-none">
                            {span >= 3 ? (
                              <>
                                <span className="truncate max-w-[55%]">{plan.title}</span>
                                <span className="shrink-0">{formatIDRCompact(plan.total_budget)}</span>
                              </>
                            ) : (
                              <span className="truncate w-full text-center">{formatIDRCompact(plan.total_budget)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* "more" placeholder rows */}
                {remaining > 0 && (
                  <div className="h-10 grid grid-cols-12 border-b border-neutral-100/60 dark:border-neutral-800/40 opacity-30">
                    {Array.from({ length: 12 }).map((_, ci) => (
                      <div key={ci} className="border-r border-neutral-100/40 dark:border-neutral-800/30 last:border-r-0" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {tooltip.plan && <GanttTooltip plan={tooltip.plan} position={{ x: tooltip.x, y: tooltip.y }} />}

      <AnimatePresence>
        {isFullscreen && (
          <GanttModal plans={plans} fiscalYear={fiscalYear} onClose={() => setIsFullscreen(false)} />
        )}
      </AnimatePresence>
    </>
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

  const CARD_THEMES = {
    blue: {
      border: 'border-blue-500/20 dark:border-blue-500/10',
      indicator: 'bg-blue-600',
      iconBg: 'bg-gradient-to-br from-blue-500/15 to-blue-500/5 border-blue-500/20',
      iconText: 'text-blue-600 dark:text-blue-455',
      glow: 'bg-blue-500/10 dark:bg-blue-500/5'
    },
    emerald: {
      border: 'border-emerald-500/20 dark:border-emerald-500/10',
      indicator: 'bg-emerald-600',
      iconBg: 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/20',
      iconText: 'text-emerald-600 dark:text-emerald-455',
      glow: 'bg-emerald-500/10 dark:bg-emerald-500/5'
    },
    amber: {
      border: 'border-amber-500/20 dark:border-amber-500/10',
      indicator: 'bg-amber-600',
      iconBg: 'bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-amber-500/20',
      iconText: 'text-amber-600 dark:text-amber-455',
      glow: 'bg-amber-500/10 dark:bg-amber-500/5'
    },
    slate: {
      border: 'border-slate-500/20 dark:border-slate-500/10',
      indicator: 'bg-slate-500',
      iconBg: 'bg-gradient-to-br from-slate-500/15 to-slate-500/5 border-slate-500/20',
      iconText: 'text-slate-500 dark:text-slate-400',
      glow: 'bg-slate-500/10 dark:bg-slate-500/5'
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Overview & Analytics
            </h1>
            <p className="text-neutral-500 dark:text-neutral-450 text-xs mt-0.5">
              Visualisasi timeline campaign — ringkasan anggaran dan realisasi per periode.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={fiscalYear}
            onChange={e => setFiscalYear(e.target.value)}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-455 focus:outline-none shadow-sm font-semibold"
          >
            {FISCAL_YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>Tahun {y}</option>
            ))}
          </select>
          <button
            onClick={loadPlans}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 shadow-sm transition-colors cursor-pointer"
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
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <span className="text-xs text-neutral-455 font-bold">Memuat data overview...</span>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Anggaran', value: formatIDRCompact(kpis.totalBudget), sub: `${kpis.total} campaign`, theme: 'blue', icon: DollarSign },
              { label: 'Realisasi Terbayar', value: formatIDRCompact(kpis.totalActual), sub: `${kpis.burnRate.toFixed(1)}% burn rate`, theme: 'emerald', icon: TrendingUp },
              { label: 'Sisa Anggaran', value: formatIDRCompact(kpis.totalBudget - kpis.totalActual), sub: 'belum terserap', theme: 'amber', icon: TrendingDown },
              { label: 'Status Campaign', value: `${kpis.approved} Approved`, sub: `${kpis.pending} pending · ${kpis.rejected} ditolak`, theme: 'slate', icon: Layers },
            ].map(({ label, value, sub, theme, icon: Icon }, idx) => {
              const currentTheme = CARD_THEMES[theme];
              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4, ease: 'easeOut' }}
                  className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-neutral-200/40 dark:hover:shadow-neutral-950/30 hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl group-hover:opacity-100 opacity-60 transition-opacity duration-350 ${currentTheme.glow}`} />
                  <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md transition-all duration-300 group-hover:top-3 group-hover:bottom-3 ${currentTheme.indicator}`} />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${currentTheme.iconBg}`}>
                      <Icon className={`w-5.5 h-5.5 ${currentTheme.iconText}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider leading-none">{label}</p>
                      <h3 className="text-lg font-black text-neutral-900 dark:text-white truncate mt-1.5 leading-none">{value}</h3>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2 font-semibold truncate leading-none">{sub}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Gantt Chart */}
          <GanttChart plans={plans} fiscalYear={fiscalYear} />
        </>
      )}
    </div>
  );
}
