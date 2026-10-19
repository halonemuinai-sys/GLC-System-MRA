'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu } from '@base-ui/react/menu';
import {
  BarChart3,
  Plus,
  Search,
  Wallet,
  Coins,
  PieChart,
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
  SlidersHorizontal,
  Zap,
  Copy,
  MoreHorizontal,
  ArrowUpRight,
  Megaphone
} from 'lucide-react';
import { eventNumber } from '@/lib/eventNumber';
import { apiClient } from '@/lib/apiClient';
import { getUserRoles, hasRole } from '@/lib/userRoles';
import { useLanguage } from '@/lib/LanguageContext';
import mpt from '@/lib/translations/marketingPlan';
import { CLOSING_WINDOW_BADGE } from '@/lib/marketingGovernance';
import InlineHelp from '@/components/ui/InlineHelp';
import ActionFailureModal from '@/components/ui/ActionFailureModal';
import MarketingPlanWizardModal from './MarketingPlanWizardModal';
import MarketingPlanDetailModal from './MarketingPlanDetailModal';
import MarketingPlanQuickModal from './MarketingPlanQuickModal';
// Helper: Format to IDR Currency
const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

const KPI_THEMES = {
  blue: { color: '#2563EB', icon: 'bg-blue-50 text-blue-600', label: 'text-blue-600' },
  emerald: { color: '#10B981', icon: 'bg-emerald-50 text-emerald-600', label: 'text-emerald-600' },
  orange: { color: '#F97316', icon: 'bg-orange-50 text-orange-600', label: 'text-orange-600' },
  rose: { color: '#F43F5E', icon: 'bg-rose-50 text-rose-600', label: 'text-rose-600' },
};

function KpiCircularAccent({ tone, icon: Icon, duration = '18s' }) {
  const theme = KPI_THEMES[tone];
  const ringFill = `conic-gradient(from 12deg, ${theme.color}66 0 13%, transparent 13% 22%, ${theme.color}4d 22% 34%, transparent 34% 48%, ${theme.color}66 48% 61%, transparent 61% 73%, ${theme.color}4d 73% 85%, transparent 85% 100%)`;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -right-5 -top-5 h-24 w-24">
      <div className="marketing-plan-kpi-ring absolute inset-0 rounded-full" style={{ backgroundImage: ringFill, animationDuration: duration, WebkitMaskImage: 'radial-gradient(circle, transparent 0 58%, #000 60%)', maskImage: 'radial-gradient(circle, transparent 0 58%, #000 60%)' }} />
      <span className={`absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white bg-white shadow-sm ${theme.label}`}><Icon className="h-4 w-4" /></span>
    </div>
  );
}

function MarketingKpiCard({ label, value, detail, icon: Icon, tone, duration, valueFormatter = formatIDR }) {
  const theme = KPI_THEMES[tone];
  return (
    <section
      className="relative min-h-[150px] overflow-hidden rounded-2xl border bg-white p-4 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)]"
      style={{ borderColor: `${theme.color}38`, backgroundImage: `linear-gradient(135deg, #ffffff 0%, #ffffff 63%, ${theme.color}0d 100%)` }}
    >
      <KpiCircularAccent tone={tone} icon={Icon} duration={duration} />
      <div className="relative max-w-[78%]">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${theme.icon}`}><Icon className="h-4 w-4" /></span>
          <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${theme.label}`}>{label}</p>
        </div>
        <p className="mt-3 truncate text-xl font-extrabold tracking-tight tabular-nums text-slate-950">{valueFormatter(value)}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{detail}</p>
      </div>
    </section>
  );
}

const formatPlanPeriod = (plan, locale) => {
  const start = plan.event_start_date || plan.start_date;
  const end = plan.event_end_date || plan.end_date || start;
  const format = value => value ? new Date(value).toLocaleDateString(locale, { month: 'short', year: 'numeric' }) : '-';
  const first = format(start);
  const last = format(end);
  return first === last ? first : `${first} \u2013 ${last}`;
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
            ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300'
            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
        }`}
      >
        {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
        <span className="whitespace-nowrap max-w-[140px] truncate">
          {selected ? selected.label : label}
        </span>
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
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
                    placeholder="Search company..."
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-400 transition-colors"
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
              <p className="px-4 py-3 text-xs text-neutral-400 text-center">Not found</p>
            ) : filtered.map((opt, optIdx) => {
              const isSelected = value === opt.value;
              const color = colorMap?.[opt.value];
              return (
                <button
                  key={`filter-opt-${opt.value || 'all'}-${optIdx}`}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/70'
                  }`}
                >
                  {color && (
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  )}
                  <span className="flex-1">{opt.label}</span>
                  {isSelected && <Check className="w-3 h-3 text-blue-500 flex-shrink-0" />}
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

function PlanAction({ icon: Icon, children, danger = false, ...props }) {
  return (
    <Menu.Item {...props} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 ${danger
      ? 'text-rose-600 data-[highlighted]:bg-rose-50 dark:text-rose-400 dark:data-[highlighted]:bg-rose-500/10'
      : 'text-slate-600 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-950 dark:text-slate-300 dark:data-[highlighted]:bg-slate-800 dark:data-[highlighted]:text-white'}`}>
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </Menu.Item>
  );
}

export default function MarketingPlanPage() {
  const lang = 'en'; // Marketing Plan UI is English-only
  const t = (key, ...args) => typeof mpt.en[key] === 'function' ? mpt.en[key](...args) : (mpt.en[key] ?? key);

  // State for metadata & data
  const [metadata, setMetadata] = useState({ brands: [], lobs: [], branches: [], event_locations: [], coas: [], companies: [], vendors: [], users: [], defaultApproverContacts: [] });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [recallingPlanId, setRecallingPlanId] = useState(null);
  const [failureModal, setFailureModal] = useState({
    isOpen: false,
    title: '',
    error: null,
    actionContext: ''
  });

  const showFailureModal = useCallback((err, actionContext = 'Pengajuan Marketing Plan', title = 'Pengajuan Plan Gagal') => {
    setFailureModal({
      isOpen: true,
      title,
      error: err,
      actionContext
    });
  }, []);

  // Filter States
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [quarter, setQuarter] = useState('');
  const [month, setMonth] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const searchDebounceRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPlans, setTotalPlans] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 25;

  // Summary for KPI (independent of page)
  const [summary, setSummary] = useState({ totalBudget: 0, totalActual: 0, approved: 0, pending: 0, draft: 0, rejected: 0, total: 0 });

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailInitialTab, setDetailInitialTab] = useState('costs');
  const [planToDelete, setPlanToDelete] = useState(null);
  const [revisingPlanId, setRevisingPlanId] = useState(null);
  const [draftPlanId, setDraftPlanId] = useState(null);

  // Current user role
  const userRoles = React.useMemo(() => getUserRoles(), []);

  // Fetch Metadata & Plans on mount / filter change
  const loadMetadata = async () => {
    try {
      const res = await apiClient.get('/api/marketing/metadata');
      setMetadata(res);
      return res;
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
        quarter: quarter || undefined,
        month: month || undefined,
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
  }, [fiscalYear, quarter, month, companyId, statusFilter]);

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
  const kpis = useMemo(() => {
    const totalBudget = Number(summary.totalBudget) || 0;
    const totalActual = Number(summary.totalActual) || 0;
    return {
      totalBudget,
      totalActual,
      activeCampaigns: Number(summary.approved) || 0,
      burnRate: totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0,
      variance: totalBudget - totalActual,
    };
  }, [summary]);

  const handleWizardError = useCallback((err) => {
    setError(typeof err === 'string' ? err : err?.message);
    showFailureModal(err, 'Pengajuan Marketing Plan', 'Pengajuan Plan Gagal');
    setTimeout(() => setError(null), 6000);
  }, [showFailureModal]);

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

  const openDetail = (planId, initialTab = 'costs') => {
    setSelectedPlanId(planId);
    setDetailInitialTab(initialTab);
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
      showFailureModal(err, `Hapus Plan: ${planToDelete.title || 'Plan'}`, 'Gagal Menghapus Plan');
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
      showFailureModal(err, 'Penarikan (Recall) Plan dari Alur Approval', 'Gagal Menarik Plan');
    } finally {
      setRecallingPlanId(null);
    }
  };

  const handleSubmitDraft = async (planId, lateReason) => {
    if (!lateReason && !window.confirm(t('confirmSubmitDraft'))) return;
    try {
      setSubmitting(true);
      await apiClient.post(`/api/marketing/plans/${planId}/submit`, lateReason ? { late_submission_reason: lateReason } : {});
      setSuccessMsg(t('successSubmitted'));
      loadPlans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      // Aturan H-3: event < 3 bulan lagi -> minta alasan lalu ajukan ulang
      if (err.message?.includes('H-3')) {
        const reason = window.prompt(`${err.message}\n\nLate submission reason:`);
        if (reason?.trim()) {
          setSubmitting(false);
          return handleSubmitDraft(planId, reason.trim());
        }
      } else {
        showFailureModal(err, 'Pengajuan Draft Plan ke Alur Approval', 'Pengajuan Plan Gagal');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDuplicatePlan = async (planId) => {
    if (!window.confirm('Duplicate this plan as a new Draft?')) return;
    try {
      setSubmitting(true);
      await apiClient.post(`/api/marketing/plans/${planId}/duplicate`);
      setSuccessMsg('Marketing plan duplicated as a new Draft!');
      loadPlans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      showFailureModal(err, 'Duplikasi Marketing Plan', 'Gagal Menduplikasi Plan');
    } finally {
      setSubmitting(false);
    }
  };

  // Search sudah server-side, tidak perlu filter client

  return (
    <div className="space-y-4 pb-12">
      <style>{`
        @keyframes marketingPlanKpiRingSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .marketing-plan-kpi-ring { animation: marketingPlanKpiRingSpin 18s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .marketing-plan-kpi-ring { animation: none; }
        }
      `}</style>
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0">
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
            className="w-9 h-9 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm transition-all cursor-pointer"
            title={t('refreshData')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsQuickModalOpen(true)}
            className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Express Mode: Pendaftaran Campaign Ringkas"
          >
            <Zap className="w-4 h-4" />
            Quick Campaign
          </button>

          <button
            onClick={handleCreatePlan}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm shadow-blue-600/20 transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MarketingKpiCard
          label={t('kpiTotalBudget')}
          value={kpis.totalBudget}
          detail={`${summary.total || 0} campaign in the current view`}
          icon={Wallet}
          tone="blue"
          duration="18s"
        />
        <MarketingKpiCard
          label={t('kpiRealized')}
          value={kpis.totalActual}
          detail="Paid expenses recorded across campaign items"
          icon={Coins}
          tone="emerald"
          duration="16s"
        />
        <MarketingKpiCard
          label={t('kpiRemaining')}
          value={kpis.variance}
          detail={kpis.variance < 0 ? 'Over budget — review claims and settlement' : 'Available for the approved campaign budget'}
          icon={PieChart}
          tone="orange"
          duration="20s"
        />
        <MarketingKpiCard
          label={t('kpiBurnRate')}
          value={kpis.burnRate}
          valueFormatter={amount => `${amount.toFixed(1)}%`}
          detail={`${kpis.activeCampaigns} approved campaign${kpis.activeCampaigns === 1 ? '' : 's'}`}
          icon={Layers}
          tone="rose"
          duration="17s"
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
        {/* Top row: title + filter pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-black text-neutral-800 dark:text-white leading-tight">{t('pipelineTitle')}</p>
              <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                {totalPlans > 0 ? `${totalPlans} plans found` : 'No plans yet'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              label="Year"
              value={fiscalYear}
              icon={Calendar}
              options={FISCAL_YEAR_OPTIONS.map(y => ({ value: y, label: y }))}
              onChange={setFiscalYear}
            />
            <FilterDropdown
              label={lang === 'id' ? 'All Quarters' : 'All Quarters'}
              value={quarter}
              icon={Calendar}
              options={[
                { value: '', label: lang === 'id' ? 'All Quarters' : 'All Quarters' },
                ...[1, 2, 3, 4].map(q => ({ value: String(q), label: `Q${q} (${getMonthName(q * 3 - 2, lang).slice(0, 3)} - ${getMonthName(q * 3, lang).slice(0, 3)})` }))
              ]}
              onChange={value => { setQuarter(value); setMonth(''); }}
            />
            <FilterDropdown
              label={lang === 'id' ? 'All Months' : 'All Months'}
              value={month}
              icon={Calendar}
              options={[
                { value: '', label: lang === 'id' ? 'All Months' : 'All Months' },
                ...Array.from({ length: 12 }, (_, i) => i + 1)
                  .filter(m => !quarter || Math.ceil(m / 3) === Number(quarter))
                  .map(m => ({ value: String(m), label: getMonthName(m, lang) }))
              ]}
              onChange={setMonth}
            />
            <FilterDropdown
              label={t('allCompanies')}
              value={companyId}
              icon={Building2}
              searchable
              options={[
                { value: '', label: t('allCompanies') },
                ...metadata.companies.filter(c => c && c.id).map(c => ({ value: String(c.id), label: c.name }))
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
            {(companyId || statusFilter || quarter || month) && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setCompanyId(''); setStatusFilter(''); setQuarter(''); setMonth(''); }}
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
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-neutral-800 dark:text-white transition-all placeholder:text-neutral-400"
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
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">{t('loading')}</span>
        </div>
      ) : (
        /* Plans Table View */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-[0_4px_24px_-12px_rgba(15,23,42,0.18)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] table-fixed text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/80 bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-[0.08em]">
                  <th className="px-3 py-3 w-[34%]">
                    <InlineHelp summary={t('colPlanName')} label="About campaign plan names">
                      This is the campaign or event name submitted by Marketing. Open Detail to see its scope, budget items, schedule, and approval history.
                    </InlineHelp>
                  </th>
                  <th className="px-3 py-3">{t('colCompany')}</th>
                  <th className="px-3 py-3">{t('colPeriod')}</th>
                  <th className="px-3 py-3 text-right">{t('colTotalBudget')}</th>
                  <th className="px-3 py-3 text-center">
                    <InlineHelp summary="Status" label="About campaign statuses">
                      <span className="space-y-1.5">
                        <span className="block"><strong>Draft</strong> — still being prepared and has not been sent.</span>
                        <span className="block"><strong>Pending Approval</strong> — sent and waiting for the current approver.</span>
                        <span className="block"><strong>Approved</strong> — plan is approved and can proceed.</span>
                        <span className="block"><strong>Completed</strong> — closing and accountability have been approved.</span>
                        <span className="block"><strong>Rejected</strong> — needs revision before it can be submitted again.</span>
                      </span>
                    </InlineHelp>
                  </th>

                  <th className="px-3 py-3 w-[235px] text-right">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center">
                      {totalPlans === 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <FileSpreadsheet className="w-9 h-9 text-neutral-300 dark:text-neutral-700" />
                          <p className="text-xs text-neutral-400 font-medium">{t('noPlans')}</p>
                          <button
                            onClick={handleCreatePlan}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> {t('submitFirstPlan')}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400 font-normal">{t('noMatch')}</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  plans.map(plan => {
                    let statusBadge = 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/5 dark:text-amber-400 border-amber-200/60 dark:border-amber-900/30';
                    let statusText = 'Pending Approval';
                    let StatusIcon = Clock;
                    let rowAccent = 'border-l-transparent hover:border-l-amber-400';
                    if (plan.status === 'APPROVED') {
                      statusBadge = 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/30';
                      statusText = 'Approved';
                      StatusIcon = CheckCircle;
                      rowAccent = 'border-l-transparent hover:border-l-emerald-400';
                    } else if (plan.status === 'COMPLETED') {
                      statusBadge = 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/5 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/30';
                      statusText = 'Completed';
                      StatusIcon = CheckCircle;
                      rowAccent = 'border-l-transparent hover:border-l-blue-400';
                    } else if (plan.status === 'REJECTED') {
                      statusBadge = 'bg-red-500/10 text-red-600 dark:bg-red-500/5 dark:text-red-400 border-red-200/60 dark:border-red-900/30';
                      statusText = 'Rejected';
                      StatusIcon = AlertTriangle;
                      rowAccent = 'border-l-transparent hover:border-l-red-400';
                    } else if (plan.status === 'DRAFT') {
                      statusBadge = 'bg-neutral-500/10 text-neutral-600 dark:bg-neutral-500/5 dark:text-neutral-400 border-neutral-200/60 dark:border-neutral-700/40';
                      statusText = 'Draft';
                      StatusIcon = FileSpreadsheet;
                      rowAccent = 'border-l-transparent hover:border-l-neutral-400';
                    }

                    const canManageClosing = hasRole(userRoles, 'admin', 'marketing', 'marketing_manager');
                    const closingAction = (() => {
                      if (plan.status === 'COMPLETED') return { label: 'Closing', enabled: true, hint: 'View approved closing and campaign results.' };
                      if (plan.status !== 'APPROVED') return null;
                      if (!canManageClosing) return { label: 'Closing', enabled: false, hint: 'Only Marketing or an administrator can start closing.' };
                      if (plan.closing_status === 'PENDING_APPROVAL') return { label: 'Closing', enabled: true, hint: 'Closing is waiting for approval.' };
                      if (plan.closing_status === 'REJECTED') return { label: 'Resume closing', enabled: true, hint: 'Closing was returned for correction.' };
                      if (plan.closing_ready) return { label: 'Start closing', enabled: true, hint: 'Record final costs, proof, and closing approvers.' };
                      if (!plan.actuals_filled_at) return { label: 'Start closing', enabled: false, hint: 'Record event results first.' };
                      return { label: 'Start closing', enabled: false, hint: `${plan.unsettled_payment_count || 0} payment request${plan.unsettled_payment_count === 1 ? '' : 's'} must be paid or rejected first.` };
                    })();

                    return (
                      <tr key={plan.id} className={`border-l-[3px] ${rowAccent} group/row even:bg-slate-50/40 hover:bg-blue-50/60 dark:even:bg-slate-800/15 dark:hover:bg-blue-500/5 text-neutral-700 dark:text-neutral-300 transition-colors`}>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => openDetail(plan.id)}
                            title={[plan.title, plan.is_late_submission && "Late Submission", CLOSING_WINDOW_BADGE[plan.closing_window?.state]?.label].filter(Boolean).join(" \u00b7 ")}
                            className="flex w-full items-center gap-2.5 rounded-md font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition-colors group-hover/row:bg-blue-100 group-hover/row:text-blue-500 dark:bg-slate-800 dark:group-hover/row:bg-blue-500/15">
                              <Megaphone className="h-3.5 w-3.5" />
                            </span>
                            <span className="min-w-0"><span className="block truncate">{plan.title}</span><span className="block font-mono text-[10px] font-medium text-slate-400">{eventNumber(plan)}</span></span>
                          </button>

                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                          <span className="block truncate" title={plan.company?.name}>{plan.company?.name || 'N/A'}</span>
                        </td>
                        <td className="px-3 py-2 text-neutral-500">
                          <span className="block truncate" title={formatPlanPeriod(plan, t('dateLocale'))}>
                            {formatPlanPeriod(plan, t('dateLocale'))}
                          </span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums text-right font-semibold text-neutral-900 dark:text-white">
                          {formatIDR(plan.total_budget)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-1 whitespace-nowrap rounded-md text-[10px] font-semibold inline-flex items-center gap-1 border ${statusBadge}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusText}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDetail(plan.id)}
                              aria-label={`${t('btnDetails')}: ${plan.title}`}
                              className="group/detail inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                            >
                              Detail <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover/detail:-translate-y-0.5 group-hover/detail:translate-x-0.5" />
                            </button>
                            {closingAction && (
                              <button
                                type="button"
                                disabled={!closingAction.enabled}
                                title={closingAction.hint}
                                onClick={() => closingAction.enabled && openDetail(plan.id, 'results')}
                                aria-label={`${closingAction.label}: ${plan.title}`}
                                className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${closingAction.enabled
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 cursor-pointer'
                                  : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 opacity-75 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'}`}
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> {closingAction.label}
                              </button>
                            )}
                            <Menu.Root>
                              <Menu.Trigger
                                aria-label={`${lang === 'id' ? 'Aksi lainnya' : 'More actions'}: ${plan.title}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-700 data-[popup-open]:border-blue-200 data-[popup-open]:bg-blue-50 data-[popup-open]:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Menu.Trigger>
                              <Menu.Portal>
                                <Menu.Positioner align="end" sideOffset={6} className="z-[100]">
                                  <Menu.Popup className="min-w-48 origin-[var(--transform-origin)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 outline-none transition-[transform,opacity] duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 dark:border-slate-700 dark:bg-slate-900">
                                    {plan.status === 'DRAFT' && (
                                      <>
                                        <PlanAction icon={Pencil} onClick={() => handleEditDraft(plan.id)}>{t('btnContinue')}</PlanAction>
                                        <PlanAction icon={Send} disabled={submitting} onClick={() => handleSubmitDraft(plan.id)}>{t('btnSubmit')}</PlanAction>
                                      </>
                                    )}
                                    {plan.status === 'PENDING_APPROVAL' && hasRole(userRoles, 'marketing', 'marketing_manager', 'admin') && (
                                      <PlanAction icon={Undo2} disabled={recallingPlanId === plan.id} onClick={() => handleRecallPlan(plan.id)}>{t('btnRecallTitle')}</PlanAction>
                                    )}
                                    <PlanAction icon={Copy} disabled={submitting} onClick={() => handleDuplicatePlan(plan.id)}>{lang === 'id' ? 'Duplikat campaign' : 'Duplicate campaign'}</PlanAction>
                                    {(plan.status === 'DRAFT' || plan.status === 'REJECTED' || hasRole(userRoles, 'admin')) && (
                                      <>
                                        <div role="separator" className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                        <PlanAction icon={Trash2} danger onClick={() => setPlanToDelete(plan)}>{t('btnDeleteTitle')}</PlanAction>
                                      </>
                                    )}
                                  </Menu.Popup>
                                </Menu.Positioner>
                              </Menu.Portal>
                            </Menu.Root>
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
            Menampilkan <span className="font-semibold text-neutral-700 dark:text-neutral-300">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalPlans)}</span> of <span className="font-semibold text-neutral-700 dark:text-neutral-300">{totalPlans}</span> plan
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
                      ? 'bg-blue-600 text-white border border-blue-600'
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
        onMetadataChanged={loadMetadata}
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
        initialTab={detailInitialTab}
        metadata={metadata}
        loadPlans={loadPlans}
        onRevise={handleRevisePlan}
        onEditDraft={handleEditDraft}
        userRoles={userRoles}
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
                <h3 className="text-sm font-black text-neutral-900 dark:text-white">{t('deleteTitle')}</h3>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 px-2 leading-relaxed">
                  {t('deleteBodyPrefix')} <strong>"{planToDelete.title}"</strong> {t('deleteBodySuffix')}
                </p>
                {planToDelete.status === 'APPROVED' && (
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40 text-left">
                    ⚠️ <strong>Perhatian:</strong> This plan is <strong>APPROVED</strong>. Deleting it cancels its budget allocation. Make sure no invoices or payments have been processed.
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2.5 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setPlanToDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
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

      {/* QUICK MARKETING PLAN MODAL */}
      <MarketingPlanQuickModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        metadata={metadata}
        onSuccess={() => {
          setSuccessMsg('Quick campaign created!');
          loadPlans();
          setTimeout(() => setSuccessMsg(null), 5000);
        }}
        onError={(err) => showFailureModal(err, 'Penyimpanan Quick Campaign', 'Pengajuan Plan Gagal')}
      />

      {/* GLOBAL POP-UP FEEDBACK SAAT KEGAGALAN (403, 401, 400, 500) */}
      <ActionFailureModal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal(prev => ({ ...prev, isOpen: false }))}
        title={failureModal.title}
        error={failureModal.error}
        actionContext={failureModal.actionContext}
      />
    </div>
  );
}
