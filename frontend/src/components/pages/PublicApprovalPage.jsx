'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  Paperclip,
  ShieldCheck
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

export default function PublicApprovalPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [task, setTask] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState(null);
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState(null);
  const [result, setResult] = useState(null);

  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  const loadTask = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.get(`/api/marketing/magic/${token}`);
      setTask(res.task);
      setRecipientEmail(res.recipientEmail);
    } catch (err) {
      setLoadError(err.message || 'Link approval tidak valid.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawingRef.current = true;
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => { isDrawingRef.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleDecision = async (action) => {
    if (submitting) return;
    setActionError(null);

    if (action === 'REJECT' && !comment.trim()) {
      setActionError('Komentar / alasan penolakan wajib diisi.');
      return;
    }

    let signatureBase64 = null;

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/api/marketing/magic/${token}`, {
        action,
        comment,
        signature: signatureBase64
      });
      setResult({ action, message: res.message });
    } catch (err) {
      setActionError(err.message || 'Gagal memproses persetujuan.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPlan = task ? !!task.marketing_plan_id : false;
  const docTitle = task ? (isPlan ? task.marketing_plan?.title : task.payment_request?.title) : '';
  const docAmount = task ? (isPlan ? task.marketing_plan?.total_budget : task.payment_request?.amount) : 0;
  const companyName = task
    ? (isPlan ? task.marketing_plan?.company?.name : task.payment_request?.marketing_plan_item?.marketing_plan?.company?.name)
    : '';
  const requesterName = task ? (isPlan ? task.marketing_plan?.creator?.name : task.payment_request?.creator?.name) : '';
  const isOverbudget = task && !isPlan && task.payment_request?.status === 'OVERBUDGET_WARN';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl space-y-5">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
            <ShieldCheck className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-900 dark:text-white tracking-tight">GLC Apps - Persetujuan via Email</h1>
            <p className="text-[11px] text-neutral-450">MRA Group · Marketing Budget Approval</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl py-20 flex flex-col items-center justify-center gap-3 shadow-sm">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs text-neutral-400 font-medium">Memuat detail pengajuan...</span>
          </div>
        ) : loadError ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl py-16 px-6 flex flex-col items-center justify-center gap-3 text-center shadow-sm">
            <AlertTriangle className="w-10 h-10 text-red-500" />
            <h3 className="text-sm font-black text-neutral-850 dark:text-white">Link Tidak Bisa Diakses</h3>
            <p className="text-xs text-neutral-450 max-w-sm">{loadError}</p>
          </div>
        ) : result ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl py-16 px-6 flex flex-col items-center justify-center gap-3 text-center shadow-sm"
          >
            {result.action === 'REJECT' ? (
              <XCircle className="w-12 h-12 text-red-500" />
            ) : (
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            )}
            <h3 className="text-sm font-black text-neutral-850 dark:text-white">
              {result.action === 'REJECT' ? 'Pengajuan Ditolak' : 'Persetujuan Berhasil Diproses'}
            </h3>
            <p className="text-xs text-neutral-450 max-w-sm">{result.message}</p>
          </motion.div>
        ) : (
          <>
            {/* Document Detail Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/20 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-850 dark:text-white">Detail Pengajuan</h3>
                  <p className="text-[10px] text-neutral-450 mt-0.5">
                    Modul: {isPlan ? 'Marketing Plan' : 'Payment Request'} · Step {task.step_number} Approval
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-500/10 text-indigo-600 border border-indigo-200">
                  Untuk: {recipientEmail}
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-bold text-neutral-700 dark:text-neutral-350">
                  <div>Judul: <span className="font-normal text-neutral-900 dark:text-white">{docTitle}</span></div>
                  <div>PT / Entitas: <span className="font-normal text-neutral-900 dark:text-white">{companyName || '-'}</span></div>
                  <div>Diajukan Oleh: <span className="font-normal text-neutral-900 dark:text-white">{requesterName || '-'}</span></div>
                  {isPlan && (
                    <>
                      <div>Tahun Fiskal: <span className="font-normal text-neutral-900 dark:text-white">{task.marketing_plan.fiscal_year}</span></div>
                      {task.marketing_plan.doc_url && (
                        <div>
                          Proposal: 
                          <a href={task.marketing_plan.doc_url} target="_blank" rel="noreferrer" className="ml-1 text-indigo-500 font-bold hover:underline inline-flex items-center gap-1">
                            <Paperclip className="w-3.5 h-3.5" /> Lihat Proposal
                          </a>
                        </div>
                      )}
                    </>
                  )}
                  {!isPlan && task.payment_request.doc_url && (
                    <div>
                      Lampiran:
                      <a href={task.payment_request.doc_url} target="_blank" rel="noreferrer" className="ml-1 text-indigo-500 font-bold hover:underline inline-flex items-center gap-1">
                        <Paperclip className="w-3.5 h-3.5" /> Lihat Dokumen
                      </a>
                    </div>
                  )}
                  <div className="sm:col-span-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <span>Nilai Pengajuan:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 text-base font-black">{formatIDR(docAmount)}</span>
                  </div>
                </div>

                {isOverbudget && (
                  <div className="bg-red-500/10 border border-red-300 text-red-700 dark:text-red-400 text-xs font-bold p-4 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>PERINGATAN OVERBUDGET</span>
                    </div>
                    <p className="font-normal text-[11px] leading-relaxed text-red-650 dark:text-red-350">
                      Realisasi biaya ini melampaui sisa anggaran bulanan pos terkait dan membutuhkan persetujuan level akhir.
                    </p>
                  </div>
                )}

                {isPlan && task.marketing_plan.items?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-bold text-neutral-450 uppercase">Rincian Anggaran</h5>
                    <div className="border border-neutral-200 dark:border-neutral-850 rounded-2xl overflow-hidden text-xs max-h-48 overflow-y-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-850 text-neutral-400 font-bold uppercase">
                            <th className="px-3 py-2">CoA</th>
                            <th className="px-3 py-2">Vendor</th>
                            <th className="px-3 py-2 text-right">Budget</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-150 dark:divide-neutral-850 text-neutral-700 dark:text-neutral-300 font-medium">
                          {task.marketing_plan.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-3 py-2">{item.m_coa?.code} - {item.m_coa?.name}</td>
                              <td className="px-3 py-2">{item.vendors?.vendor_name || '-'}</td>
                              <td className="px-3 py-2 text-right font-bold">{formatIDR(item.budget_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Decision Form */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm p-6 space-y-6">
              {actionError && (
                <div className="bg-red-500/10 border border-red-200 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> {actionError}
                </div>
              )}              <div className="space-y-2">
                <label className="text-[10px] font-bold text-neutral-450 uppercase flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-500" /> Komentar / Catatan
                </label>
                <textarea
                  rows="4"
                  placeholder="Komentar opsional untuk persetujuan, atau wajib diisi jika menolak (REJECT)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-3.5 py-3 text-xs text-neutral-850 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => handleDecision('REJECT')}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/10 cursor-pointer disabled:opacity-50"
                >
                  Tolak (Reject)
                </button>
                <button
                  onClick={() => handleDecision('APPROVE')}
                  disabled={submitting}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Setujui (Approve)
                </button>
              </div>
            </div>
          </>
        )}

        <p className="text-center text-[10px] text-neutral-400 pt-2">
          Link approval ini bersifat rahasia, sekali pakai, dan kedaluwarsa otomatis. Jangan diteruskan ke pihak lain.
        </p>
      </div>
    </div>
  );
}
