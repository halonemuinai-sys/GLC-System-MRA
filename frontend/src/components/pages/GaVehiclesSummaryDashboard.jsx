'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Car,
  Truck,
  Clock,
  ShieldAlert,
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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl shadow-xl text-xs">
        <p className="font-bold text-neutral-850 dark:text-neutral-200 capitalize mb-1">{data.type}</p>
        <p className="text-indigo-500 font-semibold font-mono">Jumlah: {data.count} kendaraan</p>
      </div>
    );
  }
  return null;
};

export default function GaVehiclesSummaryDashboard({ showDashboard, summary, meta }) {
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
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Jenis Kendaraan
                </h3>
                <p className="text-[10px] text-neutral-400 mt-1">Breakdown tipe armada kendaraan operasional</p>
              </div>
              
              <div className="h-44 w-full my-3 flex items-center justify-center relative">
                {summary.typeBreakdown && summary.typeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.typeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="type"
                      >
                        {summary.typeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-neutral-400 flex flex-col items-center gap-1.5">
                    <Car className="w-8 h-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                    <span>Tidak ada data jenis kendaraan</span>
                  </div>
                )}
              </div>

              {/* Legend / Breakdown List */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 max-h-20 overflow-y-auto text-[10px] pr-1 mt-1 border-t border-neutral-100 dark:border-neutral-800/60 pt-2.5">
                {summary.typeBreakdown && summary.typeBreakdown.map((entry, idx) => (
                  <div key={entry.type} className="flex items-center gap-1.5 truncate">
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="text-neutral-500 dark:text-neutral-400 capitalize truncate">{entry.type}</span>
                    <span className="font-bold text-neutral-700 dark:text-neutral-350 ml-auto font-mono">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Fleet Card (Spans 2 columns) */}
              <div className="sm:col-span-2 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 dark:from-indigo-950/20 dark:via-violet-950/25 dark:to-neutral-900 border border-indigo-500/20 dark:border-indigo-500/15 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-500/5 pointer-events-none">
                  <Truck className="w-36 h-36" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Fleet Armada</p>
                    <h3 className="text-2xl font-black text-neutral-800 dark:text-white tracking-tight mt-0.5">{meta.total}</h3>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-full font-bold">
                    Database Sync
                  </span>
                </div>
              </div>

              {/* Active Fleet */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Fleet</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.activeCount}</h3>
                </div>
              </div>

              {/* In Service */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">In Service</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.inServiceCount}</h3>
                </div>
              </div>

              {/* Tax Warning */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Tax Warning</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.taxWarningCount}</h3>
                </div>
              </div>

              {/* Entities */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Entities (PT)</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.uniqueCompaniesCount}</h3>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
