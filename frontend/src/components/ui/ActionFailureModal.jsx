'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  X,
  Copy,
  Check,
  ShieldAlert,
  LogIn,
  RefreshCw,
  HelpCircle,
  Info
} from 'lucide-react';

export default function ActionFailureModal({
  isOpen,
  onClose,
  title = 'Pengajuan Plan Gagal',
  error,
  actionContext = 'Pengajuan Marketing Plan',
  onRetry
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !error) return null;

  // Normalisasi message & status code
  let rawMessage = '';
  let statusCode = error?.status || null;

  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
    statusCode = error.status || null;
  } else if (typeof error === 'object') {
    rawMessage = error.message || error.error || JSON.stringify(error);
    statusCode = error.status || null;
  }

  // Deteksi status code dari teks jika belum ada
  if (!statusCode) {
    if (/403|forbidden/i.test(rawMessage)) statusCode = 403;
    else if (/401|unauthorized|expired token|no token/i.test(rawMessage)) statusCode = 401;
    else if (/400|bad request|required/i.test(rawMessage)) statusCode = 400;
    else if (/404|not found/i.test(rawMessage)) statusCode = 404;
    else if (/500|server error/i.test(rawMessage)) statusCode = 500;
  }

  // Diagnosis cerdas berbasis status & kata kunci
  const getDiagnosticInsight = () => {
    const text = (rawMessage || '').toLowerCase();

    if (statusCode === 403 || text.includes('forbidden') || text.includes('403')) {
      if (text.includes('signer') || text.includes('master signer')) {
        return {
          category: 'Identitas Master Signer Belum Terdaftar',
          badge: '403 — MASTER SIGNER',
          badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
          explanation: 'Email login akun Anda belum tercatat atau belum aktif di direktori Master Signer Approval.',
          tips: [
            'Sistem telah dilengkapi auto-sinkronisasi ke tabel Signer. Coba klik "Coba Ajukan Ulang".',
            'Jika masih terkendala, hubungi Administrator untuk memastikan email Anda aktif di menu Admin / Approval Signers.'
          ]
        };
      }
      if (text.includes('scope') || text.includes('perusahaan') || text.includes('company')) {
        return {
          category: 'Scope Perusahaan Dibatasi',
          badge: '403 — COMPANY SCOPE',
          badgeColor: 'border-orange-500/40 bg-orange-500/10 text-orange-600 dark:text-orange-400',
          explanation: 'Perusahaan (PT) yang dipilih berada di luar izin akses unit bisnis yang di-assign untuk akun Anda.',
          tips: [
            'Pastikan memilih PT / Perusahaan yang menjadi hak wewenang akun Anda.',
            'Hubungi Administrator jika penugasan PT Anda perlu ditambahkan di Pengaturan User Access.'
          ]
        };
      }
      return {
        category: 'Batasan Hak Akses (Role Permissions)',
        badge: '403 — FORBIDDEN',
        badgeColor: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400',
        explanation: 'Akun Anda tidak memiliki role yang diizinkan untuk melakukan aksi ini (misal: perlu role Admin, Marketing, atau Marketing Manager).',
        tips: [
          'Periksa role akun yang sedang aktif di pojok kanan atas.',
          'Pastikan Anda login dengan akun yang memiliki wewenang pengajuan marketing.',
          'Hubungi Super Admin jika membutuhkan eskalasi role wewenang.'
        ]
      };
    }

    if (statusCode === 401 || text.includes('unauthorized') || text.includes('expired') || text.includes('token')) {
      return {
        category: 'Sesi Autentikasi Kedaluwarsa',
        badge: '401 — UNAUTHORIZED',
        badgeColor: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        explanation: 'Sesi login Anda telah habis atau token autentikasi tidak valid.',
        tips: [
          'Klik tombol "Login Ulang" di bawah untuk memperbarui sesi Anda.',
          'Data pada formulir tidak akan hilang jika Anda membuka tab login baru.'
        ]
      };
    }

    if (statusCode === 400 || text.includes('required') || text.includes('invalid') || text.includes('h-3')) {
      return {
        category: 'Validasi Data Formulir',
        badge: '400 — VALIDATION NOTICE',
        badgeColor: 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400',
        explanation: 'Terdapat data atau isian formulir yang belum memenuhi persyaratan sistem.',
        tips: [
          'Pastikan semua field bertanda bintang (*) telah terisi.',
          'Pastikan alokasi biaya budget > 0 dan tentukan minimal 1 approver/signer di Langkah 3.',
          'Jika event kurang dari 3 bulan (aturan H-3), cantumkan alasan keterlambatan pengajuan.'
        ]
      };
    }

    return {
      category: 'Kendala Sistem / Server',
      badge: statusCode ? `HTTP ${statusCode}` : 'SYSTEM NOTICE',
      badgeColor: 'border-neutral-500/40 bg-neutral-500/10 text-neutral-600 dark:text-neutral-400',
      explanation: 'Terjadi kegagalan pemrosesan saat server backend menangani permintaan Anda.',
      tips: [
        'Pastikan service backend Express (Port 5005) sedang aktif dan terkoneksi ke database.',
        'Periksa koneksi jaringan internet Anda lalu coba submit kembali.'
      ]
    };
  };

  const insight = getDiagnosticInsight();

  const handleCopy = () => {
    const fullLog = `[ERROR REPORT - GLC MRA SYSTEM]\nStatus: ${statusCode || 'Unknown'}\nAction: ${actionContext}\nMessage: ${rawMessage}\nTimestamp: ${new Date().toISOString()}`;
    navigator.clipboard.writeText(fullLog).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handleRedirectLogin = () => {
    window.location.href = '/login';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header Bar with Alert Aura */}
          <div className="relative px-6 pt-6 pb-4 border-b border-neutral-100 dark:border-neutral-800 bg-gradient-to-r from-red-500/5 via-rose-500/5 to-transparent dark:from-red-950/20 dark:via-rose-950/10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative flex-shrink-0">
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-red-500/20 dark:bg-red-500/30 blur-md"
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${insight.badgeColor}`}>
                      {insight.badge}
                    </span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-medium truncate max-w-[200px]">
                      {actionContext}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white mt-1 leading-tight">
                    {title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-4 text-xs">
            {/* Box 1: Error Message from Server */}
            <div className="rounded-2xl bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Respon Server Backend
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin Detail</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-neutral-800 dark:text-neutral-200 font-mono text-[11px] leading-relaxed break-words bg-white/60 dark:bg-neutral-900/60 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
                {rawMessage || 'Terjadi kesalahan tanpa pesan spesifik dari server.'}
              </p>
            </div>

            {/* Box 2: Diagnosa & Penjelasan */}
            <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <h4 className="font-bold text-neutral-850 dark:text-neutral-200 text-xs">
                  {insight.category}
                </h4>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                {insight.explanation}
              </p>

              {/* Troubleshooting Tips */}
              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 space-y-1.5">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Langkah yang dapat dilakukan:
                </span>
                <ul className="space-y-1 text-[11px] text-neutral-600 dark:text-neutral-300">
                  {insight.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-indigo-500 font-bold leading-none mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Note: Safe Draft Notice */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/15 border border-blue-200/40 dark:border-blue-900/30 text-[10px] text-blue-700 dark:text-blue-300">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Data formulir yang Anda input <strong>tidak hilang</strong>. Anda dapat memeriksa kembali data setelah menutup pop-up ini.</span>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-neutral-50/80 dark:bg-neutral-950/50 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 text-[11px] font-bold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin!' : 'Salin Laporan'}
            </button>

            <div className="flex items-center gap-2">
              {statusCode === 401 && (
                <button
                  type="button"
                  onClick={handleRedirectLogin}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Login Ulang
                </button>
              )}

              {onRetry && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRetry();
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Coba Lagi
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup & Periksa Form
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
