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
  RotateCcw
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import SearchableCompanySelect from './SearchableCompanySelect';
import SearchableBrandSelect from './SearchableBrandSelect';

const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i));

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
    doc_url: ''
  });

  const [approvers, setApprovers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState(null); // 'draft' | 'submit'
  const [errMessage, setErrMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Helper to load default recommended approvers for a given company
  const getDefaultApproversForCompany = useCallback((companyId) => {
    if (metadata.defaultApproverContacts && metadata.defaultApproverContacts.length > 0) {
      const selectedCompany = (metadata.companies || []).find(c => String(c.id) === String(companyId));
      const masterId = selectedCompany?.m_company_master?.id || selectedCompany?.company_master_id;

      let contacts = metadata.defaultApproverContacts;
      if (masterId) {
        const matching = contacts.filter(c => c.company_master_id === masterId);
        if (matching.length > 0) contacts = matching;
        else contacts = contacts.filter(c => !c.company_master_id);
      } else {
        contacts = contacts.filter(c => !c.company_master_id);
      }

      if (contacts.length > 0) {
        return contacts.map((c, idx) => {
          const email = c.email || c.contact_email || '';
          const matchedUser = (metadata.users || []).find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
          return {
            step_number: idx + 1,
            approver_name: matchedUser ? matchedUser.full_name : (c.contact_name || c.label || ''),
            approver_email: email,
            approver_role: c.label || c.role?.replace(/_/g, ' ') || 'Approver'
          };
        });
      }
    }

    return [
      { step_number: 1, approver_name: '', approver_email: '', approver_role: 'Marketing Manager' },
      { step_number: 2, approver_name: '', approver_email: '', approver_role: 'General Manager' },
      { step_number: 3, approver_name: '', approver_email: '', approver_role: 'Finance Controller' }
    ];
  }, [metadata.defaultApproverContacts, metadata.companies, metadata.users]);

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
    const matched = (metadata.users || []).find(u => u.full_name === val);
    if (matched) {
      setApprovers(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          approver_name: matched.full_name,
          approver_email: matched.email || updated[index].approver_email,
          approver_role: matched.position || matched.department || matched.role || updated[index].approver_role
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

    setUploading(true);
    setUploadError(null);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('folder', 'marketing');

      const token = Cookies.get('glc_mra_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:5005';
      const res = await fetch(`${apiBase}/api/marketing/upload`, {
        method: 'POST',
        headers,
        body: formDataUpload
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengunggah file.');
      }

      const data = await res.json();
      setFormData(prev => ({ ...prev, doc_url: data.url }));
    } catch (err) {
      setUploadError(err.message || 'Gagal mengunggah file.');
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
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        total_budget: '',
        coa_id: metadata.coas?.[0]?.id ? String(metadata.coas[0].id) : '',
        brand_id: metadata.brands?.[0]?.id ? String(metadata.brands[0].id) : '',
        branch_id: '',
        description: '',
        doc_url: ''
      });
      setApprovers(getDefaultApproversForCompany(initCompanyId));
      setErrMessage(null);
    }
  }, [isOpen, metadata.companies, metadata.coas, metadata.brands, metadata.defaultApproverContacts, metadata.users, getDefaultApproversForCompany]);

  if (!isOpen) return null;

  const handleSubmit = async (saveAsDraft = true) => {
    setErrMessage(null);
    if (!formData.title.trim()) {
      setErrMessage('Judul campaign wajib diisi.');
      return;
    }
    if (!formData.company_id) {
      setErrMessage('Pilih Perusahaan (PT).');
      return;
    }
    if (!formData.total_budget || parseFloat(formData.total_budget) <= 0) {
      setErrMessage('Total anggaran harus lebih dari 0.');
      return;
    }
    if (!formData.coa_id) {
      setErrMessage('Pilih Kategori Anggaran / COA.');
      return;
    }

    // Validate DocHub sequential signers if submitting for approval
    if (!saveAsDraft) {
      const validApprovers = approvers.filter(a => a.approver_name?.trim() && a.approver_email?.trim());
      if (validApprovers.length === 0) {
        setErrMessage('Minimal 1 penandatangan (approver) wajib ditentukan untuk mengajukan approval.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (let i = 0; i < approvers.length; i++) {
        const app = approvers[i];
        if (!app.approver_name?.trim()) {
          setErrMessage(`Nama penandatangan pada Step ${i + 1} belum diisi.`);
          return;
        }
        if (!app.approver_email?.trim() || !emailRegex.test(app.approver_email.trim())) {
          setErrMessage(`Email penandatangan pada Step ${i + 1} ("${app.approver_name || ''}") tidak valid.`);
          return;
        }
      }
    }

    const startMonth = formData.start_date
      ? new Date(formData.start_date).getMonth() + 1
      : new Date().getMonth() + 1;

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
      const msg = err.message || 'Gagal menyimpan Quick Campaign.';
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
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
          />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-neutral-900 dark:text-white text-base flex items-center gap-2">
                      Quick Marketing Campaign
                      <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                        Express Mode
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Input cepat campaign & anggaran sederhana dengan alur persetujuan terintegrasi.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
                {errMessage && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl text-rose-600 dark:text-rose-400 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{errMessage}</span>
                  </div>
                )}

                {/* Judul Campaign */}
                <div>
                  <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                    Judul Campaign / Event *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cetak Brosur & Spanduk Promo Toko"
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
                          return { ...prev, company_id: strVal, brand_id: newBrandId };
                        });
                        setApprovers(getDefaultApproversForCompany(strVal));
                      }}
                      placeholder="Pilih Perusahaan..."
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Tahun Fiskal *
                    </label>
                    <select
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Tanggal Mulai *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Tanggal Selesai *
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                    />
                  </div>
                </div>

                {/* Total Budget & COA Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Total Anggaran (IDR) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs">
                        Rp
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="0"
                        value={formatThousands(formData.total_budget)}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/\D/g, '');
                          setFormData({ ...formData, total_budget: raw });
                        }}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-blue-600 dark:text-blue-400 font-bold text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Kategori Anggaran / COA *
                    </label>
                    <select
                      value={formData.coa_id}
                      onChange={(e) => setFormData({ ...formData, coa_id: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                    >
                      <option value="">-- Pilih COA --</option>
                      {(metadata.coas || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code ? `${c.code} - ${c.name}` : c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Brand & Cabang Optional */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Brand (Opsional)
                    </label>
                    <SearchableBrandSelect
                      brands={metadata.brands || []}
                      value={formData.brand_id}
                      onChange={(val) => setFormData({ ...formData, brand_id: val })}
                      selectedCompanyId={formData.company_id}
                      onBrandCreated={(newBrand) => {
                        if (metadata.brands && !metadata.brands.some(b => b.id === newBrand.id)) {
                          metadata.brands.push(newBrand);
                        }
                      }}
                      placeholder="Semua / Tidak Spesifik"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Target / Impacted Branch (Opsional)
                    </label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs font-medium"
                    >
                      <option value="">Global Sales (Semua Cabang)</option>
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

                        if (list.length === 0 && allBranches.length > 0) {
                          list = allBranches;
                        }

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
                    Catatan / Deskripsi Singkat
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Rincian singkat kebutuhan..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-xs"
                  />
                </div>

                {/* Link Proposal / Dokumen & Upload */}
                <div>
                  <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                    Proposal / Dokumen Pendukung (Upload atau Link)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Paperclip className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                      <input
                        type="url"
                        placeholder="https://drive.google.com/... atau upload file"
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

                {/* Alur Persetujuan Dokumen (DocHub Workflow) */}
                <div className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-200/60 dark:border-neutral-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-850 dark:text-white flex items-center gap-1.5">
                          Tujuan Approval / Penandatangan
                          <span className="px-1.5 py-0.5 rounded-full text-[8.5px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/30">
                            Berurutan
                          </span>
                        </h4>
                        <p className="text-[10px] text-neutral-450 dark:text-neutral-500">
                          Proposal dikirim berjenjang ke penandatangan di bawah via Magic Link email
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setApprovers(getDefaultApproversForCompany(formData.company_id))}
                        className="px-2.5 py-1 rounded-lg border border-neutral-250 dark:border-neutral-750 text-neutral-650 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-[10px] font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center gap-1 cursor-pointer"
                        title="Muat ulang penandatangan rekomendasi sistem untuk PT ini"
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
                        <span>Tambah</span>
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
                              title="Pindah ke atas"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === approvers.length - 1}
                              onClick={() => handleMoveApprover(idx, 1)}
                              className="p-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Pindah ke bawah"
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
                              placeholder="Pilih / ketik nama"
                              required
                              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                            />
                            <datalist id={`quick-users-datalist-${idx}`}>
                              {(metadata.users || []).map(u => (
                                <option key={u.id} value={u.full_name}>
                                  {u.position ? `${u.position} · ${u.email}` : u.email}
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
                                title="Hapus Penandatangan"
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

              {/* Modal Footer Actions */}
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit(true)}
                    className="px-4 py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && submitMode === 'draft' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    Simpan Draft
                  </button>

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit(false)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitting && submitMode === 'submit' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Kirim Approval
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
