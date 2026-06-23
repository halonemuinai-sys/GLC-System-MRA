'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Search,
  X,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Building2,
  DollarSign,
  Users,
  Wrench,
  ShieldCheck,
  Truck,
  ClipboardCheck,
  Package,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
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

const METRIC_ICON = {
  assetUtilization: Package,
  budgetAchievement: DollarSign,
  vendorActiveRate: Users,
  maintenanceHealth: Wrench,
  insuranceCoverage: ShieldCheck,
  vehicleTaxCompliance: Truck,
  stockOpnameAccuracy: ClipboardCheck
};

const METRIC_CAPTION = {
  assetUtilization: 'Proporsi aset berstatus Active terhadap total aset terdaftar.',
  budgetAchievement: 'Realisasi belanja (Actual) terhadap pagu anggaran (Budget) tahun berjalan.',
  vendorActiveRate: 'Proporsi vendor berstatus aktif terhadap seluruh vendor terdaftar.',
  maintenanceHealth: 'Proporsi kontrak maintenance yang belum melewati tanggal kadaluarsa.',
  insuranceCoverage: 'Proporsi kendaraan dengan minimal satu polis asuransi aktif & belum expired.',
  vehicleTaxCompliance: 'Proporsi kendaraan dengan pajak (STNK) belum lewat jatuh tempo.',
  stockOpnameAccuracy: 'Rasio aset "Ditemukan" terhadap total aset yang sudah dicek di seluruh sesi Stock Opname.'
};

const STATUS_COLOR = {
  green: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bar: '#10b981', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  yellow: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bar: '#f59e0b', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  red: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bar: '#ef4444', badge: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  gray: { dot: 'bg-neutral-400', text: 'text-neutral-400', bar: '#a3a3a3', badge: 'bg-neutral-200/60 text-neutral-500 dark:bg-neutral-700/40 dark:text-neutral-400' }
};

function GaugeBar({ actual, target, status, lowerIsBetter }) {
  if (actual === null || actual === undefined) {
    return <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full" />;
  }
  const maxVal = Math.max(actual, target) * (lowerIsBetter ? 1.3 : 1.25);
  const actualPct = Math.min(100, (actual / maxVal) * 100);
  const targetPct = Math.min(100, (target / maxVal) * 100);
  const s = STATUS_COLOR[status] || STATUS_COLOR.gray;
  return (
    <div className="relative w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full mt-2">
      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${actualPct}%`, background: s.bar }} />
      <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-neutral-500 border border-white dark:border-neutral-900 rounded-full shadow" style={{ left: `${targetPct}%`, transform: 'translate(-50%, -50%)' }} title={`Target: ${target}%`} />
    </div>
  );
}

const defaultData = {
  headline: { totalAssetValue: 0, totalAssetUnits: 0, totalExpenseActual: 0, totalExpenseBudget: 0, budgetAchievementPct: null },
  metrics: [],
  byCompany: []
};

export default function GaBenchmarkScorecardPage() {
  const [years, setYears] = useState([]);
  const [fiscalYear, setFiscalYear] = useState('');
  const [companyMasterId, setCompanyMasterId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [companyMasters, setCompanyMasters] = useState([]);
  const [companySearch, setCompanySearch] = useState('');

  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyDetail, setCompanyDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
    }).catch(err => console.error('Failed to fetch scorecard meta', err));
  }, []);

  const load = useCallback(async () => {
    if (!fiscalYear) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/ga/benchmark-scorecard', {
        params: {
          fiscalYear,
          companyId: companyId || undefined,
          companyMasterId: !companyId && companyMasterId ? companyMasterId : undefined
        }
      });
      setData(res || defaultData);
    } catch (err) {
      setError(err.message || 'Failed to load benchmark scorecard.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, companyId, companyMasterId]);

  useEffect(() => { load(); }, [load]);

  const handleViewCompanyDetail = async (company) => {
    setSelectedCompany(company);
    setCompanyDetail(null);
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/api/ga/benchmark-scorecard/company/${company.company_id}`, {
        params: { fiscalYear: fiscalYear || undefined }
      });
      setCompanyDetail(res);
    } catch (err) {
      console.error('Failed to fetch company detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredCompaniesForGroup = companyMasterId
    ? companies.filter(c => String(c.company_master_id) === String(companyMasterId))
    : companies;

  const filteredByCompany = data.byCompany.filter(c => c.company_name.toLowerCase().includes(companySearch.toLowerCase()));

  const formatIDR = (val) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
  };

  const { totalAssetValue, totalAssetUnits, totalExpenseActual, totalExpenseBudget, budgetAchievementPct } = data.headline;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-indigo-500" />
            Benchmark Scorecard
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Performance perusahaan keseluruhan GA — valuasi aset, anggaran, dan kepatuhan operasional.</p>
        </div>
        <button onClick={load} className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 hover:text-indigo-500 shadow-sm transition-colors cursor-pointer w-fit" title="Muat Ulang">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <span className="text-xs text-neutral-400">Memuat scorecard...</span>
        </div>
      ) : (
        <>
          {/* Headline Panel */}
          <div className="bg-neutral-950 border border-neutral-900 text-white rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div>
              <p className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest">Total Asset Value</p>
              <p className="text-xl font-black text-amber-400 leading-none mt-1.5 truncate">{formatIDR(totalAssetValue)}</p>
            </div>
            <div className="border-l border-neutral-800 pl-4 sm:pl-6">
              <p className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest">Total Unit Aset</p>
              <p className="text-xl font-black text-white leading-none mt-1.5">{totalAssetUnits.toLocaleString('id-ID')}</p>
            </div>
            <div className="border-l border-neutral-800 pl-4 sm:pl-6">
              <p className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest">Expense Actual YTD</p>
              <p className="text-xl font-black text-emerald-400 leading-none mt-1.5 truncate">{formatIDR(totalExpenseActual)}</p>
            </div>
            <div className="border-l border-neutral-800 pl-4 sm:pl-6">
              <p className="text-neutral-500 text-[9px] font-bold uppercase tracking-widest">Budget Achievement</p>
              <p className="text-xl font-black text-white leading-none mt-1.5">{budgetAchievementPct !== null ? `${budgetAchievementPct}%` : '-'}</p>
              <p className="text-neutral-500 text-[9px] font-semibold mt-1 truncate">Budget: {formatIDR(totalExpenseBudget)}</p>
            </div>
          </div>

          {/* KPI Scorecard Grid */}
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-3">Key Performance Indicators</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.metrics.map(m => {
                const Icon = METRIC_ICON[m.key] || Building2;
                const s = STATUS_COLOR[m.status] || STATUS_COLOR.gray;
                return (
                  <div key={m.key} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4.5 shadow-sm hover:-translate-y-0.5 transition-transform duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    </div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-1">{m.label}</p>
                    <p className={`text-2xl font-black ${m.actual !== null ? 'text-neutral-800 dark:text-white' : 'text-neutral-400'}`}>
                      {m.actual !== null ? `${m.actual}%` : 'N/A'}
                    </p>
                    <GaugeBar actual={m.actual} target={m.target} status={m.status} lowerIsBetter={m.lowerIsBetter} />
                    <p className={`text-[10px] font-bold mt-1.5 ${s.text}`}>
                      {m.actual !== null ? `Target: ${m.target}%` : 'Belum ada data'}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-medium mt-2 leading-relaxed">{METRIC_CAPTION[m.key]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per-Company Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Breakdown Per Perusahaan ({filteredByCompany.length})</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Cari perusahaan..."
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
                />
              </div>
            </div>

            {filteredByCompany.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl py-16 text-center text-neutral-400 text-xs">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                Tidak ada data perusahaan ditemukan.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredByCompany.map(c => {
                  const s = STATUS_COLOR[c.status] || STATUS_COLOR.gray;
                  return (
                    <button
                      type="button"
                      key={c.company_id}
                      onClick={() => handleViewCompanyDetail(c)}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4.5 shadow-sm text-left hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer w-full"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <p className="text-xs font-bold text-neutral-800 dark:text-slate-200 leading-snug truncate" title={c.company_name}>{c.company_name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${s.badge}`}>
                          {c.status === 'green' ? 'Healthy' : c.status === 'yellow' ? 'Warning' : 'Critical'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[11px]">
                        <div>
                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Asset Value</p>
                          <p className="font-bold text-neutral-700 dark:text-neutral-300 truncate">{formatIDR(c.totalAssetValue)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Unit Aset</p>
                          <p className="font-bold text-neutral-700 dark:text-neutral-300">{c.totalAssetUnits}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Utilization</p>
                          <p className="font-bold text-neutral-700 dark:text-neutral-300">{c.assetUtilizationPct !== null ? `${c.assetUtilizationPct}%` : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Achievement</p>
                          <p className="font-bold text-neutral-700 dark:text-neutral-300">{c.budgetAchievementPct !== null ? `${c.budgetAchievementPct}%` : '-'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-[10px] mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <div>
                          <p className="text-neutral-400">Expense Actual</p>
                          <p className="font-semibold text-neutral-600 dark:text-neutral-400 truncate">{formatIDR(c.expenseActual)}</p>
                        </div>
                        <div>
                          <p className="text-neutral-400">Expense Budget</p>
                          <p className="font-semibold text-neutral-600 dark:text-neutral-400 truncate">{formatIDR(c.expenseBudget)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-3 text-[10px] font-bold text-indigo-500">
                        Lihat Detail <ChevronRight className="w-3 h-3" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Company Detail Drawer */}
      <AnimatePresence>
        {selectedCompany && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSelectedCompany(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="font-bold text-neutral-800 dark:text-white text-sm flex items-center gap-2">
                  Detail Perusahaan
                  {detailLoading && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                </h3>
                <button onClick={() => setSelectedCompany(null)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Perusahaan</span>
                  <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedCompany.company_name}</h2>
                  {companyDetail?.company?.code && <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">{companyDetail.company.code}</span>}
                </div>

                {/* Recap headline (sudah tersedia dari card, tampil instan) */}
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Asset Value</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-bold">{formatIDR(selectedCompany.totalAssetValue)}</span></div>
                  <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Unit Aset</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-bold">{selectedCompany.totalAssetUnits}</span></div>
                  <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Utilization</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-bold">{selectedCompany.assetUtilizationPct !== null ? `${selectedCompany.assetUtilizationPct}%` : '-'}</span></div>
                  <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Achievement</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-bold">{selectedCompany.budgetAchievementPct !== null ? `${selectedCompany.budgetAchievementPct}%` : '-'}</span></div>
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                {/* Asset Breakdown per Kategori */}
                <div>
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-500" /> Asset Breakdown per Kategori
                  </h4>
                  {detailLoading ? (
                    <div className="py-6 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-neutral-400" /></div>
                  ) : !companyDetail?.assetByCategory?.length ? (
                    <p className="text-[11px] text-neutral-400">Tidak ada data aset untuk perusahaan ini.</p>
                  ) : (
                    <div className="space-y-2">
                      {companyDetail.assetByCategory.map(cat => (
                        <div key={cat.category} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 rounded-xl px-3 py-2 border border-neutral-100 dark:border-neutral-800">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 truncate">{cat.category}</p>
                            <p className="text-[10px] text-neutral-400">{cat.activeCount}/{cat.count} aktif</p>
                          </div>
                          <span className="text-[11px] font-bold text-neutral-800 dark:text-white shrink-0">{formatIDR(cat.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                {/* Expense Breakdown per CoA */}
                <div>
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200 mb-2.5 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" /> Expense Breakdown per CoA
                  </h4>
                  {detailLoading ? (
                    <div className="py-6 flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-neutral-400" /></div>
                  ) : !companyDetail?.expenseByCoa?.length ? (
                    <p className="text-[11px] text-neutral-400">Tidak ada data anggaran untuk perusahaan ini.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {companyDetail.expenseByCoa.map(coa => {
                        const isOver = coa.variance < 0;
                        return (
                          <div key={coa.coa_id} className="bg-neutral-50 dark:bg-neutral-950 rounded-xl px-3 py-2 border border-neutral-100 dark:border-neutral-800">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 truncate">{coa.coa_name}</p>
                              <span className={`text-[10px] font-bold shrink-0 ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>{isOver ? 'Over' : 'On Track'}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-500">
                              <span>Budget: {formatIDR(coa.budget)}</span>
                              <span className="font-bold text-neutral-700 dark:text-neutral-300">Actual: {formatIDR(coa.actual)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
