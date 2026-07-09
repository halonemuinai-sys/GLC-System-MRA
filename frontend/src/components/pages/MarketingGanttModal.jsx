'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Info
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import {
  formatIDR,
  formatIDRCompact,
  STATUS_CONFIG,
  GANTT_BAR_COLORS,
  MONTHS_SHORT,
  MONTHS_FULL
} from './MarketingGanttUtils';

export default function MarketingGanttModal({ plans, fiscalYear, onClose }) {
  const { t } = useLanguage();
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
              <p className="text-sm font-black text-neutral-900 dark:text-white leading-tight">{t('marketing_ganttTitle')} {fiscalYear}</p>
              <p className="text-[10px] text-neutral-455 dark:text-neutral-500 font-bold mt-0.5">{filtered.length} campaign · Esc untuk tutup</p>
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
            { label: t('marketing_kpiTotal'), value: String(kpis.total), color: '#2563eb' },
            { label: t('marketing_kpiApproved'), value: String(kpis.approved), color: '#10b981' },
            { label: t('marketing_kpiPending'), value: String(kpis.pending), color: '#f59e0b' },
            { label: 'Ditolak', value: String(kpis.rejected), color: '#ef4444' },
            { label: t('marketing_kpiDraft'), value: String(kpis.draft), color: '#94a3b8' },
            { label: 'Total Anggaran', value: formatIDRCompact(kpis.totalBudget), color: '#6366f1' },
            { label: 'Realisasi', value: formatIDRCompact(kpis.totalActual), color: '#10b981' },
            { label: 'Sisa', value: formatIDRCompact(kpis.totalBudget - kpis.totalActual), color: '#64748b' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-shrink-0 flex items-center gap-2.5 bg-white dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 rounded-xl px-3.5 py-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div>
                <p className="text-[9px] text-neutral-455 dark:text-neutral-500 font-extrabold uppercase tracking-wider leading-none">{label}</p>
                <p className="text-xs text-neutral-855 dark:text-white font-black mt-1 leading-none">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TOOLBAR ── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-2.5 border-b border-neutral-200 dark:border-neutral-855 bg-white dark:bg-neutral-950">
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
              className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center text-neutral-555 dark:text-neutral-400 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollRef.current?.scrollBy({ left: MONTH_COL_W * 3, behavior: 'smooth' })}
              className="w-9 h-9 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center text-neutral-555 dark:text-neutral-400 cursor-pointer"
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
                <span className="text-[10px] font-black text-neutral-400 dark:text-neutral-505 uppercase tracking-widest">Campaign / Detail</span>
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
                          isCur ? 'text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-500/[0.04]' : 'text-neutral-400 dark:text-neutral-505'
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
              <div className="py-24 flex flex-col items-center gap-3 text-neutral-400 dark:text-neutral-505">
                <Calendar className="w-12 h-12 opacity-35" />
                <p className="text-sm font-semibold">{t('marketing_emptyFilter')}</p>
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
                : 'bg-neutral-50/50 dark:bg-neutral-955/20';

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
                      <p className="text-xs font-bold text-neutral-855 dark:text-neutral-150 truncate leading-tight flex-1">{plan.title}</p>
                    </div>
                    {plan.company?.name && (
                      <p className="text-[10px] text-neutral-455 dark:text-neutral-500 pl-4.5 leading-none">{plan.company.name}</p>
                    )}
                    <div className="flex items-center gap-2 pl-4.5">
                      <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '15', color }}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-455 dark:text-neutral-400">
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
        <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-t border-neutral-200 dark:border-neutral-850 bg-neutral-50 dark:bg-neutral-955/40">
          <div className="flex items-center gap-3 text-[10px] text-neutral-455 dark:text-neutral-500 font-bold uppercase tracking-wider">
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
