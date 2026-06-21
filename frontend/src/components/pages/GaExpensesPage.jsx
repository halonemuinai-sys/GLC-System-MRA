'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function GaExpensesPage() {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('2026');

  // High-fidelity mock budget & actual data for charts
  const monthlyChartData = [
    { name: 'Jan', Budget: 120000000, Actual: 110000000 },
    { name: 'Feb', Budget: 120000000, Actual: 118000000 },
    { name: 'Mar', Budget: 140000000, Actual: 145000000 }, // Overbudget
    { name: 'Apr', Budget: 140000000, Actual: 135000000 },
    { name: 'May', Budget: 150000000, Actual: 148000000 },
    { name: 'Jun', Budget: 150000000, Actual: 152000000 }  // Current month
  ];

  // Mock list of CoA budget items (glc_mra.expense_budget schema)
  const [budgets, setBudgets] = useState([
    { id: 1, coa_code: '510101', coa_name: 'Beban Sewa Gedung Kantor', budget: 600000000, actual: 600000000 },
    { id: 2, coa_code: '510102', coa_name: 'Beban Sewa Kendaraan Operasional', budget: 180000000, actual: 165000000 },
    { id: 3, coa_code: '510103', coa_name: 'Beban Sewa Komputer & IT', budget: 120000000, actual: 124000000 }, // Overbudget
    { id: 4, coa_code: '510201', coa_name: 'Beban Pemeliharaan & Perbaikan AC', budget: 45000000, actual: 38000000 },
    { id: 5, coa_code: '510202', coa_name: 'Beban Pemeliharaan Inventaris Kantor', budget: 30000000, actual: 24500000 },
    { id: 6, coa_code: '510301', coa_name: 'Beban Premi Asuransi Kendaraan', budget: 90000000, actual: 90000000 },
    { id: 7, coa_code: '510401', coa_name: 'Beban Penyusutan Aset Tetap', budget: 150000000, actual: 150000000 }
  ]);

  const filteredBudgets = budgets.filter(item => {
    return (
      item.coa_code.includes(search) ||
      item.coa_name.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Calculate totals
  const totalBudget = filteredBudgets.reduce((acc, curr) => acc + curr.budget, 0);
  const totalActual = filteredBudgets.reduce((acc, curr) => acc + curr.actual, 0);
  const totalVariance = totalBudget - totalActual;
  const burnRatePercent = totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0;

  // Format currency helper
  const formatIDR = (val) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-bold text-neutral-800 dark:text-white mb-1.5">{label} 2026</p>
          <p className="text-indigo-500 font-semibold">Budget: {formatIDR(payload[0].value)}</p>
          <p className="text-emerald-500 font-semibold">Actual: {formatIDR(payload[1].value)}</p>
          <p className="text-neutral-400 font-mono mt-1">
            Var: {formatIDR(payload[0].value - payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-500" />
            Expenses & Budgets
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Analisis perbandingan rencana anggaran vs realisasi biaya sewa, asuransi, dan pemeliharaan.</p>
        </div>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-500 focus:outline-none w-fit"
        >
          <option value="2026">Fiscal Year 2026</option>
          <option value="2025">Fiscal Year 2025</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Budget Plan</p>
            <h3 className="text-md font-black text-neutral-800 dark:text-white mt-0.5 truncate">{formatIDR(totalBudget)}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Actual Spent</p>
            <h3 className="text-md font-black text-neutral-800 dark:text-white mt-0.5 truncate">{formatIDR(totalActual)}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Budget Variance</p>
            <h3 className={`text-md font-black mt-0.5 truncate ${totalVariance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatIDR(totalVariance)}
            </h3>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Burn Rate</p>
            <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{burnRatePercent}%</h3>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 mb-4">Budget vs Actual Monthly Trend</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Budget" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorBudget)" name="Budget Plan" />
                <Area type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" name="Actual Spent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparison Bar Chart */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl">
          <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 mb-4">Cumulative Budget Comparison</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                <YAxis stroke="#888888" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v/1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="Budget" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Budget Limit" />
                <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} name="Actual Realization" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CoA Budget Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-50/20 dark:bg-neutral-950/10">
          <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-2">
            <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-500" />
            Chart of Accounts (CoA) Budget Allocations
          </h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search CoA code or account name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
            />
          </div>
        </div>

        {filteredBudgets.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-xs">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
            No accounts found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">CoA Code</th>
                  <th className="p-4">Account Description</th>
                  <th className="p-4">Annual Budget</th>
                  <th className="p-4">Actual Realization</th>
                  <th className="p-4">Variance</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {filteredBudgets.map((item, idx) => {
                  const variance = item.budget - item.actual;
                  const isOver = variance < 0;
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      key={item.id} 
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-neutral-600 dark:text-neutral-400">{item.coa_code}</td>
                      <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{item.coa_name}</td>
                      <td className="p-4 font-semibold text-neutral-600 dark:text-slate-400">{formatIDR(item.budget)}</td>
                      <td className="p-4 font-bold text-neutral-800 dark:text-slate-200">{formatIDR(item.actual)}</td>
                      <td className={`p-4 font-bold font-mono ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>
                        {formatIDR(variance)}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isOver 
                            ? 'bg-red-500/10 text-red-500' 
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isOver ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {isOver ? 'Overbudget' : 'On Track'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
