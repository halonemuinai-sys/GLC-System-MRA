'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, ShieldAlert } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatIDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);
const shortIDR = (v) => {
  if (!v) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace('.0', '')}M`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace('.0', '')}jt`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}rb`;
  return String(Math.round(v));
};
// Cell shade by ticket count, relative to the busiest cell of the year.
const shade = (count, max) => {
  if (!count) return '';
  const r = count / max;
  if (r > 0.75) return 'bg-blue-600 text-white';
  if (r > 0.5) return 'bg-blue-400 text-white';
  if (r > 0.25) return 'bg-blue-200 text-blue-900 dark:bg-blue-500/40 dark:text-blue-50';
  return 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200';
};

// Monthly maintenance journey: trend per month and a company x month matrix.
// Honors the page filters (search / status / company); clicking a month or a
// cell opens the list filtered to that month (and company).
export default function GaMaintenanceJourney({ filters, onOpenMonth, refreshKey }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metric, setMetric] = useState('count');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient.get('/api/ga/maintenances/journey', {
      params: { year, search: filters.search || undefined, status: filters.status || undefined, companyId: filters.companyId || undefined }
    })
      .then(res => { if (!cancelled) setData(res); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load journey'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [year, filters.search, filters.status, filters.companyId, refreshKey]);

  const monthKey = (m) => `${year}-${String(m).padStart(2, '0')}`;
  const nowMonth = new Date().getFullYear() === year ? new Date().getMonth() : -1;
  const months = data?.months || [];
  const maxBar = Math.max(1, ...months.map(m => (metric === 'count' ? m.count : m.cost)));
  const maxCell = Math.max(1, ...(data?.companies || []).flatMap(c => c.months.map(m => m.count)));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
          <button type="button" aria-label="Previous year" onClick={() => setYear(y => y - 1)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-14 text-center text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200">{year}</span>
          <button type="button" aria-label="Next year" onClick={() => setYear(y => y + 1)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
        </div>
        {data && <span className="text-[11px] text-slate-400"><span className="font-semibold text-slate-600 dark:text-slate-300">{data.total.count}</span> tickets · <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">{formatIDR(data.total.cost)}</span> in {year}</span>}
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] dark:border-slate-700 dark:bg-slate-900">
          {[['count', 'Tickets'], ['cost', 'Cost']].map(([key, label]) => (
            <button key={key} type="button" aria-pressed={metric === key} onClick={() => setMetric(key)} className={`rounded-md px-3 py-1 font-medium cursor-pointer ${metric === key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Loading journey...</div>
      ) : error ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-xs text-rose-500 dark:border-slate-800 dark:bg-slate-900"><ShieldAlert className="mx-auto mb-2 h-6 w-6" />{error}</div>
      ) : (
        <>
          {/* Monthly trend */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Monthly trend</p>
            <div className="grid grid-cols-12 items-end gap-1.5 sm:gap-2">
              {months.map((m, i) => {
                const value = metric === 'count' ? m.count : m.cost;
                const height = value ? Math.max(6, Math.round((value / maxBar) * 100)) : 0;
                return (
                  <button key={m.month} type="button" disabled={!m.count} onClick={() => onOpenMonth(monthKey(m.month), '')} title={`${MONTHS[i]} ${year}: ${m.count} tickets (${m.done} completed, ${m.open} open) · ${formatIDR(m.cost)}`} className="group flex flex-col items-center gap-1.5 disabled:cursor-default cursor-pointer">
                    <span className="text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">{value ? (metric === 'count' ? m.count : shortIDR(m.cost)) : ''}</span>
                    <div className="flex h-28 w-full items-end rounded-md bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex w-full flex-col overflow-hidden rounded-md transition-opacity group-enabled:group-hover:opacity-80" style={{ height: `${height}%` }}>
                        {metric === 'count' && m.count ? <>
                          <div className="bg-amber-400" style={{ flexGrow: m.open }} />
                          <div className="bg-blue-600" style={{ flexGrow: m.done }} />
                        </> : <div className="flex-1 bg-blue-600" />}
                      </div>
                    </div>
                    <span className={`text-[10px] ${i === nowMonth ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>{MONTHS[i]}</span>
                  </button>
                );
              })}
            </div>
            {metric === 'count' && <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-400"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue-600" />Completed</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-amber-400" />Pending / In progress</span><span className="ml-auto">Click a month to open its tickets</span></div>}
          </div>

          {/* Company x month matrix */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                  <tr>
                    <th className="sticky left-0 w-56 bg-slate-50 px-4 py-2.5 font-semibold dark:bg-slate-950">Company</th>
                    {MONTHS.map((m, i) => <th key={m} className={`px-1 py-2.5 text-center font-semibold ${i === nowMonth ? 'text-blue-600 dark:text-blue-400' : ''}`}>{m}</th>)}
                    <th className="w-28 px-3 py-2.5 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {!data?.companies.length && <tr><td colSpan={14} className="px-4 py-12 text-center text-slate-400">No maintenance in {year} for the current filters.</td></tr>}
                  {data?.companies.map(company => (
                    <tr key={company.company_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td title={company.name} className="sticky left-0 truncate bg-white px-4 py-2 font-medium text-slate-800 dark:bg-slate-900 dark:text-slate-200">{company.name}</td>
                      {company.months.map((m, i) => (
                        <td key={i} className="p-0.5">
                          {m.count ? (
                            <button type="button" onClick={() => onOpenMonth(monthKey(i + 1), company.company_id)} title={`${company.name} · ${MONTHS[i]} ${year}: ${m.count} tickets (${m.open} open) · ${formatIDR(m.cost)}`} className={`flex h-10 w-full flex-col items-center justify-center rounded-md transition-transform hover:scale-[1.04] cursor-pointer ${shade(m.count, maxCell)}`}>
                              <span className="text-[11px] font-semibold tabular-nums leading-none">{metric === 'count' ? m.count : shortIDR(m.cost)}</span>
                              {m.open > 0 && <span className="mt-1 h-1 w-1 rounded-full bg-amber-400" />}
                            </button>
                          ) : <div className="flex h-10 items-center justify-center text-slate-200 dark:text-slate-700">·</div>}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <span className="block font-semibold tabular-nums text-slate-700 dark:text-slate-200">{company.count}</span>
                        <span className="block text-[10px] tabular-nums text-slate-400">{shortIDR(company.cost)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!!data?.companies.length && <div className="border-t border-slate-100 px-4 py-2.5 text-[10px] text-slate-400 dark:border-slate-800">Darker cell = more tickets · <span className="inline-block h-1 w-1 rounded-full bg-amber-400 align-middle" /> = has open tickets · click a cell to see its tickets</div>}
          </div>
        </>
      )}
    </div>
  );
}
