'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardCheck,
  Search,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Building,
  User,
  Coins,
  ArrowRight,
  Mail,
  Calendar,
  Sparkles,
  Award
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

// ─── Horizontal Stepper Component ───────────────────────────────────────────────
function HorizontalStepper({ steps }) {
  if (!steps || steps.length === 0) return <span className="text-[10px] text-neutral-400">-</span>;

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, idx) => {
        let dotClass = 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500';
        let lineClass = 'bg-neutral-200 dark:bg-neutral-850';

        if (step.status === 'APPROVED') {
          dotClass = 'bg-emerald-500 text-white';
          lineClass = 'bg-emerald-500';
        } else if (step.status === 'PENDING') {
          dotClass = 'bg-amber-500 text-white animate-pulse';
        } else if (step.status === 'REJECTED') {
          dotClass = 'bg-red-500 text-white';
        }

        return (
          <div key={idx} className="flex items-center gap-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black tracking-tighter ${dotClass}`}
              title={`${step.role} (${step.status})`}
            >
              {idx + 1}
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-4 h-0.5 ${lineClass}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MarketingApprovalOverviewPage() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [metadata, setMetadata] = useState({ companies: [] });
  const [error, setError] = useState(null);

  // Search/Filters
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({
    company_id: '',
    fiscal_year: String(new Date().getFullYear()),
    status: ''
  });

  // Data List
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Load Companies
  const fetchMetadata = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/marketing/metadata');
      if (res) {
        setMetadata({
          companies: res.companies || []
        });

        // Set default filter company
        if (res.companies.length > 0) {
          const mogems = res.companies.find(c => c.name.toLowerCase().includes('mogems'));
          setFilter(prev => ({
            ...prev,
            company_id: mogems ? String(mogems.id) : String(res.companies[0].id)
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

  // Load Approval Overview List
  const handleProses = async () => {
    if (!filter.company_id || !filter.fiscal_year) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const res = await apiClient.get('/api/marketing/approvals-overview', {
        params: {
          company_id: filter.company_id,
          fiscal_year: filter.fiscal_year,
          status: filter.status || undefined
        }
      });
      setPlans(res || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data monitoring.');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => {
    if (filter.company_id) {
      handleProses();
    }
  }, [filter.company_id, filter.fiscal_year, filter.status]);

  // Filtering on client side for Search query
  const filteredPlans = plans.filter(p => {
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.creator_name.toLowerCase().includes(q) ||
      String(p.id).includes(q)
    );
  });

  // Calculate KPIs
  const totalCount = plans.length;
  const pendingCount = plans.filter(p => p.status === 'PENDING_APPROVAL').length;
  const overBudgetCount = plans.filter(p => p.is_over_budget).length;
  const approvedCount = plans.filter(p => p.status === 'APPROVED').length;

  const formatIDR = (num) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const getStatusBadgeClass = (status) => {
    const maps = {
      DRAFT: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400',
      PENDING_APPROVAL: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
      APPROVED: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
      REJECTED: 'bg-red-500/10 text-red-500 border border-red-500/20'
    };
    return maps[status] || 'bg-neutral-100 text-neutral-500';
  };

  const getStepStatusIcon = (status) => {
    if (status === 'APPROVED') return <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />;
    if (status === 'REJECTED') return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
    if (status === 'PENDING') return <Clock className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />;
    return <Clock className="w-4 h-4 text-neutral-300 dark:text-neutral-700 flex-shrink-0" />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
        <p className="text-xs text-neutral-450 dark:text-neutral-500 font-bold">Memuat modul monitoring...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
            {t('marketing_approval_title')}
          </h1>
        </div>
        <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">
          Pantau status penandatanganan dan step-by-step alur persetujuan rencana anggaran marketing yang diajukan.
        </p>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl p-4 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Company</label>
          <select
            value={filter.company_id}
            onChange={(e) => setFilter(prev => ({ ...prev, company_id: e.target.value }))}
            className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 dark:text-white"
          >
            {metadata.companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Fiscal Year</label>
          <select
            value={filter.fiscal_year}
            onChange={(e) => setFilter(prev => ({ ...prev, fiscal_year: e.target.value }))}
            className="bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 dark:text-white"
          >
            {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Status</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
            className="bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 dark:text-white"
          >
            <option value="">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="PENDING_APPROVAL">PENDING APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[200px] relative mt-4">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            placeholder="Cari nama campaign atau pembuat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 text-neutral-800 dark:text-white"
          />
        </div>

        <button
          onClick={handleProses}
          disabled={processing}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 mt-4"
        >
          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {t('processData')}
        </button>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('marketing_approval_kpiTotal')}
          value={totalCount}
          icon={ClipboardCheck}
          color="blue"
          delay={0.05}
        />
        <StatCard
          label={t('marketing_approval_kpiPending')}
          value={pendingCount}
          icon={Clock}
          color="amber"
          delay={0.1}
        />
        <StatCard
          label="Pengajuan Over-Budget"
          value={overBudgetCount}
          icon={AlertTriangle}
          color="purple"
          delay={0.15}
        />
        <StatCard
          label="Disetujui (Approved)"
          value={approvedCount}
          icon={CheckCircle}
          color="emerald"
          delay={0.2}
        />
      </div>

      {/* ── Monitoring Table ── */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-955 border-b border-neutral-200/60 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider">
                <th className="px-6 py-3.5">ID / Nama Rencana Campaign</th>
                <th className="px-6 py-3.5">PT / Company</th>
                <th className="px-6 py-3.5">Pembuat</th>
                <th className="px-6 py-3.5 text-right">Nilai Anggaran</th>
                <th className="px-6 py-3.5">Progress Approval (Stepper)</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 font-medium text-neutral-700 dark:text-neutral-300">
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-neutral-450 font-bold">
                    Tidak ditemukan data persetujuan yang cocok.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-neutral-550/5 dark:hover:bg-neutral-955/10 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold text-neutral-400">ID: {plan.id}</span>
                        <div className="flex items-center gap-1.5 font-bold text-neutral-850 dark:text-white">
                          {plan.title}
                          {plan.is_over_budget && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[8px] font-extrabold flex items-center gap-0.5" title="Melebihi limit anggaran bulanan">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              OVER
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-neutral-500 dark:text-neutral-450">
                      {plan.company_name}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-neutral-800 dark:text-neutral-300 block">{plan.creator_name}</span>
                      <span className="text-[10px] text-neutral-450 block">{new Date(plan.created_at).toLocaleDateString('id-ID')}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold text-neutral-900 dark:text-white">
                      {formatIDR(plan.total_budget)}
                    </td>
                    <td className="px-6 py-3.5">
                      <HorizontalStepper steps={plan.steps} />
                    </td>
                    <td className="px-6 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider ${getStatusBadgeClass(plan.status)}`}>
                        {plan.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <button
                        onClick={() => {
                          setSelectedPlan(plan);
                          setShowDrawer(true);
                        }}
                        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg text-neutral-450 hover:text-blue-500 transition-colors cursor-pointer"
                        title="Tampilkan Audit Trail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Audit Trail Detail Drawer ── */}
      <AnimatePresence>
        {showDrawer && selectedPlan && (
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
              className="fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-neutral-955 border-l border-neutral-200 dark:border-neutral-850 z-50 shadow-2xl p-6 flex flex-col justify-between"
            >
              <div className="space-y-6 overflow-y-auto flex-1 pr-1.5">
                <div className="flex items-start justify-between border-b border-neutral-100 dark:border-neutral-850 pb-4">
                  <div>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Detail & Audit Trail</span>
                    <h3 className="text-sm font-black text-neutral-855 dark:text-white mt-1">
                      {selectedPlan.title}
                    </h3>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                      Diajukan oleh {selectedPlan.creator_name} pada {new Date(selectedPlan.created_at).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="p-1.5 text-neutral-450 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Overbudget Note */}
                {selectedPlan.is_over_budget && (
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-black">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Alasan Pengajuan Over-Budget:</span>
                    </div>
                    <p className="text-[11px] text-neutral-650 dark:text-neutral-400 italic leading-relaxed font-semibold">
                      "{selectedPlan.over_budget_reason || 'Tidak dilampirkan alasan.'}"
                    </p>
                  </div>
                )}

                {/* Audit Trail Stepper Timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-blue-500" />
                    Langkah Jalur Persetujuan (Steps)
                  </h4>

                  <div className="relative border-l border-neutral-200 dark:border-neutral-800 ml-3.5 space-y-6 py-2">
                    {selectedPlan.steps.map((step, idx) => {
                      const isActive = selectedPlan.current_active_step === step.step_number;

                      return (
                        <div key={idx} className="relative pl-6">
                          {/* Dot Icon */}
                          <div className={`absolute -left-[13px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white dark:bg-neutral-950 transition-all ${
                            step.status === 'APPROVED' ? 'border-emerald-500' :
                            step.status === 'REJECTED' ? 'border-red-500' :
                            isActive ? 'border-amber-500' : 'border-neutral-200 dark:border-neutral-800'
                          }`}>
                            {getStepStatusIcon(step.status)}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-neutral-850 dark:text-white">
                                Step {step.step_number}: {step.role}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${
                                step.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' :
                                step.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                step.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                              }`}>
                                {step.status}
                              </span>
                            </div>

                            {/* Approver Action Details */}
                            {step.status === 'APPROVED' && (
                              <div className="text-[10px] text-neutral-500 dark:text-neutral-450 space-y-0.5">
                                <div>Disetujui oleh: <span className="font-bold text-neutral-750 dark:text-neutral-300">{step.approver_name}</span></div>
                                <div>Waktu: <span>{new Date(step.action_at).toLocaleString('id-ID')}</span></div>
                              </div>
                            )}

                            {step.status === 'REJECTED' && (
                              <div className="text-[10px] text-neutral-500 dark:text-neutral-450 space-y-1">
                                <div>Ditolak oleh: <span className="font-bold text-neutral-750 dark:text-neutral-300">{step.approver_name}</span></div>
                                <div>Waktu: <span>{new Date(step.action_at).toLocaleString('id-ID')}</span></div>
                                {step.comment && (
                                  <div className="bg-red-500/5 border border-red-500/10 p-2 rounded-lg italic text-red-500/90 font-medium">
                                    "{step.comment}"
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Magic Link Info */}
                            {step.recipients.length > 0 && (
                              <div className="text-[9px] text-neutral-400 dark:text-neutral-500 space-y-1 mt-1 border-t border-neutral-100 dark:border-neutral-900 pt-1.5">
                                <div className="flex items-center gap-1 font-bold text-neutral-500 dark:text-neutral-400">
                                  <Mail className="w-3 h-3" />
                                  Email Penerima Magic Link:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {step.recipients.map((em, eIdx) => (
                                    <span key={eIdx} className="px-1.5 py-0.5 rounded bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/50 dark:border-neutral-800">
                                      {em}
                                    </span>
                                  ))}
                                </div>

                                {/* Active Links */}
                                {step.magic_links.length > 0 && (
                                  <div className="space-y-0.5 mt-1">
                                    {step.magic_links.map((ml, mlIdx) => (
                                      <div key={mlIdx} className="flex items-center gap-1">
                                        <ArrowRight className="w-2.5 h-2.5" />
                                        <span>Sent to {ml.email} ({ml.used_at ? 'Telah Digunakan' : 'Menunggu Klik'})</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-855 pt-4">
                <button
                  onClick={() => setShowDrawer(false)}
                  className="w-full px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-350 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer text-center block"
                >
                  Tutup Monitor
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
