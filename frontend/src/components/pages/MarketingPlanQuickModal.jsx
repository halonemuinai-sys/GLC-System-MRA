'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Zap,
  Check,
  Loader2,
  Calendar,
  DollarSign,
  Building2,
  Layers,
  Paperclip,
  FileText,
  AlertTriangle,
  Tag,
  MapPin,
  Users,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Mail,
  RotateCcw,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';
import SearchableCompanySelect from './SearchableCompanySelect';
import SearchableBrandSelect from './SearchableBrandSelect';
import { isLateSubmission } from '@/lib/marketingGovernance';

const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i));
const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

const formatThousands = (value) => {
  if (value === undefined || value === null) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function MarketingPlanQuickModal({
  isOpen,
  onClose,
  metadata = { companies: [], coas: [], brands: [], branches: [], users: [], defaultApproverContacts: [] },
  onSuccess,
  onError
}) {
  const prevIsOpenRef = useRef(false);
  const contentRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    company_id: '',
    fiscal_year: String(CURRENT_YEAR),
    start_date: '',
    end_date: '',
    total_budget: '',
    coa_id: '',
    brand_id: '',
    branch_id: '',
    description: '',
    doc_url: '',
    late_submission_reason: ''
  });

  const [approvers, setApprovers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState(null); // 'draft' | 'submit'
  const [errMessage, setErrMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [multiDay, setMultiDay] = useState(false);
  const [approverEditorOpen, setApproverEditorOpen] = useState(false);

  useEffect(() => {
    if (errMessage) contentRef.current?.scrollTo({ top: 0 });
  }, [errMessage]);

  // Helper to load default recommended approvers for a given company.
  // Resolusi tingkat kontak sama seperti backend: PT spesifik > Holding Group > Global.
  const getDefaultApproversForCompany = useCallback((companyId) => {
    if (metadata.defaultApproverContacts && metadata.defaultApproverContacts.length > 0) {
      const selectedCompany = (metadata.companies || []).find(c => String(c.id) === String(companyId));
      const masterId = selectedCompany?.m_company_master?.id || selectedCompany?.company_master_id;
      const allContacts = metadata.defaultApproverContacts;

      const roles = [...new Set(allContacts.map(c => c.role))];
      const contacts = roles.map(role => {
        const ptMatch = allContacts.find(c => c.role === role && c.company_id && String(c.company_id) === String(companyId));
        if (ptMatch) return ptMatch;
        const holdingMatch = allContacts.find(c => c.role === role && !c.company_id && masterId && c.company_master_id === masterId);
        if (holdingMatch) return holdingMatch;
        return allContacts.find(c => c.role === role && !c.company_id && !c.company_master_id) || null;
      }).filter(Boolean);

      if (contacts.length > 0) {
        return contacts.map((c, idx) => ({
          step_number: idx + 1,
          approver_name: c.signer?.name || c.label || '',
          approver_email: c.signer?.email || c.email || '',
          approver_role: c.label || c.role?.replace(/_/g, ' ') || 'Approver'
        }));
      }
    }

    return [
      { step_number: 1, approver_name: '', approver_email: '', approver_role: 'Marketing Manager' },
      { step_number: 2, approver_name: '', approver_email: '', approver_role: 'General Manager' },
      { step_number: 3, approver_name: '', approver_email: '', approver_role: 'Finance Controller' }
    ];
  }, [metadata.defaultApproverContacts, metadata.companies]);

  const handleAddApprover = () => {
    setApprovers(prev => [
      ...prev,
      {
        step_number: prev.length + 1,
        approver_name: '',
        approver_email: '',
        approver_role: ''
      }
    ]);
  };

  const handleRemoveApprover = (index) => {
    if (approvers.length <= 1) return;
    setApprovers(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((item, i) => ({ ...item, step_number: i + 1 }));
    });
  };

  const handleUpdateApprover = (index, field, value) => {
    setApprovers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleMoveApprover = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= approvers.length) return;
    setApprovers(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((item, i) => ({ ...item, step_number: i + 1 }));
    });
  };

  const handleApproverUserSelect = (index, val) => {
    const matched = (metadata.signers || []).find(s => s.name === val);
    if (matched) {
      setApprovers(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          approver_name: matched.name,
          approver_email: matched.email || updated[index].approver_email,
          approver_role: matched.position || updated[index].approver_role
        };
        return updated;
      });
    } else {
      handleUpdateApprover(index, 'approver_name', val);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 10 MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'marketing');

      const data = await apiClient.postForm('/api/marketing/upload', formDataUpload);
      if (!data.url) throw new Error('The upload did not return a document link.');
      setFormData(prev => ({ ...prev, doc_url: data.url }));
    } catch (err) {
      setUploadError(err.message || 'Failed to upload the file.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpening) {
      const initCompanyId = metadata.companies?.[0]?.id ? String(metadata.companies[0].id) : '';
      setFormData({
        title: '',
        company_id: initCompanyId,
        fiscal_year: String(CURRENT_YEAR),
        start_date: localToday(),
        end_date: localToday(),
        total_budget: '',
        coa_id: metadata.coas?.length === 1 ? String(metadata.coas[0].id) : '',
        brand_id: '',
        branch_id: '',
        description: '',
        doc_url: '',
        late_submission_reason: ''
      });
      setApprovers(getDefaultApproversForCompany(initCompanyId));
      setMultiDay(false);
      setApproverEditorOpen(false);
      setUploadError(null);
      setErrMessage(null);
    }
  }, [isOpen, metadata.companies, metadata.coas, metadata.brands, metadata.defaultApproverContacts, metadata.signers, getDefaultApproversForCompany]);

  if (!isOpen) return null;

  const handleSubmit = async (saveAsDraft = true) => {
    if (submitting || uploading) return;
    setErrMessage(null);
    if (!formData.title.trim()) {
      setErrMessage('Campaign title is required.');
      return;
    }
    if (!formData.company_id) {
      setErrMessage('Select a company (PT).');
      return;
    }
    if (!Number.isSafeInteger(Number(formData.total_budget)) || Number(formData.total_budget) <= 0) {
      setErrMessage('Total budget must be greater than 0.');
      return;
    }
    if (!formData.coa_id) {
      setErrMessage('Select a budget category / COA.');
      return;
    }
    if (!formData.start_date || !formData.end_date || !Number.isFinite(Date.parse(formData.start_date)) || !Number.isFinite(Date.parse(formData.end_date))) {
      setErrMessage('Activity date is required.');
      return;
    }
    if (formData.end_date < formData.start_date) {
      setErrMessage('End date cannot be before the start date.');
      return;
    }
    if (Number(formData.start_date.slice(0, 4)) !== Number(formData.fiscal_year)) {
      setErrMessage('Budget year must match the activity start date.');
      return;
    }

    if (!saveAsDraft && isLateSubmission(formData.start_date) && !formData.late_submission_reason.trim()) {
      setErrMessage('The event is less than 3 months away (H-3 rule). Enter a late-submission reason.');
      return;
    }

    // Validate DocHub sequential signers if submitting for approval
    if (!saveAsDraft) {
      const validApprovers = approvers.filter(a => a.approver_name?.trim() && a.approver_email?.trim());
      if (validApprovers.length === 0) {
        setApproverEditorOpen(true);
        setErrMessage('At least one signer (approver) is required to submit for approval.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (let i = 0; i < approvers.length; i++) {
        const app = approvers[i];
        if (!app.approver_name?.trim()) {
          setApproverEditorOpen(true);
          setErrMessage(`Signer name in step ${i + 1} is empty.`);
          return;
        }
        if (!app.approver_email?.trim() || !emailRegex.test(app.approver_email.trim())) {
          setApproverEditorOpen(true);
          setErrMessage(`Signer email in step ${i + 1} ("${app.approver_name || ''}") is invalid.`);
          return;
        }
      }
    }

    const startMonth = Number(formData.start_date.slice(5, 7));

    const budgetVal = parseFloat(formData.total_budget);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      company_id: parseInt(formData.company_id, 10),
      fiscal_year: parseInt(formData.fiscal_year, 10),
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      event_start_date: formData.start_date || null,
      event_end_date: formData.end_date || null,
      doc_url: formData.doc_url.trim() || null,
      late_submission_reason: formData.late_submission_reason.trim() || null,
      save_as_draft: saveAsDraft,
      items: [
        {
          coa_id: parseInt(formData.coa_id, 10),
          brand_id: formData.brand_id ? parseInt(formData.brand_id, 10) : null,
          branch_id: formData.branch_id ? parseInt(formData.branch_id, 10) : null,
          period_month: startMonth,
          budget_amount: budgetVal,
          qty: 1,
          unit_price: budgetVal,
          description: formData.description.trim() || formData.title.trim()
        }
      ],
      approvers: approvers.map((a, i) => ({
        step_number: i + 1,
        approver_name: String(a.approver_name || '').trim(),
        approver_email: String(a.approver_email || '').trim(),
        approver_role: a.approver_role ? String(a.approver_role).trim() : null
      }))
    };

    try {
      setSubmitting(true);
      setSubmitMode(saveAsDraft ? 'draft' : 'submit');
      const res = await apiClient.post('/api/marketing/plans', payload);
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err) {
      const msg = err.message || 'Failed to save the quick campaign.';
      setErrMessage(msg);
      if (onError) onError(msg);
    } finally {
      setSubmitting(false);
      setSubmitMode(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!submitting && !uploading) onClose(); }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-campaign-title"
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[94dvh]"
            >
              {/* Header Modal */}
              <div className="shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-blue-950 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="quick-campaign-title" className="font-semibold text-white text-base flex flex-wrap items-center gap-2">
                      Quick Marketing Campaign
                      <span className="text-[9px] bg-white/10 text-blue-200 font-medium px-2 py-0.5 rounded-md border border-white/10">
                        1 budget line
                      </span>
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Fill in the need and amount, then submit.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  disabled={submitting || uploading}
                  aria-label="Close quick campaign"
                  className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <fieldset ref={contentRef} disabled={submitting || uploading} className={`min-h-0 min-w-0 p-5 space-y-4 overflow-y-auto flex-1 text-xs ${submitting || uploading ? 'pointer-events-none opacity-70' : ''}`}>
                {errMessage && (
                  <div role="alert" className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-600 dark:text-rose-400 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <InlineHelp summary="For simple needs, without the wizard." label="Kapan menggunakan Quick Campaign?">
                    Best for a single cost category, e.g. printing brochures for Rp5 million or another small campaign need. There is no special amount limit. The budget is recorded in the month the activity starts. For several categories or monthly allocations, use Create Marketing Plan. Approval and submission rules still apply.
                  </InlineHelp>
                </div>
                {/* Judul Campaign */}
                <div>
                  <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                    Judul Campaign / Event *
                  </label>
                  <input
                    type="text"
                    aria-label="Activity name"
                    required
                    placeholder="Contoh: Cetak brosur promo toko"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors font-medium text-xs"
                  />
                </div>

                {/* Perusahaan & Tahun Fiskal */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Perusahaan (PT) *
                    </label>
                    <SearchableCompanySelect
                      companies={metadata.companies || []}
                      value={formData.company_id}
                      onChange={(val) => {
                        const strVal = String(val);
                        setFormData((prev) => {
                          let newBrandId = prev.brand_id;
                          if (strVal && prev.brand_id) {
                            const b = (metadata.brands || []).find((item) => String(item.id) === String(prev.brand_id));
                            if (b && b.company_id && String(b.company_id) !== strVal) {
                              newBrandId = '';
                            }
                          }
                          return { ...prev, company_id: strVal, brand_id: newBrandId, branch_id: '' };
                        });
                        setApprovers(getDefaultApproversForCompany(strVal));
                      }}
                      placeholder="Select company..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Fiscal Year *
                    </label>
                    <select
                      aria-label="Budget year"
                      value={formData.fiscal_year}
                      onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors text-xs font-semibold"
                    >
                      {FISCAL_YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Periode Campaign */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      {multiDay ? 'Start date *' : 'Activity date *'}
                    </label>
                    <input
                      type="date"
                      aria-label={multiDay ? 'Start date' : 'Activity date'}
                      value={formData.start_date}
                      onChange={(e) => {
                        const date = e.target.value;
                        setFormData(prev => ({ ...prev, start_date: date, end_date: !multiDay || prev.end_date < date ? date : prev.end_date, fiscal_year: date ? date.slice(0, 4) : prev.fiscal_year }));
                      }}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                    />
                  </div>
                  {multiDay ? <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      End Date *
                    </label>
                    <input
                      type="date"
                      aria-label="End date"
                      min={formData.start_date}
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                    />
                  </div> : <label className="flex items-center gap-2 self-end rounded-xl border border-dashed border-slate-200 px-3 py-2.5 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400 cursor-pointer"><input type="checkbox" checked={multiDay} onChange={() => setMultiDay(true)} className="accent-blue-600" />Multi-day activity</label>}
                </div>
                {multiDay && <button type="button" onClick={() => { setMultiDay(false); setFormData(prev => ({ ...prev, end_date: prev.start_date })); }} className="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400">Make it one day</button>}

                {isLateSubmission(formData.start_date) && (
                  <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 space-y-2">
                    <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <InlineHelp summary="Add a reason for submitting close to the activity date." label="Submission timing rule">
                        Requests made less than 3 months before the activity are flagged as Late Submission. A reason is required when submitting and can be added later if saved as a draft.
                      </InlineHelp>
                    </div>
                    <textarea
                      rows={1}
                      aria-label="Reason for submitting close to the activity date"
                      value={formData.late_submission_reason}
                      onChange={(e) => setFormData({ ...formData, late_submission_reason: e.target.value })}
                      placeholder="e.g. Additional promo need from the store"
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-rose-500 text-xs resize-none"
                    />
                  </div>
                )}

                {/* Total Budget & COA Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Total Budget (IDR) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label="Total budget in rupiah"
                        required
                        placeholder="5.000.000"
                        value={formatThousands(formData.total_budget)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, total_budget: raw });
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-blue-600 dark:text-blue-400 font-bold text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {[1000000, 3000000, 5000000].map(amount => <button key={amount} type="button" onClick={() => setFormData(prev => ({ ...prev, total_budget: String(amount) }))} aria-pressed={Number(formData.total_budget) === amount} className={`rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors ${Number(formData.total_budget) === amount ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'}`}>Rp{amount / 1000000} juta</button>)}
                      <span className="text-[10px] text-slate-400">or type an amount</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Budget Category / COA *
                    </label>
                    <select
                      aria-label="Cost category or COA"
                      value={formData.coa_id}
                      onChange={(e) => setFormData({ ...formData, coa_id: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                    >
                      <option value="">-- Select COA --</option>
                      {(metadata.coas || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code ? `${c.code} - ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-[10px] text-slate-400">{formData.start_date ? `Allocated to ${new Date(`${formData.start_date}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} · 1 cost line` : 'Pick a date to set the allocation month.'}</p>
                  </div>
                </div>

                <details className="group rounded-2xl border border-slate-200 dark:border-slate-800">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2"><Paperclip className="h-3.5 w-3.5 text-slate-400" />Detail tambahan <span className="text-[10px] font-normal text-slate-400">Opsional</span></span><ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" /></summary>
                  <div className="space-y-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                {/* Brand & Cabang Optional */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Brand (Opsional)
                    </label>
                    <SearchableBrandSelect
                      brands={metadata.brands || []}
                      value={formData.brand_id}
                      onChange={(val) => setFormData({ ...formData, brand_id: val, branch_id: '' })}
                      selectedCompanyId={formData.company_id}
                      onBrandCreated={(newBrand) => {
                        if (metadata.brands && !metadata.brands.some(b => b.id === newBrand.id)) {
                          metadata.brands.push(newBrand);
                        }
                      }}
                      placeholder="All / Not specific"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Target / Impacted Branch (Opsional)
                    </label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs font-medium"
                    >
                      <option value="">Global Sales (All Branches)</option>
                      {(() => {
                        const allBranches = metadata.branches || [];
                        let list = allBranches.filter((br) => {
                          if (formData.company_id && br.company_id) {
                            if (String(br.company_id) !== String(formData.company_id)) return false;
                          }
                          if (formData.brand_id && br.brand_id) {
                            if (String(br.brand_id) !== String(formData.brand_id)) return false;
                          }
                          return true;
                        });

                        return list.map((br) => (
                          <option key={br.id} value={br.id}>
                            {br.name}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                {/* Catatan / Deskripsi */}
                <div>
                  <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                    Notes / Short Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Rincian singkat kebutuhan..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                  />
                </div>

                {/* Link Proposal / Dokumen & Upload */}
                <div>
                  <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                    Proposal / Supporting Document (Upload or Link)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... or upload a file"
                        value={formData.doc_url}
                        onChange={(e) => setFormData({ ...formData, doc_url: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                      />
                    </div>
                    <input
                      type="file"
                      id="quick-proposal-file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    />
                    <label
                      htmlFor="quick-proposal-file-upload"
                      className={`px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                        </>
                      )}
                    </label>
                  </div>
                  {uploadError && (
                    <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {uploadError}
                    </p>
                  )}
                </div>

                  </div>
                </details>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200"><Users className="h-4 w-4 text-blue-500" />Alur approval</span><button type="button" aria-expanded={approverEditorOpen} aria-controls="quick-approver-editor" onClick={() => setApproverEditorOpen(prev => !prev)} className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400">{approverEditorOpen ? 'Close settings' : 'View / edit'}</button></div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {approvers.map((approver, index) => <React.Fragment key={index}>{index > 0 && <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />}<span title={`${approver.approver_role || 'Approver'} · ${approver.approver_email || 'Email not set'}`} className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] ${approver.approver_name && approver.approver_email ? 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-400'}`}><span className="text-slate-400">{index + 1}.</span>{approver.approver_name || approver.approver_role || 'Lengkapi approver'}</span></React.Fragment>)}
                  </div>
                  {approvers.some(approver => !approver.approver_name || !approver.approver_email) && <button type="button" onClick={() => setApproverEditorOpen(true)} className="mt-2 text-[10px] font-medium text-amber-600 hover:underline dark:text-amber-400">Complete the approvers before submitting</button>}
                </div>

                <div id="quick-approver-editor" hidden={!approverEditorOpen}>
                {/* Alur Persetujuan Dokumen (DocHub Workflow) */}
                <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-200/60 dark:border-neutral-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                          Tujuan Approval / Penandatangan
                          <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/30">
                            Berurutan
                          </span>
                        </h4>
                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500"><InlineHelp summary="Approvals follow the order below." label="How approval works">The request is emailed to the first approver. Once approved, the system forwards it to the next approver.</InlineHelp></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setApprovers(getDefaultApproversForCompany(formData.company_id))}
                        className="px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-[10px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center gap-1 cursor-pointer"
                        title="Reload the system's recommended signers for this company"
                      >
                        <RotateCcw className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                        <span>Rekomendasi PT</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddApprover}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/15"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* List of Approvers */}
                  <div className="space-y-2.5">
                    {approvers.map((app, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2.5"
                      >
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-black flex items-center justify-center shadow-sm shadow-blue-500/20">
                            {idx + 1}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveApprover(idx, -1)}
                              className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === approvers.length - 1}
                              onClick={() => handleMoveApprover(idx, 1)}
                              className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">
                              Nama Penandatangan *
                            </label>
                            <input
                              type="text"
                              list={`quick-users-datalist-${idx}`}
                              value={app.approver_name}
                              onChange={(e) => handleApproverUserSelect(idx, e.target.value)}
                              placeholder="Select / type a name"
                              required
                              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                            />
                            <datalist id={`quick-users-datalist-${idx}`}>
                              {(metadata.signers || []).map(s => (
                                <option key={s.id} value={s.name}>
                                  {s.position ? `${s.position} · ${s.email}` : s.email}
                                </option>
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">
                              Email *
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
                              <input
                                type="email"
                                value={app.approver_email}
                                onChange={(e) => handleUpdateApprover(idx, 'approver_email', e.target.value)}
                                placeholder="approver@email.com"
                                required
                                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <div className="flex-1">
                              <label className="text-[8.5px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">
                                Role / Jabatan
                              </label>
                              <input
                                type="text"
                                value={app.approver_role || ''}
                                onChange={(e) => handleUpdateApprover(idx, 'approver_role', e.target.value)}
                                placeholder="e.g. Marketing Manager"
                                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                              />
                            </div>
                            {approvers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveApprover(idx)}
                                className="mt-3.5 p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                                title="Remove signer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              </fieldset>

              {/* Modal Footer Actions */}
              <div className="shrink-0 p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex flex-wrap items-center justify-between gap-3">
                <div><p className="text-[10px] text-slate-400">Request total · 1 line</p><p className="mt-0.5 text-base font-semibold tabular-nums text-slate-900 dark:text-white">{formatIDR(formData.total_budget || 0)}</p></div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting || uploading}
                    onClick={() => handleSubmit(true)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && submitMode === 'draft' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    Save Draft
                  </button>

                  <button
                    type="button"
                    disabled={submitting || uploading}
                    onClick={() => handleSubmit(false)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && submitMode === 'submit' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Submit Campaign
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
