'use client';

import React, { useState, useEffect } from 'react';
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
  MapPin
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import SearchableCompanySelect from './SearchableCompanySelect';

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
  metadata = { companies: [], coas: [], brands: [], branches: [] },
  onSuccess,
  onError
}) {
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

  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState(null); // 'draft' | 'submit'
  const [errMessage, setErrMessage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

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
    if (isOpen) {
      setFormData({
        title: '',
        company_id: metadata.companies?.[0]?.id ? String(metadata.companies[0].id) : '',
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
      setErrMessage(null);
    }
  }, [isOpen, metadata]);

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
      ]
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
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-indigo-500/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-neutral-900 dark:text-white text-base flex items-center gap-2">
                      Quick Marketing Campaign
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                        Express Mode
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Input cepat campaign & anggaran sederhana tanpa wizard multi-step.
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
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors font-medium text-xs"
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
                        setFormData((prev) => {
                          let newBrandId = prev.brand_id;
                          if (val && prev.brand_id) {
                            const b = (metadata.brands || []).find((item) => String(item.id) === String(prev.brand_id));
                            if (b && b.company_id && String(b.company_id) !== String(val)) {
                              newBrandId = '';
                            }
                          }
                          return { ...prev, company_id: val, brand_id: newBrandId };
                        });
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
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors text-xs font-semibold"
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
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
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
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
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
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs focus:outline-none focus:border-indigo-500"
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
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
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
                    <select
                      value={formData.brand_id}
                      onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="">Semua / Tidak Spesifik</option>
                      {(metadata.brands || [])
                        .filter((b) => {
                          if (!formData.company_id) return true;
                          return !b.company_id || String(b.company_id) === String(formData.company_id);
                        })
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Cabang (Opsional)
                    </label>
                    <select
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
                    >
                      <option value="">Pusat / Semua Cabang</option>
                      {(metadata.branches || [])
                        .filter((br) => {
                          const matchCompany = !br.company_id || String(br.company_id) === String(formData.company_id);
                          const matchBrand = !br.brand_id || String(br.brand_id) === String(formData.brand_id);
                          return matchCompany && matchBrand;
                        })
                        .map((br) => (
                          <option key={br.id} value={br.id}>
                            {br.name}
                          </option>
                        ))}
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
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
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
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-indigo-500 text-xs"
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
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
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
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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
