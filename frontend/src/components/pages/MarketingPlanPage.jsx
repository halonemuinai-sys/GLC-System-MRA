'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Pencil,
  ChevronLeft,
  ChevronRight,
  Eye,
  ChevronDown,
  Building2,
  SlidersHorizontal
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

// ── Custom Filter Dropdown ────────────────────────────────────────────────────
function FilterDropdown({ label, value, icon: Icon, options, onChange, colorMap, searchable = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && searchable && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!open) setQuery('');
  }, [open, searchable]);

  const selected = options.find(o => o.value === value);
  const isActive = value !== '';

  const filtered = searchable && query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer select-none ${
          isActive
            ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-850'
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
        <span className="whitespace-nowrap max-w-[140px] truncate">
          {selected ? selected.label : label}
        </span>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full mt-2 left-0 z-50 min-w-[220px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl shadow-black/8 dark:shadow-black/30 overflow-hidden"
          >
            {searchable && (
              <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Cari perusahaan..."
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-indigo-400 transition-colors"
                  />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="py-1.5 max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-neutral-400 text-center">Tidak ditemukan</p>
            ) : filtered.map((opt) => {
              const isSelected = value === opt.value;
              const color = colorMap?.[opt.value];
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/70'
                  }`}
                >
                  {color && (
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  )}
                  <span className="flex-1">{opt.label}</span>
                  {isSelected && <Check className="w-3 h-3 text-indigo-500 flex-shrink-0" />}
                </button>
              );
            })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  const searchDebounceRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPlans, setTotalPlans] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 15;

  // Summary for KPI (independent of page)
  const [summary, setSummary] = useState({ totalBudget: 0, approved: 0, pending: 0, draft: 0, rejected: 0 });

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

  const loadPlans = useCallback(async (page = 1, search = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        fiscal_year: fiscalYear || undefined,
        company_id: companyId || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE
      };
      const res = await apiClient.get('/api/marketing/plans', { params });
      setPlans(res?.data || []);
      setTotalPlans(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setCurrentPage(res?.page || 1);
      if (res?.summary) setSummary(res.summary);
    } catch (err) {
      setError(err.message || 'Failed to load marketing plans.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, companyId, statusFilter]);

  useEffect(() => { loadMetadata(); }, []);

  // Reset ke page 1 saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
    loadPlans(1, searchQuery);
  }, [loadPlans]);

  // Debounce search — kirim ke server setelah 400ms berhenti ketik
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadPlans(1, val);
    }, 400);
  };

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    loadPlans(page, searchQuery);
  };

  const handleRefresh = () => { loadPlans(currentPage, searchQuery); };

  // KPI dari summary server — tidak terpengaruh pagination
  const kpis = useMemo(() => ({
    totalBudget: summary.totalBudget,
    activeCampaigns: summary.approved,
    burnRate: 0,
    variance: 0,
  }), [summary]);

  const handleWizardError = useCallback((err) => {
    setError(err);
    setTimeout(() => setError(null), 6000);
  }, []);

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

  // Search sudah server-side, tidak perlu filter client

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
            className="w-9 h-9 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 shadow-sm transition-all cursor-pointer"
            title={t('refreshData')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreatePlan}
            className="flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
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

      {/* Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
        {/* Top row: title + filter pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-black text-neutral-800 dark:text-white leading-tight">{t('pipelineTitle')}</p>
              <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                {totalPlans > 0 ? `${totalPlans} rencana ditemukan` : 'Belum ada rencana'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Tahun"
              value={fiscalYear}
              icon={Calendar}
              options={FISCAL_YEAR_OPTIONS.map(y => ({ value: y, label: y }))}
              onChange={setFiscalYear}
            />
            <FilterDropdown
              label={t('allCompanies')}
              value={companyId}
              icon={Building2}
              searchable
              options={[
                { value: '', label: t('allCompanies') },
                ...metadata.companies.map(c => ({ value: String(c.id), label: c.name }))
              ]}
              onChange={setCompanyId}
            />
            <FilterDropdown
              label={t('allStatuses')}
              value={statusFilter}
              icon={Layers}
              options={[
                { value: '', label: t('allStatuses') },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'COMPLETED', label: 'Completed' },
              ]}
              colorMap={{
                DRAFT: 'bg-neutral-400',
                PENDING_APPROVAL: 'bg-amber-400',
                APPROVED: 'bg-emerald-400',
                REJECTED: 'bg-red-400',
                COMPLETED: 'bg-blue-400',
              }}
              onChange={setStatusFilter}
            />
            {(companyId || statusFilter) && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setCompanyId(''); setStatusFilter(''); }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200 dark:hover:border-red-500/20 transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
                Reset
              </motion.button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-neutral-800 dark:text-white transition-all placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); loadPlans(1, ''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-16 text-center">
                      {totalPlans === 0 ? (
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
                  plans.map(plan => {
                    let statusBadge = 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/5 dark:text-amber-450 border-amber-200/60 dark:border-amber-900/30';
                    let statusText = 'Pending Approval';
                    let StatusIcon = Clock;
                    let rowAccent = 'border-l-transparent hover:border-l-amber-400';
                    if (plan.status === 'APPROVED') {
                      statusBadge = 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-450 border-emerald-200/60 dark:border-emerald-900/30';
                      statusText = 'Approved';
                      StatusIcon = CheckCircle;
                      rowAccent = 'border-l-transparent hover:border-l-emerald-400';
                    } else if (plan.status === 'COMPLETED') {
                      statusBadge = 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/30';
                      statusText = 'Completed';
                      StatusIcon = CheckCircle;
                      rowAccent = 'border-l-transparent hover:border-l-blue-400';
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
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* DRAFT actions */}
                            {plan.status === 'DRAFT' && (
                              <>
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleEditDraft(plan.id)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-all cursor-pointer"
                                  title={t('btnContinue')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => handleSubmitDraft(plan.id)}
                                  disabled={submitting}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm shadow-emerald-500/30 hover:from-emerald-400 hover:to-emerald-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={t('btnSubmit')}
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </motion.button>
                              </>
                            )}

                            {/* PENDING_APPROVAL recall */}
                            {plan.status === 'PENDING_APPROVAL' && (userRole === 'marketing' || userRole === 'admin') && (
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => handleRecallPlan(plan.id)}
                                disabled={recallingPlanId === plan.id}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
                                title={t('btnRecallTitle')}
                              >
                                {recallingPlanId === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                              </motion.button>
                            )}

                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => openDetail(plan.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/40 text-neutral-500 dark:text-neutral-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200/70 dark:hover:border-indigo-500/20 transition-all cursor-pointer"
                              title={t('btnDetails')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => setPlanToDelete(plan)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200/60 dark:hover:border-red-500/20 transition-all cursor-pointer"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-400">
            Menampilkan <span className="font-semibold text-neutral-700 dark:text-neutral-300">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalPlans)}</span> dari <span className="font-semibold text-neutral-700 dark:text-neutral-300">{totalPlans}</span> plan
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (currentPage <= 3) p = i + 1;
              else if (currentPage >= totalPages - 2) p = totalPages - 4 + i;
              else p = currentPage - 2 + i;
              return (
                <button key={p} onClick={() => handlePageChange(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    p === currentPage
                      ? 'bg-indigo-600 text-white border border-indigo-600'
                      : 'border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
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
        onError={handleWizardError}
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
