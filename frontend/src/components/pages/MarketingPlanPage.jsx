'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  X,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Paperclip,
  Layers,
  Info,
  Check,
  FileSpreadsheet,
  Trash2,
  Save,
  Send,
  Undo2,
  Pencil
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import { useLanguage } from '@/lib/LanguageContext';
import mpt from '@/lib/translations/marketingPlan';
import MarketingPlanWizardModal from './MarketingPlanWizardModal';
import MarketingPlanDetailModal from './MarketingPlanDetailModal';
// Helper: Format to IDR Currency
const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

// Helper: Format angka jadi pemisah ribuan saat diketik (tampilan saja, value yang
// disimpan di state tetap angka polos tanpa titik)
const formatThousands = (value) => {
  if (value === undefined || value === null) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper: Get Month Name
const getMonthName = (monthNum, lang = 'en') => {
  const months_en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months_id = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const months = lang === 'id' ? months_id : months_en;
  return months[monthNum - 1] || '';
};

// Rentang tahun anggaran yang bisa dipilih (tahun berjalan -1 s/d +2), supaya tidak
const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i));

export default function MarketingPlanPage() {
  const { lang } = useLanguage();
  const t = (key, ...args) => typeof mpt[lang][key] === 'function' ? mpt[lang][key](...args) : (mpt[lang][key] ?? key);

  // State for metadata & data
  const [metadata, setMetadata] = useState({ brands: [], lobs: [], branches: [], event_locations: [], coas: [], companies: [], vendors: [] });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [recallingPlanId, setRecallingPlanId] = useState(null);

  // Filter States
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [companyId, setCompanyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [revisingPlanId, setRevisingPlanId] = useState(null);
  const [draftPlanId, setDraftPlanId] = useState(null);

  // Current user role
  const userRole = React.useMemo(() => (typeof window !== 'undefined' ? (Cookies.get('glc_user_role') || '').toLowerCase() : ''), []);

  // Fetch Metadata & Plans on mount / filter change
  const loadMetadata = async () => {
    try {
      const res = await apiClient.get('/api/marketing/metadata');
      setMetadata(res);
    } catch (err) {
      console.error('Failed to load marketing metadata:', err);
    }
  };

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        fiscal_year: fiscalYear || undefined,
        company_id: companyId || undefined,
        status: statusFilter || undefined
      };
      const res = await apiClient.get('/api/marketing/plans', { params });
      setPlans(res || []);
    } catch (err) {
      setError(err.message || 'Failed to load marketing plans.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, companyId, statusFilter]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Refetch wrapper
  const handleRefresh = () => {
    loadPlans();
  };

  // Calculations for KPI Cards
  const kpis = useMemo(() => {
    let totalBudget = 0;
    let totalActual = 0;
    let activeCampaigns = 0;

    plans.forEach(p => {
      totalBudget += Number(p.total_budget || 0);
      if (p.status === 'APPROVED') {
        activeCampaigns++;
      }
      // Calculate actual from items
      if (p.items) {
        p.items.forEach(item => {
          totalActual += Number(item.actual_amount || 0);
        });
      }
    });

    const variance = totalBudget - totalActual;
    const burnRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalActual,
      variance,
      burnRate,
      activeCampaigns
    };
  }, [plans]);

  // Action handlers
  const handleCreatePlan = () => {
    setDraftPlanId(null);
    setRevisingPlanId(null);
    setIsWizardOpen(true);
  };

  const handleEditDraft = (planId) => {
    setDraftPlanId(planId);
    setRevisingPlanId(null);
    setIsWizardOpen(true);
  };

  const handleRevisePlan = (plan) => {
    setRevisingPlanId(plan.id);
    setDraftPlanId(null);
    setIsWizardOpen(true);
  };

  const openDetail = (planId) => {
    setSelectedPlanId(planId);
    setIsDetailOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/marketing/plans/${planToDelete.id}`);
      setSuccessMsg(t('successDeleted'));
      setPlanToDelete(null);
      loadPlans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      alert(err.message || t('errFailDelete'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecallPlan = async (planId) => {
    if (!window.confirm(t('confirmRecall'))) return;
    try {
      setRecallingPlanId(planId);
      await apiClient.post(`/api/marketing/plans/${planId}/recall`);
      setSuccessMsg(t('successRecalled'));
      loadPlans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      alert(err.message || t('errFailRecall'));
    } finally {
      setRecallingPlanId(null);
    }
  };

  const handleSubmitDraft = async (planId) => {
    if (!window.confirm(t('confirmSubmitDraft'))) return;
    try {
      setSubmitting(true);
      await apiClient.post(`/api/marketing/plans/${planId}/submit`);
      setSuccessMsg(t('successSubmitted'));
      loadPlans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      alert(err.message || t('errFailSubmitPlan'));
    } finally {
      setSubmitting(false);
    }
  };

  // Filter plans based on search queries
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        p.company?.name.toLowerCase().includes(q) ||
        p.creator?.name.toLowerCase().includes(q)
      );
    });
  }, [plans, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Marketing Plan & Budgeting
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
              {t('subtitle')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 hover:text-indigo-500 shadow-sm transition-colors cursor-pointer"
            title={t('refreshData')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreatePlan}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('createPlan')}
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" /> {error}
        </motion.div>
      )}

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-indigo-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <DollarSign className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('kpiTotalBudget')}</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">{formatIDR(kpis.totalBudget)}</h3>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-emerald-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('kpiRealized')}</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">{formatIDR(kpis.totalActual)}</h3>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-blue-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <TrendingDown className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('kpiRemaining')}</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">{formatIDR(kpis.variance)}</h3>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-violet-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/15 to-violet-500/5 border border-violet-500/20 flex items-center justify-center text-violet-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Layers className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('kpiBurnRate')}</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">
                {kpis.burnRate.toFixed(1)}% <span className="text-xs font-normal text-neutral-400">({kpis.activeCampaigns} Approved)</span>
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <p className="text-xs font-black text-neutral-700 dark:text-neutral-300">
            {t('pipelineTitle')} <span className="font-normal text-neutral-400">({plans.length})</span>
          </p>
          <div className="flex items-center gap-2">
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              {FISCAL_YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{t('fiscalYear')} {y}</option>
              ))}
            </select>

            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none max-w-[200px]"
            >
              <option value="">{t('allCompanies')}</option>
              {metadata.companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">{t('allStatuses')}</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">{t('loading')}</span>
        </div>
      ) : (
        /* Plans Table View */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/20 text-neutral-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-4">{t('colPlanName')}</th>
                  <th className="px-5 py-4">{t('colCompany')}</th>
                  <th className="px-5 py-4">{t('colPeriod')}</th>
                  <th className="px-5 py-4 text-right">{t('colTotalBudget')}</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4">{t('colSubmittedBy')}</th>
                  <th className="px-5 py-4 text-center">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-16 text-center">
                      {plans.length === 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <FileSpreadsheet className="w-9 h-9 text-neutral-300 dark:text-neutral-700" />
                          <p className="text-xs text-neutral-450 font-medium">{t('noPlans')}</p>
                          <button
                            onClick={handleCreatePlan}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> {t('submitFirstPlan')}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-450 font-normal">{t('noMatch')}</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map(plan => {
                    let statusBadge = 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/5 dark:text-amber-450 border-amber-200/60 dark:border-amber-900/30';
                    let statusText = 'Pending Approval';
                    let StatusIcon = Clock;
                    let rowAccent = 'border-l-transparent hover:border-l-amber-400';
                    if (plan.status === 'APPROVED') {
                      statusBadge = 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-450 border-emerald-200/60 dark:border-emerald-900/30';
                      statusText = 'Approved';
                      StatusIcon = CheckCircle;
                      rowAccent = 'border-l-transparent hover:border-l-emerald-400';
                    } else if (plan.status === 'REJECTED') {
                      statusBadge = 'bg-red-500/10 text-red-600 dark:bg-red-500/5 dark:text-red-450 border-red-200/60 dark:border-red-900/30';
                      statusText = 'Rejected';
                      StatusIcon = AlertTriangle;
                      rowAccent = 'border-l-transparent hover:border-l-red-400';
                    } else if (plan.status === 'DRAFT') {
                      statusBadge = 'bg-neutral-500/10 text-neutral-600 dark:bg-neutral-500/5 dark:text-neutral-450 border-neutral-200/60 dark:border-neutral-700/40';
                      statusText = 'Draft';
                      StatusIcon = FileSpreadsheet;
                      rowAccent = 'border-l-transparent hover:border-l-neutral-400';
                    }

                    return (
                      <tr key={plan.id} className={`border-l-[3px] ${rowAccent} hover:bg-neutral-50/30 dark:hover:bg-neutral-800/5 text-neutral-700 dark:text-neutral-300 transition-colors`}>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => openDetail(plan.id)}
                            className="font-bold text-neutral-900 dark:text-white hover:text-indigo-500 transition-colors text-left"
                          >
                            {plan.title}
                          </button>
                          {plan.description && <p className="text-[10px] text-neutral-400 font-normal line-clamp-1 mt-0.5">{plan.description}</p>}
                        </td>
                        <td className="px-5 py-4 text-neutral-900 dark:text-neutral-200">
                          {plan.company?.name || 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-neutral-500">
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 block">
                            {plan.event_start_date ? new Date(plan.event_start_date).toLocaleDateString(t('dateLocale'), { month: 'short', year: 'numeric' }) : (plan.start_date ? new Date(plan.start_date).toLocaleDateString(t('dateLocale'), { month: 'short', year: 'numeric' }) : '-')} - {plan.event_end_date ? new Date(plan.event_end_date).toLocaleDateString(t('dateLocale'), { month: 'short', year: 'numeric' }) : (plan.end_date ? new Date(plan.end_date).toLocaleDateString(t('dateLocale'), { month: 'short', year: 'numeric' }) : '-')}
                          </span>
                          {plan.cta_start_date && (
                            <span className="text-[9px] text-neutral-450 dark:text-neutral-500 block mt-0.5">
                              {t('promoLabel')} {new Date(plan.cta_start_date).toLocaleDateString(t('dateLocale'), { month: 'short', year: 'numeric' })} - {new Date(plan.cta_end_date).toLocaleDateString(t('dateLocale'), { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-neutral-850 dark:text-white">
                          {formatIDR(plan.total_budget)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide inline-flex items-center gap-1 border ${statusBadge}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusText}
                          </span>
                          {plan.pipeline && (
                            <p className="text-[9px] text-neutral-400 font-bold mt-1">
                              Step {plan.pipeline.currentStep}/{plan.pipeline.totalSteps || '?'}
                              {plan.pipeline.approverRole && <> · {plan.pipeline.approverRole.replace(/_/g, ' ')}</>}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{plan.creator?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* DRAFT actions */}
                            {plan.status === 'DRAFT' && (
                              <>
                                <button
                                  onClick={() => handleEditDraft(plan.id)}
                                  className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl hover:text-indigo-500 hover:border-indigo-500 text-[10px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" /> {t('btnContinue')}
                                </button>
                                <button
                                  onClick={() => handleSubmitDraft(plan.id)}
                                  disabled={submitting}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Send className="w-3 h-3" /> {t('btnSubmit')}
                                </button>
                              </>
                            )}

                            {/* PENDING_APPROVAL recall */}
                            {plan.status === 'PENDING_APPROVAL' && (userRole === 'marketing' || userRole === 'admin') && (
                              <button
                                onClick={() => handleRecallPlan(plan.id)}
                                disabled={recallingPlanId === plan.id}
                                className="px-2.5 py-1.5 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-300/60 dark:border-amber-700/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/15 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                title={t('btnRecallTitle')}
                              >
                                {recallingPlanId === plan.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                                {t('btnRecall')}
                              </button>
                            )}

                            <button
                              onClick={() => openDetail(plan.id)}
                              className="px-2.5 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl hover:text-indigo-500 hover:border-indigo-500 text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                            >
                              {t('btnDetails')}
                            </button>
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setPlanToDelete(plan)}
                              className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200/40 flex items-center justify-center"
                              title={t('btnDeleteTitle')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
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
      )}

      {/* MODAL 1: MULTI-STEP CREATION WIZARD */}
      <MarketingPlanWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setDraftPlanId(null);
          setRevisingPlanId(null);
        }}
        draftPlanId={draftPlanId}
        revisingPlanId={revisingPlanId}
        metadata={metadata}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          loadPlans();
          setIsWizardOpen(false);
          setDraftPlanId(null);
          setRevisingPlanId(null);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
        onError={(err) => {
          setError(err);
          setTimeout(() => setError(null), 6000);
        }}
      />

      {/* MODAL 2: PLAN DETAIL & INLINE PAYMENT REQUEST */}
      <MarketingPlanDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedPlanId(null);
        }}
        planId={selectedPlanId}
        metadata={metadata}
        loadPlans={loadPlans}
        onRevise={handleRevisePlan}
        onEditDraft={handleEditDraft}
        userRole={userRole}
        onSuccessMsg={(msg) => {
          setSuccessMsg(msg);
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
      />

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {planToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPlanToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-md p-6 z-55 overflow-hidden flex flex-col items-center text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-500 flex items-center justify-center animate-pulse">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-neutral-850 dark:text-white">{t('deleteTitle')}</h3>
                <p className="text-xs text-neutral-450 dark:text-neutral-500 px-2 leading-relaxed">
                  {t('deleteBodyPrefix')} <strong>"{planToDelete.title}"</strong> {t('deleteBodySuffix')}
                </p>
              </div>
              <div className="flex items-center gap-2.5 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setPlanToDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-neutral-250 dark:border-neutral-750 text-neutral-650 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t('btnYesDelete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
