'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Loader2,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MarketingBudgetShiftDrawer({
  isOpen,
  onClose,
  activeBudget,
  monthlyData,
  onShiftSuccess
}) {
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Available source months (must have available budget and not closed)
  const availableSourceMonths = monthlyData.filter(
    (m) => !m.is_closed && m.available > 0
  );

  // Set initial default selections when drawer opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setAmount('');
      setReason('');
      if (availableSourceMonths.length > 0) {
        setFromMonth(String(availableSourceMonths[0].month));
        const firstTarget = monthlyData.find(
          (m) => m.month !== availableSourceMonths[0].month
        );
        setToMonth(firstTarget ? String(firstTarget.month) : '');
      } else {
        setFromMonth('');
        setToMonth('');
      }
    }
  }, [isOpen, monthlyData]);

  // Selected fromMonth data
  const selectedFromData = monthlyData.find((m) => m.month === parseInt(fromMonth, 10));
  const maxAvailable = selectedFromData ? selectedFromData.available : 0;

  // Calculate shift type
  const fromNum = parseInt(fromMonth, 10);
  const toNum = parseInt(toMonth, 10);
  const fromQ = Math.ceil(fromNum / 3);
  const toQ = Math.ceil(toNum / 3);
  const isIntraQuarter = fromQ === toQ;

  const formatIDR = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = parseFloat(raw) || 0;
    setAmount(raw ? num.toLocaleString('id-ID') : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanAmount = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;

    if (!fromMonth || !toMonth || fromMonth === toMonth) {
      setError('Bulan asal dan tujuan harus valid serta berbeda.');
      return;
    }
    if (cleanAmount <= 0) {
      setError('Nominal pergeseran harus lebih dari Rp 0.');
      return;
    }
    if (cleanAmount > maxAvailable) {
      setError(`Nominal melebihi sisa alokasi bulan asal (${formatIDR(maxAvailable)}).`);
      return;
    }
    if (!reason.trim()) {
      setError('Alasan pergeseran anggaran wajib diisi.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post(`/api/marketing/budgets/${activeBudget.id}/shifts`, {
        from_month: fromNum,
        to_month: toNum,
        amount: cleanAmount,
        reason: reason.trim()
      });

      if (onShiftSuccess) onShiftSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Gagal mengajukan pergeseran anggaran.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-neutral-900 dark:text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </span>
                  Ajukan Pergeseran Anggaran
                </h2>
                <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">
                  Relokasi alokasi dana antar bulan sesuai matriks otorisasi COO.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Source & Target Month Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* From Month */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                    Bulan Sumber (Asal)
                  </label>
                  <select
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {availableSourceMonths.length === 0 && (
                      <option value="">Tidak ada bulan yang memiliki sisa kuota</option>
                    )}
                    {availableSourceMonths.map((m) => (
                      <option key={m.month} value={m.month}>
                        {MONTH_NAMES[m.month - 1]} (Sisa {formatIDR(m.available)})
                      </option>
                    ))}
                  </select>
                  {selectedFromData && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Tersedia: {formatIDR(maxAvailable)}
                    </p>
                  )}
                </div>

                {/* To Month */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                    Bulan Tujuan
                  </label>
                  <select
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {monthlyData
                      .filter((m) => m.month !== fromNum)
                      .map((m) => (
                        <option key={m.month} value={m.month}>
                          {MONTH_NAMES[m.month - 1]} {m.is_closed ? '(Tutup Buku)' : ''}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Policy Detection Banner */}
              {fromMonth && toMonth && fromMonth !== toMonth && (
                <div
                  className={`p-4 rounded-xl border text-xs ${
                    isIntraQuarter
                      ? 'bg-blue-50/70 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-900 dark:text-blue-300'
                      : 'bg-amber-50/70 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {isIntraQuarter ? (
                      <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-extrabold uppercase tracking-wider text-[10px]">
                        {isIntraQuarter
                          ? `Pergeseran Internal Kuartal (Intra-Q${fromQ})`
                          : `Pergeseran Lintas Kuartal (Cross-Quarter: Q${fromQ} -> Q${toQ})`}
                      </p>
                      <p className="text-[11px] mt-1 leading-relaxed">
                        {isIntraQuarter ? (
                          <>
                            Bulan asal dan tujuan berada di kuartal yang sama. Sesuai arahan COO,
                            pergeseran ini hanya membutuhkan <b>1 tahap persetujuan</b> dari{' '}
                            <b>Financial Controller (FC)</b>.
                          </>
                        ) : (
                          <>
                            Bulan asal dan tujuan berada di kuartal berbeda. Sesuai arahan COO,
                            pergeseran ini memerlukan <b>2 tahap persetujuan berjenjang</b>:{' '}
                            <b>1. Head of Marketing</b> lalu <b>2. Financial Controller (FC)</b>.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                  Nominal yang Digeser (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-3 py-2.5 text-xs font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Reason Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">
                  Alasan & Justifikasi Pergeseran
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan program atau kebutuhan kampanye yang melatarbelakangi penambahan anggaran pada bulan tujuan..."
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || availableSourceMonths.length === 0}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/15 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Mengirim Pengajuan...
                    </>
                  ) : (
                    <>
                      Kirim Permohonan
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
