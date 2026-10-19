'use client';

import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Paperclip, FileSpreadsheet, Building, Loader2,
  AlertTriangle, Info, BarChart2, CheckCircle, Clock,
  Plus, Trash2, ChevronDown,
  TrendingUp, Copy, Check, Users, Wallet, CreditCard, CircleDollarSign, Megaphone, ArrowUpRight, LayoutDashboard, Target
, ShoppingCart, Edit3
} from 'lucide-react';
import { eventNumber } from '@/lib/eventNumber';
import { apiClient } from '@/lib/apiClient';
import { hasRole } from '@/lib/userRoles';
import Cookies from 'js-cookie';
import { useLanguage } from '@/lib/LanguageContext';
import mpt from '@/lib/translations/marketingPlan';
import MarketingPlanClosingSection from './MarketingPlanClosingSection';
import PlanPoTracker, { PoActionCell, poSummary } from './MarketingPlanPoTracker';
import MarketingAmendmentPanel from './MarketingAmendmentPanel';
import MarketingPlanApprovalLedger from './MarketingPlanApprovalLedger';
import InlineHelp from '@/components/ui/InlineHelp';
import MarketingReimbursementModal from './MarketingReimbursementModal';
import ActionFailureModal from '@/components/ui/ActionFailureModal';

// Helper: Format to IDR Currency
const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

// Helper: Format number with thousands separator
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

function PlanFinancialOverview({ plan, lang }) {
  const totals = (plan.items || []).reduce((sum, item) => ({
    budget: sum.budget + Number(item.budget_amount || 0),
    committed: sum.committed + Number(item.committed_amount || 0),
    actual: sum.actual + Number(item.actual_amount || 0),
  }), { budget: 0, committed: 0, actual: 0 });
  const remaining = totals.budget - totals.committed - totals.actual;
  const paidPercent = totals.budget > 0 ? totals.actual / totals.budget * 100 : 0;
  const metrics = [
    { label: lang === 'id' ? 'Total budget' : 'Total budget', value: totals.budget, icon: Wallet, tone: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10' },
    { label: 'Committed', value: totals.committed, icon: CreditCard, tone: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10' },
    { label: lang === 'id' ? 'Paid actuals' : 'Paid expenses', value: totals.actual, icon: CheckCircle, tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10' },
    { label: lang === 'id' ? 'Remaining budget' : 'Remaining budget', value: remaining, icon: CircleDollarSign, tone: remaining < 0 ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10' : 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800' },
  ];
  return (
    <section aria-label={lang === 'id' ? 'Budget summary' : 'Budget overview'} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="min-w-0 border-b border-slate-100 px-3 py-2 sm:p-3 sm:border-b-0 [&:nth-child(odd)]:border-r sm:border-r sm:last:border-r-0 dark:border-slate-800">
            <div className="mb-1 flex items-center gap-2"><span className={`hidden sm:flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="h-3.5 w-3.5" /></span><span className="text-[10px] sm:text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</span></div>
            <p className={`break-words text-sm sm:text-lg font-semibold tracking-tight tabular-nums ${value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{formatIDR(value)}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/30">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{lang === 'id' ? 'Paid budget absorption' : 'Paid budget utilization'}</span>
        <div className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, paidPercent))}%` }} /></div>
        <span className="text-[11px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{paidPercent.toFixed(1)}%</span>
      </div>
    </section>
  );
}

export default function MarketingPlanDetailModal({
  isOpen,
  onClose,
  planId,
  metadata,
  loadPlans,
  onRevise,
  onEditDraft,
  userRoles = [],
  onSuccessMsg,
  initialTab = 'costs'
}) {
  const lang = 'en'; // Marketing Plan UI is English-only
  const t = useCallback((key, ...args) => typeof mpt.en[key] === 'function' ? mpt.en[key](...args) : (mpt.en[key] ?? key), [lang]);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [activeTab, setActiveTab] = useState('costs');
  const [noClaimClosingRequest, setNoClaimClosingRequest] = useState(0);
  const [failureModal, setFailureModal] = useState({
    isOpen: false,
    title: '',
    error: null,
    actionContext: ''
  });
  const tabId = useId();
  const tabButtons = useRef({});
  const detailBody = useRef(null);
  const detailTabs = [
    { id: 'overview', label: lang === 'id' ? 'Ringkasan' : 'Overview', icon: LayoutDashboard },
    { id: 'costs', label: lang === 'id' ? 'Costs & Reimbursement' : 'Costs & Reimbursement', icon: Wallet },
    { id: 'approvals', label: lang === 'id' ? 'Persetujuan & Perubahan' : 'Approvals & Changes', icon: Users },
    { id: 'po', label: 'GA Purchase Orders', icon: ShoppingCart },
  ];

  useEffect(() => {
    setActiveTab(initialTab);
  }, [isOpen, planId, initialTab]);

  const changeTab = (id) => {
    setActiveTab(id);
    if (detailBody.current) detailBody.current.scrollTop = 0;
  };

  const handleTabKeyDown = (event, index) => {
    const last = detailTabs.length - 1;
    const next = event.key === 'ArrowRight' ? (index + 1) % detailTabs.length
      : event.key === 'ArrowLeft' ? (index + last) % detailTabs.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? last : null;
    if (next === null) return;
    event.preventDefault();
    changeTab(detailTabs[next].id);
    tabButtons.current[detailTabs[next].id]?.focus();
  };

  const handleCopyMagicLink = (token) => {
    if (!token) return;
    const link = `${window.location.origin}/approve/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleDuplicatePlan = async () => {
    if (!selectedPlan) return;
    if (!window.confirm('Duplicate this plan as a new Draft?')) return;
    setDuplicating(true);
    try {
      await apiClient.post(`/api/marketing/plans/${selectedPlan.id}/duplicate`);
      if (onSuccessMsg) onSuccessMsg('Plan duplicated as a new Draft.');
      loadPlans();
      onClose();
    } catch (err) {
      setFailureModal({
        isOpen: true,
        title: 'Duplikasi Plan Gagal',
        error: err,
        actionContext: 'Duplikasi Marketing Plan'
      });
    } finally {
      setDuplicating(false);
    }
  };

  // Post-campaign actuals form state
  const [actualsForm, setActualsForm] = useState({
    actual_sales: '', actual_leads: '', actual_reach: '',
    actual_impressions: '', actual_roi_pct: '', actual_notes: ''
  });
  const [submittingActuals, setSubmittingActuals] = useState(false);
  const [actualsMsg, setActualsMsg] = useState(null);

  // Expense/Payment Request modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReimbursementOpen, setIsReimbursementOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [claimBusyId, setClaimBusyId] = useState(null);
  const deleteClaim = async (claim) => {
    if (!window.confirm(`Delete reimbursement "${claim.title}" (${formatIDR(claim.amount)})? Its additional Others line is removed from the plan.`)) return;
    setClaimBusyId(claim.id);
    try {
      await apiClient.delete(`/api/marketing/claims/${claim.id}`);
      onSuccessMsg('Reimbursement deleted.');
      refreshPlanSilently();
    } catch (err) {
      setFailureModal({ isOpen: true, title: 'Failed to delete reimbursement', error: err, actionContext: 'Delete reimbursement' });
    } finally {
      setClaimBusyId(null);
    }
  };
  const [paymentRequestItem, setPaymentRequestItem] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    title: '',
    amount: '',
    notes: '',
    doc_url: ''
  });
  const [paymentError, setPaymentError] = useState(null);
  const [paymentUploading, setPaymentUploading] = useState(false);
  const [paymentUploadError, setPaymentUploadError] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Recalling state
  const [recalling, setRecalling] = useState(false);

  // Amendment form preset from a cost line ({ action, itemId, nonce })
  const [amendPreset, setAmendPreset] = useState(null);

  // Fetch plan details
  const fetchPlanDetail = useCallback(async () => {
    if (!planId) return;
    try {
      setLoading(true);
      const planDetail = await apiClient.get(`/api/marketing/plans/${planId}`);
      setSelectedPlan(planDetail);

      // Populate actuals form if approved or completed
      if (['APPROVED', 'COMPLETED'].includes(planDetail.status)) {
        setActualsForm({
          actual_sales: planDetail.actual_sales != null ? String(planDetail.actual_sales) : '',
          actual_leads: planDetail.actual_leads != null ? String(planDetail.actual_leads) : '',
          actual_reach: planDetail.actual_reach != null ? String(planDetail.actual_reach) : '',
          actual_impressions: planDetail.actual_impressions != null ? String(planDetail.actual_impressions) : '',
          actual_roi_pct: planDetail.actual_roi_pct != null ? String(planDetail.actual_roi_pct) : '',
          actual_notes: planDetail.actual_notes || ''
        });
      }
    } catch (err) {
      alert(t('errFailLoadDetail') + err.message);
    } finally {
      setLoading(false);
    }
  }, [planId, t]);

  useEffect(() => {
    if (isOpen && planId) {
      fetchPlanDetail();
    } else {
      setSelectedPlan(null);
      setIsReimbursementOpen(false);
    }
  }, [isOpen, planId, fetchPlanDetail]);

  const handleActualsSubmit = async () => {
    if (!selectedPlan) return;
    setSubmittingActuals(true);
    setActualsMsg(null);
    try {
      const payload = {
        actual_sales: actualsForm.actual_sales !== '' ? Number(actualsForm.actual_sales) : null,
        actual_leads: actualsForm.actual_leads !== '' ? parseInt(actualsForm.actual_leads, 10) : null,
        actual_reach: actualsForm.actual_reach !== '' ? parseInt(actualsForm.actual_reach, 10) : null,
        actual_impressions: actualsForm.actual_impressions !== '' ? parseInt(actualsForm.actual_impressions, 10) : null,
        actual_roi_pct: actualsForm.actual_roi_pct !== '' ? parseFloat(actualsForm.actual_roi_pct) : null,
        actual_notes: actualsForm.actual_notes || null
      };

      await apiClient.put(`/api/marketing/plans/${selectedPlan.id}/actuals`, payload);
      
      // Refresh local detail & parent plans list
      const updated = await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`);
      setSelectedPlan(updated);
      setActualsMsg(t('successActuals'));
      loadPlans();
      setTimeout(() => setActualsMsg(null), 5000);
    } catch (err) {
      setFailureModal({
        isOpen: true,
        title: 'Gagal Menyimpan Hasil / Realisasi',
        error: err,
        actionContext: 'Penyimpanan Realisasi Event (Actuals)'
      });
    } finally {
      setSubmittingActuals(false);
    }
  };

  const [clearingActuals, setClearingActuals] = useState(false);
  const handleActualsClear = async () => {
    if (!selectedPlan || !window.confirm('Delete the post-campaign actuals of this plan? Sales, leads, reach, impressions, ROI and notes will be cleared.')) return;
    setClearingActuals(true);
    setActualsMsg(null);
    try {
      await apiClient.delete(`/api/marketing/plans/${selectedPlan.id}/actuals`);
      setActualsForm({ actual_sales: '', actual_leads: '', actual_reach: '', actual_impressions: '', actual_roi_pct: '', actual_notes: '' });
      setSelectedPlan(await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`));
      setActualsMsg('Actuals deleted.');
      loadPlans();
      setTimeout(() => setActualsMsg(null), 5000);
    } catch (err) {
      setFailureModal({ isOpen: true, title: 'Failed to delete actuals', error: err, actionContext: 'Delete post-campaign actuals' });
    } finally {
      setClearingActuals(false);
    }
  };

  const handlePaymentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setPaymentUploadError('File size limit is 10MB.');
      return;
    }

    setPaymentUploading(true);
    setPaymentUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('glc_mra_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:5005';
      const res = await fetch(`${apiBase}/api/marketing/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to upload file.');
      }

      const data = await res.json();
      setPaymentForm(prev => ({ ...prev, doc_url: data.url }));
    } catch (err) {
      setPaymentUploadError(err.message || 'Failed to upload file.');
    } finally {
      setPaymentUploading(false);
    }
  };

  const openPaymentRequest = (item) => {
    setPaymentRequestItem(item);
    const firstPo = poSummary(item).issued.find(po => po.available > 0);
    setPaymentForm({ title: firstPo ? `${firstPo.po_number} · ${item.description || item.m_coa?.name || ''}`.trim() : '', amount: firstPo ? String(Math.round(firstPo.available)) : '', notes: '', doc_url: '', purchase_order_id: firstPo ? String(firstPo.id) : '' });
    setPaymentError(null);
    setPaymentUploadError('');
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentRequestItem || !selectedPlan) return;
    
    setPaymentError(null);
    if (!paymentForm.title || !paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setPaymentError(t('errPayment'));
      return;
    }
    const chosenPo = poSummary(paymentRequestItem).issued.find(po => String(po.id) === String(paymentForm.purchase_order_id));
    if (!chosenPo) { setPaymentError('Select the GA purchase order for this payment.'); return; }
    if (Number(paymentForm.amount) > Number(chosenPo.available) + 0.01) { setPaymentError(`Only ${formatIDR(chosenPo.available)} is left on ${chosenPo.po_number}.`); return; }

    setSubmittingPayment(true);
    try {
      const payload = {
        marketing_plan_item_id: paymentRequestItem.id,
        title: paymentForm.title,
        amount: Number(paymentForm.amount),
        notes: paymentForm.notes,
        doc_url: paymentForm.doc_url,
        purchase_order_id: Number(paymentForm.purchase_order_id)
      };

      await apiClient.post('/api/marketing/payments', payload);
      onSuccessMsg(t('successPayment'));
      setIsPaymentModalOpen(false);
      setPaymentForm({ title: '', amount: '', notes: '', doc_url: '', purchase_order_id: '' });
      loadPlans();

      // Refresh plan details
      const updatedPlan = await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`);
      setSelectedPlan(updatedPlan);
    } catch (err) {
      setPaymentError(err.message || t('errFailPayment'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleRecallPlan = async () => {
    if (!selectedPlan) return;
    if (!window.confirm(t('confirmRecall'))) return;
    
    setRecalling(true);
    try {
      await apiClient.post(`/api/marketing/plans/${selectedPlan.id}/recall`);
      onSuccessMsg(t('successRecalled'));
      loadPlans();
      onClose();
    } catch (err) {
      setFailureModal({
        isOpen: true,
        title: 'Recall Plan Gagal',
        error: err,
        actionContext: 'Penarikan (Recall) Marketing Plan dari Alur Approval'
      });
    } finally {
      setRecalling(false);
    }
  };

  // Refresh tanpa spinner (fetchPlanDetail mengganti seluruh isi modal dengan loader)
  const refreshPlanSilently = async () => {
    if (!selectedPlan) return;
    try {
      setSelectedPlan(await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`));
      loadPlans();
    } catch (err) { /* abaikan — data akan ter-refresh saat modal dibuka ulang */ }
  };

  const closingPaymentCount = (selectedPlan?.items || []).flatMap(item => item.payment_requests || [])
    .filter(payment => ['PENDING', 'APPROVED', 'OVERBUDGET_WARN'].includes(payment.status)).length;
  const canManageClosing = hasRole(userRoles, 'admin', 'marketing', 'marketing_manager');
  const canOpenClosing = selectedPlan?.status === 'APPROVED' && Boolean(selectedPlan?.actuals_filled_at) && closingPaymentCount === 0;
  const openResultsAndClosing = () => {
    changeTab('results');
  };
  const startNoClaimClosing = () => {
    setNoClaimClosingRequest(request => request + 1);
    changeTab('results');
  };

  return (
    <>
      {/* MODAL 2: PLAN DETAIL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
              onClick={onClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${tabId}-title`}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-7xl z-55 overflow-hidden flex flex-col h-[94dvh]"
            >
              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-xs text-neutral-400 font-medium">{t('loading')}</span>
                </div>
              ) : selectedPlan ? (
                <>
                  {/* Detail Header */}
                  <div className="relative shrink-0 overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 px-4 py-3 sm:px-6 sm:py-4 text-white">
                    <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-32 h-72 w-72 rounded-full border-[40px] border-white/[0.03]" />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2.5">
                          <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200"><Megaphone className="h-3.5 w-3.5" /> Campaign overview</span>
                          <span className={`rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${
                            selectedPlan.status === 'APPROVED' ? 'bg-emerald-400/15 text-emerald-300' :
                            selectedPlan.status === 'COMPLETED' ? 'bg-blue-400/15 text-blue-200' :
                            selectedPlan.status === 'REJECTED' ? 'bg-rose-400/15 text-rose-300' :
                            selectedPlan.status === 'DRAFT' ? 'bg-white/10 text-slate-300' : 'bg-amber-400/15 text-amber-200'
                          }`}>{selectedPlan.status.replace(/_/g, ' ')}</span>
                          <button type="button" title="Copy event number" onClick={() => navigator.clipboard?.writeText(eventNumber(selectedPlan)).catch(() => {})} className="rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] font-semibold text-white hover:bg-white/20 cursor-pointer">{eventNumber(selectedPlan)}</button>
                        </div>
                        <h3 id={`${tabId}-title`} className="line-clamp-2 text-base sm:text-xl font-semibold tracking-tight leading-snug" title={selectedPlan.title}>{selectedPlan.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-slate-400">
                          <span className="inline-flex items-center gap-1.5"><Building className="h-3.5 w-3.5" />{selectedPlan.company?.name || '-'}</span>
                          <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{t('submittedBy')} {selectedPlan.creator?.name || 'N/A'}</span>
                        </div>
                      </div>
                      <button type="button" onClick={onClose} aria-label={t('btnClose')}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="shrink-0 bg-slate-50/80 px-3 pt-3 sm:px-6 dark:bg-slate-950/50">
                    <PlanFinancialOverview plan={selectedPlan} lang={lang} />
                    <div role="tablist" aria-label="Campaign overview" className="flex gap-1 overflow-x-auto py-2 sm:gap-2">
                      {detailTabs.map(({ id, label, icon: Icon }, index) => (
                        <button key={id} ref={(node) => { tabButtons.current[id] = node; }}
                          type="button" role="tab" id={`${tabId}-tab-${id}`}
                          aria-controls={`${tabId}-panel-${id}`} aria-selected={activeTab === id}
                          tabIndex={activeTab === id ? 0 : -1}
                          onClick={() => changeTab(id)} onKeyDown={(event) => handleTabKeyDown(event, index)}
                          className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors sm:flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${activeTab === id
                            ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300'
                            : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'}`}>
                          <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Keep panels mounted so unsaved forms survive tab changes. */}
                  <div ref={detailBody} className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-200/80 bg-slate-50/80 p-3 sm:p-6 dark:border-slate-800 dark:bg-slate-950/50">
                    <section role="tabpanel" id={`${tabId}-panel-overview`} aria-labelledby={`${tabId}-tab-overview`}
                      hidden={activeTab !== 'overview'} tabIndex={0} className="space-y-5 focus-visible:outline-blue-500">
                    {selectedPlan.is_late_submission && (
                      <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-400">
                        <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-black uppercase tracking-wide text-[10px]">Late Submission (H-3 rule)</p>
                          <p className="mt-0.5">
                            Submitted {selectedPlan.submitted_at ? new Date(selectedPlan.submitted_at).toLocaleDateString('en-GB') : '-'}, less than 3 months before the event. Reason: <strong>{selectedPlan.late_submission_reason || '-'}</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Description & Period — card-style */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Description Card */}
                      <div className="md:col-span-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-slate-900">
                          <div className="w-6 h-6 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('planDescription')}</span>
                        </div>
                        <div className="px-4 py-4">
                          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">{selectedPlan.description || t('noDescription')}</p>
                        </div>
                      </div>

                      {/* Period & Attachment Card */}
                      <div className="md:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-slate-900">
                          <div className="w-6 h-6 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{t('periodAttachment')}</span>
                        </div>
                        <div className="px-4 py-3 space-y-3">
                          <div className="flex items-start gap-2.5">
                            <Calendar className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-neutral-400 font-semibold">{t('eventLabel')}</p>
                              <p className="text-xs font-semibold text-neutral-800 dark:text-white">
                                {selectedPlan.event_start_date
                                  ? new Date(selectedPlan.event_start_date).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short', year: 'numeric' })
                                  : (selectedPlan.start_date ? new Date(selectedPlan.start_date).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short', year: 'numeric' }) : '-')}
                                {' '}{t('dateSeparator')}{' '}
                                {selectedPlan.event_end_date
                                  ? new Date(selectedPlan.event_end_date).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short', year: 'numeric' })
                                  : (selectedPlan.end_date ? new Date(selectedPlan.end_date).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short', year: 'numeric' }) : '-')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                            <Calendar className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
                            <div className="space-y-0.5">
                              <p className="text-[10px] text-neutral-400 font-semibold">{t('promoDateLabel')}</p>
                              <p className="text-xs font-semibold text-neutral-800 dark:text-white">
                                {selectedPlan.cta_start_date
                                  ? new Date(selectedPlan.cta_start_date).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '-'}
                                {' '}{t('dateSeparator')}{' '}
                                {selectedPlan.cta_end_date
                                  ? new Date(selectedPlan.cta_end_date).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '-'}
                              </p>
                            </div>
                          </div>
                          {selectedPlan.doc_url && (
                            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-2.5">
                              <a href={selectedPlan.doc_url} target="_blank" rel="noreferrer"
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 font-bold">
                                <Paperclip className="w-3.5 h-3.5" /> {t('viewProposal')}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
                      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                        <Target className="h-4 w-4 text-blue-500" /> {lang === 'id' ? 'Target KPI campaign' : 'Campaign KPI targets'}
                      </h4>
                      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                        {[
                          ['target_sales', lang === 'id' ? 'Penjualan' : 'Sales', 'currency'],
                          ['target_leads', 'Leads'],
                          ['target_reach', lang === 'id' ? 'Jangkauan' : 'Reach'],
                          ['target_impressions', lang === 'id' ? 'Impresi' : 'Impressions'],
                          ['target_roi_pct', 'ROI', 'percent'],
                        ].map(([key, label, format]) => (
                          <div key={key}>
                            <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
                            <dd className="mt-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                              {selectedPlan[key] == null ? '-' : format === 'currency' ? formatIDR(selectedPlan[key])
                                : `${Number(selectedPlan[key]).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')}${format === 'percent' ? '%' : ''}`}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {selectedPlan.target_notes && <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300">{selectedPlan.target_notes}</p>}
                    </div>
                    </section>

                    <section role="tabpanel" id={`${tabId}-panel-costs`} aria-labelledby={`${tabId}-tab-costs`}
                      hidden={activeTab !== 'costs'} tabIndex={0} className="space-y-5 focus-visible:outline-blue-500">
                    {/* Items Budget Table */}
                    {(() => {
                      const showAction = ['APPROVED', 'COMPLETED'].includes(selectedPlan.status);
                      const totalBudget = selectedPlan.items?.reduce((s, i) => s + Number(i.budget_amount || 0), 0) || 0;
                      const totalCommitted = selectedPlan.items?.reduce((s, i) => s + Number(i.committed_amount || 0), 0) || 0;
                      const totalActual = selectedPlan.items?.reduce((s, i) => s + Number(i.actual_amount || 0), 0) || 0;
                      const totalRemaining = totalBudget - totalCommitted - totalActual;
                      const colSpanFull = showAction ? 7 : 6;
                      const canAmend = selectedPlan.status === 'APPROVED' && !['PENDING_APPROVAL', 'APPROVED'].includes(selectedPlan.closing_status) && hasRole(userRoles, 'admin', 'marketing', 'marketing_manager');
                      const pendingAmendItems = new Set((selectedPlan.amendments || []).filter(a => ['DRAFT', 'PENDING_REVIEW'].includes(a.status)).flatMap(a => (a.change_items || []).map(ci => ci.plan_item_id)));
                      const proposeChange = (action, itemId) => setAmendPreset({ action, itemId, nonce: Date.now() });

                      return (
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800 sm:px-5">
                              <div className="min-w-0">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><FileSpreadsheet className="h-3.5 w-3.5" /></span>
                                  {t('budgetBreakdown')}
                                  <InlineHelp label="How transactions work">For vendor bills, wait for GA to issue a PO, then select Request payment on that cost line. Use Claim reimbursement only for an employee expense that was paid personally and was not recorded as a vendor payment. Committed means payment requested or approved; paid means transfer confirmed.</InlineHelp>
                                </h4>
                                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Vendor payment: request it on the related line. Personal out-of-pocket expense: submit a reimbursement claim.</p>
                              </div>
                              {(canAmend || (canManageClosing && selectedPlan.status === 'APPROVED' && (!selectedPlan.actuals_filled_at || (canOpenClosing && !['PENDING_APPROVAL', 'APPROVED'].includes(selectedPlan.closing_status))))) && (
                                <div className="flex shrink-0 flex-wrap gap-2">
                                  {canAmend && <>
                                    <button type="button" onClick={() => proposeChange('ADD_ITEM')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-500/40 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-amber-500/10 cursor-pointer">
                                      <Plus className="h-3.5 w-3.5" /> Add cost line
                                    </button>
                                    <button type="button" onClick={() => setIsReimbursementOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 cursor-pointer">
                                      <CircleDollarSign className="h-3.5 w-3.5" /> Claim reimbursement
                                    </button>
                                  </>}
                                  {canManageClosing && selectedPlan.status === 'APPROVED' && !selectedPlan.actuals_filled_at && (
                                    <button type="button" onClick={openResultsAndClosing} title="Required before closing the campaign" className="relative inline-flex h-9 items-center gap-1.5 overflow-visible rounded-xl bg-rose-600 px-3 text-xs font-semibold text-white shadow-sm shadow-rose-500/30 transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 cursor-pointer">
                                      <span aria-hidden="true" className="pointer-events-none absolute -inset-1 rounded-2xl border border-rose-400/80 animate-ping" />
                                      <Target className="relative h-3.5 w-3.5" /> <span className="relative">Record results</span>
                                    </button>
                                  )}
                                  {canManageClosing && canOpenClosing && !['PENDING_APPROVAL', 'APPROVED'].includes(selectedPlan.closing_status) && (
                                    <button type="button" onClick={startNoClaimClosing} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 cursor-pointer">
                                      <CheckCircle className="h-3.5 w-3.5" /> No claim &amp; close
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 bg-slate-50/70 dark:divide-slate-800 dark:bg-slate-950/30 sm:grid-cols-4 sm:divide-y-0">
                              {[
                                ['Planned', totalBudget, 'text-slate-900 dark:text-white'],
                                ['Committed', totalCommitted, 'text-amber-600 dark:text-amber-400'],
                                ['Paid', totalActual, 'text-emerald-600 dark:text-emerald-400'],
                                ['Available', totalRemaining, totalRemaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'],
                              ].map(([label, amount, tone]) => (
                                <div key={label} className="px-4 py-2.5 sm:px-5">
                                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                                  <dd className={`mt-0.5 text-sm font-bold tabular-nums ${tone}`}>{formatIDR(amount)}</dd>
                                </div>
                              ))}
                            </dl>

                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[880px] text-left text-xs bg-white dark:bg-slate-900">
                                <thead>
                                  <tr className="border-y border-slate-100 bg-slate-50/60 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
                                    <th className="px-4 py-2.5">{t('colMonth')}</th>
                                    <th className="px-3 py-2.5">Cost line</th>
                                    <th className="px-3 py-2.5">Vendor & location</th>
                                    <th className="px-3 py-2.5 text-right">Planned</th>
                                    <th className="px-3 py-2.5 text-right">Transactions</th>
                                    <th className="px-3 py-2.5 text-right">Available</th>
                                    {showAction && <th className="px-4 py-2.5 text-right">Action</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 dark:divide-slate-800 dark:text-slate-300">
                                  {!selectedPlan.items?.length && (
                                    <tr><td colSpan={colSpanFull} className="px-4 py-10 text-center text-slate-400">No cost lines yet. Add a cost line to prepare this campaign for vendor payment.</td></tr>
                                  )}
                                  {selectedPlan.items?.map((item, idx) => {
                                    const budget = Number(item.budget_amount || 0);
                                    const committed = Number(item.committed_amount || 0);
                                    const actual = Number(item.actual_amount || 0);
                                    const remaining = budget - committed - actual;

                                    return (
                                      <React.Fragment key={item.id || idx}>
                                        <tr className="transition-colors hover:bg-blue-50/35 dark:hover:bg-blue-500/5">
                                          <td className="px-4 py-3.5 align-top font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200">{getMonthName(item.period_month, lang).slice(0, 3)}</td>
                                          <td className="px-3 py-3.5 align-top">
                                            <p className="font-bold text-slate-900 dark:text-white">{item.m_coa?.code || '—'} <span className="font-medium text-slate-500 dark:text-slate-400">· {item.m_coa?.name || item.description || 'Cost item'}</span></p>
                                            <p className="mt-1 text-[10px] text-slate-400">{item.m_brand?.name || 'No brand'}{item.m_line_business?.name ? ` · ${item.m_line_business.name}` : ''}{item.description?.startsWith('Reimbursement: ') ? ' · Reimbursement' : ''}</p>
                                          </td>
                                          <td className="px-3 py-3.5 align-top">
                                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200"><Building className="h-3 w-3 shrink-0 text-slate-400" />{item.vendors?.vendor_name || 'Vendor to be assigned'}</p>
                                            <p className="mt-1 text-[10px] text-slate-400">{item.m_branch?.name ? `${t('branchPrefix')} ${item.m_branch.name}` : 'Global Sales'}{item.m_event_location?.name ? ` · ${item.m_event_location.name}` : ''}</p>
                                          </td>
                                          <td className="px-3 py-3.5 text-right align-top">
                                            <span className="font-bold text-neutral-900 dark:text-white block whitespace-nowrap">{formatIDR(budget)}</span>
                                            <span className="text-[10px] text-neutral-400 font-normal block mt-0.5 whitespace-nowrap">
                                              {item.qty || 1} × {formatIDR(item.unit_price || budget)}
                                            </span>
                                          </td>
                                          <td className="px-3 py-3.5 text-right align-top tabular-nums whitespace-nowrap">
                                            <p className="text-[10px] text-slate-400">Committed <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">{committed ? formatIDR(committed) : '—'}</span></p>
                                            <p className="mt-1 text-[10px] text-slate-400">Paid <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">{formatIDR(actual)}</span></p>
                                          </td>
                                          <td className={`px-3 py-3.5 text-right align-top font-bold tabular-nums whitespace-nowrap ${remaining < 0 ? 'text-rose-600 dark:text-rose-400' : remaining < budget * 0.15 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                                            {formatIDR(remaining)}
                                          </td>
                                          {showAction && (
                                            <td className="px-4 py-3.5 text-right align-top">
                                              <PoActionCell item={item} planStatus={selectedPlan.status} canRequest={hasRole(userRoles, 'admin', 'marketing', 'marketing_manager')} onRequest={openPaymentRequest} />
                                              {pendingAmendItems.has(item.id)
                                                ? <span className="mt-1.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Change in progress</span>
                                                : canAmend && <button type="button" onClick={() => proposeChange('CHANGE_BUDGET', item.id)} className="mt-1.5 ml-auto flex items-center gap-1 text-[10px] font-semibold text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-300 cursor-pointer"><Edit3 className="h-3 w-3" /> Change</button>}
                                            </td>
                                          )}
                                        </tr>
                                        {item.payment_requests && item.payment_requests.length > 0 && (
                                          <tr className="bg-neutral-50/40 dark:bg-neutral-950/20">
                                            <td colSpan={colSpanFull} className="px-6 py-2.5">
                                              <details className="group/history rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                                                <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 [&::-webkit-details-marker]:hidden">
                                                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/history:rotate-180" />
                                                  {t('expenseHistory')} ({item.payment_requests.length})
                                                </summary>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                                  {item.payment_requests.map((pr) => (
                                                    <div key={pr.id} className="bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-2.5 flex items-center justify-between text-[10px] shadow-sm">
                                                      <div className="space-y-0.5">
                                                        <p className="font-bold text-neutral-800 dark:text-white">{pr.request_type === 'CLAIM' && <span className="mr-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">REIMBURSEMENT</span>}{pr.title}</p>
                                                        <p className="text-neutral-400 font-medium text-[9px]">{t('byLabel')} {pr.creator?.name || 'N/A'}</p>
                                                        {pr.request_type === 'CLAIM' && pr.reimbursement_payee && <p className="text-[10px] text-slate-500">Reimbursement for: {pr.reimbursement_payee}{pr.expense_date ? ` / ${new Date(pr.expense_date).toLocaleDateString('en-GB', { timeZone: 'UTC' })}` : ''}</p>}
                                                      </div>
                                                      <div className="flex items-center gap-3.5">
                                                        <span className="font-extrabold text-neutral-900 dark:text-white">{formatIDR(pr.amount)}</span>
                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                                                          pr.status === 'APPROVED' || pr.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' :
                                                          pr.status === 'REJECTED' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                                                        }`}>
                                                          {pr.status}
                                                        </span>
                                                        {pr.doc_url && (
                                                          <a href={pr.doc_url} target="_blank" rel="noreferrer"
                                                            className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center gap-1 font-bold"
                                                            title={t('viewAttachment')}>
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                          </a>
                                                        )}
                                                        {pr.request_type === 'CLAIM' && selectedPlan.status === 'APPROVED' && !['PENDING_APPROVAL', 'APPROVED'].includes(selectedPlan.closing_status) && hasRole(userRoles, 'admin', 'marketing', 'marketing_manager') && (
                                                          <span className="flex items-center gap-0.5">
                                                            {pr.status === 'PENDING' && <button type="button" title="Edit reimbursement" onClick={() => { setEditingClaim(pr); setIsReimbursementOpen(true); }} className="rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 cursor-pointer"><Edit3 className="h-3.5 w-3.5" /></button>}
                                                            {['PENDING', 'REJECTED'].includes(pr.status) && <button type="button" title="Delete reimbursement" disabled={claimBusyId === pr.id} onClick={() => deleteClaim(pr)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-500/10 cursor-pointer">{claimBusyId === pr.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </details>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50">
                                    <td colSpan={3} className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Total</td>
                                    <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{formatIDR(totalBudget)}</td>
                                    <td className="px-3 py-3 text-right text-[10px] tabular-nums whitespace-nowrap"><p className="text-amber-600 dark:text-amber-400">{totalCommitted ? formatIDR(totalCommitted) : '—'}</p><p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">{formatIDR(totalActual)}</p></td>
                                    <td className={`px-3 py-3 text-right font-bold tabular-nums whitespace-nowrap ${totalRemaining < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>{formatIDR(totalRemaining)}</td>
                                    {showAction && <td />}
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>

                          {['APPROVED', 'COMPLETED'].includes(selectedPlan.status) && (
                            <MarketingAmendmentPanel plan={selectedPlan} metadata={metadata} userRoles={userRoles} preset={amendPreset} onChanged={refreshPlanSilently} />
                          )}
                        </div>
                      );
                    })()}

                    </section>

                    <section role="tabpanel" id={`${tabId}-panel-approvals`} aria-labelledby={`${tabId}-tab-approvals`}
                      hidden={activeTab !== 'approvals'} tabIndex={0} className="space-y-5 focus-visible:outline-blue-500">
                    {/* DocHub-style Document Signers & Approval Timeline Card */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                              {lang === 'id' ? 'Approval Flow & Document Signers' : 'Approval Chain & Document Signers'}
                            </h4>
                            <p className="text-[10px] text-neutral-400">Campaign approval first, then every payment, reimbursement and closing approval below.</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 border border-blue-200/60 dark:border-blue-900/30">
                          {selectedPlan.approvers?.length || selectedPlan.approval_history?.length || 0} {lang === 'id' ? 'Penandatangan' : 'Signers'}
                        </span>
                      </div>

                      <div className="p-5 space-y-4">
                        {selectedPlan.approvers && selectedPlan.approvers.length > 0 ? (
                          <div className="relative pl-6 border-l-2 border-neutral-200 dark:border-neutral-800 space-y-5 my-2">
                            {selectedPlan.approvers.map((signer, idx) => {
                              const isApproved = signer.status === 'APPROVED';
                              const isPending = signer.status === 'PENDING';
                              const isRejected = signer.status === 'REJECTED';
                              const isWaiting = signer.status === 'WAITING' || !signer.status;

                              // Find matching active magic link token
                              const matchingHistory = (selectedPlan.approval_history || []).find(h => h.step_number === signer.step_number);
                              const activeMagicLink = matchingHistory?.magic_links?.[0]?.token;

                              return (
                                <div key={signer.id || idx} className="relative">
                                  {/* Step indicator circle on timeline */}
                                  <div className={`absolute -left-[31px] top-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 bg-white dark:bg-neutral-900 ${
                                    isApproved ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' :
                                    isPending ? 'border-blue-500 text-blue-600 animate-pulse bg-blue-50 dark:bg-blue-950/30' :
                                    isRejected ? 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30' :
                                    'border-neutral-300 text-neutral-400'
                                  }`}>
                                    {isApproved ? '✓' : idx + 1}
                                  </div>

                                  {/* Signer Card */}
                                  <div className={`p-4 rounded-xl border transition-all ${
                                    isPending
                                      ? 'border-blue-500/40 bg-blue-50/20 dark:bg-blue-950/10 shadow-sm ring-1 ring-blue-500/20'
                                      : isApproved
                                      ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                                      : isRejected
                                      ? 'border-red-500/30 bg-red-50/10 dark:bg-red-950/5'
                                      : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-950/20'
                                  }`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-black text-neutral-900 dark:text-white">
                                            {signer.approver_name}
                                          </span>
                                          {signer.approver_role && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                                              {signer.approver_role}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1 break-all">
                                          {signer.approver_email}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-2 flex-wrap">
                                        {/* Status badge */}
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                                          isApproved ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                          isPending ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20 animate-pulse' :
                                          isRejected ? 'bg-red-500/10 text-red-600 border border-red-500/20' :
                                          'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border border-neutral-200 dark:border-neutral-700'
                                        }`}>
                                          {isApproved && <CheckCircle className="w-3 h-3" />}
                                          {isPending && <Clock className="w-3 h-3" />}
                                          {isRejected && <AlertTriangle className="w-3 h-3" />}
                                          {isWaiting && <Clock className="w-3 h-3 text-neutral-400" />}
                                          {isApproved ? (lang === 'id' ? 'Approved' : 'Approved') :
                                           isPending ? (lang === 'id' ? 'Pending Approval' : 'Pending Signature') :
                                           isRejected ? (lang === 'id' ? 'Rejected' : 'Rejected') :
                                           (lang === 'id' ? 'Waiting' : 'Waiting in Queue')}
                                        </span>

                                        {/* Copy Magic Link Button for PENDING step */}
                                        {isPending && activeMagicLink && (
                                          <button
                                            type="button"
                                            onClick={() => handleCopyMagicLink(activeMagicLink)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-sm ${
                                              copiedToken === activeMagicLink
                                                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                            }`}
                                            title="Copy the magic link for this signer"
                                          >
                                            {copiedToken === activeMagicLink ? (
                                              <>
                                                <Check className="w-3 h-3" />
                                                <span>{lang === 'id' ? 'Link Tersalin!' : 'Link Copied!'}</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="w-3 h-3" />
                                                <span>{lang === 'id' ? 'Salin Link Approval' : 'Copy Approval Link'}</span>
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Additional metadata: action_at, comment, signature */}
                                    {(signer.action_at || signer.comment || signer.signature_url) && (
                                      <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                                        <div className="space-y-1">
                                          {signer.action_at && (
                                            <p className="text-neutral-400">
                                              {isApproved ? (lang === 'id' ? 'Signed on: ' : 'Signed on: ') : (lang === 'id' ? 'Waktu aksi: ' : 'Action date: ')}
                                              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                                {new Date(signer.action_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                                              </span>
                                            </p>
                                          )}
                                          {signer.comment && (
                                            <p className="italic text-neutral-600 dark:text-neutral-300">
                                              "{signer.comment}"
                                            </p>
                                          )}
                                        </div>

                                        {signer.signature_url && (
                                          <div className="shrink-0 flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1 px-2.5">
                                            <span className="text-[9px] font-bold text-neutral-400 uppercase">Tanda Tangan</span>
                                            <img
                                              src={signer.signature_url}
                                              alt="Signature"
                                              className="h-7 max-w-[120px] object-contain dark:invert"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Legacy fallback */
                          (selectedPlan.approval_history && selectedPlan.approval_history.length > 0) ? (
                            <div className="space-y-3">
                              {selectedPlan.approval_history.map((hist, idx) => (
                                <div key={hist.id || idx} className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-950/20 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-bold text-neutral-800 dark:text-white">
                                      Step {hist.step_number}: {hist.approver?.name || hist.approver?.email || 'Approver'}
                                    </p>
                                    <p className="text-[10px] text-neutral-400">{hist.approver?.email}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                      hist.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                                      hist.status === 'REJECTED' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                                    }`}>
                                      {hist.status}
                                    </span>
                                    {hist.magic_links?.[0]?.token && hist.status === 'PENDING' && (
                                      <button
                                        type="button"
                                        onClick={() => handleCopyMagicLink(hist.magic_links[0].token)}
                                        className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                                        title="Copy magic link"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-400 text-center py-3">
                              {lang === 'id' ? 'No signer workflow data for this plan yet.' : 'No signer workflow data found.'}
                            </p>
                          )
                        )}
                      </div>

                      {/* Payments, reimbursements and closing approvals of this campaign */}
                      <div className="border-t border-neutral-100 p-5 dark:border-neutral-800">
                        <MarketingPlanApprovalLedger plan={selectedPlan} />
                      </div>
                    </div>


                    </section>

                    <section role="tabpanel" id={`${tabId}-panel-po`} aria-labelledby={`${tabId}-tab-po`}
                      hidden={activeTab !== 'po'} tabIndex={0} className="space-y-5 focus-visible:outline-blue-500">
                      <PlanPoTracker plan={selectedPlan} />
                    </section>

                    <section role="region" aria-label="Campaign results and closing"
                      hidden={activeTab !== 'results'} tabIndex={0} className="space-y-5 focus-visible:outline-blue-500">
                    {!['APPROVED', 'COMPLETED'].includes(selectedPlan.status) && (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
                        <BarChart2 className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{lang === 'id' ? 'Results & closing not available yet' : 'Results & closing are not available yet'}</h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{lang === 'id' ? 'Available after the plan is approved.' : 'Available once the plan is approved.'}</p>
                      </div>
                    )}
                    {/* Post-Campaign Actuals & Completed Plan Performance Report */}
                    {['APPROVED', 'COMPLETED'].includes(selectedPlan.status) && (
                      <div className="p-5 bg-neutral-50 dark:bg-neutral-950/40 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/50 dark:border-neutral-800/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-1.5">
                                <BarChart2 className="w-4 h-4 text-indigo-500" />
                                {selectedPlan.status === 'COMPLETED' 
                                  ? 'Final Results & Campaign Evaluation' 
                                  : t('postCampaignActuals')}
                              </h4>
                              {selectedPlan.status === 'COMPLETED' && (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30">
                                  Close Books & Complete
                                </span>
                              )}
                            </div>
                            {selectedPlan.actuals_filled_at && (
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                                · {t('filledOn')} {new Date(selectedPlan.actuals_filled_at).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Summary Metrics Cards (Always shown if filled or if completed) */}
                        {(selectedPlan.actuals_filled_at || selectedPlan.status === 'COMPLETED') && (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 p-4.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualSales')}</p>
                              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                {selectedPlan.actual_sales != null ? formatIDR(selectedPlan.actual_sales) : '-'}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualLeads')}</p>
                              <p className="text-xs font-black text-neutral-900 dark:text-white">
                                {selectedPlan.actual_leads != null ? selectedPlan.actual_leads.toLocaleString('en-GB') : '-'}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualReach')}</p>
                              <p className="text-xs font-black text-neutral-900 dark:text-white">
                                {selectedPlan.actual_reach != null ? selectedPlan.actual_reach.toLocaleString('en-GB') : '-'}
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualImpressions')}</p>
                              <p className="text-xs font-black text-neutral-900 dark:text-white">
                                {selectedPlan.actual_impressions != null ? selectedPlan.actual_impressions.toLocaleString('en-GB') : '-'}
                              </p>
                            </div>
                            <div className="space-y-0.5 col-span-2 md:col-span-1">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualROI')}</p>
                              <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                {selectedPlan.actual_roi_pct != null 
                                  ? `${Number(selectedPlan.actual_roi_pct).toFixed(2)}%` 
                                  : (selectedPlan.total_budget > 0 && selectedPlan.actual_sales > 0 
                                      ? `${((Number(selectedPlan.actual_sales) / Number(selectedPlan.total_budget)) * 100).toFixed(0)}%` 
                                      : '-')}
                              </p>
                            </div>
                            {selectedPlan.actual_notes && (
                              <div className="col-span-2 md:col-span-5 border-t border-neutral-100 dark:border-neutral-800/80 pt-3 mt-1.5">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('notesInsights')}</p>
                                <div className="mt-1 p-3 bg-neutral-50 dark:bg-neutral-950/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 text-xs text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed italic">
                                  "{selectedPlan.actual_notes}"
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Input form: ONLY shown when APPROVED */}
                        {selectedPlan.status === 'APPROVED' && (
                          <div className="space-y-4">
                            <h5 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                              {selectedPlan.actuals_filled_at ? t('updateActuals') : t('enterActuals')}
                            </h5>
                            {actualsMsg && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 animate-pulse">
                                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> {actualsMsg}
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('actualSalesLabel')}</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={formatThousands(actualsForm.actual_sales)}
                                  onChange={(e) => setActualsForm(p => ({ ...p, actual_sales: e.target.value.replace(/\D/g, '') }))}
                                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('actualLeadsLabel')}</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={actualsForm.actual_leads}
                                  onChange={(e) => setActualsForm(p => ({ ...p, actual_leads: e.target.value }))}
                                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('actualReachLabel')}</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={actualsForm.actual_reach}
                                  onChange={(e) => setActualsForm(p => ({ ...p, actual_reach: e.target.value }))}
                                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('actualImpressionsLabel')}</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={actualsForm.actual_impressions}
                                  onChange={(e) => setActualsForm(p => ({ ...p, actual_impressions: e.target.value }))}
                                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('actualROILabel')}</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={actualsForm.actual_roi_pct}
                                  onChange={(e) => setActualsForm(p => ({ ...p, actual_roi_pct: e.target.value }))}
                                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('notesInsights')}</label>
                              <textarea
                                rows={2}
                                placeholder={t('notesPlaceholder')}
                                value={actualsForm.actual_notes}
                                onChange={(e) => setActualsForm(p => ({ ...p, actual_notes: e.target.value }))}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 resize-none font-medium leading-relaxed"
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              {selectedPlan.actuals_filled_at && !['PENDING_APPROVAL', 'APPROVED'].includes(selectedPlan.closing_status) && (
                                <button type="button" onClick={handleActualsClear} disabled={clearingActuals || submittingActuals} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10 cursor-pointer">
                                  {clearingActuals ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  Delete actuals
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleActualsSubmit}
                                disabled={submittingActuals}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                {submittingActuals ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart2 className="w-3.5 h-3.5" />}
                                {t('btnSaveActuals')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Closing: biaya final vs dibayar -> kelebihan / claim -> approval -> COMPLETED */}
                    {['APPROVED', 'COMPLETED'].includes(selectedPlan.status) && (
                      <MarketingPlanClosingSection
                        key={`${selectedPlan.id}-${selectedPlan.actuals_filled_at ? 'actuals' : 'no-actuals'}`}
                        planId={selectedPlan.id}
                        planStatus={selectedPlan.status}
                        userRoles={userRoles}
                        purchaseOrdersByItem={Object.fromEntries((selectedPlan.items || []).map(item => [item.id, item.purchase_orders || []]))}
                        noClaimTrigger={noClaimClosingRequest}
                        onChanged={refreshPlanSilently}
                      />
                    )}
                    </section>
                  </div>

                  {/* Detail Footer Controls */}
                  <div className="shrink-0 px-4 sm:px-7 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      {selectedPlan.status === 'PENDING_APPROVAL' && hasRole(userRoles, 'admin', 'marketing', 'marketing_manager') && (
                        <button
                          type="button"
                          disabled={recalling}
                          onClick={handleRecallPlan}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/15 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                        >
                          {recalling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {t('btnRecall')}
                        </button>
                      )}

                      {selectedPlan.status === 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => onRevise(selectedPlan)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/15 flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          {t('btnRevise')}
                        </button>
                      )}

                      {selectedPlan.status === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => onEditDraft(selectedPlan.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/15 flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          Edit Draft
                        </button>
                      )}

                      {canManageClosing && selectedPlan.status === 'APPROVED' && selectedPlan.actuals_filled_at && closingPaymentCount > 0 && (
                        <span className="hidden text-[10px] font-medium text-amber-700 dark:text-amber-300 sm:inline">Resolve {closingPaymentCount} payment{closingPaymentCount === 1 ? '' : 's'} before closing</span>
                      )}

                      {canManageClosing && (canOpenClosing || selectedPlan.closing_status === 'PENDING_APPROVAL' || selectedPlan.closing_status === 'REJECTED') && (
                        <button
                          type="button"
                          onClick={openResultsAndClosing}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer ${selectedPlan.closing_status === 'PENDING_APPROVAL' ? 'bg-slate-700 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          {selectedPlan.closing_status === 'PENDING_APPROVAL' ? 'View closing' : selectedPlan.closing_status === 'REJECTED' ? 'Resume closing' : 'Start closing'}
                        </button>
                      )}

                      {selectedPlan.status === 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={openResultsAndClosing}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20 cursor-pointer"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> View closing
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={duplicating}
                        onClick={handleDuplicatePlan}
                        className="px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        title="Duplicate this plan as a new draft"
                      >
                        {duplicating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                        Duplikat Plan
                      </button>

                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm shadow-blue-600/20"
                    >
                      {t('btnClose')}
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isOpen && isReimbursementOpen && selectedPlan && (
        <MarketingReimbursementModal plan={selectedPlan} claim={editingClaim}
          onClose={() => { setIsReimbursementOpen(false); setEditingClaim(null); }}
          onSuccess={() => {
            setIsReimbursementOpen(false);
            onSuccessMsg(editingClaim ? 'Reimbursement updated.' : 'Reimbursement submitted to Finance.');
            setEditingClaim(null);
            refreshPlanSilently();
          }}
        />
      )}

      {/* MODAL 3: EXPENSE / PAYMENT REQUEST RECORDING FORM */}
      <AnimatePresence>
        {isPaymentModalOpen && paymentRequestItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsPaymentModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-lg z-65 overflow-hidden"
            >
              <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
                <div>
                  <h3 className="text-md font-black text-neutral-900 dark:text-white">{t('paymentModalTitle')}</h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Item: {paymentRequestItem.m_coa?.code} - {paymentRequestItem.m_coa?.name}</p>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {paymentError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold p-3 rounded-xl flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> {paymentError}
                  </div>
                )}

                {(() => {
                  const eventEnd = selectedPlan?.event_end_date;
                  if (!eventEnd) return null;
                  const isEventPast = new Date() > new Date(eventEnd);
                  if (!isEventPast) return null;
                  const endLabel = new Date(eventEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                  return (
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-semibold p-3 rounded-xl flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>The event period ended on <strong>{endLabel}</strong>. This request will be recorded as a post-event actual.</span>
                    </div>
                  );
                })()}

                {(() => {
                  const issued = poSummary(paymentRequestItem).issued;
                  const chosen = issued.find(po => String(po.id) === String(paymentForm.purchase_order_id));
                  return (
                    <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950">
                      <label htmlFor="payment-po" className="text-[9px] font-bold uppercase tracking-wider text-slate-400">GA purchase order *</label>
                      <select id="payment-po" value={paymentForm.purchase_order_id} onChange={e => { const po = issued.find(x => String(x.id) === e.target.value); setPaymentForm(prev => ({ ...prev, purchase_order_id: e.target.value, amount: po ? String(Math.round(po.available)) : prev.amount })); }} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">
                        <option value="">Select issued PO</option>
                        {issued.map(po => <option key={po.id} value={po.id} disabled={po.available <= 0}>{po.po_number} · {po.vendor?.vendor_name} · {formatIDR(po.available)} left</option>)}
                      </select>
                      {chosen && (() => {
                        const taxRate = Number(chosen.tax_rate || 0);
                        const isPph21 = String(chosen.tax_type || '').toUpperCase() === 'PPH21_INDIVIDUAL' || (!chosen.tax_type && taxRate === 2.5);
                        const taxDescription = isPph21
                          ? `after PPh 21 ${taxRate}% withholding`
                          : taxRate > 0 ? `incl. PPN ${taxRate}%` : 'without tax';
                        return <p className="text-[11px] text-slate-500">PO payable {formatIDR(chosen.line_total)} {taxDescription} · already requested {formatIDR(chosen.requested)} · <span className="font-semibold text-blue-600 dark:text-blue-400">{formatIDR(chosen.available)} available</span></p>;
                      })()}
                    </div>
                  );
                })()}

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase">{t('paymentDescLabel')}</label>
                    <input
                      type="text"
                      placeholder={t('paymentDescPlaceholder')}
                      value={paymentForm.title}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">{t('paymentAmountLabel')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatThousands(paymentForm.amount)}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }))}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">{t('supportingDocLabel')}</label>
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <input
                            type="text"
                            placeholder={t('docLinkPlaceholder')}
                            value={paymentForm.doc_url || ''}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, doc_url: e.target.value }))}
                            className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
                          />
                        </div>
                        <div className="relative shrink-0">
                          <input
                            type="file"
                            id="payment-doc-upload"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={handlePaymentFileChange}
                            disabled={paymentUploading}
                          />
                          <label
                            htmlFor="payment-doc-upload"
                            className={`px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 h-full ${paymentUploading ? 'opacity-50 pointer-events-none' : ''}`}
                          >
                            {paymentUploading ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>{t('uploadProof')}</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                      {paymentUploadError && (
                        <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {paymentUploadError}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Overbudget warning alert */}
                {paymentForm.amount && Number(paymentForm.amount) > (Number(paymentRequestItem.budget_amount) - Number(paymentRequestItem.actual_amount)) && (
                  <div className="bg-amber-500/10 border border-amber-300 text-amber-700 dark:text-amber-400 text-[11px] font-bold p-3 rounded-2xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {t('overBudgetWarning')}
                    </span>
                  </div>
                )}

                {/* Legal PKS warning alert */}
                {paymentForm.amount && Number(paymentForm.amount) > 50000000 && (
                  <div className="bg-indigo-500/10 border border-indigo-200 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold p-3 rounded-2xl flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {t('legalWarning')}
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">{t('additionalNotes')}</label>
                  <textarea
                    rows="2"
                    placeholder={t('notesVendorPlaceholder')}
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 resize-none font-medium leading-relaxed"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                  >
                    {t('btnCancel')}
                  </button>

                  <button
                    type="submit"
                    disabled={submittingPayment || paymentUploading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submittingPayment && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {t('btnSubmitExpense')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up feedback saat terjadi kegagalan (403/401/400/500) */}
      <ActionFailureModal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal(prev => ({ ...prev, isOpen: false }))}
        title={failureModal.title}
        error={failureModal.error}
        actionContext={failureModal.actionContext}
      />
    </>
  );
}
