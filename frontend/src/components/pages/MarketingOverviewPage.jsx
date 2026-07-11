'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  RefreshCw,
  Loader2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';
import MarketingGanttChart from './MarketingGanttChart';
import {
  formatIDR,
  formatIDRCompact,
  CURRENT_YEAR
} from './MarketingGanttUtils';

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MarketingOverviewPage() {
  const { lang, t } = useLanguage();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(String(CURRENT_YEAR));

  const FISCAL_YEAR_OPTIONS = useMemo(() => Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i)), []);

  const handleExportExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Marketing Plans');
      ws.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Judul Campaign', key: 'title', width: 35 },
        { header: 'Perusahaan', key: 'company', width: 25 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Total Budget (Rp)', key: 'budget', width: 22 },
        { header: 'Realisasi (Rp)', key: 'actual', width: 20 },
        { header: 'Sisa (Rp)', key: 'sisa', width: 20 },
        { header: 'Burn Rate (%)', key: 'burn', width: 14 },
        { header: 'Fiscal Year', key: 'fy', width: 12 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };

      plans.forEach((p, i) => {
        const actual = (p.items || []).reduce((s, it) => s + Number(it.actual_amount || 0), 0);
        const budget = Number(p.total_budget || 0);
        ws.addRow({
          no: i + 1,
          title: p.title,
          company: p.company?.name || '-',
          status: p.status,
          budget,
          actual,
          sisa: budget - actual,
          burn: budget > 0 ? Number(((actual / budget) * 100).toFixed(1)) : 0,
          fy: p.fiscal_year,
        });
      });
      ['budget', 'actual', 'sisa'].forEach(k => { ws.getColumn(k).numFmt = '#,##0'; });
      ws.getColumn('burn').numFmt = '0.0"%"';

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `marketing-plans-${fiscalYear}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert('Gagal export: ' + err.message); }
  };

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
    let totalBudget = 0, totalActual = 0, approved = 0, pending = 0, rejected = 0, draft = 0;
    plans.forEach(p => {
      totalBudget += Number(p.total_budget || 0);
      if (p.items) p.items.forEach(it => { totalActual += Number(it.actual_amount || 0); });
      if (p.status === 'APPROVED') approved++;
      else if (p.status === 'PENDING_APPROVAL') pending++;
      else if (p.status === 'REJECTED') rejected++;
      else draft++;
    });
    const burnRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    return { totalBudget, totalActual, burnRate, approved, pending, rejected, draft, total: plans.length };
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
      border: 'border-rose-500/20 dark:border-rose-500/10',
      indicator: 'bg-rose-500',
      iconBg: 'bg-gradient-to-br from-rose-500/15 to-rose-500/5 border-rose-500/20',
      iconText: 'text-rose-500 dark:text-rose-455',
      glow: 'bg-rose-500/10 dark:bg-rose-500/5'
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
              {t('marketing_overview_title')}
            </h1>
            <p className="text-neutral-500 dark:text-neutral-450 text-xs mt-0.5">
              Visualisasi timeline campaign — ringkasan anggaran dan realisasi per periode.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-emerald-600 hover:border-emerald-300 shadow-sm transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export
          </button>
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
          <span className="text-xs text-neutral-455 font-bold">{t('loading')}</span>
        </div>
      ) : (
        <>
          {/* Animated trendline keyframe style */}
          <style>{`
            @keyframes waveMove {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .wave-animated-fast {
              animation: waveMove 12s linear infinite;
            }
          `}</style>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Anggaran',
                value: formatIDRCompact(kpis.totalBudget),
                sub: `${kpis.total} campaign`,
                theme: 'blue',
                stroke: '#3b82f6',
                icon: DollarSign,
                strokePath: 'M 0 25 L 30 18 L 60 22 L 90 12 L 120 28 L 150 10 L 180 20 L 210 5 L 240 18 L 270 8 L 300 15 L 330 25 L 360 12 L 400 25',
                fillPath: 'M 0 40 L 0 25 L 30 18 L 60 22 L 90 12 L 120 28 L 150 10 L 180 20 L 210 5 L 240 18 L 270 8 L 300 15 L 330 25 L 360 12 L 400 25 L 400 40 Z'
              },
              {
                label: 'Realisasi Terbayar',
                value: formatIDRCompact(kpis.totalActual),
                sub: `${kpis.burnRate.toFixed(1)}% burn rate`,
                theme: 'emerald',
                stroke: '#10b981',
                icon: TrendingUp,
                strokePath: 'M 0 35 L 40 32 L 80 25 L 120 28 L 160 18 L 200 20 L 240 12 L 280 15 L 320 8 L 360 10 L 400 35',
                fillPath: 'M 0 40 L 0 35 L 40 32 L 80 25 L 120 28 L 160 18 L 200 20 L 240 12 L 280 15 L 320 8 L 360 10 L 400 35 L 400 40 Z'
              },
              {
                label: 'Sisa Anggaran',
                value: formatIDRCompact(kpis.totalBudget - kpis.totalActual),
                sub: 'belum terserap',
                theme: 'amber',
                stroke: '#f59e0b',
                icon: TrendingDown,
                strokePath: 'M 0 10 L 40 12 L 80 18 L 120 15 L 160 22 L 200 20 L 240 28 L 280 25 L 320 32 L 360 30 L 400 10',
                fillPath: 'M 0 40 L 0 10 L 40 12 L 80 18 L 120 15 L 160 22 L 200 20 L 240 28 L 280 25 L 320 32 L 360 30 L 400 10 L 400 40 Z'
              },
              {
                label: 'Status Campaign',
                value: `${kpis.approved} Approved`,
                sub: (
                  <>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {kpis.pending} pending
                    </span>
                    <span className="mx-0.5 text-neutral-350 dark:text-neutral-600">·</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 dark:bg-neutral-600 shrink-0" />
                      {kpis.rejected} ditolak
                    </span>
                    <span className="mx-0.5 text-neutral-350 dark:text-neutral-600">·</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#64748b] shrink-0" />
                      {kpis.draft} draft
                    </span>
                  </>
                ),
                theme: 'slate',
                icon: Layers,
                showProgress: true
              },
            ].map(({ label, value, sub, theme, stroke, icon: Icon, strokePath, fillPath, showProgress }, idx) => {
              const currentTheme = CARD_THEMES[theme];
              const approvedPercentage = kpis.total > 0 ? Math.round((kpis.approved / kpis.total) * 100) : 0;
              return (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.4, ease: 'easeOut' }}
                  className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-5 pb-8 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-neutral-200/40 dark:hover:shadow-neutral-950/30 hover:-translate-y-0.5 transition-all duration-300 group min-h-[128px]"
                >
                  <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl group-hover:opacity-100 opacity-60 transition-opacity duration-350 ${currentTheme.glow}`} />
                  <div className={`absolute left-0 top-5 bottom-5 w-1 rounded-r-md transition-all duration-300 group-hover:top-3 group-hover:bottom-3 ${currentTheme.indicator}`} />
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 ${currentTheme.iconBg}`}>
                      <Icon className={`w-5.5 h-5.5 ${currentTheme.iconText}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider leading-none">{label}</p>
                      <h3 className="text-lg font-black text-neutral-900 dark:text-white truncate mt-1.5 leading-none">{value}</h3>
                      {typeof sub === 'string' ? (
                        <p className="text-[10px] text-neutral-455 dark:text-neutral-500 mt-2 font-semibold truncate leading-none">{sub}</p>
                      ) : (
                        <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-bold flex items-center flex-wrap gap-1 leading-none mb-3">
                          {sub}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modern Graph sparkline background with Grid overlay */}
                  {theme !== 'slate' && (
                    <div className="absolute inset-x-0 bottom-0 h-10 overflow-hidden pointer-events-none select-none rounded-b-2xl opacity-60 dark:opacity-40">
                      {/* Grid overlay */}
                      <div 
                        className="absolute inset-0 opacity-[0.06] dark:opacity-[0.04]"
                        style={{
                          backgroundImage: `
                            linear-gradient(to right, ${stroke} 1px, transparent 1px),
                            linear-gradient(to top, ${stroke} 1px, transparent 1px)
                          `,
                          backgroundSize: '12px 6px'
                        }}
                      />
                      
                      {/* Scrolling Graph */}
                      <div className="flex w-[200%] h-full wave-animated-fast">
                        <svg className="w-1/2 h-full shrink-0" viewBox="0 0 400 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id={`graph-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
                              <stop offset="100%" stopColor={stroke} stopOpacity="0.00" />
                            </linearGradient>
                          </defs>
                          <path d={fillPath} fill={`url(#graph-grad-${idx})`} />
                          <path d={strokePath} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <svg className="w-1/2 h-full shrink-0" viewBox="0 0 400 40" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                          <path d={fillPath} fill={`url(#graph-grad-${idx})`} />
                          <path d={strokePath} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar for Status Campaign card */}
                  {showProgress && (
                    <div className="absolute bottom-4 left-5 right-5 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-neutral-150 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-rose-500 transition-all duration-500"
                          style={{ width: `${approvedPercentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-neutral-500 dark:text-neutral-450 shrink-0 leading-none">
                        {approvedPercentage}%
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Budget vs Actual Chart */}
          {plans.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest mb-0.5">Perbandingan</p>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">Budget vs Realisasi per Campaign</h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-neutral-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500" />Budget</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" />Realisasi</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={plans.slice(0, 10).map(p => ({
                    name: p.title?.length > 20 ? p.title.slice(0, 20) + '…' : (p.title || '-'),
                    Budget: Number(p.total_budget || 0),
                    Realisasi: (p.items || []).reduce((s, it) => s + Number(it.actual_amount || 0), 0),
                  }))}
                  margin={{ top: 4, right: 8, left: 8, bottom: 40 }}
                  barCategoryGap="30%"
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tickFormatter={v => formatIDRCompact(v)} tick={{ fontSize: 10 }} width={72} />
                  <RechartsTooltip
                    formatter={(v, name) => [formatIDR(v), name]}
                    contentStyle={{
                      background: 'var(--color-neutral-900, #0f172a)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '12px', fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ display: 'none' }} />
                  <Bar dataKey="Budget" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
              {plans.length > 10 && (
                <p className="text-center text-[11px] text-neutral-400 mt-2">Menampilkan 10 dari {plans.length} campaign</p>
              )}
            </div>
          )}

          {/* Gantt Chart */}
          <MarketingGanttChart plans={plans} fiscalYear={fiscalYear} />
        </>
      )}
    </div>
  );
}
