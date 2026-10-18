'use client';

import React, { useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import InlineHelp from '@/components/ui/InlineHelp';
import { formatIDR } from './MarketingGanttUtils';

const PAGE_SIZE = 5;

export default function MarketingBudgetComparison({ data, isId }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = data.slice(start, start + PAGE_SIZE);
  // One shared scale across pages preserves the comparison between campaigns.
  const maximum = Math.max(1, ...data.flatMap(row => [row.budget, row.actual]));
  const pageButton = 'flex h-8 min-w-8 items-center justify-center rounded-lg border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30';

  return <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"><BarChart3 className="h-[18px] w-[18px]" /></span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">{isId ? 'Budget & actuals' : 'Budget & paid expenses'}</h2>
          <p className="mt-1 text-[11px] text-slate-400">{isId ? `${data.length} campaigns with the largest budgets` : `${data.length} campaigns with the largest budgets`}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-[10px] text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />{isId ? 'Budget' : 'Budget'}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{isId ? 'Terbayar' : 'Paid'}</span>
      </div>
    </div>

    <ol start={start + 1} className="divide-y divide-slate-100 dark:divide-slate-800/80" aria-label={isId ? 'Campaign budget comparison' : 'Campaign budget comparison'}>
      {visible.map((row, index) => {
        const percentage = row.budget > 0 ? row.actual / row.budget * 100 : 0;
        const overBudget = row.actual > row.budget;
        return <li key={row.id} className="px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5 dark:hover:bg-slate-800/25">
          <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-6">
            <div className="flex min-w-0 items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-semibold tabular-nums text-slate-400 dark:bg-slate-800 dark:text-slate-500">{String(start + index + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-100">{row.name}</h3>
                <p title={row.company} className="mt-1 truncate text-[10px] text-slate-400">{row.company}</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium ${overBudget ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : row.actual > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {row.budget <= 0 && row.actual > 0 ? (isId ? 'No budget' : 'Unbudgeted') : row.actual === 0 ? (isId ? 'No payments yet' : 'No payments yet') : `${percentage.toFixed(1)}% ${isId ? 'terbayar' : 'paid'}`}
                </span>
              </div>
            </div>

            <dl className="space-y-3 pl-10 md:pl-0">
              {[
                { key: 'budget', label: isId ? 'Budget' : 'Budget', color: 'from-blue-400 to-blue-600', value: row.budget },
                { key: 'actual', label: isId ? 'Terbayar' : 'Paid', color: 'from-emerald-400 to-emerald-600', value: row.actual },
              ].map(metric => <div key={metric.key}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <dt className="text-[10px] text-slate-400">{metric.label}</dt>
                  <dd className={`text-[11px] font-semibold tabular-nums ${metric.key === 'actual' && metric.value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>{formatIDR(metric.value)}</dd>
                </div>
                <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full bg-gradient-to-r ${metric.color}`} style={{ width: `${Math.max(0, metric.value) / maximum * 100}%` }} />
                </div>
              </div>)}
            </dl>
          </div>
        </li>;
      })}
    </ol>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="text-[10px] text-slate-400"><InlineHelp summary={isId ? 'Skala perbandingan sama' : 'Shared comparison scale'} label={isId ? 'Cara membaca grafik' : 'How to read the chart'}>{isId ? `Bar lengths use the largest value, ${formatIDR(maximum)}, across all ${data.length} campaigns. Paid percentages use each campaign's own budget.` : `Bar lengths use the largest value, ${formatIDR(maximum)}, across all ${data.length} campaigns. Paid percentages use each campaign's own budget.`}</InlineHelp></div>
      <nav aria-label={isId ? 'Halaman perbandingan campaign' : 'Campaign comparison pages'} className="flex items-center gap-1.5">
        <span aria-live="polite" className="mr-2 text-[10px] tabular-nums text-slate-400">{data.length ? start + 1 : 0}–{Math.min(start + PAGE_SIZE, data.length)} / {data.length}</span>
        <button type="button" aria-label={isId ? 'Halaman sebelumnya' : 'Previous page'} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className={`${pageButton} border-slate-200 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800`}><ChevronLeft className="h-3.5 w-3.5" /></button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button key={number} type="button" aria-label={`${isId ? 'Halaman' : 'Page'} ${number}`} aria-current={currentPage === number ? 'page' : undefined} onClick={() => setPage(number)} className={`${pageButton} ${currentPage === number ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/20' : 'border-slate-200 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>{number}</button>)}
        <button type="button" aria-label={isId ? 'Halaman berikutnya' : 'Next page'} disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className={`${pageButton} border-slate-200 text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800`}><ChevronRight className="h-3.5 w-3.5" /></button>
      </nav>
    </div>
  </section>;
}
