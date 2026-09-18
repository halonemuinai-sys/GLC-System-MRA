'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  User,
  Loader2,
  Calendar
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MarketingBudgetShiftHistoryModal({
  isOpen,
  onClose,
  shifts,
  onDecisionSuccess
}) {
  const [selectedShift, setSelectedShift] = useState(null);
  const [decisionAction, setDecisionAction] = useState(null); // 'APPROVE' | 'REJECT'
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOpenDecision = (shift, action) => {
    setSelectedShift(shift);
    setDecisionAction(action);
    setComment('');
    setError(null);
  };

  const handleCloseDecision = () => {
    setSelectedShift(null);
    setDecisionAction(null);
    setComment('');
    setError(null);
  };

  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!selectedShift || !decisionAction) return;

    try {
      setSubmitting(true);
      setError(null);
      await apiClient.post(`/api/marketing/budgets/shifts/${selectedShift.id}/decision`, {
        action: decisionAction,
        comment: comment.trim()
      });

      handleCloseDecision();
      if (onDecisionSuccess) onDecisionSuccess();
    } catch (err) {
      setError(err.message || `Gagal memproses ${decisionAction.toLowerCase()}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-4xl max-h-[85vh] bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden z-10"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-neutral-900 dark:text-white">
                    Riwayat & Otorisasi Pergeseran Anggaran
                  </h2>
                  <p className="text-[11px] text-neutral-450 dark:text-neutral-500">
                    Daftar pengajuan relokasi dana antar bulan, rantai penandatangan, dan audit trail.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {shifts.length === 0 ? (
                <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-bold">Belum ada riwayat pergeseran anggaran.</p>
                  <p className="text-[11px] mt-0.5">
                    Gunakan tombol "Ajukan Pergeseran" untuk memulai realokasi alokasi bulanan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shifts.map((s) => {
                    const fromM = s.from_monthly?.period_month;
                    const toM = s.to_monthly?.period_month;
                    const isIntra = s.shift_type === 'INTRA_QUARTER';
                    const isPending = s.status === 'PENDING';
                    const isApproved = s.status === 'APPROVED';
                    const isRejected = s.status === 'REJECTED';

                    return (
                      <div
                        key={s.id}
                        className="bg-neutral-50/70 dark:bg-neutral-950/40 border border-neutral-200/70 dark:border-neutral-800 rounded-xl p-4 space-y-3"
                      >
                        {/* Row Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/40 dark:border-neutral-800/60 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                                isIntra
                                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20'
                                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20'
                              }`}
                            >
                              {isIntra ? 'Intra-Quarter' : 'Cross-Quarter'}
                            </span>
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                              {MONTH_NAMES[(fromM || 1) - 1]}
                            </span>
                            <ArrowRight className="w-3 h-3 text-neutral-400" />
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                              {MONTH_NAMES[(toM || 1) - 1]}
                            </span>
                            <span className="text-xs font-black text-neutral-900 dark:text-white ml-2">
                              {formatIDR(parseFloat(s.amount))}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                                isApproved
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : isRejected
                                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {isApproved ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  Disetujui
                                </>
                              ) : isRejected ? (
                                <>
                                  <XCircle className="w-3 h-3" />
                                  Ditolak
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3" />
                                  Menunggu Otorisasi (Step {s.current_step}/{s.total_steps})
                                </>
                              )}
                            </span>

                            {isPending && (
                              <div className="flex gap-1.5 ml-2">
                                <button
                                  onClick={() => handleOpenDecision(s, 'APPROVE')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs shadow-emerald-600/20"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleOpenDecision(s, 'REJECT')}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-xs shadow-red-600/20"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reason / Notes */}
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed italic">
                          "{s.reason}"
                        </p>

                        {/* Signers Timeline */}
                        <div className="space-y-1 pt-1">
                          <p className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                            Rantai Penandatangan (Sequential Signers):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {s.approvers?.map((app) => (
                              <div
                                key={app.id}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 ${
                                  app.status === 'APPROVED'
                                    ? 'bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                    : app.status === 'REJECTED'
                                    ? 'bg-red-50/70 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-300'
                                    : app.status === 'PENDING'
                                    ? 'bg-blue-50/70 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 animate-pulse'
                                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'
                                }`}
                              >
                                {app.status === 'APPROVED' ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                ) : app.status === 'REJECTED' ? (
                                  <XCircle className="w-3 h-3 text-red-500" />
                                ) : (
                                  <Clock className="w-3 h-3 text-amber-500" />
                                )}
                                <span className="font-bold">
                                  Step {app.step_number}: {app.approver_name}
                                </span>
                                {app.action_at && (
                                  <span className="text-[8.5px] opacity-75">
                                    ({formatDate(app.action_at)})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Footer Meta */}
                        <div className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center justify-between pt-1">
                          <span>
                            Diajukan oleh: <b className="text-neutral-600 dark:text-neutral-300">{s.creator?.name || s.creator?.email || 'Marketing Team'}</b>
                          </span>
                          <span>{formatDate(s.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Inline Decision Sub-Modal */}
            <AnimatePresence>
              {selectedShift && decisionAction && (
                <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-20">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-2xl space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                      <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        {decisionAction === 'APPROVE' ? (
                          <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                            <XCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                        Konfirmasi {decisionAction === 'APPROVE' ? 'Persetujuan' : 'Penolakan'} Pergeseran
                      </h3>
                      <button onClick={handleCloseDecision} className="text-neutral-400 hover:text-neutral-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Anda akan <b>{decisionAction === 'APPROVE' ? 'menyetujui' : 'menolak'}</b> pergeseran alokasi anggaran sebesar{' '}
                      <b>{formatIDR(parseFloat(selectedShift.amount))}</b> dari{' '}
                      <b>{MONTH_NAMES[(selectedShift.from_monthly?.period_month || 1) - 1]}</b> ke{' '}
                      <b>{MONTH_NAMES[(selectedShift.to_monthly?.period_month || 1) - 1]}</b>.
                    </p>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                        Komentar / Catatan (Opsional)
                      </label>
                      <textarea
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Tuliskan catatan otorisasi..."
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleCloseDecision}
                        className="flex-1 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitDecision}
                        disabled={submitting}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                          decisionAction === 'APPROVE'
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/15'
                            : 'bg-red-600 hover:bg-red-750 shadow-red-500/15'
                        }`}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Memproses...
                          </>
                        ) : decisionAction === 'APPROVE' ? (
                          'Setujui Sekarang'
                        ) : (
                          'Tolak Pengajuan'
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
