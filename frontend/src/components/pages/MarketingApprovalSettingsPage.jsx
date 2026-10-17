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
  LockKeyhole,
  ListFilter,
  ArrowUpDown,
  Users,
  UserCog,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';
import InlineHelp from '@/components/ui/InlineHelp';
import { resolveRecipientPreview } from '@/lib/marketingApproverPreview.mjs';
import MarketingApprovalTiers from './MarketingApprovalTiers';
import MarketingApproverDirectory from './MarketingApproverDirectory';

const ROLE_DESCRIPTION = {
  MARKETING_MANAGER: 'Penerima untuk role Marketing Manager',
  VP_DIRECTOR: 'Penerima untuk role VP / Director',
  BU_DIRECTOR: 'Penerima untuk role BU Director',
  FINANCE_CONTROLLER: 'Penerima Finance untuk pembayaran dan reimbursement',
  CFO_CEO: 'Penerima untuk role CFO / CEO dan eskalasi biaya'
};

const ROLE_OPTIONS = ['MARKETING_MANAGER', 'VP_DIRECTOR', 'BU_DIRECTOR', 'FINANCE_CONTROLLER', 'CFO_CEO'];
const ROLE_LABELS = {
  MARKETING_MANAGER: 'Marketing Manager',
  VP_DIRECTOR: 'VP / Director',
  BU_DIRECTOR: 'BU Director',
  FINANCE_CONTROLLER: 'Finance Controller',
  CFO_CEO: 'CFO / CEO',
};

const MODULE_LABELS = { MARKETING_PLAN: 'Marketing Plan', PAYMENT_REQUEST: 'Payment Request' };

export default function MarketingApprovalSettingsPage() {
  const { lang, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('rules');
  const [previewCompanyId, setPreviewCompanyId] = useState('');

  const [contacts, setContacts] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [signers, setSigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editSignerId, setEditSignerId] = useState('');
  const [saving, setSaving] = useState(false);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newOverride, setNewOverride] = useState({ role: ROLE_OPTIONS[0], level: 'holding', company_master_id: '', company_id: '', signer_id: '' });

  // Signer master data state
  const [signerEditingId, setSignerEditingId] = useState(null);
  const [signerForm, setSignerForm] = useState({ name: '', email: '', position: '' });
  const [isAddSignerOpen, setIsAddSignerOpen] = useState(false);
  const [signerSaving, setSignerSaving] = useState(false);
  const [signerError, setSignerError] = useState(null);
  const [signerBusyId, setSignerBusyId] = useState(null);
  const editingSigner = signers.find(signer => signer.id === signerEditingId);

  // Approval Rules state
  const [rules, setRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState(null);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editingRule, setEditingRule] = useState({});
  const [addingRule, setAddingRule] = useState(false);
  const [newRule, setNewRule] = useState({ module: 'MARKETING_PLAN', min_amount: '', max_amount: '', step_number: '1', approver_role: '' });
  const [ruleSaving, setRuleSaving] = useState(false);
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const ruleRoleOptions = useMemo(() => [...new Set([...ROLE_OPTIONS, ...rules.map(rule => rule.approver_role), ...contacts.map(contact => contact.role)])].filter(Boolean), [rules, contacts]);

  const loadContacts = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [res, directory] = await Promise.all([
        apiClient.get('/api/marketing/approval-contacts'),
        apiClient.get('/api/marketing/approval-signers'),
      ]);
      setContacts(res.contacts || []);
      setHoldings(res.holdings || []);
      setCompanies(res.companies || []);
      setSigners(directory || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat konfigurasi approval.');
    } finally {
      if (!quiet) setLoading(false);
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

  const globalDefaults = useMemo(() => contacts.filter(c => !c.company_master_id && !c.company_id), [contacts]);
  const holdingOverrides = useMemo(() => contacts.filter(c => c.company_master_id || c.company_id), [contacts]);
  const activeSigners = useMemo(() => signers.filter(signer => signer.is_active !== false), [signers]);
  const previewCompany = companies.find(company => String(company.id) === previewCompanyId) || companies[0];
  const previewRoles = useMemo(() => [...new Set([...ROLE_OPTIONS, ...contacts.map(contact => contact.role)])], [contacts]);

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
    setEditSignerId(contact.signer_id ? String(contact.signer_id) : '');
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditSignerId('');
  };

  const saveEdit = async (contact) => {
    if (!editSignerId) {
      setError('Pilih signer terlebih dahulu.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.put(`/api/marketing/approval-contacts/${contact.id}`, {
        signer_id: editSignerId
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
    const targetId = newOverride.level === 'pt' ? newOverride.company_id : newOverride.company_master_id;
    if (!targetId || !newOverride.signer_id) {
      setError(newOverride.level === 'pt' ? 'PT dan signer wajib diisi.' : 'Holding Group dan signer wajib diisi.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiClient.post('/api/marketing/approval-contacts', {
        role: newOverride.role,
        company_id: newOverride.level === 'pt' ? newOverride.company_id : undefined,
        company_master_id: newOverride.level === 'holding' ? newOverride.company_master_id : undefined,
        signer_id: newOverride.signer_id
      });
      setSuccessMsg('Penerima khusus berhasil ditambahkan.');
      setIsAddOpen(false);
      setNewOverride({ role: ROLE_OPTIONS[0], level: 'holding', company_master_id: '', company_id: '', signer_id: '' });
      loadContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Gagal menambah override.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (contact) => {
    const targetName = contact.m_company?.name || contact.m_company_master?.name;
    if (!confirm(`Hapus penerima khusus ${contact.role} untuk ${targetName}? Sistem akan mencari penerima Holding, lalu penerima umum yang tersedia.`)) return;
    setError(null);
    try {
      await apiClient.delete(`/api/marketing/approval-contacts/${contact.id}`);
      setSuccessMsg('Penerima khusus berhasil dihapus.');
      loadContacts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err.message || 'Gagal menghapus override.');
    }
  };

  // ── Signer master data handlers ──────────────────────────────────────────
  const handleOpenAddSigner = () => {
    setSignerEditingId(null);
    setSignerForm({ name: '', email: '', position: '' });
    setSignerError(null);
    setIsAddSignerOpen(true);
  };

  const handleOpenEditSigner = (signer) => {
    setSignerEditingId(signer.id);
    setSignerForm({ name: signer.name, email: signer.email, position: signer.position || '' });
    setSignerError(null);
    setIsAddSignerOpen(true);
  };

  const handleSaveSigner = async () => {
    if (signerSaving) return;
    if (!signerForm.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signerForm.email.trim())) {
      setSignerError('Isi nama dan alamat email yang valid.');
      return;
    }
    setSignerSaving(true);
    setSignerError(null);
    try {
      if (signerEditingId) {
        await apiClient.put(`/api/marketing/approval-signers/${signerEditingId}`, signerForm);
      } else {
        await apiClient.post('/api/marketing/approval-signers', signerForm);
      }
      setIsAddSignerOpen(false);
      await loadContacts(true);
    } catch (err) {
      setSignerError(err.message || 'Gagal menyimpan signer.');
    } finally {
      setSignerSaving(false);
    }
  };

  const handleToggleSignerActive = async (signer) => {
    if (signerBusyId !== null) return;
    setSignerBusyId(signer.id);
    setSignerError(null);
    try {
      await apiClient.put(`/api/marketing/approval-signers/${signer.id}`, { is_active: !signer.is_active });
      await loadContacts(true);
    } catch (err) {
      setSignerError(err.message || 'Gagal mengubah status approver.');
    } finally {
      setSignerBusyId(null);
    }
  };

  const handleDeleteSigner = async (signer) => {
    if (signerBusyId !== null) return;
    if (signer.can_delete !== true) {
      setSignerError(signer.delete_block_reason || 'Penggunaan approver belum dapat diverifikasi. Muat ulang direktori.');
      return;
    }
    if (!confirm(`Hapus approver "${signer.name}" dari direktori? Data yang sudah digunakan dalam transaksi atau pengaturan tidak dapat dihapus.`)) return;
    setSignerBusyId(signer.id);
    setSignerError(null);
    try {
      await apiClient.delete(`/api/marketing/approval-signers/${signer.id}`);
      await loadContacts(true);
    } catch (err) {
      setSignerError(err.message || 'Gagal menghapus approver.');
      await loadContacts(true);
    } finally {
      setSignerBusyId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <div aria-hidden="true" className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-white/[0.03]" />
        <div className="relative">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><Settings className="h-4 w-4" />Approval management</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t('marketing_approvalSettings_title')}
          </h1>
          <p className="text-slate-400 text-xs mt-2">
            Susun tier persetujuan, siapkan direktori, lalu pilih approver saat pengajuan.
          </p>
        </div>
      </div>

      {/* Tab Toggle */}
      <nav aria-label="Pengaturan approval" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { id: 'rules', icon: ListFilter, title: '1. Tier & Workflow', caption: 'Rentang anggaran dan urutan role' },
          { id: 'signers', icon: Users, title: '2. Direktori Approver', caption: 'Nama, email, dan jabatan' },
          { id: 'contacts', icon: Mail, title: 'Penerima Otomatis', caption: 'Lanjutan · Rekomendasi per PT' },
        ].map(({ id, icon: Icon, title, caption }) => <button key={id} type="button" aria-pressed={activeTab === id} onClick={() => setActiveTab(id)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${activeTab === id ? 'border-blue-200 bg-blue-50/70 dark:border-blue-500/30 dark:bg-blue-500/10' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeTab === id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}><Icon className="h-4 w-4" /></span><span><span className={`block text-xs font-semibold ${activeTab === id ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>{title}</span><span className="mt-1 block text-[10px] text-slate-400">{caption}</span></span></button>)}
      </nav>

      {activeTab === 'contacts' && <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <InlineHelp summary="Tentukan orang yang otomatis direkomendasikan untuk setiap role." label="Kapan mengatur penerima otomatis">
          Gunakan pengaturan ini untuk rekomendasi penerima PT dan pengiriman melalui alur otomatis. Jika memilih approver langsung di Marketing Plan atau Quick Campaign, Anda bisa memakai direktori atau nama dan email manual tanpa mengubah pemetaan PT. Aturan tier ada di tab pertama.
        </InlineHelp>
        <span className="inline-flex items-center gap-1.5 text-[11px]"><Shield className="h-3.5 w-3.5" /><InlineHelp summary="Tentang Magic Link" label="Cara kerja Magic Link">Link dikirim ke email penerima untuk menyetujui atau menolak tanpa login. Link berlaku 7 hari; pemegang link dapat memproses approval, jadi jangan diteruskan ke pihak lain.</InlineHelp></span>
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

      {(activeTab === 'contacts' || activeTab === 'signers') && loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Memuat konfigurasi...</span>
        </div>
      ) : activeTab === 'contacts' ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
              <div><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white"><Building2 className="h-4 w-4 text-blue-500" />Pratinjau penerima per PT</h2><p className="mt-1 text-[11px] text-slate-400">Sumber penerima untuk setiap role, bukan urutan approval.</p></div>
              <select aria-label="PT untuk pratinjau penerima" value={previewCompany?.id || ''} onChange={event => setPreviewCompanyId(event.target.value)} className="max-w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {!companies.length && <option value="">Belum ada PT</option>}{companies.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-slate-50/70 px-5 py-3 text-[11px] text-slate-500 dark:bg-slate-950/30 dark:text-slate-400"><span className="font-medium">Prioritas penerima:</span><span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400">PT</span><ArrowRight className="h-3 w-3" /><span>Holding</span><ArrowRight className="h-3 w-3" /><span>Penerima umum</span><InlineHelp label="Arti penerima umum">Penerima umum dipakai untuk suatu role hanya jika PT dan Holding belum memiliki penerima khusus. Contoh: jika PT A sudah menetapkan Finance, alamat umum Finance tidak digunakan untuk PT A.</InlineHelp></div>
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 dark:divide-slate-800">
              {previewRoles.map(role => {
                const { contact, source } = resolveRecipientPreview(contacts, role, previewCompany);
                const sourceName = source === 'company' ? 'PT' : source === 'holding' ? 'Holding' : source === 'general' ? 'Umum' : 'Belum diatur';
                return <div key={role} className="min-w-0 border-b border-slate-100 p-4 sm:px-5 dark:border-slate-800"><div className="flex items-center justify-between gap-2"><span className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">{contact?.label || role.replace(/_/g, ' ')}</span><span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-medium ${source === 'company' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : source ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'}`}>{sourceName}</span></div><p className="mt-2 truncate text-xs text-slate-600 dark:text-slate-300">{contact?.signer?.name || (contact ? 'Penerima tersimpan' : 'Perlu ditentukan')}</p><p title={contact?.email} className="mt-0.5 truncate text-[11px] text-slate-400">{contact?.email || 'Tidak ada email penerima'}</p></div>;
              })}
            </div>
          </section>

          {/* General recipients */}
          <details className="group rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden"><span><span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{t('marketing_approvalSettings_sectionDefault')}</span><span className="mt-1 block text-[11px] text-slate-400">Dipakai jika role tersebut belum diatur pada PT atau Holding.</span></span><ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" /></summary>
            <div className="mt-4">
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
                                <select
                                  value={editSignerId}
                                  onChange={(e) => setEditSignerId(e.target.value)}
                                  autoFocus
                                  className="bg-neutral-50 dark:bg-neutral-950 border border-blue-400 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white focus:outline-none w-56 focus:ring-2 focus:ring-blue-500/20"
                                >
                                  <option value="">-- Pilih Approver --</option>
                                  {activeSigners.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-neutral-900 dark:text-neutral-200 font-bold">
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
          </details>

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
                      <th className="px-5 py-4">PT / Holding Group</th>
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
                        <td colSpan={4} className="px-5 py-12 text-center text-neutral-400 font-normal">
                          Belum ada penerima khusus. Sistem memakai penerima umum untuk role yang sudah tersedia.
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
                                {contact.m_company?.name || contact.m_company_master?.name || '-'}
                                {contact.m_company && (
                                  <span className="text-[9px] font-black uppercase text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">PT</span>
                                )}
                                {!contact.m_company && contact.m_company_master && (
                                  <span className="text-[9px] font-black uppercase text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">Holding</span>
                                )}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono text-neutral-500">{contact.role}</td>
                            <td className="px-5 py-4">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                  <select
                                    value={editSignerId}
                                    onChange={(e) => setEditSignerId(e.target.value)}
                                    autoFocus
                                    className="bg-neutral-50 dark:bg-neutral-950 border border-blue-400 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 dark:text-white focus:outline-none w-56 focus:ring-2 focus:ring-blue-500/20"
                                  >
                                    <option value="">-- Pilih Approver --</option>
                                    {activeSigners.map(s => (
                                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-neutral-900 dark:text-neutral-200 font-bold">
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
                                  <button onClick={() => handleDeleteOverride(contact)} className="p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl hover:text-red-500 hover:border-red-400 transition-all cursor-pointer" title="Hapus Penerima Khusus">
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
                <h3 className="text-md font-semibold text-neutral-900 dark:text-white">Atur Penerima Khusus</h3>
                <button onClick={() => setIsAddOpen(false)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Berlaku untuk</label>
                  <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setNewOverride(prev => ({ ...prev, level: 'holding', company_id: '' }))}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${newOverride.level === 'holding' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                      Holding Group
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewOverride(prev => ({ ...prev, level: 'pt', company_master_id: '' }))}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${newOverride.level === 'pt' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400'}`}
                    >
                      PT Spesifik
                    </button>
                  </div>
                </div>

                {newOverride.level === 'holding' ? (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">Holding Group</label>
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
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase">PT</label>
                    <select
                      value={newOverride.company_id}
                      onChange={(e) => setNewOverride(prev => ({ ...prev, company_id: e.target.value }))}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none"
                    >
                      <option value="">Pilih PT...</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Role Approval</label>
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
                  <label className="text-[10px] font-bold text-neutral-400 uppercase">Signer (Email Penerima)</label>
                  <select
                    value={newOverride.signer_id}
                    onChange={(e) => setNewOverride(prev => ({ ...prev, signer_id: e.target.value }))}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Pilih Approver --</option>
                    {activeSigners.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                  <div className="text-[10px] text-slate-400"><InlineHelp summary="Pengaturan ini disimpan untuk PT / Holding." label="Penerima tetap atau khusus dokumen">Gunakan Direktori Approver untuk penerima yang akan dipakai berulang. Untuk satu pengajuan saja, nama dan email bisa diisi langsung pada bagian approval dokumen.</InlineHelp></div>
                </div>
              </div>

              <div className="px-6 py-4.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2 bg-neutral-50/30 dark:bg-neutral-950/10">
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddOverride}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Penerima
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      ) : activeTab === 'signers' ? (
        /* ── Tab: Master Signer ──────────────────────────────────────── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-sm font-semibold text-slate-800 dark:text-white">Master Approver</h2><div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400"><InlineHelp summary="Daftar orang yang dapat dipilih untuk approval." label="Fungsi direktori approver">Simpan nama, email, dan jabatan di sini. Urutan persetujuan mengikuti pengaturan tier. Data yang sudah digunakan tidak bisa dihapus; gunakan Nonaktifkan untuk mengeluarkannya dari pilihan direktori. Pengaturan penerima otomatis yang masih menunjuk orang tersebut perlu diperbarui secara terpisah.</InlineHelp></div></div>
            <button onClick={handleOpenAddSigner} disabled={signerBusyId !== null}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md shadow-blue-600/10 transition-all cursor-pointer shrink-0 ml-4">
              <Plus className="w-3.5 h-3.5" /> Tambah Approver
            </button>
          </div>

          {signerError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {signerError}
            </div>
          )}

          <MarketingApproverDirectory signers={signers} busyId={signerBusyId} onEdit={handleOpenEditSigner} onDelete={handleDeleteSigner} onToggle={handleToggleSignerActive} />

          {/* Add/Edit Signer Modal */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-slate-400">
            <InlineHelp summary="Data yang sudah digunakan tetap disimpan." label="Aturan hapus dan nonaktifkan approver">Tombol hapus terkunci untuk approver yang tercatat di transaksi, riwayat approval, atau pengaturan penerima. Validasi diperiksa kembali di server saat menghapus. Nonaktifkan menghilangkan kontak dari pilihan direktori untuk pengajuan baru; riwayat dan dokumen yang sudah ada tetap tersimpan.</InlineHelp>
            <button type="button" onClick={() => setActiveTab('contacts')} className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">Atur rekomendasi otomatis <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          <AnimatePresence>
            {isAddSignerOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                  onClick={() => { if (!signerSaving) setIsAddSignerOpen(false); }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-md z-55 overflow-hidden"
                >
                  <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
                    <h3 className="text-md font-black text-neutral-900 dark:text-white">{signerEditingId ? 'Ubah Approver' : 'Tambah Approver'}</h3>
                    <button disabled={signerSaving} aria-label="Tutup form approver" onClick={() => setIsAddSignerOpen(false)} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-800 dark:hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    {signerError && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {signerError}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Nama Lengkap</label>
                      <input
                        type="text"
                        placeholder="Contoh: Budi Santoso"
                        value={signerForm.name}
                        maxLength={150}
                        disabled={signerSaving}
                        onChange={(e) => setSignerForm(prev => ({ ...prev, name: e.target.value }))}
                        autoFocus
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Email</label>
                      <input
                        type="email"
                        placeholder="nama@mraretail.co.id"
                        value={signerForm.email}
                        maxLength={150}
                        onChange={(e) => setSignerForm(prev => ({ ...prev, email: e.target.value }))}
                        disabled={signerSaving || Boolean(editingSigner?.email_locked)}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      {editingSigner?.email_locked && <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400"><LockKeyhole className="h-3 w-3 shrink-0" /><InlineHelp summary="Email terkunci karena sudah digunakan." label="Mengganti email approver">Riwayat menyimpan identitas approver melalui email. Untuk mengganti alamat, nonaktifkan data lama lalu tambahkan approver baru dan perbarui pengaturan penerima jika diperlukan.</InlineHelp></div>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-400 uppercase">Jabatan (opsional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: Finance Controller"
                        value={signerForm.position}
                        maxLength={100}
                        disabled={signerSaving}
                        onChange={(e) => setSignerForm(prev => ({ ...prev, position: e.target.value }))}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="px-6 py-4.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2 bg-neutral-50/30 dark:bg-neutral-950/10">
                    <button
                      onClick={() => setIsAddSignerOpen(false)}
                      disabled={signerSaving}
                      className="px-4 py-2 border border-neutral-200 dark:border-neutral-700/60 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSaveSigner}
                      disabled={signerSaving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {signerSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Simpan Approver
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ── Tab: Aturan Approval (DOA) ──────────────────────────────── */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Tier persetujuan</h2>
              <div className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400"><InlineHelp summary="Tentukan rentang anggaran dan urutan jabatan." label="Cara menyusun tier">Satu tier adalah satu rentang anggaran untuk jenis pengajuan yang sama. Untuk menambah tahap pada tier yang sama, gunakan rentang nominal yang sama, lalu isi nomor tahap berikutnya dan pilih role. Batas minimum dan maksimum termasuk dalam rentang, sehingga batas tier sebaiknya tidak bertumpuk. Kosongkan batas maksimum untuk tanpa batas atas. Nama orang dipilih dari direktori saat pengajuan.</InlineHelp></div>
            </div>
            <div className="flex items-center gap-2">
            <button type="button" aria-expanded={showRuleEditor} aria-controls="approval-rule-editor" onClick={() => setShowRuleEditor(value => !value)} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Edit3 className="h-3.5 w-3.5" />{showRuleEditor ? 'Tutup editor' : 'Kelola tahap'}</button>
            <button onClick={() => { setAddingRule(true); setEditingRuleId(null); setShowRuleEditor(true); }}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Tambah tahap
            </button>
            </div>
          </div>

          {rulesError && <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{rulesError}</div>}

          {rulesLoading ? <div className="flex items-center justify-center gap-2 py-12 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin" />Memuat tier...</div> : !rulesError && <MarketingApprovalTiers rules={rules} companies={companies} moduleLabels={MODULE_LABELS} roleLabels={ROLE_LABELS} />}

          {showRuleEditor && <div id="approval-rule-editor" className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">Satu baris untuk satu tahap. Gunakan rentang anggaran yang sama untuk tahap dalam satu tier.</div>
            {rulesLoading ? (
              <div className="py-16 flex items-center justify-center gap-2 text-neutral-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Memuat...</span></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 font-black uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Modul</th>
                      <th className="px-4 py-3 text-right">Minimum (Rp)</th>
                      <th className="px-4 py-3 text-right">Maksimum (Rp)</th>
                      <th className="px-4 py-3 text-center">Tahap</th>
                      <th className="px-4 py-3 text-left">Role / Jabatan</th>
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
                        <td className="px-3 py-2"><select aria-label="Role untuk tahap baru" value={newRule.approver_role} onChange={e => setNewRule(r => ({ ...r, approver_role: e.target.value }))} className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">Pilih role</option>{ruleRoleOptions.map(role => <option key={role} value={role}>{ROLE_LABELS[role] || role.replace(/_/g, ' ')}</option>)}</select></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button title="Simpan tahap" onClick={handleSaveRule} disabled={ruleSaving} className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"><Check className="w-3 h-3" /></button>
                            <button title="Batal tambah tahap" onClick={() => setAddingRule(false)} className="p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"><X className="w-3 h-3" /></button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {rules.length === 0 && !addingRule ? (
                      <tr><td colSpan="6" className="px-4 py-10 text-center text-neutral-400">Belum ada tahap approval. Klik "Tambah tahap" untuk memulai.</td></tr>
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
                            <td className="px-3 py-2"><input type="number" value={editingRule.min_amount ?? ''} onChange={e => setEditingRule(r => ({ ...r, min_amount: e.target.value }))} className="w-full text-xs text-right bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                            <td className="px-3 py-2"><input type="number" placeholder="∞" value={editingRule.max_amount ?? ''} onChange={e => setEditingRule(r => ({ ...r, max_amount: e.target.value }))} className="w-full text-xs text-right bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500" /></td>
                            <td className="px-3 py-2 text-center"><input type="number" min="1" max="10" value={editingRule.step_number || 1} onChange={e => setEditingRule(r => ({ ...r, step_number: e.target.value }))} className="w-16 text-xs text-center bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 mx-auto block" /></td>
                            <td className="px-3 py-2"><select aria-label="Role tahap approval" value={editingRule.approver_role || ''} onChange={e => setEditingRule(r => ({ ...r, approver_role: e.target.value }))} className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"><option value="">Pilih role</option>{ruleRoleOptions.map(role => <option key={role} value={role}>{ROLE_LABELS[role] || role.replace(/_/g, ' ')}</option>)}</select></td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1.5">
                                <button title="Simpan tahap" onClick={handleSaveRule} disabled={ruleSaving} className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"><Check className="w-3 h-3" /></button>
                                <button title="Batal ubah tahap" onClick={() => setEditingRuleId(null)} className="p-1.5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"><X className="w-3 h-3" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">{MODULE_LABELS[rule.module] || rule.module}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">Rp {Number(rule.min_amount || 0).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-neutral-600 dark:text-neutral-400">{rule.max_amount != null && rule.max_amount !== '' ? `Rp ${Number(rule.max_amount).toLocaleString('id-ID')}` : 'Tanpa batas'}</td>
                            <td className="px-4 py-3 text-center font-black text-blue-600 dark:text-blue-400">{rule.step_number}</td>
                            <td className="px-4 py-3"><span className="text-[11px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-lg text-neutral-700 dark:text-neutral-300">{ROLE_LABELS[rule.approver_role] || rule.approver_role.replace(/_/g, ' ')}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button title="Ubah tahap" onClick={() => { setEditingRuleId(rule.id); setEditingRule({ module: rule.module, min_amount: rule.min_amount ?? 0, max_amount: rule.max_amount ?? '', step_number: rule.step_number, approver_role: rule.approver_role }); setAddingRule(false); }}
                                  className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button title="Hapus tahap" onClick={() => handleDeleteRule(rule.id)}
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
          </div>}

          <div className="bg-blue-500/10 border border-blue-300/60 text-blue-700 dark:text-blue-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-2">
            <ArrowUpDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <InlineHelp summary="Tier berlaku pada alur otomatis. Daftar approver manual masih mengikuti urutan dokumen." label="Cakupan tier saat ini">Sistem mencocokkan jenis pengajuan, rentang nominal, dan nomor tahap. Validasi tier pada daftar approver manual belum diterapkan. Payment Request dengan peringatan overbudget memiliki eskalasi tambahan ke CFO / CEO. Reimbursement memakai persetujuan Finance, sedangkan closing mengikuti Marketing Head lalu Kadiv.</InlineHelp>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div><h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Tier siap? Siapkan daftar approver.</h3><p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Simpan nama dan email di direktori, lalu pilih orangnya saat pengajuan.</p></div>
            <button type="button" onClick={() => setActiveTab('signers')} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700">Buka Direktori Approver <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
