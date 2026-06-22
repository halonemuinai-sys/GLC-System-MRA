'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
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
  Download
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const CATEGORY_OPTIONS = ['Finance SOP', 'HR Policy', 'Code of Conduct', 'Procurement Policy', 'IT Security Policy', 'Operational SOP', 'Compliance Policy', 'Risk Management Policy', 'Whistleblowing Policy', 'Data Privacy Policy'];
const DOC_STATUS_OPTIONS = ['Draft', 'Under Review', 'Approved', 'Active', 'Obsolete', 'Archived'];
const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const DOCUMENT_CLASSIFICATION_OPTIONS = ['Controlled Document', 'Uncontrolled Document'];
const CONFIDENTIALITY_OPTIONS = ['Public', 'Internal', 'Restricted', 'Confidential', 'Strictly Confidential'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const TRAINING_STATUS_OPTIONS = ['Not Started', 'On Going', 'Completed'];
const DISTRIBUTION_STATUS_OPTIONS = ['Not Distributed', 'Partially Distributed', 'Fully Distributed'];
const ACKNOWLEDGEMENT_STATUS_OPTIONS = ['Pending', 'Acknowledged', 'Not Acknowledged'];
const REVIEW_FREQUENCY_OPTIONS = ['Monthly', 'Quarterly', 'Semi Annual', 'Annual', 'Every 2 Years'];
const ARCHIVE_STATUS_OPTIONS = ['Active Archive', 'Inactive Archive', 'Ready for Disposal'];
const EXPIRY_STATUS_OPTIONS = ['Valid', 'Warning', 'Critical', 'Expired'];
const APPROVAL_STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Need Revision'];
const WORKFLOW_STATUS_OPTIONS = ['Open', 'On Review', 'Approved', 'Closed', 'Archived'];
const AUDIT_STATUS_OPTIONS = ['Not Started', 'On Progress', 'Completed', 'Overdue'];

const DOC_STATUS_BADGE = {
  Draft: 'bg-neutral-200/60 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300',
  'Under Review': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Approved: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Obsolete: 'bg-red-500/10 text-red-600 dark:text-red-400',
  Archived: 'bg-neutral-200/60 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300'
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

const EXPIRY_STATUS_BADGE = {
  Valid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Critical: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Expired: 'bg-red-500/10 text-red-600 dark:text-red-400'
};

const APPROVAL_STATUS_BADGE = {
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  'Need Revision': 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
};

const ACTION_LABEL = { CREATE: 'Dibuat', UPDATE: 'Diubah', DELETE: 'Dihapus' };

const defaultFormData = {
  company_id: '',
  doc_name: '',
  category: '',
  id_number: '',
  version: '',
  business_unit: '',
  process_owner: '',
  document_owner: '',
  pic: '',
  issue_date: '',
  effective_date: '',
  review_date: '',
  expiry_date: '',
  last_revision_date: '',
  doc_status: 'Draft',
  risk_level: '',
  document_classification: '',
  confidentiality: 'Public',
  controlled_copy: '',
  approval_status: '',
  approval_authority: '',
  workflow_status: '',
  change_request_number: '',
  audit_requirement: '',
  audit_status: '',
  regulatory_reference: '',
  policy_objective: '',
  scope_of_application: '',
  related_sop_policy: '',
  revision_notes: '',
  training_required: '',
  training_status: '',
  distribution_status: '',
  acknowledgement_status: '',
  review_frequency: '',
  retention_period: '',
  archive_status: '',
  document_url: '',
  supporting_documents: '',
  legal_compliance_notes: '',
  notes: ''
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
        <BookOpen className="w-7 h-7 text-indigo-500" />
      </motion.div>
    </div>
  );
}

export default function ComplianceSopPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCount: 0, activeCount: 0, expiringSoonCount: 0, expiredCount: 0 });
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [companyMasterId, setCompanyMasterId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [docStatus, setDocStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [archiveStatus, setArchiveStatus] = useState('');
  const [expiryStatus, setExpiryStatus] = useState('');

  const [tempSearch, setTempSearch] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempCompanyMasterId, setTempCompanyMasterId] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');
  const [tempDocStatus, setTempDocStatus] = useState('');
  const [tempRiskLevel, setTempRiskLevel] = useState('');
  const [tempArchiveStatus, setTempArchiveStatus] = useState('');
  const [tempExpiryStatus, setTempExpiryStatus] = useState('');

  const [hasProcessed, setHasProcessed] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [companyMasters, setCompanyMasters] = useState([]);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const [formData, setFormData] = useState({ ...defaultFormData });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedIds([]);

      const res = await apiClient.get('/api/compliance/sop', {
        params: {
          page,
          limit: 20,
          search,
          category: category || undefined,
          companyId: companyId || undefined,
          companyMasterId: !companyId && companyMasterId ? companyMasterId : undefined,
          docStatus: docStatus || undefined,
          riskLevel: riskLevel || undefined,
          archiveStatus: archiveStatus || undefined,
          expiryStatus: expiryStatus || undefined
        }
      });

      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
      setSummary(res.summary || { totalCount: 0, activeCount: 0, expiringSoonCount: 0, expiredCount: 0 });
    } catch (err) {
      setError(err.message || 'Failed to fetch SOP & Policy records');
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
  }, [page, search, category, companyMasterId, companyId, docStatus, riskLevel, archiveStatus, expiryStatus, hasProcessed]);

  const handleProcessFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setCategory(tempCategory);
    setCompanyMasterId(tempCompanyMasterId);
    setCompanyId(tempCompanyId);
    setDocStatus(tempDocStatus);
    setRiskLevel(tempRiskLevel);
    setArchiveStatus(tempArchiveStatus);
    setExpiryStatus(tempExpiryStatus);
    setHasProcessed(true);
  };

  const filteredCompaniesForGroup = tempCompanyMasterId
    ? companies.filter(c => String(c.company_master_id) === String(tempCompanyMasterId))
    : companies;

  const handleCloseAddDrawer = () => {
    setShowAddDrawer(false);
    setEditingRecord(null);
    setFormData({ ...defaultFormData });
  };

  const openEditRecord = (rec) => {
    setEditingRecord(rec);
    setFormData({
      company_id: rec.company_id ? String(rec.company_id) : '',
      doc_name: rec.doc_name || '',
      category: rec.category || '',
      id_number: rec.id_number || '',
      version: rec.version || '',
      business_unit: rec.business_unit || '',
      process_owner: rec.process_owner || '',
      document_owner: rec.document_owner || '',
      pic: rec.pic || '',
      issue_date: rec.issue_date ? rec.issue_date.split('T')[0] : '',
      effective_date: rec.effective_date ? rec.effective_date.split('T')[0] : '',
      review_date: rec.review_date ? rec.review_date.split('T')[0] : '',
      expiry_date: rec.expiry_date ? rec.expiry_date.split('T')[0] : '',
      last_revision_date: rec.last_revision_date ? rec.last_revision_date.split('T')[0] : '',
      doc_status: rec.doc_status || 'Draft',
      risk_level: rec.risk_level || '',
      document_classification: rec.document_classification || '',
      confidentiality: rec.confidentiality || 'Public',
      controlled_copy: rec.controlled_copy || '',
      approval_status: rec.approval_status || '',
      approval_authority: rec.approval_authority || '',
      workflow_status: rec.workflow_status || '',
      change_request_number: rec.change_request_number || '',
      audit_requirement: rec.audit_requirement || '',
      audit_status: rec.audit_status || '',
      regulatory_reference: rec.regulatory_reference || '',
      policy_objective: rec.policy_objective || '',
      scope_of_application: rec.scope_of_application || '',
      related_sop_policy: rec.related_sop_policy || '',
      revision_notes: rec.revision_notes || '',
      training_required: rec.training_required || '',
      training_status: rec.training_status || '',
      distribution_status: rec.distribution_status || '',
      acknowledgement_status: rec.acknowledgement_status || '',
      review_frequency: rec.review_frequency || '',
      retention_period: rec.retention_period || '',
      archive_status: rec.archive_status || '',
      document_url: rec.document_url || '',
      supporting_documents: rec.supporting_documents || '',
      legal_compliance_notes: rec.legal_compliance_notes || '',
      notes: rec.notes || ''
    });
    setShowAddDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doc_name || !formData.category || !formData.pic) {
      alert('Nama SOP/Policy, Kategori, dan PIC Document Control wajib diisi.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = { ...formData, company_id: formData.company_id ? Number(formData.company_id) : null };

      if (editingRecord) {
        await apiClient.put(`/api/compliance/sop/${editingRecord.id}`, payload);
      } else {
        await apiClient.post('/api/compliance/sop', payload);
      }

      handleCloseAddDrawer();
      if (!editingRecord) setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (rec) => {
    setSelectedRecord(rec);
    setDetailLoading(true);
    try {
      const full = await apiClient.get(`/api/compliance/sop/${rec.id}`);
      setSelectedRecord(full);
    } catch (err) {
      console.error('Failed to fetch record detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteRecord = (rec) => setRecordToDelete(rec);

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/compliance/sop/${recordToDelete.id}`);
      fetchData();
      if (selectedRecord && selectedRecord.id === recordToDelete.id) setSelectedRecord(null);
      setRecordToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete record');
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
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} record terpilih?`)) return;
    setDeletingBulk(true);
    try {
      await Promise.all(selectedIds.map(id => apiClient.delete(`/api/compliance/sop/${id}`)));
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus beberapa record');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/api/compliance/sop', {
        params: { limit: 9999, search, category: category || undefined, companyId: companyId || undefined, docStatus: docStatus || undefined }
      });
      const rows = res.data || [];
      const headers = ['Nomor Dokumen', 'Nama SOP/Policy', 'Versi', 'Kategori', 'Perusahaan', 'Business Unit', 'PIC', 'Status Dokumen', 'Risk Level', 'Tanggal Berlaku', 'Tanggal Kadaluarsa', 'Catatan'];
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const csvRows = [
        headers.join(','),
        ...rows.map(r => [
          r.id_number, r.doc_name, r.version, r.category, r.m_company?.name, r.business_unit, r.pic, r.doc_status, r.risk_level,
          r.effective_date ? r.effective_date.split('T')[0] : '', r.expiry_date ? r.expiry_date.split('T')[0] : '', r.notes
        ].map(escapeCSV).join(','))
      ];
      const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sop_policy_${new Date().toISOString().split('T')[0]}.csv`;
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
    if (days < 0) return `Expired ${Math.abs(days)} hari lalu`;
    if (days === 0) return 'Hari ini kadaluarsa!';
    return `${days} hari lagi`;
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            SOP & Policy
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Pengelolaan SOP dan kebijakan internal GLC MRA — versi, review, training, dan distribusi.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasProcessed && (
            <button onClick={handleExportCSV} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-neutral-200 dark:border-neutral-800 shadow-sm w-fit disabled:opacity-50">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export CSV
            </button>
          )}
          <button onClick={() => { setEditingRecord(null); setFormData({ ...defaultFormData }); setShowAddDrawer(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit">
            <Plus className="w-4 h-4" />
            Tambah SOP/Policy
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
                placeholder="Cari nama SOP/policy, nomor dokumen, PIC..."
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
            <select value={tempDocStatus} onChange={(e) => setTempDocStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Document Status</option>
              {DOC_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempRiskLevel} onChange={(e) => setTempRiskLevel(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Risk Levels</option>
              {RISK_LEVEL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempArchiveStatus} onChange={(e) => setTempArchiveStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Archive Status</option>
              {ARCHIVE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempExpiryStatus} onChange={(e) => setTempExpiryStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Expiry Status</option>
              {EXPIRY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2.5">
              {hasProcessed && (
                <button type="button" onClick={() => {
                  setTempSearch(''); setTempCategory(''); setTempCompanyMasterId(''); setTempCompanyId(''); setTempDocStatus(''); setTempRiskLevel(''); setTempArchiveStatus(''); setTempExpiryStatus('');
                  setSearch(''); setCategory(''); setCompanyMasterId(''); setCompanyId(''); setDocStatus(''); setRiskLevel(''); setArchiveStatus(''); setExpiryStatus('');
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
            Filter & Proses Data SOP & Policy
          </motion.h3>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }} className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed relative z-10">
            Pilih kriteria pencarian dan filter di atas, lalu klik tombol <strong className="text-indigo-500 font-bold">"Proses Data"</strong> untuk memuat data dan statistik ringkas.
          </motion.p>
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 dark:from-indigo-950/20 dark:via-violet-950/25 dark:to-neutral-900 border border-indigo-500/20 dark:border-indigo-500/15 p-4.5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-500/5 pointer-events-none"><BookOpen className="w-28 h-28" /></div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30"><BookOpen className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Dokumen</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.totalCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><FileText className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.activeCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Mendekati Review</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.expiringSoonCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><X className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Expired</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.expiredCount}</h3>
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
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                Tidak ada SOP/Policy ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 w-10">
                        <input type="checkbox" checked={data.length > 0 && data.every(d => selectedIds.includes(d.id))} onChange={toggleSelectAll} className="rounded border-neutral-300 dark:border-neutral-700" title="Pilih semua baris" />
                      </th>
                      <th className="p-4">Nama SOP / Policy</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">PIC</th>
                      <th className="p-4">Tgl Kadaluarsa</th>
                      <th className="p-4">Risk</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {data.map((rec, idx) => (
                      <motion.tr
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={rec.id}
                        className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors ${selectedIds.includes(rec.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/10' : ''}`}
                      >
                        <td className="p-4">
                          <input type="checkbox" checked={selectedIds.includes(rec.id)} onChange={() => toggleSelect(rec.id)} className="rounded border-neutral-300 dark:border-neutral-700" title={`Pilih ${rec.doc_name}`} />
                        </td>
                        <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">
                          {rec.doc_name}
                          {rec.id_number && <span className="block text-[10px] font-mono text-neutral-400 mt-0.5">{rec.id_number}{rec.version ? ` · v${rec.version}` : ''}</span>}
                        </td>
                        <td className="p-4 text-neutral-500">{rec.category}</td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium">{rec.m_company?.name || '-'}</td>
                        <td className="p-4 text-neutral-500">{rec.pic}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 font-medium ${rec.status === 'Critical' || rec.status === 'Expired' ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {rec.expiry_date ? new Date(rec.expiry_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                          </span>
                          {rec.status && (
                            <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${EXPIRY_STATUS_BADGE[rec.status] || EXPIRY_STATUS_BADGE.Valid}`}>{rec.status}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {rec.risk_level && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[rec.risk_level] || RISK_BADGE.Low}`}>{rec.risk_level}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${DOC_STATUS_BADGE[rec.doc_status] || DOC_STATUS_BADGE.Draft}`}>{rec.doc_status || 'Draft'}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {rec.document_url && (
                              <a href={rec.document_url} target="_blank" rel="noopener noreferrer" className="p-1 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" title="Open Document Repository">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button onClick={() => handleViewDetail(rec)} className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer" title="View Details">
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditRecord(rec)} className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer" title="Edit">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <motion.button type="button" onClick={() => handleDeleteRecord(rec)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
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
        {selectedRecord && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSelectedRecord(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm flex items-center gap-2">
                    SOP/Policy Detail
                    {detailLoading && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                  </h3>
                  <button onClick={() => setSelectedRecord(null)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Nama SOP / Policy</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedRecord.doc_name}</h2>
                    <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">{selectedRecord.id_number || 'No Document Number'}{selectedRecord.version ? ` · v${selectedRecord.version}` : ''}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Kategori</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.category}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Company</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.m_company?.name || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Business Unit</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.business_unit || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Process Owner</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.process_owner || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Document Owner</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.document_owner || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">PIC Document Control</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.pic}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Terbit</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.issue_date ? new Date(selectedRecord.issue_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Berlaku</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.effective_date ? new Date(selectedRecord.effective_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Review</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.review_date ? new Date(selectedRecord.review_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Kadaluarsa</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-slate-200">
                        {selectedRecord.expiry_date ? new Date(selectedRecord.expiry_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                        {selectedRecord.days_until_expiry !== null && selectedRecord.days_until_expiry !== undefined && (
                          <span className="ml-1 text-[10px] text-neutral-400 font-normal">({daysLabel(selectedRecord.days_until_expiry)})</span>
                        )}
                      </span>
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Last Revision</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.last_revision_date ? new Date(selectedRecord.last_revision_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status Dokumen</span><span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${DOC_STATUS_BADGE[selectedRecord.doc_status] || DOC_STATUS_BADGE.Draft}`}>{selectedRecord.doc_status || 'Draft'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Risk Level</span>
                      {selectedRecord.risk_level ? <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[selectedRecord.risk_level] || RISK_BADGE.Low}`}>{selectedRecord.risk_level}</span> : <span className="text-xs text-neutral-400">-</span>}
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Document Classification</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.document_classification || '-'}</span></div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Klasifikasi</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium flex items-center gap-1"><Lock className="w-3 h-3 text-neutral-400" />{selectedRecord.confidentiality || 'Public'}</span>
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Controlled Copy</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.controlled_copy || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Approval Status</span>
                      {selectedRecord.approval_status ? <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${APPROVAL_STATUS_BADGE[selectedRecord.approval_status] || APPROVAL_STATUS_BADGE.Pending}`}>{selectedRecord.approval_status}</span> : <span className="text-xs text-neutral-400">-</span>}
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Approval Authority</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.approval_authority || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Workflow Status</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.workflow_status || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Change Request Number</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-mono font-medium">{selectedRecord.change_request_number || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Audit Requirement</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.audit_requirement || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Audit Status</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.audit_status || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Training Required</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.training_required || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Training Status</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.training_status || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Distribution Status</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.distribution_status || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Acknowledgement Status</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.acknowledgement_status || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Review Frequency</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.review_frequency || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Archive Status</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.archive_status || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Policy Objective</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.policy_objective || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Scope of Application</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.scope_of_application || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Regulatory Reference</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.regulatory_reference || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Related SOP / Policy</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.related_sop_policy || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Retention Period</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.retention_period || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Legal / Compliance Notes</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.legal_compliance_notes || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Remarks</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.notes || 'Tidak ada catatan.'}</p>
                  </div>

                  {selectedRecord.document_url && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><FileText className="w-4 h-4" /></div>
                        <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">Document Repository / DMS</span>
                      </div>
                      <a href={selectedRecord.document_url} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />Open
                      </a>
                    </div>
                  )}

                  {selectedRecord.compliance_sop_audit_logs?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Riwayat Aktivitas</span>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedRecord.compliance_sop_audit_logs.map(log => (
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
                <button type="button" onClick={() => { setSelectedRecord(null); openEditRecord(selectedRecord); }} className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-indigo-200/50 dark:border-indigo-900/30">Edit</button>
                <button type="button" onClick={() => handleDeleteRecord(selectedRecord)} className="flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-red-200/50 dark:border-red-900/30">Hapus</button>
                <button onClick={() => setSelectedRecord(null)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-850 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center">Tutup</button>
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">{editingRecord ? `Edit — ${editingRecord.doc_name}` : 'Tambah SOP/Policy'}</h3>
                  <button onClick={handleCloseAddDrawer} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
                  {/* Section: Identitas Dokumen */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Identitas Dokumen</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nama SOP / Policy *</label>
                    <input required type="text" placeholder="e.g. SOP Pengadaan Barang & Jasa" value={formData.doc_name} onChange={(e) => setFormData({ ...formData, doc_name: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Kategori SOP / Policy *</label>
                      <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">— Pilih Kategori —</option>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nomor Dokumen</label>
                      <input type="text" placeholder="e.g. SOP-PROC-001" value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Versi Dokumen</label>
                    <input type="text" placeholder="e.g. 2.1" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Entitas & Owner */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Entitas & Owner</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Perusahaan / Entitas</label>
                    <SearchableCompanySelect companies={companies} value={formData.company_id} onChange={(val) => setFormData({ ...formData, company_id: val })} placeholder="Select Company" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Business Unit / Department</label>
                    <input type="text" placeholder="e.g. Procurement Division" value={formData.business_unit} onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Process Owner</label>
                      <input type="text" placeholder="Nama process owner" value={formData.process_owner} onChange={(e) => setFormData({ ...formData, process_owner: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Owner</label>
                      <input type="text" placeholder="Nama document owner" value={formData.document_owner} onChange={(e) => setFormData({ ...formData, document_owner: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">PIC Document Control *</label>
                    <input required type="text" placeholder="Nama PIC" value={formData.pic} onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Tanggal */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tanggal</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tanggal Terbit</label>
                      <input type="date" value={formData.issue_date} onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tanggal Berlaku</label>
                      <input type="date" value={formData.effective_date} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tanggal Review</label>
                      <input type="date" value={formData.review_date} onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tanggal Kadaluarsa</label>
                      <input type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Last Revision Date</label>
                    <input type="date" value={formData.last_revision_date} onChange={(e) => setFormData({ ...formData, last_revision_date: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Status & Klasifikasi */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Status & Klasifikasi</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status Dokumen *</label>
                      <select required value={formData.doc_status} onChange={(e) => setFormData({ ...formData, doc_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        {DOC_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Risk Level</label>
                      <select value={formData.risk_level} onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {RISK_LEVEL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Classification</label>
                      <select value={formData.document_classification} onChange={(e) => setFormData({ ...formData, document_classification: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {DOCUMENT_CLASSIFICATION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Klasifikasi Kerahasiaan *</label>
                      <select required value={formData.confidentiality} onChange={(e) => setFormData({ ...formData, confidentiality: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        {CONFIDENTIALITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Controlled Copy</label>
                    <select value={formData.controlled_copy} onChange={(e) => setFormData({ ...formData, controlled_copy: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                      <option value="">—</option>
                      {YES_NO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Section: Approval & Change Control */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Approval & Change Control</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Approval Status</label>
                      <select value={formData.approval_status} onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {APPROVAL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Approval Authority</label>
                      <input type="text" placeholder="e.g. Direktur Operasional" value={formData.approval_authority} onChange={(e) => setFormData({ ...formData, approval_authority: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Workflow Status</label>
                      <select value={formData.workflow_status} onChange={(e) => setFormData({ ...formData, workflow_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {WORKFLOW_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Change Request Number</label>
                      <input type="text" placeholder="e.g. CR-2026-014" value={formData.change_request_number} onChange={(e) => setFormData({ ...formData, change_request_number: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Audit Requirement</label>
                      <select value={formData.audit_requirement} onChange={(e) => setFormData({ ...formData, audit_requirement: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {YES_NO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Audit Status</label>
                      <select value={formData.audit_status} onChange={(e) => setFormData({ ...formData, audit_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {AUDIT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Section: Konten & Referensi */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Konten & Referensi</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Regulatory Reference</label>
                    <input type="text" placeholder="e.g. UU No 13/2003 Ketenagakerjaan" value={formData.regulatory_reference} onChange={(e) => setFormData({ ...formData, regulatory_reference: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Policy Objective</label>
                    <textarea rows={2} placeholder="Tujuan kebijakan..." value={formData.policy_objective} onChange={(e) => setFormData({ ...formData, policy_objective: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Scope of Application</label>
                    <textarea rows={2} placeholder="Cakupan penerapan..." value={formData.scope_of_application} onChange={(e) => setFormData({ ...formData, scope_of_application: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Related SOP / Policy</label>
                    <input type="text" placeholder="Dokumen terkait" value={formData.related_sop_policy} onChange={(e) => setFormData({ ...formData, related_sop_policy: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Revision Notes</label>
                    <textarea rows={2} placeholder="Catatan revisi..." value={formData.revision_notes} onChange={(e) => setFormData({ ...formData, revision_notes: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Training & Distribusi */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Training & Distribusi</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Training Required</label>
                      <select value={formData.training_required} onChange={(e) => setFormData({ ...formData, training_required: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {YES_NO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Training Status</label>
                      <select value={formData.training_status} onChange={(e) => setFormData({ ...formData, training_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {TRAINING_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Distribution Status</label>
                      <select value={formData.distribution_status} onChange={(e) => setFormData({ ...formData, distribution_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {DISTRIBUTION_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Acknowledgement Status</label>
                      <select value={formData.acknowledgement_status} onChange={(e) => setFormData({ ...formData, acknowledgement_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {ACKNOWLEDGEMENT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Section: Review & Arsip */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Review & Arsip</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Review Frequency</label>
                      <select value={formData.review_frequency} onChange={(e) => setFormData({ ...formData, review_frequency: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {REVIEW_FREQUENCY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Archive Status</label>
                      <select value={formData.archive_status} onChange={(e) => setFormData({ ...formData, archive_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {ARCHIVE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Retention Period</label>
                    <input type="text" placeholder="e.g. 5 Tahun" value={formData.retention_period} onChange={(e) => setFormData({ ...formData, retention_period: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Dokumen Pendukung */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-pink-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Dokumen Pendukung</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Repository / DMS Link</label>
                    <input type="url" placeholder="https://drive.google.com/..." value={formData.document_url} onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Supporting Documents</label>
                    <input type="text" placeholder="Daftar dokumen pendukung" value={formData.supporting_documents} onChange={(e) => setFormData({ ...formData, supporting_documents: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Legal / Compliance Notes</label>
                    <textarea rows={2} placeholder="Catatan legal/compliance..." value={formData.legal_compliance_notes} onChange={(e) => setFormData({ ...formData, legal_compliance_notes: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Remarks</label>
                    <textarea rows={2} placeholder="Catatan tambahan..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button type="button" onClick={handleCloseAddDrawer} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center">Batal</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40">
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingRecord ? 'Simpan Perubahan' : 'Tambah SOP/Policy')}
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
        {recordToDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setRecordToDelete(null)} className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 15 }} transition={{ type: 'spring', duration: 0.35 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <motion.div className="absolute inset-0 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-sm" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                  <div className="relative w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center"><AlertTriangle className="w-6 h-6 animate-pulse" /></div>
                </div>
                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus SOP/Policy</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong className="text-red-500 dark:text-red-400 font-bold">"{recordToDelete.doc_name}"</strong>? Tindakan ini bersifat permanen dan akan tercatat di riwayat aktivitas.
                </p>
                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button type="button" onClick={() => setRecordToDelete(null)} disabled={submitting} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50">Batal</button>
                  <button type="button" onClick={confirmDeleteRecord} disabled={submitting} className="flex-1 py-2 bg-red-650 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/25 disabled:opacity-50">
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
