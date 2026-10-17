'use client';

import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Tooltip } from '@base-ui/react/tooltip';
import { CalendarDays, X, ChevronLeft, ChevronRight, Search, Download, Layers, Wallet, CheckCircle2, ArrowUpRight, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { formatIDR, formatIDRCompact, STATUS_CONFIG, MONTHS_SHORT } from './MarketingGanttUtils';
import { timelineRange, calendarPosition, buildTimelineSvg } from '@/lib/marketingTimeline.mjs';

const BUDGET_WIDTH = 140;
const ROW_HEIGHT = 86;
const QUARTERS = ['from-blue-400 to-cyan-400', 'from-emerald-400 to-teal-400', 'from-amber-400 to-orange-400', 'from-rose-400 to-pink-400'];
const control = 'h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';
const compactMoney = value => value < 0 ? `−${formatIDRCompact(Math.abs(value))}` : formatIDRCompact(value);

function CampaignBubble({ row, totalWidth, formatDate, isId }) {
  const [open, setOpen] = useState(false);
  const labelLeft = Math.max(4, Math.min(row.range.left, totalWidth - 284));
  return <>
    <Tooltip.Root open={open} onOpenChange={setOpen}>
      <Tooltip.Trigger type="button" closeOnClick={false} onClick={() => setOpen(true)}
        aria-label={`${row.title}, ${row.status}, ${formatDate(row.range.start)} – ${formatDate(row.range.end)}, ${formatIDR(row.budget)}`}
        className="absolute top-2 z-[2] w-[280px] rounded-xl border px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        style={{ left: labelLeft, backgroundColor: `color-mix(in srgb, ${row.color} 8%, var(--timeline-surface))`, borderColor: `${row.color}55` }}>
        <span className="flex min-w-0 items-center gap-2"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} /><span className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">{row.title}</span></span>
        <span className="mt-1 flex items-center justify-between gap-2 text-[9px] text-slate-500 dark:text-slate-400"><span>{formatDate(row.range.start)} – {formatDate(row.range.end)}</span><span className="font-medium tabular-nums">{compactMoney(row.budget)}</span></span>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" align="start" sideOffset={10} className="z-[230]">
          <Tooltip.Popup className="w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <span className="inline-flex rounded-md px-2 py-1 text-[9px] font-semibold" style={{ color: row.color, backgroundColor: `${row.color}15` }}>{row.status}</span>
            <p className="mt-2 text-sm font-semibold leading-snug text-slate-900 dark:text-white">{row.title}</p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{row.company}</p>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
              {[[isId ? 'Periode event' : 'Event period', `${formatDate(row.range.start, true)} – ${formatDate(row.range.end, true)}`], [isId ? 'Anggaran' : 'Budget', formatIDR(row.budget)], [isId ? 'Terbayar' : 'Paid', formatIDR(row.actual)], [isId ? 'Serapan' : 'Utilization', `${row.progress.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-200">{value}</dd></div>)}
            </dl>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
    {/* Only this lower bar encodes duration; the label stays readable for short events. */}
    <div aria-hidden="true" className="absolute top-[62px] h-2 rounded-full" style={{ left: row.range.left, width: row.range.width, backgroundColor: `${row.color}35` }}>
      <div className="h-full w-full rounded-full border" style={{ borderColor: `${row.color}80`, backgroundColor: `${row.color}55` }} />
      <span className="absolute -left-0.5 -top-0.5 h-3 w-1 rounded-full" style={{ backgroundColor: row.color }} />
      <span className="absolute -right-0.5 -top-0.5 h-3 w-1 rounded-full" style={{ backgroundColor: row.color }} />
    </div>
  </>;
}

export default function MarketingGanttModal({ plans, fiscalYear, onClose }) {
  const { lang, t } = useLanguage();
  const isId = lang === 'id';
  const reducedMotion = useReducedMotion();
  const titleId = useId();
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthWidth, setMonthWidth] = useState(128);
  const scrollRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const today = useMemo(() => new Date(), []);
  const year = Number(fiscalYear);
  const isCurrentYear = today.getFullYear() === year;
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const todayX = isCurrentYear ? calendarPosition(todayISO, year, monthWidth) : null;
  const totalWidth = monthWidth * 12;
  const behavior = reducedMotion ? 'auto' : 'smooth';
  const formatDate = (value, full = false) => new Date(`${value}T00:00:00Z`).toLocaleDateString(isId ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', ...(full ? { year: 'numeric' } : {}), timeZone: 'UTC' });

  useEffect(() => {
    const overflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = event => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const elements = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]') || [])].filter(element => element.getClientRects().length > 0);
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKey);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [onClose]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = isCurrentYear ? Math.max(0, todayX - monthWidth * 1.5) : 0;
  }, [year, monthWidth, isCurrentYear, todayX]);

  const available = useMemo(() => plans.map(plan => ({ plan, range: timelineRange(plan, year, monthWidth) })).filter(row => row.range), [plans, year, monthWidth]);
  const companies = useMemo(() => [...new Set(available.map(({ plan }) => plan.company?.name).filter(Boolean))].sort(), [available]);
  const brands = useMemo(() => [...new Set(available.map(({ plan }) => plan.brand?.name).filter(Boolean))].sort(), [available]);
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return available.filter(({ plan }) => (!query || `${plan.title || ''} ${plan.company?.name || ''}`.toLocaleLowerCase().includes(query))
      && (!companyFilter || plan.company?.name === companyFilter) && (!brandFilter || plan.brand?.name === brandFilter)
      && (!statusFilter || plan.status === statusFilter)).sort((a, b) => a.range.start.localeCompare(b.range.start)).map(({ plan, range }) => {
        const config = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT;
        const budget = Number(plan.total_budget || 0);
        const actual = (plan.items || []).reduce((sum, item) => sum + Number(item.actual_amount || 0), 0);
        return { id: plan.id, title: plan.title || '—', company: plan.company?.name || '—', range, budget, actual, progress: budget > 0 ? actual / budget * 100 : 0, color: config.color, status: config.label };
      });
  }, [available, search, companyFilter, brandFilter, statusFilter]);
  const totals = useMemo(() => rows.reduce((sum, row) => ({ budget: sum.budget + row.budget, actual: sum.actual + row.actual }), { budget: 0, actual: 0 }), [rows]);
  const hasFilter = !!(search || companyFilter || brandFilter || statusFilter);
  const resetFilters = () => { setSearch(''); setCompanyFilter(''); setBrandFilter(''); setStatusFilter(''); };
  const scrollTo = left => scrollRef.current?.scrollTo({ left: Math.max(0, left), behavior });
  const downloadTimeline = () => {
    const svg = buildTimelineSvg({ rows, year, monthWidth, months: MONTHS_SHORT, todayX, formatMoney: formatIDR, formatDate });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `timeline-campaign-${fiscalYear}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}
    className="fixed inset-0 z-[200] flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200 [--timeline-surface:#ffffff] dark:[--timeline-surface:#0f172a]">
    <header className="relative isolate shrink-0 overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 px-4 py-4 text-white sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-40 h-72 w-72 rounded-full border-[36px] border-white/[0.03]" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-300 sm:flex"><CalendarDays className="h-5 w-5" /></span>
          <div className="min-w-0"><p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-blue-300">Marketing calendar</p><h2 id={titleId} className="truncate text-base font-semibold tracking-tight sm:text-xl">{t('marketing_ganttTitle')} {fiscalYear}</h2></div>
        </div>
        <div className="flex items-center gap-3"><span className="hidden rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 sm:inline">ESC</span><button ref={closeRef} type="button" onClick={onClose} aria-label={isId ? 'Tutup timeline' : 'Close timeline'} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><X className="h-4 w-4" /></button></div>
      </div>
    </header>

    <div className="grid shrink-0 grid-cols-2 border-b border-slate-200 bg-white sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
      {[
        { label: 'Campaign', value: `${rows.length} / ${available.length}`, icon: Layers, color: 'text-blue-500' },
        { label: isId ? 'Anggaran rencana' : 'Planned budget', value: compactMoney(totals.budget), exact: formatIDR(totals.budget), icon: Wallet, color: 'text-blue-500' },
        { label: isId ? 'Realisasi terbayar' : 'Paid expenses', value: compactMoney(totals.actual), exact: formatIDR(totals.actual), icon: CheckCircle2, color: 'text-emerald-500' },
        { label: isId ? 'Sisa terhadap pembayaran' : 'Budget less payments', value: compactMoney(totals.budget - totals.actual), exact: formatIDR(totals.budget - totals.actual), icon: ArrowUpRight, color: 'text-amber-500' },
      ].map(({ label, value, exact, icon: Icon, color }) => <div key={label} className="flex items-center gap-3 border-r border-slate-100 px-4 py-2.5 last:border-r-0 sm:px-6 sm:py-3 dark:border-slate-800"><Icon className={`hidden h-4 w-4 shrink-0 sm:block ${color}`} /><div className="min-w-0"><p className="truncate text-[10px] text-slate-400">{label}</p><p title={exact} className="mt-0.5 truncate text-sm font-semibold tabular-nums sm:text-base">{value}</p></div></div>)}
    </div>

    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1 sm:max-w-xs"><Search aria-hidden="true" className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" /><input aria-label={isId ? 'Cari campaign atau perusahaan' : 'Search campaign or company'} placeholder={isId ? 'Cari campaign atau perusahaan…' : 'Search campaign or company…'} value={search} onChange={event => setSearch(event.target.value)} className={`${control} w-full bg-slate-50 pl-9 dark:bg-slate-950`} /></div>
        <select aria-label={isId ? 'Filter status' : 'Filter status'} value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className={control}><option value="">{isId ? 'Semua status' : 'All statuses'}</option>{Object.entries(STATUS_CONFIG).map(([key, config]) => <option key={key} value={key}>{config.label}</option>)}</select>
        {companies.length > 1 && <select aria-label={isId ? 'Filter perusahaan' : 'Filter company'} value={companyFilter} onChange={event => setCompanyFilter(event.target.value)} className={`${control} max-w-48`}><option value="">{isId ? 'Semua perusahaan' : 'All companies'}</option>{companies.map(name => <option key={name} value={name}>{name}</option>)}</select>}
        {brands.length > 0 && <select aria-label="Filter brand" value={brandFilter} onChange={event => setBrandFilter(event.target.value)} className={`${control} max-w-40`}><option value="">{isId ? 'Semua brand' : 'All brands'}</option>{brands.map(name => <option key={name} value={name}>{name}</option>)}</select>}
        {hasFilter && <button type="button" onClick={resetFilters} className={`${control} inline-flex items-center gap-1.5`}><RotateCcw className="h-3 w-3" />Reset</button>}
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-1 lg:flex dark:border-slate-700 dark:bg-slate-950">{[0, 1, 2, 3].map(quarter => <button key={quarter} type="button" title={`${isId ? 'Lompat ke kuartal' : 'Jump to quarter'} ${quarter + 1}`} onClick={() => scrollTo(quarter * monthWidth * 3)} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-white hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800">Q{quarter + 1}</button>)}</div>
        <label className="flex items-center gap-1.5"><SlidersHorizontal aria-hidden="true" className="hidden h-3.5 w-3.5 text-slate-400 sm:block" /><select aria-label={isId ? 'Skala timeline' : 'Timeline scale'} value={monthWidth} onChange={event => setMonthWidth(Number(event.target.value))} className={control}><option value={96}>{isId ? 'Ringkas' : 'Compact'}</option><option value={128}>Normal</option><option value={176}>Detail</option></select></label>
        {isCurrentYear && <button type="button" onClick={() => scrollTo(todayX - monthWidth * 1.5)} className="h-9 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-600 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">{isId ? 'Hari ini' : 'Today'}</button>}
        <button type="button" aria-label={isId ? 'Geser tiga bulan ke kiri' : 'Scroll three months left'} onClick={() => scrollRef.current?.scrollBy({ left: -monthWidth * 3, behavior })} className={`${control} !px-2`}><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" aria-label={isId ? 'Geser tiga bulan ke kanan' : 'Scroll three months right'} onClick={() => scrollRef.current?.scrollBy({ left: monthWidth * 3, behavior })} className={`${control} !px-2`}><ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>

    {rows.length === 0 ? <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-400 dark:bg-blue-500/10"><CalendarDays className="h-6 w-6" /></span><p className="text-sm font-semibold">{isId ? 'Tidak ada campaign yang sesuai' : 'No matching campaigns'}</p><p className="text-xs text-slate-400">{isId ? 'Coba ubah filter atau kata pencarian.' : 'Try another filter or search.'}</p>{hasFilter && <button onClick={resetFilters} className={control}>Reset filter</button>}</div> :
      <div ref={scrollRef} tabIndex={0} aria-label={isId ? 'Timeline campaign, gulir untuk melihat bulan lainnya' : 'Campaign timeline, scroll to view other months'} className="relative min-h-0 flex-1 overflow-auto overscroll-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500" style={{ scrollbarWidth: 'thin' }}>
        <div className="relative min-h-full" style={{ width: totalWidth + BUDGET_WIDTH, minWidth: '100%' }}>
          <div className="sticky top-0 z-20 flex h-[70px] border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="relative shrink-0" style={{ width: totalWidth }}>
              <div className="flex h-8">{QUARTERS.map((gradient, index) => <div key={gradient} style={{ width: monthWidth * 3 }} className={`flex shrink-0 items-center justify-center border-r border-white/20 bg-gradient-to-r ${gradient} text-[10px] font-bold tracking-wider text-slate-900`}>Q{index + 1} <span className="ml-2 font-medium opacity-60">{fiscalYear}</span></div>)}</div>
              <div className="flex h-[38px]">{MONTHS_SHORT.map((month, index) => <div key={month} style={{ width: monthWidth }} className={`flex shrink-0 items-center justify-center border-r border-slate-100 text-[10px] font-semibold uppercase tracking-wide dark:border-slate-800 ${isCurrentYear && index === today.getMonth() ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' : 'text-slate-400'}`}>{month}</div>)}</div>
              {todayX !== null && <div aria-hidden="true" className="pointer-events-none absolute bottom-0 z-10" style={{ left: Math.max(22, Math.min(totalWidth - 22, todayX)), transform: 'translateX(-50%)' }}><span className="rounded-full bg-blue-600 px-2 py-0.5 text-[8px] font-bold text-white shadow-sm">TODAY</span></div>}
            </div>
            <div className="sticky right-0 z-30 ml-auto flex shrink-0 flex-col items-end justify-center border-l border-slate-200 bg-slate-50 px-4 shadow-[-4px_0_12px_-8px_#0f172a] dark:border-slate-700 dark:bg-slate-900" style={{ width: BUDGET_WIDTH }}><span className="text-[11px] font-semibold">Total Budget</span><span className="mt-1 text-[9px] text-slate-400">{isId ? 'Serapan terbayar' : 'Paid utilization'}</span></div>
          </div>
          <Tooltip.Provider delay={150}>
            {rows.map((row, index) => <div key={row.id} className={`group relative flex border-b border-slate-100 dark:border-slate-800/70 ${index % 2 ? 'bg-slate-50/70 dark:bg-slate-950/40' : 'bg-white dark:bg-slate-900'}`} style={{ height: ROW_HEIGHT }}>
              <div className="relative shrink-0" style={{ width: totalWidth }}>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex">{MONTHS_SHORT.map((month, monthIndex) => <div key={month} style={{ width: monthWidth }} className={`h-full shrink-0 border-r border-slate-100 dark:border-slate-800/60 ${isCurrentYear && monthIndex === today.getMonth() ? 'bg-blue-500/[0.025]' : ''}`} />)}</div>
                <CampaignBubble row={row} totalWidth={totalWidth} formatDate={formatDate} isId={isId} />
              </div>
              <div className="sticky right-0 z-10 ml-auto flex shrink-0 flex-col justify-center border-l border-slate-200 bg-white px-4 text-right shadow-[-4px_0_12px_-8px_#0f172a] dark:border-slate-700 dark:bg-slate-900" style={{ width: BUDGET_WIDTH }}>
                <span title={formatIDR(row.budget)} className="text-xs font-semibold tabular-nums">{compactMoney(row.budget)}</span>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${row.progress > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }} /></div>
                <span title={formatIDR(row.actual)} className="mt-1.5 text-[9px] text-slate-400">{row.progress.toFixed(0)}% {isId ? 'terbayar' : 'paid'}</span>
              </div>
            </div>)}
          </Tooltip.Provider>
          {todayX !== null && <div aria-hidden="true" className="pointer-events-none absolute bottom-0 top-[70px] z-[3] border-l border-dashed border-blue-500/65" style={{ left: todayX }} />}
        </div>
      </div>}

    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 sm:flex">{Object.entries(STATUS_CONFIG).map(([key, config]) => <span key={key} className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: config.color }} />{config.label}</span>)}</div>
      <div className="flex items-center gap-2 text-[11px]"><span className="text-slate-400">Total Budget Plan</span><span title={formatIDR(totals.budget)} className="font-semibold tabular-nums">{compactMoney(totals.budget)}</span></div>
      <button type="button" onClick={downloadTimeline} disabled={!rows.length} title={isId ? 'Unduh semua campaign sesuai filter dalam format SVG' : 'Download all filtered campaigns as SVG'} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-40"><Download className="h-3.5 w-3.5" />Download Timeline <span className="text-[9px] text-blue-200">SVG</span></button>
    </footer>
  </motion.div>;
}
