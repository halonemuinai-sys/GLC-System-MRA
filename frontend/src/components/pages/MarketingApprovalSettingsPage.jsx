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
  Trash2,
  ListFilter,
  ArrowUpDown
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

const ROLE_DESCRIPTION = {
  MARKETING_MANAGER: 'Step 1 — semua pengajuan, tier nominal apa pun',
  VP_DIRECTOR: 'Step 2 — tier nominal ≥10 juta',
  BU_DIRECTOR: 'Step 3 — tier nominal ≥50 juta',
  FINANCE_CONTROLLER: 'Step approval khusus Payment Request (realisasi biaya)',
  CFO_CEO: 'Step final — tier nominal ≥250 juta, & eskalasi overbudget'
};

const ROLE_OPTIONS = ['MARKETING_MANAGER', 'VP_DIRECTOR', 'BU_DIRECTOR', 'FINANCE_CONTROLLER', 'CFO_CEO'];

const MODULE_LABELS = { MARKETING_PLAN: 'Marketing Plan', PAYMENT_REQUEST: 'Payment Request' };

export default function MarketingApprovalSettingsPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('contacts');

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

  // Approval Rules state
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState(null);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editingRule, setEditingRule] = useState({});
  const [addingRule, setAddingRule] = useState(false);
  const [newRule, setNewRule] = useState({ module: 'MARKETING_PLAN', min_amount: '', max_amount: '', step_number: '1', approver_role: '' });
  const [ruleSaving, setRuleSaving] = useState(false);

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

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    setRulesError(null);
    try {
      const res = await apiClient.get('/api/marketing/approval-rules');
      setRules(res || []);
    } catch (err) {
      setRulesError(err.message || 'Gagal memuat aturan approval.');
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { if (activeTab === 'rules') loadRules(); }, [activeTab, loadRules]);

  const handleSaveRule = async () => {
    setRuleSaving(true);
    setRulesError(null);
    try {
      if (editingRuleId) {
        await apiClient.put(`/api/marketing/approval-rules/${editingRuleId}`, editingRule);
      } else {
        await apiClient.post('/api/marketing/approval-rules', newRule);
      }
      setEditingRuleId(null);
      setAddingRule(false);
      setNewRule({ module: 'MARKETING_PLAN', min_amount: '', max_amount: '', step_number: '1', approver_role: '' });
      loadRules();
    } catch (err) {
      setRulesError(err.message || 'Gagal menyimpan aturan.');
    } finally {
      setRuleSaving(false);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Hapus aturan approval ini? Ini bisa memengaruhi alur persetujuan yang sedang berjalan.')) return;
    try {
      await apiClient.delete(`/api/marketing/approval-rules/${id}`);
      loadRules();
    } catch (err) {
      setRulesError(err.message || 'Gagal menghapus aturan.');
    }
  };

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
            {t('marketing_approvalSettings_title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
            Atur email penerima link approval untuk setiap role. Project tetap per PT, tapi approver tier VP/BU/COO bisa di-override per Holding Group.
          </p>
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-1 w-fit">
        <button onClick={() => setActiveTab('contacts')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'contacts' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
          <Mail className="w-3.5 h-3.5" /> Email Approver
        </button>
        <button onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'rules' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}>
          <ListFilter className="w-3.5 h-3.5" /> Aturan Approval (DOA)
        </button>
      </div>

      {activeTab === 'contacts' && <div className="bg-amber-500/10 border border-amber-300/60 text-amber-700 dark:text-amber-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-2">
        <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Email di bawah ini menerima link approval (klik untuk setujui/tolak tanpa login). Pastikan hanya mengarahkan
          ke email pihak yang benar-benar berwenang — siapa pun yang memegang link dapat memproses approval tersebut.
        </span>
      </div>}

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

      {activeTab === 'contacts' && loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Memuat konfigurasi...</span>
        </div>
      ) : activeTab === 'contacts' ? (
        <>
          {/* Default Global */}
          <div>
            <h2 className="text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wide mb-2.5">{t('marketing_approvalSettings_sectionDefault')}</h2>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/20 text-neutral-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-4">{t('marketing_approvalSettings_colRole')}</th>
                      <th className="px-5 py-4">{t('marketing_approvalSettings_colFor')}</th>
                      <th className="px-5 py-4">{t('marketing_approvalSettings_colEmail')}</th>
                      <th className="px-5 py-4 text-center">{t('marketing_approvalSettings_colAction')}</th>
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
              <h2 className="text-xs font-black text-neutral-700 dark:text-neutral-300 uppercase tracking-wide">{t('marketing_approvalSettings_sectionOverride')}</h2>
              <button
                onClick={() => setIsAddOpen(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md shadow-blue-600/10 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> {t('marketing_approvalSettings_addOverride')}
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
      ) : (
        /* ── Tab: Aturan Approval (DOA) ──────────────────────────────── */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Konfigurasi DOA (Delegation of Authority) — jumlah step, amount bracket, dan role approver per modul.</p>
            </div>
            <button onClick={() => { setAddingRule(true); setEditingRuleId(null); }}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Tambah Rule
            </button>
          </div>

          {rulesError && <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{rulesError}</div>}

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {rulesLoading ? (
              <div className="py-16 flex items-center justify-center gap-2 text-neutral-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Memuat...</span></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-black uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Modul</th>
                      <th className="px-4 py-3 text-right">Min Amount</th>
                      <th className="px-4 py-3 text-right">Max Amount</th>
                      <th className="px-4 py-3 text-center">Step</th>
                      <th className="px-4 py-3 text-left">Role Approver</th>
                      <th className="px-4 py-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                    {addingRule && (
                      <tr className="bg-blue-50/40 dark:bg-blue-500/5">
                        <td className="px-3 py-2">
                          <select value={newRule.module} onChange={e => setNewRule(r => ({ ...r, module: e.target.value }))}
                            className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="MARKETING_PLAN">Marketing Plan</option>
                            <option value="PAYMENT_REQUEST">Payment Request</option>
                          </select>
                        </td>
                        <td className="px-3 py-2"><input type="number" placeholder="0" value={newRule.min_amount} onChange={e => setNewRule(r => ({ ...r, min_amount: e.target.value }))} className="w-full text-xs text-right bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="px-3 py-2"><input type="number" placeholder="∞" value={newRule.max_amount} onChange={e => setNewRule(r => ({ ...r, max_amount: e.target.value }))} className="w-full text-xs text-right bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="px-3 py-2 text-center"><input type="number" min="1" max="10" value={newRule.step_number} onChange={e => setNewRule(r => ({ ...r, step_number: e.target.value }))} className="w-16 text-xs text-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 mx-auto block" /></td>
                        <td className="px-3 py-2"><input type="text" placeholder="Contoh: MANAGER" value={newRule.approver_role} onChange={e => setNewRule(r => ({ ...r, approver_role: e.target.value }))} className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={handleSaveRule} disabled={ruleSaving} className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"><Check className="w-3 h-3" /></button>
                            <button onClick={() => setAddingRule(false)} className="p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"><X className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {rules.length === 0 && !addingRule ? (
                      <tr><td colSpan="6" className="px-4 py-10 text-center text-neutral-400">Belum ada aturan approval. Klik "Tambah Rule" untuk memulai.</td></tr>
                    ) : rules.map(rule => (
                      <tr key={rule.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                        {editingRuleId === rule.id ? (
                          <>
                            <td className="px-3 py-2">
                              <select value={editingRule.module} onChange={e => setEditingRule(r => ({ ...r, module: e.target.value }))}
                                className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="MARKETING_PLAN">Marketing Plan</option>
                                <option value="PAYMENT_REQUEST">Payment Request</option>
                              </select>
                            </td>
                            <td className="px-3 py-2"><input type="number" value={editingRule.min_amount || ''} onChange={e => setEditingRule(r => ({ ...r, min_amount: e.target.value }))} className="w-full text-xs text-right bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                            <td className="px-3 py-2"><input type="number" placeholder="∞" value={editingRule.max_amount || ''} onChange={e => setEditingRule(r => ({ ...r, max_amount: e.target.value }))} className="w-full text-xs text-right bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                            <td className="px-3 py-2 text-center"><input type="number" min="1" max="10" value={editingRule.step_number || 1} onChange={e => setEditingRule(r => ({ ...r, step_number: e.target.value }))} className="w-16 text-xs text-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 mx-auto block" /></td>
                            <td className="px-3 py-2"><input type="text" value={editingRule.approver_role || ''} onChange={e => setEditingRule(r => ({ ...r, approver_role: e.target.value }))} className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={handleSaveRule} disabled={ruleSaving} className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setEditingRuleId(null)} className="p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"><X className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">{MODULE_LABELS[rule.module] || rule.module}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">Rp {Number(rule.min_amount || 0).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">{rule.max_amount ? `Rp ${Number(rule.max_amount).toLocaleString('id-ID')}` : '—'}</td>
                            <td className="px-4 py-3 text-center font-black text-blue-600 dark:text-blue-400">{rule.step_number}</td>
                            <td className="px-4 py-3"><span className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg text-neutral-700 dark:text-neutral-300">{rule.approver_role}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => { setEditingRuleId(rule.id); setEditingRule({ module: rule.module, min_amount: rule.min_amount, max_amount: rule.max_amount, step_number: rule.step_number, approver_role: rule.approver_role }); setAddingRule(false); }}
                                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleDeleteRule(rule.id)}
                                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-blue-500/10 border border-blue-300/60 text-blue-700 dark:text-blue-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-2">
            <ArrowUpDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Aturan dicocokkan berdasarkan <strong>module + amount bracket + step_number</strong>. Sistem akan mencari rule dengan step berikutnya setelah setiap approval. Jika tidak ada rule untuk step berikutnya, dokumen otomatis berstatus APPROVED. Untuk payment OVERBUDGET_WARN, satu step eskalasi ke role <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">CFO_CEO</code> ditambahkan secara otomatis di luar chain normal.</span>
          </div>
        </div>
      )}
    </div>
  );
}
