'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Building
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';

const CHART_COLORS = [
  '#4f46e5', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

const CustomTooltip = ({ active, payload, mode, formatIDR, globalHidePrices }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const displayCount = globalHidePrices ? '••••' : data.count;
    return (
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl shadow-xl text-xs">
        <p className="font-bold text-neutral-850 dark:text-neutral-200 capitalize mb-1">{data.name}</p>
        <p className="text-indigo-500 font-semibold font-mono">
          {mode === 'count' ? `Jumlah: ${displayCount} unit` : `Nilai: ${formatIDR(data.value)}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function GaAssetsSummaryDashboard({ showDashboard, summary, meta, formatIDR, maskNum, globalHidePrices, t }) {
  const [chartMode, setChartMode] = useState('count');
  const totalCost = summary.totalAcquisitionCost || 0;

  return (
    <AnimatePresence initial={false}>
      {showDashboard && (
        <motion.div
          initial={{ height: 0, opacity: 0, marginBottom: 0 }}
          animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
          exit={{ height: 0, opacity: 0, marginBottom: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          {/* Summary & Analytics Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[340px]">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Breakdown Kategori
                  </h3>
                  <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => setChartMode('count')}
                      className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                        chartMode === 'count' 
                          ? 'bg-white dark:bg-neutral-950 text-indigo-650 dark:text-indigo-400 shadow-sm' 
                          : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                      }`}
                    >
                      {t('gaAssets_unitView')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartMode('value')}
                      className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                        chartMode === 'value' 
                          ? 'bg-white dark:bg-neutral-950 text-indigo-650 dark:text-indigo-400 shadow-sm' 
                          : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                      }`}
                    >
                      {t('gaAssets_valueView')}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Distribusi aset berdasarkan pengelompokan kategori</p>
              </div>
              
              <div className="h-40 w-full my-3 flex items-center justify-center relative">
                {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey={chartMode === 'count' ? 'count' : 'value'}
                        nameKey="name"
                      >
                        {summary.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip mode={chartMode} formatIDR={formatIDR} globalHidePrices={globalHidePrices} />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-neutral-400 flex flex-col items-center gap-1.5">
                    <Box className="w-8 h-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                    <span>Tidak ada data kategori</span>
                  </div>
                )}
              </div>

              {/* Legend / Breakdown List */}
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-24 overflow-y-auto text-[10px] pr-1 mt-1 border-t border-neutral-100 dark:border-neutral-800/60 pt-2 bg-neutral-50/50 dark:bg-neutral-950/20 rounded-xl p-2">
                {summary.categoryBreakdown && summary.categoryBreakdown.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center py-1 gap-1.5 truncate">
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="text-neutral-500 dark:text-neutral-400 capitalize truncate font-medium">{entry.name}</span>
                    <span className="font-bold text-neutral-700 dark:text-neutral-350 ml-auto font-mono text-[9px]">
                      {maskNum(entry.count)} unit ({formatIDR(entry.value)})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Total Value (Spans 2 columns) */}
              <div className="sm:col-span-2 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 dark:from-indigo-950/20 dark:via-violet-950/25 dark:to-neutral-900 border border-indigo-500/20 dark:border-indigo-500/15 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-500/5 pointer-events-none">
                  <DollarSign className="w-36 h-36" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Value Aset</p>
                    <h3 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-white tracking-tight mt-0.5">{formatIDR(totalCost)}</h3>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-full font-bold">
                    Acquisition Cost
                  </span>
                </div>
              </div>

              {/* Card 2: Total Aset */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Aset</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(meta.total)}</h3>
                </div>
              </div>

              {/* Card 3: Entitas (PT) */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Entitas (PT)</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(summary.uniqueCompaniesCount)}</h3>
                </div>
              </div>

              {/* Card 4: Kondisi Bagus */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Kondisi Bagus</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(summary.goodConditionCount)}</h3>
                </div>
              </div>

              {/* Card 5: Perlu Perbaikan */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Perlu Perbaikan</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(summary.needRepairCount)}</h3>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
