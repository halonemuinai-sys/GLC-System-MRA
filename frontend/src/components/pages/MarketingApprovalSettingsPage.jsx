'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Mail,
  Edit3,
  Check,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Shield,
  Building2,
  Plus,
  Trash2
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const ROLE_DESCRIPTION = {
  MARKETING_MANAGER: 'Step 1 — semua pengajuan, tier nominal apa pun',
  VP_DIRECTOR: 'Step 2 — tier nominal ≥10 juta',
  BU_DIRECTOR: 'Step 3 — tier nominal ≥50 juta',
  FINANCE_CONTROLLER: 'Step approval khusus Payment Request (realisasi biaya)',
  CFO_CEO: 'Step final — tier nominal ≥250 juta, & eskalasi overbudget'
};

const ROLE_OPTIONS = ['MARKETING_MANAGER', 'VP_DIRECTOR', 'BU_DIRECTOR', 'FINANCE_CONTROLLER', 'CFO_CEO'];

export default function MarketingApprovalSettingsPage() {
  const [contacts, setContacts] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newOverride, setNewOverride] = useState({ role: ROLE_OPTIONS[0], company_master_id: '', email: '' });

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/marketing/approval-contacts');
      setContacts(res.contacts || []);
      setHoldings(res.holdings || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat konfigurasi approval.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const globalDefaults = useMemo(() => contacts.filter(c => !c.company_master_id), [contacts]);
  const holdingOverrides = useMemo(() => contacts.filter(c => c.company_master_id), [contacts]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const rowVariants = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 25 } }
  };

  const startEdit = (contact) => {
    setEditingId(contact.id);
    setEditEmail(contact.email);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditEmail('');
  };

  const saveEdit = async (contact) => {
    if (!editEmail.trim()) {
      setError('Email tujuan wajib diisi.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.put(`/api/marketing/approval-contacts/${contact.id}`, {
        email: editEmail.trim(),
        label: contact.label
      });
      setSuccessMsg(`Email approver ${contact.label || contact.role} berhasil diperbarui.`);
      setEditingId(null);
      loadContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddOverride = async () => {
    if (!newOverride.company_master_id || !newOverride.email.trim()) {
      setError('Holding Group dan email tujuan wajib diisi.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.post('/api/marketing/approval-contacts', {
        role: newOverride.role,
        company_master_id: newOverride.company_master_id,
        email: newOverride.email.trim()
      });
      setSuccessMsg('Override Holding Group berhasil ditambahkan.');
      setIsAddOpen(false);
      setNewOverride({ role: ROLE_OPTIONS[0], company_master_id: '', email: '' });
      loadContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Gagal menambah override.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (contact) => {
    if (!confirm(`Hapus override ${contact.role} untuk ${contact.m_company_master?.name}? Approval akan kembali pakai default global.`)) return;
    setError(null);
    try {
      await apiClient.delete(`/api/marketing/approval-contacts/${contact.id}`);
      setSuccessMsg('Override berhasil dihapus.');
      loadContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Gagal menghapus override.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
            Konfigurasi Approval & Magic Link
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
            Atur email penerima link approval untuk setiap role. Project tetap per PT, tapi approver tier VP/BU/COO bisa di-override per Holding Group.
          </p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-300/60 text-amber-700 dark:text-amber-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-2">
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Email di bawah ini menerima link approval (klik untuk setujui/tolak tanpa login). Pastikan hanya mengarahkan
          ke email pihak yang benar-benar berwenang — siapa pun yang memegang link dapat memproses approval tersebut.
        </span>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" /> {error}
        </motion.div>
      )}

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Memuat konfigurasi...</span>
        </div>
      ) : (
        <>
          {/* Default Global */}
          <div>
            <h2 className="text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2.5">Default Global (Fallback)</h2>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/20 text-neutral-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-4">Role Approval</th>
                      <th className="px-5 py-4">Dipakai Untuk</th>
                      <th className="px-5 py-4">Email Penerima</th>
                      <th className="px-5 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium"
                  >
                    {globalDefaults.map(contact => {
                      const isEditing = editingId === contact.id;
                      return (
                        <motion.tr 
                          variants={rowVariants}
                          key={contact.id} 
                          className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/5 text-neutral-700 dark:text-neutral-300 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <span className="font-black text-neutral-900 dark:text-white">{contact.label || contact.role}</span>
                            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{contact.role}</p>
                          </td>
                          <td className="px-5 py-4 text-neutral-500 dark:text-neutral-400 max-w-xs">
                            {ROLE_DESCRIPTION[contact.role] || '-'}
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                <input
                                  type="email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  autoFocus
                                  className="bg-neutral-50 dark:bg-neutral-955 border border-blue-400 rounded-lg px-2.5 py-1.5 text-xs text-neutral-850 dark:text-white focus:outline-none w-56 focus:ring-2 focus:ring-blue-550/20"
                                />
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-neutral-850 dark:text-neutral-200 font-bold">
                                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                {contact.email}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => saveEdit(contact)} disabled={saving} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 cursor-pointer animate-pulse" title="Simpan">
                                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={cancelEdit} disabled={saving} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-lg text-neutral-500 cursor-pointer" title="Batal">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => startEdit(contact)} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl hover:text-blue-500 hover:border-blue-500 text-[11px] font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1">
                                <Edit3 className="w-3 h-3" /> Ubah
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </motion.tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Override per Holding Group */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">Override per Holding Group</h2>
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md shadow-blue-600/10 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Override
              </button>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/20 text-neutral-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-4">Holding Group</th>
                      <th className="px-5 py-4">Role Approval</th>
                      <th className="px-5 py-4">Email Penerima</th>
                      <th className="px-5 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <motion.tbody 
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium"
                  >
                    {holdingOverrides.length === 0 ? (
                      <motion.tr variants={rowVariants}>
                        <td colSpan={4} className="px-5 py-12 text-center text-neutral-450 font-normal">
                          Belum ada override khusus per Holding. Semua PT pakai default global di atas.
                        </td>
                      </motion.tr>
                    ) : (
                      holdingOverrides.map(contact => {
                        const isEditing = editingId === contact.id;
                        return (
                          <motion.tr 
                            variants={rowVariants}
                            key={contact.id} 
                            className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/5 text-neutral-700 dark:text-neutral-300 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 font-bold text-neutral-900 dark:text-white">
                                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                {contact.m_company_master?.name || '-'}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono text-neutral-500">{contact.role}</td>
                            <td className="px-5 py-4">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                  <input
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    autoFocus
                                    className="bg-neutral-50 dark:bg-neutral-955 border border-blue-400 rounded-lg px-2.5 py-1.5 text-xs text-neutral-850 dark:text-white focus:outline-none w-56 focus:ring-2 focus:ring-blue-500/20"
                                  />
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-neutral-850 dark:text-neutral-200 font-bold">
                                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                  {contact.email}
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={() => saveEdit(contact)} disabled={saving} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 cursor-pointer animate-pulse" title="Simpan">
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                  </button>
                                  <button onClick={cancelEdit} disabled={saving} className="p-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-lg text-neutral-500 cursor-pointer" title="Batal">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={() => startEdit(contact)} className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl hover:text-blue-500 hover:border-blue-500 text-[11px] font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1">
                                    <Edit3 className="w-3 h-3" /> Ubah
                                  </button>
                                  <button onClick={() => handleDeleteOverride(contact)} className="p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl hover:text-red-500 hover:border-red-400 transition-all cursor-pointer" title="Hapus Override">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </motion.tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Override Modal */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsAddOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-md z-55 overflow-hidden"
            >
              <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
                <h3 className="text-md font-black text-neutral-850 dark:text-white">Tambah Override Holding Group</h3>
                <button onClick={() => setIsAddOpen(false)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase">Holding Group</label>
                  <select
                    value={newOverride.company_master_id}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, company_master_id: e.target.value }))}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none"
                  >
                    <option value="">Pilih Holding Group...</option>
                    {holdings.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase">Role Approval</label>
                  <select
                    value={newOverride.role}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none"
                  >
                    {ROLE_OPTIONS.map(r => (
                      <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase">Email Penerima</label>
                  <input
                    type="email"
                    placeholder="nama@mraretail.co.id"
                    value={newOverride.email}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="px-6 py-4.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2 bg-neutral-50/30 dark:bg-neutral-950/10">
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-neutral-250 dark:border-neutral-700/60 rounded-xl text-neutral-600 dark:text-neutral-450 hover:text-neutral-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddOverride}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Override
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
