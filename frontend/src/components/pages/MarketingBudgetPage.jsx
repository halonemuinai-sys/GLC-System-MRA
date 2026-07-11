'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Search,
  Plus,
  X,
  Edit3,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  Sparkles,
  ChevronLeft,
  Coins,
  ChevronRight,
  TrendingUp,
  Clock,
  Briefcase
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

const FISCAL_YEAR_OPTIONS = ['2024', '2025', '2026', '2027'];

// ─── Stat Card Component ────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = 'blue', delay = 0 }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl p-5 hover:shadow-lg hover:shadow-neutral-200/40 dark:hover:shadow-neutral-950/30 transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-neutral-450 dark:text-neutral-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-black text-neutral-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function MarketingBudgetPage() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [metadata, setMetadata] = useState({ brands: [], lobs: [], companies: [] });
  const [error, setError] = useState(null);

  // Active filter state
  const [filter, setFilter] = useState({
    company_id: '',
    brand_id: '',
    lob_id: '',
    fiscal_year: String(new Date().getFullYear())
  });

  // Current Budget Data
  const [activeBudget, setActiveBudget] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [relatedPlans, setRelatedPlans] = useState([]);

  // UI state
  const [showDrawer, setShowDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  
  // Drawer Form State
  const [formData, setFormData] = useState({
    company_id: '',
    brand_id: '',
    lob_id: '',
    fiscal_year: String(new Date().getFullYear()),
    total_budget: '0'
  });

  // Load Metadata
  const fetchMetadata = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/marketing/metadata');
      if (res) {
        setMetadata({
          brands: res.brands || [],
          lobs: res.lobs || [],
          companies: res.companies || []
        });

        // Set default values for filter
        if (res.companies.length > 0) {
          // Default to PT Mogems if exists, otherwise first company
          const mogems = res.companies.find(c => c.name.toLowerCase().includes('mogems'));
          setFilter(prev => ({
            ...prev,
            company_id: mogems ? String(mogems.id) : String(res.companies[0].id),
            brand_id: res.brands.length > 0 ? String(res.brands[0].id) : '',
            lob_id: res.lobs.length > 0 ? String(res.lobs[0].id) : ''
          }));
        }
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat metadata.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Load Budget based on current filters
  const handleProses = async () => {
    if (!filter.company_id || !filter.brand_id || !filter.lob_id || !filter.fiscal_year) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const res = await apiClient.get('/api/marketing/budgets/check', {
        params: filter
      });

      // Also get the budget header details if it exists to get the ID
      const allBudgets = await apiClient.get('/api/marketing/budgets', {
        params: filter
      });

      if (allBudgets && allBudgets.length > 0) {
        setActiveBudget(allBudgets[0]);
      } else {
        setActiveBudget(null);
      }

      setMonthlyData(res.monthly || []);
      setRelatedPlans(res.related_plans || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat anggaran.');
    } finally {
      setProcessing(false);
    }
  };

  // Run handleProses once metadata defaults are set
  useEffect(() => {
    if (filter.company_id && filter.brand_id && filter.lob_id) {
      handleProses();
    }
  }, [filter.company_id, filter.brand_id, filter.lob_id, filter.fiscal_year]);

  // Handle Edit Limit for a Specific Month
  const handleLimitChange = (index, value) => {
    if (activeBudget?.is_locked) return;
    const cleanVal = parseFloat(value.replace(/[^0-9]/g, '')) || 0;
    
    setMonthlyData(prev => {
      const next = [...prev];
      next[index] = { ...next[index], limit: cleanVal };
      return next;
    });
  };

  // Save changes to current monthly limits
  const handleSaveLimits = async () => {
    if (!activeBudget || activeBudget.is_locked) return;

    try {
      setProcessing(true);
      const totalLimit = monthlyData.reduce((sum, m) => sum + m.limit, 0);
      
      const payload = {
        total_budget: totalLimit,
        monthly_limits: monthlyData.map(m => ({
          period_month: m.month,
          budget_limit: m.limit
        }))
      };

      await apiClient.put(`/api/marketing/budgets/${activeBudget.id}`, payload);
      // Reload
      await handleProses();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan perubahan anggaran.');
    } finally {
      setProcessing(false);
    }
  };

  // Toggle Lock
  const handleToggleLock = async () => {
    if (!activeBudget) return;

    try {
      setProcessing(true);
      const action = activeBudget.is_locked ? 'unlock' : 'lock';
      const res = await apiClient.put(`/api/marketing/budgets/${activeBudget.id}/${action}`);
      setActiveBudget(res);
      await handleProses();
    } catch (err) {
      alert(err.message || 'Gagal mengubah status kunci.');
    } finally {
      setProcessing(false);
    }
  };

  // Open Drawer to Create
  const handleOpenCreate = () => {
    setFormData({
      company_id: filter.company_id,
      brand_id: filter.brand_id,
      lob_id: filter.lob_id,
      fiscal_year: filter.fiscal_year,
      total_budget: '0'
    });
    setFormError(null);
    setShowDrawer(true);
  };

  // Create Budget Form Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormError(null);

      const totalVal = parseFloat(formData.total_budget.replace(/[^0-9]/g, '')) || 0;
      // Split evenly by 12 months as default
      const monthlySplit = Array.from({ length: 12 }, (_, i) => ({
        period_month: i + 1,
        budget_limit: totalVal / 12
      }));

      const payload = {
        company_id: parseInt(formData.company_id, 10),
        brand_id: parseInt(formData.brand_id, 10),
        lob_id: parseInt(formData.lob_id, 10),
        fiscal_year: parseInt(formData.fiscal_year, 10),
        total_budget: totalVal,
        monthly_limits: monthlySplit
      };

      await apiClient.post('/api/marketing/budgets', payload);
      setShowDrawer(false);
      await handleProses();
    } catch (err) {
      setFormError(err.message || 'Gagal membuat anggaran baru.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helpers for calculations
  const totalLimit = monthlyData.reduce((sum, m) => sum + m.limit, 0);
  const totalCommitted = monthlyData.reduce((sum, m) => sum + m.committed, 0);
  const totalRealized = monthlyData.reduce((sum, m) => sum + (m.actual || 0), 0);
  const totalAvailable = totalLimit - totalCommitted;

  const getMonthName = (num) => {
    const names = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return names[num - 1] || '';
  };

  const formatRupiah = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
        <p className="text-xs text-neutral-450 dark:text-neutral-500 font-bold">{t('marketing_budget_loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
              {t('marketing_budget_title')}
            </h1>
            {activeBudget && (
              <span className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider flex items-center gap-1 ${activeBudget.is_locked ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {activeBudget.is_locked ? (
                  <>
                    <Lock className="w-2.5 h-2.5" />
                    {t('marketing_budget_locked')}
                  </>
                ) : (
                  <>
                    <Unlock className="w-2.5 h-2.5" />
                    {t('marketing_budget_unlocked')}
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">
            Pantau limit alokasi pengeluaran, realisasi rencana kampanye, dan sisa kuota bulanan.
          </p>
        </div>

        <div className="flex gap-2">
          {activeBudget ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleLock}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${activeBudget.is_locked ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/15' : 'bg-red-600 hover:bg-red-750 text-white shadow-red-500/15'}`}
            >
              {activeBudget.is_locked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  Buka Kunci (Unlock)
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Kunci Budget (Lock)
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/15 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Inisialisasi Budget Baru
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Company</label>
          <select
            value={filter.company_id}
            onChange={(e) => setFilter(prev => ({ ...prev, company_id: e.target.value }))}
            className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {metadata.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Brand</label>
          <select
            value={filter.brand_id}
            onChange={(e) => setFilter(prev => ({ ...prev, brand_id: e.target.value }))}
            className="bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {metadata.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Line of Business</label>
          <select
            value={filter.lob_id}
            onChange={(e) => setFilter(prev => ({ ...prev, lob_id: e.target.value }))}
            className="bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {metadata.lobs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Fiscal Year</label>
          <select
            value={filter.fiscal_year}
            onChange={(e) => setFilter(prev => ({ ...prev, fiscal_year: e.target.value }))}
            className="bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button
          onClick={handleProses}
          disabled={processing}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Proses Data
        </button>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Plafon Master (Limit)"
          value={formatRupiah(totalLimit)}
          icon={Coins}
          color="blue"
          delay={0.05}
        />
        <StatCard
          label="Committed (Plan)"
          value={formatRupiah(totalCommitted)}
          icon={Clock}
          color="amber"
          delay={0.1}
        />
        <StatCard
          label="Realisasi (Actual)"
          value={formatRupiah(totalRealized)}
          icon={TrendingUp}
          color="purple"
          delay={0.15}
        />
        <StatCard
          label="Sisa Kuota (Available)"
          value={formatRupiah(totalAvailable)}
          icon={Sparkles}
          color="emerald"
          delay={0.2}
        />
      </div>

      {/* ── Interactive 12-Month Table ── */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-855 flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-850 dark:text-white flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-blue-500" />
            Alokasi Bulanan
          </h3>
          {activeBudget && !activeBudget.is_locked && (
            <button
              onClick={handleSaveLimits}
              disabled={processing}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-750 text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-sm shadow-blue-500/10"
            >
              {processing ? 'Menyimpan...' : 'Simpan Limit Anggaran'}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-955 border-b border-neutral-200/60 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider">
                <th className="px-6 py-3.5 w-[20%]">Bulan</th>
                <th className="px-6 py-3.5 w-[25%]">Limit Anggaran</th>
                <th className="px-6 py-3.5 w-[20%]">Committed (Plan)</th>
                <th className="px-6 py-3.5 w-[20%]">Realisasi (Actual)</th>
                <th className="px-6 py-3.5 w-[15%] text-right">Persentase Pemakaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 font-medium text-neutral-700 dark:text-neutral-300">
              {monthlyData.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-neutral-450 font-bold">
                    Belum ada inisialisasi anggaran untuk konfigurasi ini. Klik tombol "Inisialisasi Budget Baru" untuk memulai.
                  </td>
                </tr>
              ) : (
                monthlyData.map((item, idx) => {
                  const usagePct = item.limit > 0 ? ((item.actual || 0) / item.limit) * 100 : 0;
                  const barColor = usagePct > 100 ? 'bg-red-500' : usagePct > 80 ? 'bg-amber-500' : 'bg-emerald-500';

                  return (
                    <tr key={item.month} className="hover:bg-neutral-550/5 dark:hover:bg-neutral-955/10 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-neutral-850 dark:text-white">
                        {getMonthName(item.month)}
                      </td>
                      <td className="px-6 py-3.5">
                        {activeBudget?.is_locked ? (
                          <span className="font-mono font-bold text-neutral-800 dark:text-white">
                            {formatRupiah(item.limit)}
                          </span>
                        ) : (
                          <div className="relative max-w-[160px]">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">Rp</span>
                            <input
                              type="text"
                              value={item.limit.toLocaleString('id-ID')}
                              onChange={(e) => handleLimitChange(idx, e.target.value)}
                              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-2.5 py-1.5 font-mono text-[11px] font-bold text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-neutral-500 dark:text-neutral-400">
                        {formatRupiah(item.committed)}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-neutral-500 dark:text-neutral-400">
                        {formatRupiah(item.actual || 0)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-extrabold ${usagePct > 100 ? 'text-red-500' : usagePct > 80 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {usagePct.toFixed(1)}%
                          </span>
                          <div className="w-24 h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                            <div className={`h-full ${barColor}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Related Marketing Plans ── */}
      {relatedPlans.length > 0 && (
        <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-855 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-neutral-850 dark:text-white">
                Marketing Plans Terkait
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold">
                {relatedPlans.length} rencana
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">Kampanye yang menggunakan alokasi anggaran ini</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-955 border-b border-neutral-200/60 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider">
                  <th className="px-5 py-3.5">#</th>
                  <th className="px-5 py-3.5">Judul Rencana</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Total Budget</th>
                  <th className="px-5 py-3.5">Periode</th>
                  <th className="px-5 py-3.5">Dibuat Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 font-medium text-neutral-700 dark:text-neutral-300">
                {relatedPlans.map((plan) => {
                  const statusColors = {
                    DRAFT: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500',
                    PENDING_APPROVAL: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                    APPROVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                    REJECTED: 'bg-red-500/10 text-red-500',
                    COMPLETED: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  };
                  const statusLabels = {
                    DRAFT: 'Draft',
                    PENDING_APPROVAL: 'Menunggu',
                    APPROVED: 'Disetujui',
                    REJECTED: 'Ditolak',
                    COMPLETED: 'Selesai'
                  };
                  const fmtDate = (d) => {
                    if (!d) return '—';
                    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                  };

                  return (
                    <tr key={plan.id} className="hover:bg-neutral-550/5 dark:hover:bg-neutral-955/10 transition-colors">
                      <td className="px-5 py-3.5 text-neutral-400 font-mono font-bold">#{plan.id}</td>
                      <td className="px-5 py-3.5 font-semibold text-neutral-850 dark:text-white max-w-[240px] truncate">{plan.title}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide ${statusColors[plan.status] || statusColors.DRAFT}`}>
                          {statusLabels[plan.status] || plan.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-neutral-850 dark:text-white">{formatRupiah(plan.total_budget)}</td>
                      <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                        {fmtDate(plan.start_date)} – {fmtDate(plan.end_date)}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400">{plan.creator?.name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Slide-over Drawer (Create Budget Form) ── */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-black z-45"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-neutral-955 border-l border-neutral-200 dark:border-neutral-850 z-50 shadow-2xl p-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-850 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-neutral-855 dark:text-white">
                      Inisialisasi Budget Baru
                    </h3>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      Tetapkan plafon master tahunan yang akan dibagi rata ke 12 bulan sebagai basis awal.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="p-1.5 text-neutral-450 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-wider block">PT / Company</label>
                    <select
                      value={formData.company_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, company_id: e.target.value }))}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white"
                      required
                    >
                      <option value="">Pilih Perusahaan</option>
                      {metadata.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-wider block">Brand</label>
                    <select
                      value={formData.brand_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, brand_id: e.target.value }))}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white"
                      required
                    >
                      <option value="">Pilih Brand</option>
                      {metadata.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-wider block">Line of Business</label>
                    <select
                      value={formData.lob_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, lob_id: e.target.value }))}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white"
                      required
                    >
                      <option value="">Pilih LOB</option>
                      {metadata.lobs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-wider block">Tahun Fiskal</label>
                    <select
                      value={formData.fiscal_year}
                      onChange={(e) => setFormData(prev => ({ ...prev, fiscal_year: e.target.value }))}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white"
                      required
                    >
                      {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-wider block">Total Master Plafon Tahun Fiskal *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">Rp</span>
                      <input
                        type="text"
                        placeholder="Contoh: 1.000.000.000"
                        value={formData.total_budget === '0' ? '' : formData.total_budget}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData(prev => ({ ...prev, total_budget: val ? parseInt(val, 10).toLocaleString('id-ID') : '0' }));
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        required
                      />
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{formError}</span>
                    </div>
                  )}
                </form>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-855 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-350 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Inisialisasi'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
