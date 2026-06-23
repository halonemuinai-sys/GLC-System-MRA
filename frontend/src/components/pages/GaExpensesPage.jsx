'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  Loader2,
  X,
  RefreshCw
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
import { apiClient } from '@/lib/apiClient';

// Searchable Dropdown for Companies (PT) — copied inline per project convention
function SearchableCompanySelect({ companies, value, onChange, placeholder = 'Select Company (Type to search...)' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCompany = companies.find(c => String(c.id) === String(value));
  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[36px] select-none"
      >
        <span className={selectedCompany ? 'text-neutral-850 dark:text-neutral-200 font-medium truncate' : 'text-neutral-400 truncate'}>
          {selectedCompany ? selectedCompany.name : placeholder}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setSearchQuery(''); }}
              className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[9px] text-neutral-400">▼</span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 w-full mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-2 space-y-1"
            >
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-44 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { onChange(''); setSearchQuery(''); setIsOpen(false); }}
                  className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-neutral-50 dark:hover:bg-neutral-800/45 text-neutral-400 transition-colors"
                >
                  All Companies (PT)
                </button>
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-3 text-center text-xs text-neutral-400">No companies found</div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { onChange(c.id); setSearchQuery(''); setIsOpen(false); }}
                      className={`w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium ${
                        String(c.id) === String(value) ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const defaultSummary = { kpi: { totalBudget: 0, totalActual: 0, totalVariance: 0, burnRatePercent: 0 }, monthlyTrend: [], coaBreakdown: [] };

export default function GaExpensesPage() {
  const [search, setSearch] = useState('');
  const [years, setYears] = useState([]);
  const [fiscalYear, setFiscalYear] = useState('');
  const [companyMasterId, setCompanyMasterId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [companyMasters, setCompanyMasters] = useState([]);

  const [summary, setSummary] = useState(defaultSummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/api/ga/expenses/years'),
      apiClient.get('/api/master/companies/all'),
      apiClient.get('/api/master/companies/master')
    ]).then(([yrs, comps, masters]) => {
      setYears(yrs || []);
      setFiscalYear(String((yrs && yrs[0]) || new Date().getFullYear()));
      setCompanies(comps || []);
      setCompanyMasters(masters || []);
    }).catch(err => console.error('Failed to fetch expenses meta', err));
  }, []);

  const loadSummary = useCallback(async () => {
    if (!fiscalYear) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/ga/expenses/summary', {
        params: {
          fiscalYear,
          companyId: companyId || undefined,
          companyMasterId: !companyId && companyMasterId ? companyMasterId : undefined
        }
      });
      setSummary(res || defaultSummary);
    } catch (err) {
      setError(err.message || 'Failed to load expenses summary.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, companyId, companyMasterId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // Saat Holding Group dipilih, persempit pilihan PT ke entitas di bawah grup tersebut
  const filteredCompaniesForGroup = companyMasterId
    ? companies.filter(c => String(c.company_master_id) === String(companyMasterId))
    : companies;

  const filteredBudgets = summary.coaBreakdown.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (item.coa_code || '').toLowerCase().includes(q) || (item.coa_name || '').toLowerCase().includes(q);
  });

  const { totalBudget, totalActual, totalVariance, burnRatePercent } = summary.kpi;

  const formatIDR = (val) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-bold text-neutral-800 dark:text-white mb-1.5">{label} {fiscalYear}</p>
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
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Analisis perbandingan rencana anggaran vs realisasi biaya operasional GA per Chart of Accounts.</p>
        </div>
        <button onClick={loadSummary} className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 hover:text-indigo-500 shadow-sm transition-colors cursor-pointer w-fit" title="Muat Ulang">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
          >
            {years.length === 0 && <option value={fiscalYear}>Fiscal Year {fiscalYear}</option>}
            {years.map(y => <option key={y} value={y}>Fiscal Year {y}</option>)}
          </select>
          <select
            value={companyMasterId}
            onChange={(e) => { setCompanyMasterId(e.target.value); setCompanyId(''); }}
            className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
          >
            <option value="">All Holding Groups</option>
            {companyMasters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <SearchableCompanySelect companies={filteredCompaniesForGroup} value={companyId} onChange={setCompanyId} placeholder="All Companies (PT)" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search CoA code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-neutral-400">Memuat data anggaran...</span>
        </div>
      ) : (
        <>
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
                  <AreaChart data={summary.monthlyTrend} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Budget" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorBudget)" name="Budget Plan" />
                    <Area type="monotone" dataKey="Actual" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" name="Actual Spent" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Comparison Bar Chart */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 mb-4">Monthly Budget Comparison</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.monthlyTrend} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={9} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
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
            <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 bg-neutral-50/20 dark:bg-neutral-950/10">
              <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-2">
                <FileSpreadsheet className="w-4.5 h-4.5 text-indigo-500" />
                Chart of Accounts (CoA) Budget Allocations
              </h3>
              <span className="text-[10px] text-neutral-400 font-semibold">{filteredBudgets.length} akun</span>
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
                      const isOver = item.variance < 0;
                      return (
                        <motion.tr
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          key={item.coa_id}
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                        >
                          <td className="p-4 font-mono font-bold text-neutral-600 dark:text-neutral-400">{item.coa_code || '-'}</td>
                          <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{item.coa_name}</td>
                          <td className="p-4 font-semibold text-neutral-600 dark:text-slate-400">{formatIDR(item.budget)}</td>
                          <td className="p-4 font-bold text-neutral-800 dark:text-slate-200">{formatIDR(item.actual)}</td>
                          <td className={`p-4 font-bold font-mono ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>
                            {formatIDR(item.variance)}
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
        </>
      )}
    </div>
  );
}
