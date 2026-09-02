'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Trash2, 
  Loader2, 
  X, 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2, 
  DollarSign, 
  Layers
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export default function GaAssetsPurgeModal({
  isOpen,
  onClose,
  companies = [],
  currentCompanyId = '',
  totalAssetsCount = 0,
  totalAcquisitionCost = 0,
  onSuccessPurge,
  formatIDR
}) {
  const [selectedScope, setSelectedScope] = useState('ALL'); // 'ALL' or company_id string
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const TARGET_PHRASE = 'HAPUS SEMUA ASET';

  // Initialize scope based on active filter if present
  useEffect(() => {
    if (isOpen) {
      if (currentCompanyId) {
        setSelectedScope(String(currentCompanyId));
      } else {
        setSelectedScope('ALL');
      }
      setConfirmationPhrase('');
      setPassword('');
      setShowPassword(false);
      setErrorMessage('');
      setCountdown(5);
    }
  }, [isOpen, currentCompanyId]);

  // Countdown timer when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, countdown]);

  const isPhraseValid = confirmationPhrase.trim().toUpperCase() === TARGET_PHRASE;
  const isFormValid = isPhraseValid && password.length > 0 && countdown === 0;

  const handleExecutePurge = async (e) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    try {
      setSubmitting(true);
      setErrorMessage('');

      const payload = {
        confirmationText: confirmationPhrase.trim().toUpperCase(),
        password: password,
        companyId: selectedScope === 'ALL' ? 'ALL' : parseInt(selectedScope)
      };

      const res = await apiClient.post('/api/ga/assets/purge', payload);

      if (onSuccessPurge) {
        onSuccessPurge(res);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Gagal melakukan pembersihan data aset. Pastikan password Anda benar.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCompanyObj = companies.find(c => String(c.id) === String(selectedScope));

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
            className="fixed inset-0 bg-black/70 z-[999] backdrop-blur-sm"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col my-8"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-red-500/20 blur-md"
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div className="relative w-11 h-11 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/30">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      Pembersihan Data Aset
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40">
                        Admin Only
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      Reset & hapus data aset secara permanen dengan aman
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleExecutePurge} className="mt-4 space-y-4">
                {/* Scope Selection */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                    Pilih Lingkup Pembersihan (Scope)
                  </label>
                  <select
                    value={selectedScope}
                    onChange={(e) => setSelectedScope(e.target.value)}
                    disabled={submitting}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-red-500 transition-colors"
                  >
                    <option value="ALL">🔴 Semua Perusahaan (Global Reset - Seluruh Tabel Aset)</option>
                    {companies.map(c => (
                      <option key={c.id} value={String(c.id)}>
                        🏢 Hanya Perusahaan: {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Impact Info Card */}
                <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-red-500" />
                      Target Pembersihan:
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {selectedScope === 'ALL' ? 'Seluruh Data Aset' : (selectedCompanyObj?.name || `PT ID ${selectedScope}`)}
                    </span>
                  </div>

                  {totalAcquisitionCost > 0 && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-red-500/10">
                      <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        Total Nilai Perolehan:
                      </span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatIDR ? formatIDR(totalAcquisitionCost) : `Rp ${Number(totalAcquisitionCost).toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-red-500/10 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    <span className="font-bold text-neutral-700 dark:text-neutral-300">Catatan Keamanan:</span> Master Data (PT, Kategori, Lokasi, PIC) serta modul lain (Kendaraan, Vendor, Marketing, Legal) <strong>100% AMAN</strong> dan tidak dihapus.
                  </div>
                </div>

                {/* Strict Phrase Input */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Konfirmasi Frasa <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">
                    Ketik persis <strong className="text-red-600 dark:text-red-400 select-all font-mono">HAPUS SEMUA ASET</strong> di bawah ini:
                  </p>
                  <input
                    type="text"
                    value={confirmationPhrase}
                    onChange={(e) => setConfirmationPhrase(e.target.value)}
                    placeholder="HAPUS SEMUA ASET"
                    disabled={submitting}
                    className={`w-full bg-neutral-50 dark:bg-neutral-950 border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition-colors ${
                      isPhraseValid 
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/20' 
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-white focus:border-red-500'
                    }`}
                  />
                </div>

                {/* Password Re-Authentication */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-neutral-500" />
                      Password Login Anda <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] font-normal text-neutral-400">Verifikasi otorisasi akun</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password akun login Anda..."
                      disabled={submitting}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-3 pr-9 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 text-center"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={!isFormValid || submitting}
                    className={`flex-1 py-2.5 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg ${
                      !isFormValid || submitting
                        ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed shadow-none'
                        : 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-600/25 cursor-pointer'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Membersihkan Data...</span>
                      </>
                    ) : countdown > 0 ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Mohon Tunggu ({countdown}s)</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Ya, Bersihkan Data Aset</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
