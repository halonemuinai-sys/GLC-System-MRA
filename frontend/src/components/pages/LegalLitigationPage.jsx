'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gavel,
  Search,
  Plus,
  X,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileText,
  Activity,
  Maximize2,
  Edit3,
  Trash2,
  ExternalLink,
  Lock,
  History,
  Download,
  Scale,
  Landmark
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import ComplianceDatePicker from '@/components/ui/ComplianceDatePicker';

const CATEGORY_OPTIONS = ['Gugatan', 'Somasi', 'Mediasi', 'Arbitrase', 'Lainnya'];
const CASE_STATUS_OPTIONS = ['Filed', 'In Progress', 'Mediation', 'Settlement', 'Won', 'Lost', 'Appeal', 'Closed'];
const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const CONFIDENTIALITY_OPTIONS = ['Public', 'Internal', 'Restricted', 'Confidential', 'Strictly Confidential'];
const HEARING_STATUS_OPTIONS = ['Valid', 'Warning', 'Critical', 'Expired'];

const CASE_STATUS_BADGE = {
  Filed: 'bg-neutral-200/60 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300',
  'In Progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Mediation: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Settlement: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  Won: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Lost: 'bg-red-500/10 text-red-600 dark:text-red-400',
  Appeal: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Closed: 'bg-neutral-200/60 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300'
};

const RISK_BADGE = {
  Low: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  High: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Critical: 'bg-red-500/10 text-red-600 dark:text-red-400'
};

const CONFIDENTIALITY_BADGE = {
  Public: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Internal: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Restricted: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Confidential: 'bg-red-500/10 text-red-600 dark:text-red-400',
  'Strictly Confidential': 'bg-red-500/10 text-red-600 dark:text-red-400'
};

const HEARING_STATUS_BADGE = {
  Valid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Critical: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Expired: 'bg-red-500/10 text-red-600 dark:text-red-400'
};

const ACTION_LABEL = { CREATE: 'Dibuat', UPDATE: 'Diubah', DELETE: 'Dihapus' };

const defaultFormData = {
  company_id: '',
  case_number: '',
  doc_name: '',
  category: '',
  court_name: '',
  opposing_party: '',
  business_unit: '',
  pic: '',
  external_counsel: '',
  case_status: 'Filed',
  risk_level: '',
  claim_amount: '',
  settlement_amount: '',
  filing_date: '',
  next_hearing_date: '',
  closing_date: '',
  confidentiality: 'Confidential',
  document_url: '',
  notes: ''
};

const formatIDR = (val) => {
  if (val === null || val === undefined || val === '') return '-';
  return `Rp ${Number(val).toLocaleString('id-ID')}`;
};

function SearchableCompanySelect({ companies, value, onChange, placeholder = 'Select Company (Type to search...)' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCompany = companies.find(c => String(c.id) === String(value));
  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[38px] select-none"
      >
        <span className={selectedCompany ? 'text-neutral-850 dark:text-neutral-200 font-medium truncate' : 'text-neutral-400 truncate'}>
          {selectedCompany ? selectedCompany.name : placeholder}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); setSearchQuery(''); }}
              className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[9px] text-neutral-400">▼</span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 w-full mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-2 space-y-1"
            >
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-44 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { onChange(''); setSearchQuery(''); setIsOpen(false); }}
                  className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-neutral-50 dark:hover:bg-neutral-800/45 text-neutral-400 transition-colors"
                >
                  All Companies (PT)
                </button>
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-3 text-center text-xs text-neutral-400">No companies found</div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { onChange(c.id); setSearchQuery(''); setIsOpen(false); }}
                      className={`w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium ${
                        String(c.id) === String(value) ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchingRadarAnimation() {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center select-none pointer-events-none mb-3">
      <motion.div
        className="absolute w-36 h-36 rounded-full border border-indigo-500/20 dark:border-indigo-400/10 bg-indigo-500/5 dark:bg-indigo-400/5"
        animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-violet-500/15 dark:border-violet-400/5"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute w-40 h-40 rounded-full border border-dashed border-indigo-500/30 dark:border-indigo-400/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute w-40 h-40 overflow-hidden rounded-full pointer-events-none z-10">
        <motion.div
          className="w-full h-full bg-gradient-to-tr from-transparent via-transparent to-indigo-500/10 origin-center"
          style={{ transformOrigin: '50% 50%' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        />
      </div>
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-indigo-500 top-12 left-16 shadow-lg shadow-indigo-500/50"
        animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-violet-500 bottom-16 right-12 shadow-lg shadow-violet-500/50"
        animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <motion.div
        className="relative z-20 w-16 h-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl flex items-center justify-center shadow-lg shadow-neutral-900/5 dark:shadow-black/40"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Gavel className="w-7 h-7 text-indigo-500" />
      </motion.div>
    </div>
  );
}

export default function LegalLitigationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCount: 0, activeCount: 0, criticalCount: 0, closedCount: 0 });
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [companyMasterId, setCompanyMasterId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [caseStatus, setCaseStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [hearingStatus, setHearingStatus] = useState('');

  const [tempSearch, setTempSearch] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempCompanyMasterId, setTempCompanyMasterId] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');
  const [tempCaseStatus, setTempCaseStatus] = useState('');
  const [tempRiskLevel, setTempRiskLevel] = useState('');
  const [tempHearingStatus, setTempHearingStatus] = useState('');

  const [hasProcessed, setHasProcessed] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [companyMasters, setCompanyMasters] = useState([]);

  const [selectedCase, setSelectedCase] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const [formData, setFormData] = useState({ ...defaultFormData });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedIds([]);

      const res = await apiClient.get('/api/legal/litigation', {
        params: {
          page,
          limit: 20,
          search,
          category: category || undefined,
          companyId: companyId || undefined,
          companyMasterId: !companyId && companyMasterId ? companyMasterId : undefined,
          caseStatus: caseStatus || undefined,
          riskLevel: riskLevel || undefined,
          hearingStatus: hearingStatus || undefined
        }
      });

      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
      setSummary(res.summary || { totalCount: 0, activeCount: 0, criticalCount: 0, closedCount: 0 });
    } catch (err) {
      setError(err.message || 'Failed to fetch litigation cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [comps, masters] = await Promise.all([
          apiClient.get('/api/master/companies/all'),
          apiClient.get('/api/master/companies/master')
        ]);
        setCompanies(comps || []);
        setCompanyMasters(masters || []);
      } catch (err) {
        console.error('Failed to fetch master data', err);
      }
    };
    fetchMasterData();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasProcessed) fetchData();
  }, [page, search, category, companyMasterId, companyId, caseStatus, riskLevel, hearingStatus, hasProcessed]);

  const handleProcessFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setCategory(tempCategory);
    setCompanyMasterId(tempCompanyMasterId);
    setCompanyId(tempCompanyId);
    setCaseStatus(tempCaseStatus);
    setRiskLevel(tempRiskLevel);
    setHearingStatus(tempHearingStatus);
    setHasProcessed(true);
  };

  // Saat Holding Group dipilih, persempit pilihan PT ke entitas di bawah grup tersebut
  const filteredCompaniesForGroup = tempCompanyMasterId
    ? companies.filter(c => String(c.company_master_id) === String(tempCompanyMasterId))
    : companies;

  const handleCloseAddDrawer = () => {
    setShowAddDrawer(false);
    setEditingCase(null);
    setFormData({ ...defaultFormData });
  };

  const openEditCase = (c) => {
    setEditingCase(c);
    setFormData({
      company_id: c.company_id ? String(c.company_id) : '',
      case_number: c.case_number || '',
      doc_name: c.doc_name || '',
      category: c.category || '',
      court_name: c.court_name || '',
      opposing_party: c.opposing_party || '',
      business_unit: c.business_unit || '',
      pic: c.pic || '',
      external_counsel: c.external_counsel || '',
      case_status: c.case_status || 'Filed',
      risk_level: c.risk_level || '',
      claim_amount: c.claim_amount !== null && c.claim_amount !== undefined ? String(c.claim_amount) : '',
      settlement_amount: c.settlement_amount !== null && c.settlement_amount !== undefined ? String(c.settlement_amount) : '',
      filing_date: c.filing_date ? c.filing_date.split('T')[0] : '',
      next_hearing_date: c.next_hearing_date ? c.next_hearing_date.split('T')[0] : '',
      closing_date: c.closing_date ? c.closing_date.split('T')[0] : '',
      confidentiality: c.confidentiality || 'Confidential',
      document_url: c.document_url || '',
      notes: c.notes || ''
    });
    setShowAddDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doc_name || !formData.category || !formData.pic) {
      alert('Judul Kasus, Kategori, dan PIC wajib diisi.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = { ...formData, company_id: formData.company_id ? Number(formData.company_id) : null };

      if (editingCase) {
        await apiClient.put(`/api/legal/litigation/${editingCase.id}`, payload);
      } else {
        await apiClient.post('/api/legal/litigation', payload);
      }

      handleCloseAddDrawer();
      if (!editingCase) setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save case');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (c) => {
    setSelectedCase(c);
    setDetailLoading(true);
    try {
      const full = await apiClient.get(`/api/legal/litigation/${c.id}`);
      setSelectedCase(full);
    } catch (err) {
      console.error('Failed to fetch case detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteCase = (c) => setCaseToDelete(c);

  const confirmDeleteCase = async () => {
    if (!caseToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/legal/litigation/${caseToDelete.id}`);
      fetchData();
      if (selectedCase && selectedCase.id === caseToDelete.id) setSelectedCase(null);
      setCaseToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete case');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    const pageIds = data.map(d => d.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(id => !pageIds.includes(id)) : [...new Set([...prev, ...pageIds])]);
  };
  const handleBulkDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} kasus terpilih?`)) return;
    setDeletingBulk(true);
    try {
      await Promise.all(selectedIds.map(id => apiClient.delete(`/api/legal/litigation/${id}`)));
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus beberapa kasus');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/api/legal/litigation', {
        params: { limit: 9999, search, category: category || undefined, companyId: companyId || undefined, caseStatus: caseStatus || undefined }
      });
      const rows = res.data || [];
      const headers = ['Nomor Perkara', 'Nama Kasus', 'Kategori', 'Pengadilan', 'Pihak Lawan', 'Perusahaan', 'PIC', 'Kuasa Hukum', 'Status Kasus', 'Risk Level', 'Nilai Gugatan', 'Nilai Settlement', 'Tgl Pengajuan', 'Tgl Sidang Berikutnya', 'Catatan'];
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const csvRows = [
        headers.join(','),
        ...rows.map(r => [
          r.case_number, r.doc_name, r.category, r.court_name, r.opposing_party, r.m_company?.name, r.pic, r.external_counsel,
          r.case_status, r.risk_level, r.claim_amount, r.settlement_amount,
          r.filing_date ? r.filing_date.split('T')[0] : '', r.next_hearing_date ? r.next_hearing_date.split('T')[0] : '', r.notes
        ].map(escapeCSV).join(','))
      ];
      const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `litigation_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Gagal mengekspor data');
    } finally {
      setExporting(false);
    }
  };

  const daysLabel = (days) => {
    if (days === null || days === undefined) return null;
    if (days < 0) return `Lewat ${Math.abs(days)} hari lalu`;
    if (days === 0) return 'Sidang hari ini!';
    return `${days} hari lagi`;
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Gavel className="w-6 h-6 text-indigo-500" />
            Litigation & Dispute
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Pengelolaan kasus sengketa dan litigasi MRA Group — tracking sidang, risiko, dan nilai gugatan.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasProcessed && (
            <button onClick={handleExportCSV} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-neutral-200 dark:border-neutral-800 shadow-sm w-fit disabled:opacity-50">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export CSV
            </button>
          )}
          <button onClick={() => { setEditingCase(null); setFormData({ ...defaultFormData }); setShowAddDrawer(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit">
            <Plus className="w-4 h-4" />
            Tambah Kasus
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
        <form onSubmit={handleProcessFilter} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari nama kasus, nomor perkara, pihak lawan, PIC..."
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
              />
            </div>
            <select
              value={tempCompanyMasterId}
              onChange={(e) => { setTempCompanyMasterId(e.target.value); setTempCompanyId(''); }}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">All Holding Groups</option>
              {companyMasters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <SearchableCompanySelect companies={filteredCompaniesForGroup} value={tempCompanyId} onChange={setTempCompanyId} placeholder="All Companies (PT)" />
            <select value={tempCategory} onChange={(e) => setTempCategory(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <select value={tempCaseStatus} onChange={(e) => setTempCaseStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Case Status</option>
              {CASE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempRiskLevel} onChange={(e) => setTempRiskLevel(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Risk Levels</option>
              {RISK_LEVEL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempHearingStatus} onChange={(e) => setTempHearingStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Hearing Status</option>
              {HEARING_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2.5 lg:col-span-2">
              {hasProcessed && (
                <button type="button" onClick={() => {
                  setTempSearch(''); setTempCategory(''); setTempCompanyMasterId(''); setTempCompanyId(''); setTempCaseStatus(''); setTempRiskLevel(''); setTempHearingStatus('');
                  setSearch(''); setCategory(''); setCompanyMasterId(''); setCompanyId(''); setCaseStatus(''); setRiskLevel(''); setHearingStatus('');
                  setHasProcessed(false);
                  setData([]);
                }} className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer text-center">
                  Reset
                </button>
              )}
              <button type="submit" className="flex-1 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10">
                <Activity className="w-4 h-4" />
                Proses Data
              </button>
            </div>
          </div>
        </form>
      </div>

      {!hasProcessed ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[380px] overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
            <motion.div className="absolute w-32 h-32 rounded-full bg-indigo-500/5 -top-10 -left-10 blur-2xl" animate={{ x: [0, 15, 0], y: [0, 20, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />
            <motion.div className="absolute w-44 h-44 rounded-full bg-violet-500/5 -bottom-16 -right-16 blur-2xl" animate={{ x: [0, -20, 0], y: [0, -15, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
          <SearchingRadarAnimation />
          <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }} className="text-lg font-black text-neutral-800 dark:text-white relative z-10">
            Filter & Proses Data Litigation
          </motion.h3>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }} className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed relative z-10">
            Pilih kriteria pencarian dan filter di atas, lalu klik tombol <strong className="text-indigo-500 font-bold">"Proses Data"</strong> untuk memuat data kasus dan statistik ringkas.
          </motion.p>
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 dark:from-indigo-950/20 dark:via-violet-950/25 dark:to-neutral-900 border border-indigo-500/20 dark:border-indigo-500/15 p-4.5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-500/5 pointer-events-none"><Gavel className="w-28 h-28" /></div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30"><Gavel className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Kasus</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.totalCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500"><Scale className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Kasus Aktif</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.activeCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Mendekati Sidang</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.criticalCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-neutral-500/10 flex items-center justify-center text-neutral-500"><FileText className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Kasus Ditutup</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.closedCount}</h3>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-neutral-400">Loading data...</span>
              </div>
            ) : error ? (
              <div className="py-20 text-center text-red-500 text-xs">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                {error}
              </div>
            ) : data.length === 0 ? (
              <div className="py-20 text-center text-neutral-400 text-xs">
                <Gavel className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                Tidak ada kasus ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 w-10">
                        <input type="checkbox" checked={data.length > 0 && data.every(d => selectedIds.includes(d.id))} onChange={toggleSelectAll} className="rounded border-neutral-300 dark:border-neutral-700" title="Pilih semua baris" />
                      </th>
                      <th className="p-4">Nama Kasus</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">PIC</th>
                      <th className="p-4">Tgl Sidang</th>
                      <th className="p-4">Risk</th>
                      <th className="p-4">Status Kasus</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {data.map((c, idx) => (
                      <motion.tr
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={c.id}
                        className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors ${selectedIds.includes(c.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/10' : ''}`}
                      >
                        <td className="p-4">
                          <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-neutral-300 dark:border-neutral-700" title={`Pilih ${c.doc_name}`} />
                        </td>
                        <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">
                          {c.doc_name}
                          {c.case_number && <span className="block text-[10px] font-mono text-neutral-400 mt-0.5">{c.case_number}</span>}
                        </td>
                        <td className="p-4 text-neutral-500">{c.category}</td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium">{c.m_company?.name || '-'}</td>
                        <td className="p-4 text-neutral-500">{c.pic}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 font-medium ${c.hearing_status === 'Critical' || c.hearing_status === 'Expired' ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {c.next_hearing_date ? new Date(c.next_hearing_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                          </span>
                          {c.hearing_status && (
                            <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${HEARING_STATUS_BADGE[c.hearing_status] || HEARING_STATUS_BADGE.Valid}`}>{c.hearing_status}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {c.risk_level && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[c.risk_level] || RISK_BADGE.Low}`}>{c.risk_level}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${CASE_STATUS_BADGE[c.case_status] || CASE_STATUS_BADGE.Filed}`}>{c.case_status || 'Filed'}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {c.document_url && (
                              <a href={c.document_url} target="_blank" rel="noopener noreferrer" className="p-1 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" title="Open Document File">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button onClick={() => handleViewDetail(c)} className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer" title="View Details">
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditCase(c)} className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer" title="Edit">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <motion.button type="button" onClick={() => handleDeleteCase(c)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer" title="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400 select-none">
                <span>Showing Page {meta.page} of {meta.totalPages} ({meta.total} items)</span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button disabled={page === meta.totalPages} onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[900] bg-neutral-900 dark:bg-neutral-800 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center gap-4">
            <span className="text-xs font-bold">{selectedIds.length} item terpilih</span>
            <div className="w-px h-4 bg-white/20" />
            <button type="button" onClick={handleBulkDelete} disabled={deletingBulk} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50">
              <Trash2 className="w-3.5 h-3.5" />
              {deletingBulk ? 'Menghapus...' : 'Hapus Terpilih'}
            </button>
            <button type="button" onClick={() => setSelectedIds([])} disabled={deletingBulk} className="text-xs font-bold text-neutral-300 hover:text-white transition-colors cursor-pointer">Batal</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedCase && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSelectedCase(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm flex items-center gap-2">
                    Case Detail
                    {detailLoading && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                  </h3>
                  <button onClick={() => setSelectedCase(null)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Nama Kasus</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedCase.doc_name}</h2>
                    <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">{selectedCase.case_number || 'Nomor Perkara / Referensi'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Kategori</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedCase.category}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Pengadilan / Forum</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium flex items-center gap-1"><Landmark className="w-3 h-3 text-neutral-400" />{selectedCase.court_name || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Pihak Lawan</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedCase.opposing_party || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Company</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedCase.m_company?.name || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Business Unit</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedCase.business_unit || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">PIC</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedCase.pic}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Kuasa Hukum Eksternal</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedCase.external_counsel || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Pengajuan</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedCase.filing_date ? new Date(selectedCase.filing_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Sidang Berikutnya</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-slate-200">
                        {selectedCase.next_hearing_date ? new Date(selectedCase.next_hearing_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                        {selectedCase.days_until_hearing !== null && selectedCase.days_until_hearing !== undefined && (
                          <span className="ml-1 text-[10px] text-neutral-400 font-normal">({daysLabel(selectedCase.days_until_hearing)})</span>
                        )}
                      </span>
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Penutupan Kasus</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedCase.closing_date ? new Date(selectedCase.closing_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status Kasus</span><span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${CASE_STATUS_BADGE[selectedCase.case_status] || CASE_STATUS_BADGE.Filed}`}>{selectedCase.case_status || 'Filed'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Risk Level</span>
                      {selectedCase.risk_level ? <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[selectedCase.risk_level] || RISK_BADGE.Low}`}>{selectedCase.risk_level}</span> : <span className="text-xs text-neutral-400">-</span>}
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Klasifikasi</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium flex items-center gap-1"><Lock className="w-3 h-3 text-neutral-400" />{selectedCase.confidentiality || 'Confidential'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Nilai Gugatan</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-bold">{formatIDR(selectedCase.claim_amount)}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Nilai Settlement</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-bold">{formatIDR(selectedCase.settlement_amount)}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Catatan</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedCase.notes || 'Tidak ada catatan.'}</p>
                  </div>

                  {selectedCase.document_url && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><FileText className="w-4 h-4" /></div>
                        <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">Dokumen / DMS Link</span>
                      </div>
                      <a href={selectedCase.document_url} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />Open
                      </a>
                    </div>
                  )}

                  {selectedCase.legal_litigation_audit_logs?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Riwayat Aktivitas</span>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedCase.legal_litigation_audit_logs.map(log => (
                          <div key={log.id} className="flex items-center justify-between text-[11px] bg-neutral-50 dark:bg-neutral-950 rounded-lg px-3 py-2 border border-neutral-100 dark:border-neutral-800">
                            <span className="font-bold text-neutral-700 dark:text-neutral-300">{ACTION_LABEL[log.action] || log.action}</span>
                            <span className="text-neutral-400">{log.performed_by}</span>
                            <span className="text-neutral-400">{new Date(log.performed_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                <button type="button" onClick={() => { setSelectedCase(null); openEditCase(selectedCase); }} className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-indigo-200/50 dark:border-indigo-900/30">Edit</button>
                <button type="button" onClick={() => handleDeleteCase(selectedCase)} className="flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-red-200/50 dark:border-red-900/30">Hapus</button>
                <button onClick={() => setSelectedCase(null)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-850 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center">Tutup</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add/Edit Drawer */}
      <AnimatePresence>
        {showAddDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={handleCloseAddDrawer} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">{editingCase ? `Edit — ${editingCase.doc_name}` : 'Tambah Kasus Litigation'}</h3>
                  <button onClick={handleCloseAddDrawer} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
                  {/* Section: Informasi Kasus */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Informasi Kasus</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nama / Judul Kasus *</label>
                    <input required type="text" placeholder="e.g. Gugatan Perdata PT XYZ vs MRA" value={formData.doc_name} onChange={(e) => setFormData({ ...formData, doc_name: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Kategori *</label>
                      <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">— Pilih Kategori —</option>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nomor Perkara / Referensi</label>
                      <input type="text" placeholder="No. perkara" value={formData.case_number} onChange={(e) => setFormData({ ...formData, case_number: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Pengadilan / Forum</label>
                      <input type="text" placeholder="e.g. PN Jakarta Selatan" value={formData.court_name} onChange={(e) => setFormData({ ...formData, court_name: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Pihak Lawan</label>
                      <input type="text" placeholder="e.g. PT ABC" value={formData.opposing_party} onChange={(e) => setFormData({ ...formData, opposing_party: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>

                  {/* Section: Entitas & PIC */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Entitas & PIC</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Perusahaan / Entitas</label>
                    <SearchableCompanySelect companies={companies} value={formData.company_id} onChange={(val) => setFormData({ ...formData, company_id: val })} placeholder="Select Company" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Business Unit</label>
                      <input type="text" placeholder="e.g. Legal & Compliance" value={formData.business_unit} onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">PIC *</label>
                      <input required type="text" placeholder="Nama PIC" value={formData.pic} onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Kuasa Hukum Eksternal</label>
                    <input type="text" placeholder="e.g. Law Firm ABC & Partners" value={formData.external_counsel} onChange={(e) => setFormData({ ...formData, external_counsel: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Tanggal & Status */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tanggal & Status</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tgl Pengajuan</label>
                      <ComplianceDatePicker value={formData.filing_date} onChange={(val) => setFormData({ ...formData, filing_date: val })} placeholder="Pilih tanggal pengajuan" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tgl Sidang Berikutnya</label>
                      <ComplianceDatePicker value={formData.next_hearing_date} onChange={(val) => setFormData({ ...formData, next_hearing_date: val })} placeholder="Pilih tanggal sidang" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tgl Penutupan Kasus</label>
                    <ComplianceDatePicker value={formData.closing_date} onChange={(val) => setFormData({ ...formData, closing_date: val })} placeholder="Pilih tanggal penutupan (jika sudah selesai)" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status Kasus *</label>
                    <select required value={formData.case_status} onChange={(e) => setFormData({ ...formData, case_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                      {CASE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Section: Risk & Kerahasiaan */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Risk & Kerahasiaan</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Risk Level</label>
                      <select value={formData.risk_level} onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {RISK_LEVEL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Klasifikasi Kerahasiaan *</label>
                      <select required value={formData.confidentiality} onChange={(e) => setFormData({ ...formData, confidentiality: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        {CONFIDENTIALITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Section: Nilai Perkara */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Nilai Perkara</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nilai Gugatan (IDR)</label>
                      <input type="number" min="0" placeholder="e.g. 500000000" value={formData.claim_amount} onChange={(e) => setFormData({ ...formData, claim_amount: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nilai Settlement (IDR)</label>
                      <input type="number" min="0" placeholder="e.g. 150000000" value={formData.settlement_amount} onChange={(e) => setFormData({ ...formData, settlement_amount: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>

                  {/* Section: Dokumen Pendukung */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Dokumen Pendukung</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">URL Dokumen / DMS</label>
                    <input type="url" placeholder="https://drive.google.com/..." value={formData.document_url} onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Catatan Internal</label>
                    <textarea rows={2} placeholder="Catatan tambahan..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button type="button" onClick={handleCloseAddDrawer} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center">Batal</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40">
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingCase ? 'Simpan Perubahan' : 'Tambah Kasus')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {caseToDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setCaseToDelete(null)} className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 15 }} transition={{ type: 'spring', duration: 0.35 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <motion.div className="absolute inset-0 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-sm" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                  <div className="relative w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center"><AlertTriangle className="w-6 h-6 animate-pulse" /></div>
                </div>
                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus Kasus</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong className="text-red-500 dark:text-red-400 font-bold">"{caseToDelete.doc_name}"</strong>? Tindakan ini bersifat permanen dan akan tercatat di riwayat aktivitas.
                </p>
                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button type="button" onClick={() => setCaseToDelete(null)} disabled={submitting} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50">Batal</button>
                  <button type="button" onClick={confirmDeleteCase} disabled={submitting} className="flex-1 py-2 bg-red-650 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/25 disabled:opacity-50">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Ya, Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
