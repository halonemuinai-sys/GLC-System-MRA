'use client';

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import {
  formatIDR,
  formatIDRCompact,
  STATUS_CONFIG,
  GANTT_BAR_COLORS,
  MONTHS_SHORT,
  CURRENT_YEAR
} from './MarketingGanttUtils';
import MarketingGanttModal from './MarketingGanttModal';

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
        {plan.company?.name && <p className="text-[10px] text-neutral-450 mt-0.5">{plan.company.name}</p>}
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
}

// ── Gantt Chart (compact inline card) ─────────────────────────────────────────
export default function MarketingGanttChart({ plans, fiscalYear }) {
  const { t } = useLanguage();
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
              {t('marketing_ganttTitle')} {fiscalYear}
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
                  <p className="text-[11px] font-bold text-neutral-850 dark:text-neutral-200 truncate leading-tight">{plan.title}</p>
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
                      <div key={m} className={`flex items-center justify-center text-[9px] font-extrabold uppercase tracking-wide border-r border-neutral-100/60 dark:border-neutral-800/50 last:border-r-0 ${isCur ? 'text-indigo-500' : 'text-neutral-400 dark:text-neutral-505'}`}>
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
          <MarketingGanttModal plans={plans} fiscalYear={fiscalYear} onClose={() => setIsFullscreen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
