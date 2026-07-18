'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, Paperclip, FileSpreadsheet, Building, Loader2,
  AlertTriangle, Info, BarChart2, CheckCircle, Clock,
  GitMerge, CheckSquare, Plus, Send, Trash2, ChevronDown, ChevronUp,
  TrendingUp, Flag
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import { useLanguage } from '@/lib/LanguageContext';
import mpt from '@/lib/translations/marketingPlan';

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

export default function MarketingPlanDetailModal({
  isOpen,
  onClose,
  planId,
  metadata,
  loadPlans,
  onRevise,
  onEditDraft,
  userRole,
  onSuccessMsg
}) {
  const { lang } = useLanguage();
  const t = useCallback((key, ...args) => typeof mpt[lang][key] === 'function' ? mpt[lang][key](...args) : (mpt[lang][key] ?? key), [lang]);

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  // Post-campaign actuals form state
  const [actualsForm, setActualsForm] = useState({
    actual_sales: '', actual_leads: '', actual_reach: '',
    actual_impressions: '', actual_roi_pct: '', actual_notes: ''
  });
  const [submittingActuals, setSubmittingActuals] = useState(false);
  const [actualsMsg, setActualsMsg] = useState(null);

  // Expense/Payment Request modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
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

  // Complete plan state
  const [completing, setCompleting] = useState(false);

  // Amendment state
  const [showAmendmentPanel, setShowAmendmentPanel] = useState(false);
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  const [amendmentTitle, setAmendmentTitle] = useState('');
  const [amendmentJustification, setAmendmentJustification] = useState('');
  const [amendmentChanges, setAmendmentChanges] = useState([]);
  const [submittingAmendment, setSubmittingAmendment] = useState(false);
  const [amendmentError, setAmendmentError] = useState(null);
  const [amendmentMsg, setAmendmentMsg] = useState(null);
  const [reviewingAmendmentId, setReviewingAmendmentId] = useState(null);

  // Fetch plan details
  const fetchPlanDetail = useCallback(async () => {
    if (!planId) return;
    try {
      setLoading(true);
      const planDetail = await apiClient.get(`/api/marketing/plans/${planId}`);
      setSelectedPlan(planDetail);

      // Populate actuals form if approved
      if (planDetail.status === 'APPROVED') {
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
      alert(err.message || t('errFailActuals'));
    } finally {
      setSubmittingActuals(false);
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

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentRequestItem || !selectedPlan) return;
    
    setPaymentError(null);
    if (!paymentForm.title || !paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setPaymentError(t('errPayment'));
      return;
    }

    setSubmittingPayment(true);
    try {
      const payload = {
        marketing_plan_item_id: paymentRequestItem.id,
        title: paymentForm.title,
        amount: Number(paymentForm.amount),
        notes: paymentForm.notes,
        doc_url: paymentForm.doc_url
      };

      await apiClient.post('/api/marketing/payments', payload);
      onSuccessMsg(t('successPayment'));
      setIsPaymentModalOpen(false);
      setPaymentForm({ title: '', amount: '', notes: '', doc_url: '' });
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
      alert(err.message || t('errFailRecall'));
    } finally {
      setRecalling(false);
    }
  };

  const handleCompletePlan = async () => {
    if (!selectedPlan) return;
    if (!window.confirm('Yakin ingin menutup plan ini? Status akan berubah menjadi COMPLETED dan tidak bisa dibatalkan.')) return;
    setCompleting(true);
    try {
      await apiClient.post(`/api/marketing/plans/${selectedPlan.id}/complete`);
      onSuccessMsg('Plan berhasil diselesaikan dan ditutup.');
      loadPlans();
      const updated = await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`);
      setSelectedPlan(updated);
    } catch (err) { alert(err.message || 'Gagal menyelesaikan plan.'); }
    finally { setCompleting(false); }
  };

  const addAmendmentChange = () => {
    setAmendmentChanges(prev => [...prev, { action: 'CHANGE_VENDOR', plan_item_id: '', new_vendor_id: '', budget_delta: '', change_reason: '', new_item: null }]);
  };

  const removeAmendmentChange = (idx) => {
    setAmendmentChanges(prev => prev.filter((_, i) => i !== idx));
  };

  const updateAmendmentChange = (idx, field, value) => {
    setAmendmentChanges(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleSubmitAmendmentDraft = async () => {
    if (!selectedPlan || !amendmentTitle || !amendmentJustification || amendmentChanges.length === 0) {
      setAmendmentError('Judul, justifikasi, dan minimal satu perubahan wajib diisi.');
      return;
    }
    setSubmittingAmendment(true);
    setAmendmentError(null);
    try {
      const changes = amendmentChanges.map(c => ({
        action: c.action,
        plan_item_id: c.plan_item_id ? parseInt(c.plan_item_id, 10) : null,
        new_vendor_id: c.new_vendor_id ? parseInt(c.new_vendor_id, 10) : null,
        budget_delta: c.budget_delta ? parseFloat(c.budget_delta) : null,
        change_reason: c.change_reason || null,
        new_item: c.action === 'ADD_ITEM' ? c.new_item : null
      }));
      await apiClient.post(`/api/marketing/plans/${selectedPlan.id}/amendments`, {
        title: amendmentTitle, justification: amendmentJustification, changes
      });
      setAmendmentMsg('Amendment berhasil disimpan sebagai draft.');
      setShowAmendmentForm(false);
      setAmendmentTitle(''); setAmendmentJustification(''); setAmendmentChanges([]);
      const updated = await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`);
      setSelectedPlan(updated);
      setTimeout(() => setAmendmentMsg(null), 4000);
    } catch (err) { setAmendmentError(err.message || 'Gagal menyimpan amendment.'); }
    finally { setSubmittingAmendment(false); }
  };

  const handleSubmitAmendment = async (amendmentId) => {
    try {
      await apiClient.post(`/api/marketing/amendments/${amendmentId}/submit`);
      setAmendmentMsg('Amendment diajukan untuk review.');
      const updated = await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`);
      setSelectedPlan(updated);
      setTimeout(() => setAmendmentMsg(null), 4000);
    } catch (err) { alert(err.message || 'Gagal mengajukan amendment.'); }
  };

  const handleReviewAmendment = async (amendmentId, action) => {
    const review_comment = action === 'REJECT' ? window.prompt('Alasan penolakan:') : null;
    if (action === 'REJECT' && !review_comment) return;
    setReviewingAmendmentId(amendmentId);
    try {
      await apiClient.post(`/api/marketing/amendments/${amendmentId}/review`, { action, review_comment });
      setAmendmentMsg(action === 'APPROVE' ? 'Amendment disetujui dan perubahan diterapkan.' : 'Amendment ditolak.');
      const updated = await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`);
      setSelectedPlan(updated); loadPlans();
      setTimeout(() => setAmendmentMsg(null), 4000);
    } catch (err) { alert(err.message || 'Gagal me-review amendment.'); }
    finally { setReviewingAmendmentId(null); }
  };

  const handleDeleteAmendment = async (amendmentId) => {
    if (!window.confirm('Hapus amendment ini?')) return;
    try {
      await apiClient.delete(`/api/marketing/amendments/${amendmentId}`);
      const updated = await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`);
      setSelectedPlan(updated);
    } catch (err) { alert(err.message || 'Gagal menghapus amendment.'); }
  };

  return (
    <>
      {/* MODAL 2: PLAN DETAIL */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-6xl z-55 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <span className="text-xs text-neutral-400 font-medium">{t('loading')}</span>
                </div>
              ) : selectedPlan ? (
                <>
                  {/* Detail Header */}
                  <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-955/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-md font-black text-neutral-850 dark:text-white">{selectedPlan.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          selectedPlan.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                          selectedPlan.status === 'COMPLETED' ? 'bg-blue-500/10 text-blue-600' :
                          selectedPlan.status === 'REJECTED' ? 'bg-red-500/10 text-red-650' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {selectedPlan.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-455 mt-0.5">{t('submittedBy')} {selectedPlan.creator?.name || 'N/A'} • {selectedPlan.company?.name || ''}</p>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-805 rounded-full text-neutral-450 hover:text-neutral-850 dark:hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Detail Body */}
                  <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Description & Period — card-style */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Description Card */}
                      <div className="md:col-span-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40">
                          <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          </div>
                          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">{t('planDescription')}</span>
                        </div>
                        <div className="px-4 py-4">
                          <p className="text-xs text-neutral-600 dark:text-neutral-350 leading-relaxed">{selectedPlan.description || t('noDescription')}</p>
                        </div>
                      </div>

                      {/* Period & Attachment Card */}
                      <div className="md:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40">
                          <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          </div>
                          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">{t('periodAttachment')}</span>
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

                    {/* Items Budget Table */}
                    {(() => {
                      const showAction = ['APPROVED', 'COMPLETED'].includes(selectedPlan.status);
                      const totalBudget = selectedPlan.items?.reduce((s, i) => s + Number(i.budget_amount || 0), 0) || 0;
                      const totalCommitted = selectedPlan.items?.reduce((s, i) => s + Number(i.committed_amount || 0), 0) || 0;
                      const totalActual = selectedPlan.items?.reduce((s, i) => s + Number(i.actual_amount || 0), 0) || 0;
                      const totalRemaining = totalBudget - totalCommitted - totalActual;
                      const colSpanFull = showAction ? 10 : 9;

                      return (
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-neutral-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                            {t('budgetBreakdown')}
                          </h4>

                          <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="bg-emerald-800 dark:bg-emerald-900 text-white text-[10px] font-black uppercase tracking-wider">
                                    <th className="px-3 py-2.5">{t('colMonth')}</th>
                                    <th className="px-3 py-2.5">CoA Account</th>
                                    <th className="px-3 py-2.5">Brand / LOB</th>
                                    <th className="px-3 py-2.5">Branch</th>
                                    <th className="px-3 py-2.5">Vendor</th>
                                    <th className="px-3 py-2.5 text-right">{t('colBudgetAlloc')}</th>
                                    <th className="px-3 py-2.5 text-right">Committed</th>
                                    <th className="px-3 py-2.5 text-right">{t('colRealized')}</th>
                                    <th className="px-3 py-2.5 text-right">{t('colRemainingBalance')}</th>
                                    {showAction && <th className="px-3 py-2.5 text-center">{t('colAction')}</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium text-neutral-700 dark:text-neutral-300">
                                  {selectedPlan.items?.map((item, idx) => {
                                    const budget = Number(item.budget_amount || 0);
                                    const committed = Number(item.committed_amount || 0);
                                    const actual = Number(item.actual_amount || 0);
                                    const remaining = budget - committed - actual;

                                    return (
                                      <React.Fragment key={item.id || idx}>
                                        <tr className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/5">
                                          <td className="px-3 py-3 font-semibold whitespace-nowrap">{getMonthName(item.period_month, lang)}</td>
                                          <td className="px-3 py-3">
                                            <span className="font-black text-neutral-800 dark:text-white whitespace-nowrap">{item.m_coa?.code}</span>
                                            <p className="text-[10px] text-neutral-400 font-normal mt-0.5">{item.m_coa?.name}</p>
                                          </td>
                                          <td className="px-3 py-3">
                                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">{item.m_brand?.name || '-'}</span>
                                            {item.m_line_business && <p className="text-[10px] text-neutral-400 font-normal mt-0.5">{item.m_line_business?.name}</p>}
                                          </td>
                                          <td className="px-3 py-3">
                                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                                              {item.m_branch?.name ? `${t('branchPrefix')} ${item.m_branch.name}` : 'Global Sales'}
                                            </span>
                                            {item.m_event_location?.name && (
                                              <span className="text-[10px] text-neutral-400 block mt-0.5">
                                                Event: {item.m_event_location.name}
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-3 py-3">
                                            {item.vendors ? (
                                              <span className="inline-flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                                                <Building className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                                                {item.vendors.vendor_name}
                                              </span>
                                            ) : (
                                              <span className="text-neutral-350 dark:text-neutral-600">-</span>
                                            )}
                                          </td>
                                          <td className="px-3 py-3 text-right">
                                            <span className="font-bold text-neutral-850 dark:text-white block whitespace-nowrap">{formatIDR(budget)}</span>
                                            <span className="text-[10px] text-neutral-400 font-normal block mt-0.5 whitespace-nowrap">
                                              {item.qty || 1} × {formatIDR(item.unit_price || budget)}
                                            </span>
                                          </td>
                                          <td className="px-3 py-3 text-right whitespace-nowrap">
                                            {committed > 0
                                              ? <span className="font-bold text-amber-600 dark:text-amber-400">{formatIDR(committed)}</span>
                                              : <span className="text-neutral-300 dark:text-neutral-600">-</span>}
                                          </td>
                                          <td className="px-3 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{formatIDR(actual)}</td>
                                          <td className={`px-3 py-3 text-right font-bold whitespace-nowrap ${remaining < 0 ? 'text-red-500' : remaining < budget * 0.15 ? 'text-amber-500' : 'text-neutral-800 dark:text-white'}`}>
                                            {formatIDR(remaining)}
                                          </td>
                                          {showAction && (
                                            <td className="px-3 py-3 text-center">
                                              {selectedPlan.status === 'APPROVED' && remaining > 0 && (
                                                <button
                                                  onClick={() => { setPaymentRequestItem(item); setIsPaymentModalOpen(true); }}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-black shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                                                >
                                                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                                  Realisasi Biaya
                                                </button>
                                              )}
                                            </td>
                                          )}
                                        </tr>
                                        {item.payment_requests && item.payment_requests.length > 0 && (
                                          <tr className="bg-neutral-50/40 dark:bg-neutral-950/20">
                                            <td colSpan={colSpanFull} className="px-6 py-2.5">
                                              <div className="border-l-2 border-emerald-500 pl-4 py-1 space-y-2">
                                                <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block">
                                                  {t('expenseHistory')} ({item.payment_requests.length})
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                                  {item.payment_requests.map((pr) => (
                                                    <div key={pr.id} className="bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-850 rounded-xl p-2.5 flex items-center justify-between text-[10px] shadow-sm">
                                                      <div className="space-y-0.5">
                                                        <p className="font-bold text-neutral-800 dark:text-white">{pr.title}</p>
                                                        <p className="text-neutral-400 font-medium text-[9px]">{t('byLabel')} {pr.creator?.name || 'N/A'}</p>
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
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t-2 border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950/50">
                                    <td colSpan={5} className="px-3 py-3 font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-xs">Total</td>
                                    <td className="px-3 py-3 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{formatIDR(totalBudget)}</td>
                                    <td className="px-3 py-3 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{totalCommitted > 0 ? formatIDR(totalCommitted) : '-'}</td>
                                    <td className="px-3 py-3 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{formatIDR(totalActual)}</td>
                                    <td className="px-3 py-3 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{formatIDR(totalRemaining)}</td>
                                    {showAction && <td />}
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Amendment Section */}
                    {['APPROVED', 'COMPLETED'].includes(selectedPlan.status) && (
                      <div className="space-y-3">
                        <button
                          onClick={() => setShowAmendmentPanel(p => !p)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl hover:border-amber-300 dark:hover:border-amber-700/40 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <GitMerge className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-black text-neutral-800 dark:text-white uppercase tracking-wider">Amendments / Perubahan Plan</span>
                            {selectedPlan.amendments?.length > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded-full">{selectedPlan.amendments.length}</span>
                            )}
                          </div>
                          {showAmendmentPanel ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                        </button>

                        {showAmendmentPanel && (
                          <div className="space-y-3 px-1">
                            {amendmentMsg && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold px-3 py-2 rounded-xl flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" /> {amendmentMsg}
                              </div>
                            )}

                            {/* Existing amendments list */}
                            {selectedPlan.amendments?.length > 0 ? (
                              <div className="space-y-2">
                                {selectedPlan.amendments.map(am => {
                                  const statusColor = am.status === 'APPROVED' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/70 dark:border-emerald-500/20'
                                    : am.status === 'REJECTED' ? 'text-red-600 bg-red-50 dark:bg-red-500/10 border-red-200/70 dark:border-red-500/20'
                                    : am.status === 'PENDING_REVIEW' ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-200/70 dark:border-amber-500/20'
                                    : 'text-neutral-500 bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800';
                                  return (
                                    <div key={am.id} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-bold text-neutral-800 dark:text-white">{am.title}</p>
                                          <p className="text-[10px] text-neutral-400 mt-0.5">{am.creator?.name} · {new Date(am.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusColor}`}>{am.status.replace('_', ' ')}</span>
                                      </div>
                                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{am.justification}</p>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {am.status === 'DRAFT' && (
                                          <>
                                            <button onClick={() => handleSubmitAmendment(am.id)}
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-[10px] font-bold shadow-sm shadow-emerald-500/25 transition-all cursor-pointer active:scale-95">
                                              <Send className="w-3 h-3" /> Ajukan Review
                                            </button>
                                            <button onClick={() => handleDeleteAmendment(am.id)}
                                              className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent hover:border-red-200/60 transition-all cursor-pointer">
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                        {am.status === 'PENDING_REVIEW' && ['admin', 'manager', 'finance'].includes(userRole) && (
                                          <>
                                            <button onClick={() => handleReviewAmendment(am.id, 'APPROVE')} disabled={reviewingAmendmentId === am.id}
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-[10px] font-bold shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                                              {reviewingAmendmentId === am.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Setujui
                                            </button>
                                            <button onClick={() => handleReviewAmendment(am.id, 'REJECT')} disabled={reviewingAmendmentId === am.id}
                                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200/70 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                                              <X className="w-3 h-3" /> Tolak
                                            </button>
                                          </>
                                        )}
                                        {am.review_comment && (
                                          <p className="w-full text-[10px] text-neutral-400 italic mt-1">"{am.review_comment}"</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : !showAmendmentForm && (
                              <p className="text-[11px] text-neutral-400 text-center py-4">Belum ada amendment untuk plan ini.</p>
                            )}

                            {/* New amendment form */}
                            {showAmendmentForm ? (
                              <div className="border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 space-y-3 bg-amber-50/30 dark:bg-amber-500/5">
                                <h5 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <GitMerge className="w-3.5 h-3.5" /> Buat Amendment Baru
                                </h5>
                                {amendmentError && (
                                  <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-bold px-3 py-2 rounded-lg flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3" /> {amendmentError}
                                  </div>
                                )}
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Judul Amendment</label>
                                  <input type="text" value={amendmentTitle} onChange={e => setAmendmentTitle(e.target.value)} placeholder="cth: Ganti vendor banner, tambah biaya digital ads"
                                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-amber-400 font-semibold" />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Justifikasi / Alasan</label>
                                  <textarea rows={2} value={amendmentJustification} onChange={e => setAmendmentJustification(e.target.value)} placeholder="Jelaskan mengapa perubahan ini diperlukan..."
                                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-amber-400 resize-none font-medium" />
                                </div>

                                {/* Changes list */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Daftar Perubahan</label>
                                    <button onClick={addAmendmentChange} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 text-[9px] font-bold transition-all cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-500/20">
                                      <Plus className="w-3 h-3" /> Tambah Perubahan
                                    </button>
                                  </div>
                                  {amendmentChanges.map((change, idx) => (
                                    <div key={idx} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 space-y-2 bg-white dark:bg-neutral-900">
                                      <div className="flex items-center gap-2">
                                        <select value={change.action} onChange={e => updateAmendmentChange(idx, 'action', e.target.value)}
                                          className="flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-[10px] font-bold text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-amber-400">
                                          <option value="CHANGE_VENDOR">Ganti Vendor</option>
                                          <option value="CHANGE_BUDGET">Ubah Budget</option>
                                          <option value="ADD_ITEM">Tambah Item Baru</option>
                                          <option value="REMOVE_ITEM">Hapus Item</option>
                                        </select>
                                        <button onClick={() => removeAmendmentChange(idx)} className="w-6 h-6 flex items-center justify-center rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer">
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      {change.action !== 'ADD_ITEM' && (
                                        <select value={change.plan_item_id} onChange={e => updateAmendmentChange(idx, 'plan_item_id', e.target.value)}
                                          className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-[10px] font-medium text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-amber-400">
                                          <option value="">— Pilih Item —</option>
                                          {selectedPlan.items?.map(item => (
                                            <option key={item.id} value={item.id}>{item.m_coa?.code} · {item.m_brand?.name || 'Global'} · {getMonthName(item.period_month, lang)} · {formatIDR(item.budget_amount)}</option>
                                          ))}
                                        </select>
                                      )}
                                      {change.action === 'CHANGE_VENDOR' && (
                                        <input type="number" value={change.new_vendor_id} onChange={e => updateAmendmentChange(idx, 'new_vendor_id', e.target.value)}
                                          placeholder="ID Vendor Baru"
                                          className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-[10px] font-medium focus:outline-none focus:border-amber-400" />
                                      )}
                                      {change.action === 'CHANGE_BUDGET' && (
                                        <input type="number" value={change.budget_delta} onChange={e => updateAmendmentChange(idx, 'budget_delta', e.target.value)}
                                          placeholder="Delta budget (positif = tambah, negatif = kurang)"
                                          className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-[10px] font-medium focus:outline-none focus:border-amber-400" />
                                      )}
                                      <input type="text" value={change.change_reason} onChange={e => updateAmendmentChange(idx, 'change_reason', e.target.value)}
                                        placeholder="Alasan spesifik perubahan ini (opsional)"
                                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-[10px] font-medium focus:outline-none focus:border-amber-400" />
                                    </div>
                                  ))}
                                  {amendmentChanges.length === 0 && (
                                    <p className="text-[10px] text-neutral-400 text-center py-2">Klik "Tambah Perubahan" untuk menambahkan item perubahan.</p>
                                  )}
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button onClick={() => { setShowAmendmentForm(false); setAmendmentError(null); setAmendmentChanges([]); }}
                                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer">
                                    Batal
                                  </button>
                                  <button onClick={handleSubmitAmendmentDraft} disabled={submittingAmendment}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold shadow-sm shadow-amber-500/25 transition-all cursor-pointer active:scale-95 disabled:opacity-50">
                                    {submittingAmendment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flag className="w-3 h-3" />} Simpan Draft
                                  </button>
                                </div>
                              </div>
                            ) : (
                              selectedPlan.status === 'APPROVED' && (
                                <button onClick={() => { setShowAmendmentForm(true); setAmendmentError(null); }}
                                  className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-amber-300 dark:border-amber-700/50 rounded-xl text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all cursor-pointer">
                                  <Plus className="w-3.5 h-3.5" /> Request Amendment
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post-Campaign Actuals */}
                    {selectedPlan.status === 'APPROVED' && (
                      <div className="p-5 bg-neutral-50 dark:bg-neutral-950/40 rounded-3xl border border-neutral-200/80 dark:border-neutral-850 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/50 dark:border-neutral-800/80 pb-3">
                          <div>
                            <h4 className="text-xs font-black text-neutral-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                              <BarChart2 className="w-4 h-4 text-indigo-500" />
                              {t('postCampaignActuals')}
                            </h4>
                            {selectedPlan.actuals_filled_at && (
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-550 mt-0.5">
                                · {t('filledOn')} {new Date(selectedPlan.actuals_filled_at).toLocaleDateString(t('dateLocale'), { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>

                        {selectedPlan.actuals_filled_at && (
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 p-4.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-850 rounded-2xl">
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualSales')}</p>
                              <p className="text-xs font-black text-neutral-850 dark:text-white">{selectedPlan.actual_sales != null ? formatIDR(selectedPlan.actual_sales) : '-'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualLeads')}</p>
                              <p className="text-xs font-black text-neutral-850 dark:text-white">{selectedPlan.actual_leads != null ? selectedPlan.actual_leads.toLocaleString('id-ID') : '-'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualReach')}</p>
                              <p className="text-xs font-black text-neutral-850 dark:text-white">{selectedPlan.actual_reach != null ? selectedPlan.actual_reach.toLocaleString('id-ID') : '-'}</p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualImpressions')}</p>
                              <p className="text-xs font-black text-neutral-850 dark:text-white">{selectedPlan.actual_impressions != null ? selectedPlan.actual_impressions.toLocaleString('id-ID') : '-'}</p>
                            </div>
                            <div className="space-y-0.5 col-span-2 md:col-span-1">
                              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('actualROI')}</p>
                              <p className="text-xs font-black text-emerald-600 dark:text-emerald-450">{selectedPlan.actual_roi_pct != null ? `${selectedPlan.actual_roi_pct.toFixed(2)}%` : '-'}</p>
                            </div>
                            {selectedPlan.actual_notes && (
                              <div className="col-span-2 md:col-span-5 border-t border-neutral-100 dark:border-neutral-800/80 pt-3 mt-1.5">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{t('notesInsights')}</p>
                                <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium leading-relaxed mt-1">{selectedPlan.actual_notes}</p>
                              </div>
                            )}
                          </div>
                        )}

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
                                type="number"
                                placeholder="0"
                                value={actualsForm.actual_sales}
                                onChange={(e) => setActualsForm(p => ({ ...p, actual_sales: e.target.value }))}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('actualLeadsLabel')}</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={actualsForm.actual_leads}
                                onChange={(e) => setActualsForm(p => ({ ...p, actual_leads: e.target.value }))}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-255 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('actualReachLabel')}</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={actualsForm.actual_reach}
                                onChange={(e) => setActualsForm(p => ({ ...p, actual_reach: e.target.value }))}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">{t('actualImpressionsLabel')}</label>
                              <input
                                type="number"
                                placeholder="0"
                                value={actualsForm.actual_impressions}
                                onChange={(e) => setActualsForm(p => ({ ...p, actual_impressions: e.target.value }))}
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
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
                                className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
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
                              className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 resize-none font-medium leading-relaxed"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={handleActualsSubmit}
                              disabled={submittingActuals}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                            >
                              {submittingActuals ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart2 className="w-3.5 h-3.5" />}
                              {t('btnSaveActuals')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detail Footer Controls */}
                  <div className="px-6 py-4.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-955/10">
                    <div className="flex items-center gap-2">
                      {selectedPlan.status === 'PENDING_APPROVAL' && (userRole === 'admin' || userRole === 'staff') && (
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

                      {selectedPlan.status === 'APPROVED' && (userRole === 'admin' || userRole === 'marketing') && selectedPlan.actuals_filled_at && (
                        <button
                          type="button"
                          disabled={completing}
                          onClick={handleCompletePlan}
                          className="px-4 py-2 bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                          title="Tutup plan setelah semua payment selesai"
                        >
                          {completing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                          Selesaikan Plan
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 border border-neutral-250 dark:border-neutral-750 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
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
              <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-955/20">
                <div>
                  <h3 className="text-md font-black text-neutral-850 dark:text-white">{t('paymentModalTitle')}</h3>
                  <p className="text-[10px] text-neutral-450 mt-0.5">Item: {paymentRequestItem.m_coa?.code} - {paymentRequestItem.m_coa?.name}</p>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-805 rounded-full text-neutral-450 hover:text-neutral-800 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                {paymentError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold p-3 rounded-xl flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> {paymentError}
                  </div>
                )}

                <div className="bg-neutral-50 dark:bg-neutral-955 p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-850 space-y-1 text-xs">
                  <div className="text-neutral-450 font-bold uppercase text-[9px] tracking-wider">{t('availableBalance')}</div>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {formatIDR(Number(paymentRequestItem.budget_amount) - Number(paymentRequestItem.actual_amount))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-455 uppercase">{t('paymentDescLabel')}</label>
                    <input
                      type="text"
                      placeholder={t('paymentDescPlaceholder')}
                      value={paymentForm.title}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-450 uppercase">{t('paymentAmountLabel')}</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatThousands(paymentForm.amount)}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }))}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-450 uppercase">{t('supportingDocLabel')}</label>
                      <div className="flex gap-2">
                        <div className="relative flex-grow">
                          <input
                            type="text"
                            placeholder={t('docLinkPlaceholder')}
                            value={paymentForm.doc_url || ''}
                            onChange={(e) => setPaymentForm(prev => ({ ...prev, doc_url: e.target.value }))}
                            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
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
                            className={`px-4 py-2 bg-neutral-105 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 text-neutral-750 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-750 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 h-full ${paymentUploading ? 'opacity-50 pointer-events-none' : ''}`}
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
                  <div className="bg-indigo-500/10 border border-indigo-250 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold p-3 rounded-2xl flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {t('legalWarning')}
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase">{t('additionalNotes')}</label>
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
                    className="px-4 py-2 border border-neutral-250 dark:border-neutral-700/60 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                  >
                    {t('btnCancel')}
                  </button>

                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
    </>
  );
}
