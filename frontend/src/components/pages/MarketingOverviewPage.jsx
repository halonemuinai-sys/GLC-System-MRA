'use client';

import React, { useState, useCallback, useMemo, useId } from 'react';
import Link from 'next/link';
import { BarChart3, TrendingUp, Wallet, Layers, RefreshCw, Loader2, AlertTriangle, FileSpreadsheet, ArrowUpRight, CalendarDays, Building2, ArrowRight, SlidersHorizontal } from 'lucide-react';
import MarketingBudgetComparison from './MarketingBudgetComparison';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';
import MarketingGanttChart from './MarketingGanttChart';
import { formatIDR, formatIDRCompact, CURRENT_YEAR } from './MarketingGanttUtils';

const paidAmount = plan => (plan.items || []).reduce((sum, item) => sum + Number(item.actual_amount || 0), 0);
const compactMoney = value => value < 0 ? `−${formatIDRCompact(Math.abs(value))}` : formatIDRCompact(value);
const panel = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const secondaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';
const THEMES = {
  blue: { color: '#3b82f6', icon: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  emerald: { color: '#10b981', icon: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  amber: { color: '#f59e0b', icon: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
  rose: { color: '#f43f5e', icon: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
};

function MetricCard({ label, value, detail, help, icon: Icon, tone, progress }) {
  const gradientId = useId();
  const theme = THEMES[tone];
  const path = 'M0 28 L25 25 L50 29 L75 18 L100 22 L125 10 L150 16 L175 9 L200 14 L225 6 L250 12 L275 20 L300 15 L325 22 L350 18 L375 24 L400 28';
  return (
    <section className={`${panel} relative isolate overflow-hidden p-4 pb-10 sm:p-5 sm:pb-11`}>
      <div aria-hidden="true" className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full opacity-[0.07] blur-2xl" style={{ background: theme.color }} />
      <div aria-hidden="true" className="absolute bottom-6 left-0 top-6 w-0.5 rounded-r" style={{ background: theme.color }} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {label}<InlineHelp label={`Info ${label}`}>{help}</InlineHelp>
          </div>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-white sm:text-[28px]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme.icon}`}><Icon className="h-[18px] w-[18px]" /></span>
      </div>
      <div className="relative mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{detail}</div>
      {progress !== undefined ? (
        <div className="absolute bottom-4 left-5 right-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-rose-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{progress.toFixed(0)}%</span>
        </div>
      ) : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-8 overflow-hidden opacity-40" style={{ backgroundImage: `linear-gradient(to right, ${theme.color}0d 1px, transparent 1px), linear-gradient(to top, ${theme.color}0d 1px, transparent 1px)`, backgroundSize: '20px 8px' }}>
          <div className="marketing-overview-trend flex h-full w-[200%]">
            {[0, 1].map(copy => <svg key={copy} viewBox="0 0 400 40" preserveAspectRatio="none" className="h-full w-1/2 shrink-0" fill="none">
              {copy === 0 && <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.color} stopOpacity="0.22" /><stop offset="100%" stopColor={theme.color} stopOpacity="0" /></linearGradient></defs>}
              <path d={`${path} L400 40 L0 40 Z`} fill={`url(#${gradientId})`} />
              <path d={path} stroke={theme.color} strokeWidth="1.5" />
            </svg>)}
          </div>
        </div>
      )}
    </section>
  );
}

export default function MarketingOverviewPage() {
  // English-only page; nothing is fetched until the user clicks Load data.
  const isId = false;
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(String(CURRENT_YEAR));
  const [draftYear, setDraftYear] = useState(String(CURRENT_YEAR));
  const [updatedAt, setUpdatedAt] = useState(null);
  const years = useMemo(() => Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i)), []);

  const loadPlans = useCallback(async (year, signal) => {
    setLoading(true);
    setError(null);
    try {
      const params = { fiscal_year: year, limit: 100 };
      const first = await apiClient.get('/api/marketing/plans', { params, signal });
      const all = [...(first.data || [])];
      // The API caps a page at 100. Load every page before presenting annual totals.
      for (let page = 2; page <= (first.totalPages || 1); page++) {
        const next = await apiClient.get('/api/marketing/plans', { params: { ...params, page }, signal });
        all.push(...(next.data || []));
      }
      if (signal?.aborted) return;
      setPlans(all);
      setFiscalYear(year);
      setUpdatedAt(new Date());
    } catch (err) {
      if (!signal?.aborted) setError(err.message || 'Failed to load data.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const handleProcess = (year) => {
    setProcessed(true);
    loadPlans(year);
  };

  const stats = useMemo(() => {
    const result = { budget: 0, actual: 0, approved: 0, pending: 0, rejected: 0, draft: 0, completed: 0, companies: [] };
    const companies = new Map();
    const statusKeys = { APPROVED: 'approved', PENDING_APPROVAL: 'pending', REJECTED: 'rejected', DRAFT: 'draft', COMPLETED: 'completed' };
    for (const plan of plans) {
      const budget = Number(plan.total_budget || 0);
      result.budget += budget;
      result.actual += paidAmount(plan);
      if (statusKeys[plan.status]) result[statusKeys[plan.status]]++;
      const key = plan.company?.id ?? plan.company_id ?? 'unknown';
      const company = companies.get(key) || { id: key, name: plan.company?.name || '—', budget: 0, count: 0 };
      company.budget += budget;
      company.count++;
      companies.set(key, company);
    }
    result.companies = [...companies.values()].sort((a, b) => b.budget - a.budget);
    result.burn = result.budget > 0 ? result.actual / result.budget * 100 : 0;
    return result;
  }, [plans]);

  const chartData = useMemo(() => [...plans].sort((a, b) => Number(b.total_budget || 0) - Number(a.total_budget || 0)).slice(0, 10).map(plan => ({
    id: plan.id, company: plan.company?.name || '-', name: plan.title || '—', budget: Number(plan.total_budget || 0), actual: paidAmount(plan),
  })), [plans]);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Marketing Plans');
      ws.columns = [
        { header: 'No', key: 'no', width: 5 }, { header: 'Campaign Title', key: 'title', width: 45 },
        { header: 'Company', key: 'company', width: 30 }, { header: 'Status', key: 'status', width: 22 },
        { header: 'Total Budget (Rp)', key: 'budget', width: 22 }, { header: 'Paid (Rp)', key: 'actual', width: 20 },
        { header: 'Remaining (Rp)', key: 'remaining', width: 20 }, { header: 'Burn Rate (%)', key: 'burn', width: 16 },
        { header: 'Fiscal Year', key: 'fy', width: 12 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      ws.getRow(1).height = 26;
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      ws.autoFilter = 'A1:I1';
      plans.forEach((plan, i) => {
        const budget = Number(plan.total_budget || 0), actual = paidAmount(plan);
        ws.addRow({ no: i + 1, title: plan.title, company: plan.company?.name || '-', status: plan.status, budget, actual, remaining: budget - actual, burn: budget > 0 ? Number((actual / budget * 100).toFixed(1)) : 0, fy: plan.fiscal_year });
      });
      ['budget', 'actual', 'remaining'].forEach(key => { ws.getColumn(key).numFmt = '#,##0'; });
      ws.getColumn('burn').numFmt = '0.0"%"';
      const buffer = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `marketing-plans-${fiscalYear}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert(`Export failed: ${err.message}`); }
    finally { setExporting(false); }
  };

  return (
    <div className="space-y-5 pb-10 text-slate-800 dark:text-slate-200">
      <style>{`@keyframes marketingOverviewTrend { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marketing-overview-trend { animation: marketingOverviewTrend 20s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .marketing-overview-trend { animation: none; } }`}</style>

      <header className="relative isolate overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7 sm:py-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full border-[45px] border-white/[0.03]" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-20 h-36 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-300"><BarChart3 className="h-4 w-4" /> Marketing intelligence</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Marketing Overview</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400 sm:text-sm">{isId ? 'Pantau anggaran, realisasi, dan perjalanan campaign.' : 'Track budgets, paid expenses, and campaign timelines.'}</p>
          </div>
          <Link href="/dashboard/marketing" className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            {isId ? 'Lihat rencana' : 'View plans'}<ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="relative mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-[11px] text-slate-300">
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-blue-300" />{isId ? 'Tahun fiskal' : 'Fiscal year'} {processed ? fiscalYear : '—'}</span>
          <span className="inline-flex items-center gap-2"><Layers className="h-3.5 w-3.5 text-blue-300" />{!processed || loading || error ? '—' : plans.length} campaigns</span>
          <span className="inline-flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-blue-300" />{!processed || loading || error ? '—' : stats.companies.length} {isId ? 'perusahaan' : 'companies'}</span>
        </div>
      </header>

      <div className={`${panel} flex flex-col justify-between gap-3 p-3 sm:flex-row sm:items-center sm:px-4`}>
        <form className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); if (!loading) handleProcess(draftYear); }}>
          <SlidersHorizontal className="mr-1 hidden h-4 w-4 text-slate-400 sm:block" />
          <label htmlFor="marketing-overview-year" className="text-xs font-medium text-slate-500 dark:text-slate-400">{isId ? 'Periode' : 'Period'}</label>
          <select id="marketing-overview-year" value={draftYear} disabled={loading} onChange={event => setDraftYear(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
          <button type="submit" disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{processed ? 'Apply' : 'Load data'}
          </button>
          {processed && draftYear !== fiscalYear && !loading && <span className="text-[11px] text-amber-600 dark:text-amber-400">{isId ? 'Filter belum diterapkan' : 'Filter not applied'}</span>}
        </form>
        <div className="flex items-center justify-between gap-3">
          <span aria-live="polite" className="text-[10px] text-slate-400">{updatedAt && !error && !loading ? `${isId ? 'Diperbarui' : 'Updated'} ${updatedAt.toLocaleTimeString(isId ? 'id-ID' : 'en-GB', { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
          <button type="button" disabled={loading || exporting || !!error || !plans.length} onClick={handleExportExcel} className={secondaryButton}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}{isId ? 'Ekspor Excel' : 'Export Excel'}
          </button>
        </div>
      </div>

      {processed && error && <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-500/10 dark:text-rose-300"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
      {!processed ? (
        <section className={`${panel} flex min-h-[320px] flex-col items-center justify-center border-dashed px-5 py-14 text-center`}>
          <span className="mb-4 flex h-12 w-12 animate-bounce items-center justify-center rounded-2xl bg-blue-50 text-blue-600 [animation-duration:2.4s] motion-reduce:animate-none dark:bg-blue-500/10 dark:text-blue-400"><BarChart3 className="h-5 w-5" /></span>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load the marketing overview</h2>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Choose a fiscal year above, then click Load data to see budgets, paid expenses and campaign status.</p>
          <button type="button" onClick={() => handleProcess(draftYear)} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"><RefreshCw className="h-3.5 w-3.5" />Load data for {draftYear}</button>
        </section>
      ) : loading ? <div role="status" aria-label="Loading" className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map(key => <div key={key} className={`${panel} h-44 animate-pulse motion-reduce:animate-none p-5`}><div className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" /><div className="mt-5 h-8 w-36 rounded bg-slate-100 dark:bg-slate-800" /><div className="mt-4 h-2 w-28 rounded bg-slate-100 dark:bg-slate-800" /></div>)}</div>
        <div className={`${panel} flex h-80 items-center justify-center gap-2 text-xs text-slate-400`}><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
      </div> : !error && <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={isId ? 'Total anggaran' : 'Total budget'} value={compactMoney(stats.budget)} detail={`${plans.length} ${plans.length === 1 ? 'campaign' : 'campaigns'} · ${fiscalYear}`} help={isId ? `Total rencana pada seluruh status: ${formatIDR(stats.budget)}. Grafik kecil merupakan dekorasi, bukan tren historis.` : `Plans across all statuses: ${formatIDR(stats.budget)}. The small graphic is decorative, not historical data.`} icon={Wallet} tone="blue" />
          <MetricCard label={isId ? 'Realisasi terbayar' : 'Paid expenses'} value={compactMoney(stats.actual)} detail={`${stats.burn.toFixed(1)}% ${isId ? 'anggaran terserap' : 'of budget used'}`} help={isId ? `Pembayaran yang telah tercatat lunas: ${formatIDR(stats.actual)}.` : `Recorded paid expenses: ${formatIDR(stats.actual)}.`} icon={TrendingUp} tone="emerald" />
          <MetricCard label={isId ? 'Sisa anggaran' : 'Remaining budget'} value={compactMoney(stats.budget - stats.actual)} detail={isId ? 'Anggaran dikurangi pembayaran' : 'Budget less paid expenses'} help={isId ? `Selisih anggaran dan realisasi terbayar: ${formatIDR(stats.budget - stats.actual)}. Belum mengurangi pengajuan yang belum dibayar.` : `Budget less paid expenses: ${formatIDR(stats.budget - stats.actual)}. Unpaid requests are not deducted.`} icon={Wallet} tone="amber" />
          <MetricCard label={isId ? 'Campaign disetujui' : 'Approved campaigns'} value={stats.approved} detail={<div className="flex flex-wrap gap-x-3 gap-y-1">{[[stats.pending, 'pending', 'bg-amber-500'], [stats.completed, isId ? 'selesai' : 'completed', 'bg-blue-500'], [stats.draft, 'draft', 'bg-slate-400'], [stats.rejected, isId ? 'ditolak' : 'rejected', 'bg-rose-400']].map(([count, label, color]) => <span key={label} className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${color}`} />{count} {label}</span>)}</div>} help={isId ? 'Persentase menunjukkan campaign berstatus Approved dari seluruh campaign. Completed dihitung terpisah.' : 'Percentage of all campaigns currently Approved. Completed campaigns are counted separately.'} icon={Layers} tone="rose" progress={plans.length ? stats.approved / plans.length * 100 : 0} />
        </div>

        {plans.length === 0 ? <section className={`${panel} flex flex-col items-center px-5 py-16 text-center`}>
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-500/10"><CalendarDays className="h-6 w-6" /></span>
          <h2 className="text-base font-semibold">{isId ? 'Belum ada campaign' : 'No campaigns yet'}</h2>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{isId ? `Tidak ada rencana untuk tahun ${fiscalYear}.` : `No plans for ${fiscalYear}.`}</p>
          <Link href="/dashboard/marketing" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">{isId ? 'Buka rencana marketing' : 'Open marketing plans'}<ArrowRight className="h-4 w-4" /></Link>
        </section> : <>
          <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <MarketingBudgetComparison key={fiscalYear} data={chartData} isId={isId} />

            <aside className={`${panel} flex flex-col p-5`}>
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Building2 className="h-4 w-4" /></span><h2 className="text-sm font-semibold">{isId ? 'Alokasi perusahaan' : 'Company allocation'}</h2></div>
              <p className="mt-2 text-[11px] text-slate-400">{isId ? 'Porsi dari total anggaran rencana.' : 'Share of total planned budget.'}</p>
              <div className="mt-6 max-h-72 space-y-5 overflow-y-auto pr-1">
                {stats.companies.map(company => {
                  const percentage = stats.budget > 0 ? company.budget / stats.budget * 100 : 0;
                  return <div key={company.id}>
                    <div className="flex items-start justify-between gap-3"><p className="min-w-0 truncate text-xs font-medium" title={company.name}>{company.name}</p><span className="text-[11px] font-semibold tabular-nums text-slate-400">{percentage.toFixed(0)}%</span></div>
                    <div className="my-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-500/80" style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} /></div>
                    <div className="flex justify-between gap-2 text-[10px] text-slate-400"><span>{company.count} {company.count === 1 ? 'campaign' : 'campaigns'}</span><span title={formatIDR(company.budget)} className="font-medium text-slate-600 dark:text-slate-300">{compactMoney(company.budget)}</span></div>
                  </div>;
                })}
              </div>
              <div className="mt-auto pt-5"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50"><div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400"><span>{isId ? 'Serapan keseluruhan' : 'Overall utilization'}</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.burn.toFixed(1)}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, stats.burn))}%` }} /></div></div></div>
            </aside>
          </div>
          <MarketingGanttChart plans={plans} fiscalYear={fiscalYear} />
        </>}
      </>}
    </div>
  );
}
