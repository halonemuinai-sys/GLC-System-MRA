'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
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
  ShieldCheck
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

const CATEGORY_OPTIONS = ['Regulatory Compliance', 'Corporate Compliance', 'Operational Compliance', 'HR Compliance', 'Tax Compliance', 'Product Compliance', 'Data Privacy Compliance', 'IT Security Compliance', 'Environmental Compliance', 'Anti-Bribery & Anti-Corruption'];
const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const COMPLIANCE_STATUS_OPTIONS = ['Comply', 'Partially Comply', 'Non-Comply', 'Under Review', 'Pending Action'];
const FINDING_STATUS_OPTIONS = ['Open', 'On Progress', 'Resolved', 'Closed', 'Overdue'];
const FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Semi Annual', 'Annual'];
const CONFIDENTIALITY_OPTIONS = ['Public', 'Internal', 'Restricted', 'Confidential', 'Strictly Confidential'];
const TIMELINE_STATUS_OPTIONS = ['On Track', 'Due Soon', 'Overdue', 'Completed'];
const APPROVAL_STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Need Revision'];
const YES_NO_OPTIONS = ['Yes', 'No'];
const AUDIT_TYPE_OPTIONS = ['Internal Audit', 'External Audit', 'Regulatory Audit', 'ISO Audit'];

const COMPLIANCE_STATUS_BADGE = {
  Comply: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'Partially Comply': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'Non-Comply': 'bg-red-500/10 text-red-600 dark:text-red-400',
  'Under Review': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'Pending Action': 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
};

const FINDING_STATUS_BADGE = {
  Open: 'bg-red-500/10 text-red-600 dark:text-red-400',
  'On Progress': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Closed: 'bg-neutral-200/60 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300',
  Overdue: 'bg-red-500/10 text-red-600 dark:text-red-400'
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

const TIMELINE_STATUS_BADGE = {
  'On Track': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'Due Soon': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Overdue: 'bg-red-500/10 text-red-600 dark:text-red-400',
  Completed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
};

const APPROVAL_STATUS_BADGE = {
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  'Need Revision': 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
};

const AUDIT_STATUS_BADGE = {
  Valid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Critical: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  Expired: 'bg-red-500/10 text-red-600 dark:text-red-400'
};

const ACTION_LABEL = { CREATE: 'Dibuat', UPDATE: 'Diubah', DELETE: 'Dihapus' };

const defaultFormData = {
  company_id: '',
  doc_name: '',
  category: '',
  regulatory_authority: '',
  business_unit: '',
  process_activity: '',
  compliance_obligation: '',
  pic: '',
  pic_department: '',
  risk_level: '',
  compliance_status: 'Under Review',
  finding_status: 'Open',
  due_date: '',
  completion_date: '',
  monitoring_frequency: '',
  review_frequency: '',
  policy_sop_reference: '',
  document_url: '',
  confidentiality: 'Public',
  approval_status: '',
  approved_by: '',
  approval_date: '',
  audit_requirement: '',
  audit_type: '',
  last_audit_date: '',
  next_audit_date: '',
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
        <ClipboardList className="w-7 h-7 text-indigo-500" />
      </motion.div>
    </div>
  );
}

export default function ComplianceDocsPage() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCount: 0, complyCount: 0, overdueCount: 0, openFindingCount: 0 });
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [companyMasterId, setCompanyMasterId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [complianceStatus, setComplianceStatus] = useState('');
  const [findingStatus, setFindingStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [timelineStatus, setTimelineStatus] = useState('');

  const [tempSearch, setTempSearch] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempCompanyMasterId, setTempCompanyMasterId] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');
  const [tempComplianceStatus, setTempComplianceStatus] = useState('');
  const [tempFindingStatus, setTempFindingStatus] = useState('');
  const [tempRiskLevel, setTempRiskLevel] = useState('');
  const [tempTimelineStatus, setTempTimelineStatus] = useState('');

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

      const res = await apiClient.get('/api/compliance/monitoring', {
        params: {
          page,
          limit: 20,
          search,
          category: category || undefined,
          companyId: companyId || undefined,
          companyMasterId: !companyId && companyMasterId ? companyMasterId : undefined,
          complianceStatus: complianceStatus || undefined,
          findingStatus: findingStatus || undefined,
          riskLevel: riskLevel || undefined,
          timelineStatus: timelineStatus || undefined
        }
      });

      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
      setSummary(res.summary || { totalCount: 0, complyCount: 0, overdueCount: 0, openFindingCount: 0 });
    } catch (err) {
      setError(err.message || 'Failed to fetch compliance monitoring records');
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
  }, [page, search, category, companyMasterId, companyId, complianceStatus, findingStatus, riskLevel, timelineStatus, hasProcessed]);

  const handleProcessFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setCategory(tempCategory);
    setCompanyMasterId(tempCompanyMasterId);
    setCompanyId(tempCompanyId);
    setComplianceStatus(tempComplianceStatus);
    setFindingStatus(tempFindingStatus);
    setRiskLevel(tempRiskLevel);
    setTimelineStatus(tempTimelineStatus);
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
      regulatory_authority: rec.regulatory_authority || '',
      business_unit: rec.business_unit || '',
      process_activity: rec.process_activity || '',
      compliance_obligation: rec.compliance_obligation || '',
      pic: rec.pic || '',
      pic_department: rec.pic_department || '',
      risk_level: rec.risk_level || '',
      compliance_status: rec.compliance_status || 'Under Review',
      finding_status: rec.finding_status || 'Open',
      due_date: rec.due_date ? rec.due_date.split('T')[0] : '',
      completion_date: rec.completion_date ? rec.completion_date.split('T')[0] : '',
      monitoring_frequency: rec.monitoring_frequency || '',
      review_frequency: rec.review_frequency || '',
      policy_sop_reference: rec.policy_sop_reference || '',
      document_url: rec.document_url || '',
      confidentiality: rec.confidentiality || 'Public',
      approval_status: rec.approval_status || '',
      approved_by: rec.approved_by || '',
      approval_date: rec.approval_date ? rec.approval_date.split('T')[0] : '',
      audit_requirement: rec.audit_requirement || '',
      audit_type: rec.audit_type || '',
      last_audit_date: rec.last_audit_date ? rec.last_audit_date.split('T')[0] : '',
      next_audit_date: rec.next_audit_date ? rec.next_audit_date.split('T')[0] : '',
      notes: rec.notes || ''
    });
    setShowAddDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doc_name || !formData.category || !formData.pic) {
      alert('Regulasi/Requirement, Kategori, dan Control Owner/PIC wajib diisi.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = { ...formData, company_id: formData.company_id ? Number(formData.company_id) : null };

      if (editingRecord) {
        await apiClient.put(`/api/compliance/monitoring/${editingRecord.id}`, payload);
      } else {
        await apiClient.post('/api/compliance/monitoring', payload);
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
      const full = await apiClient.get(`/api/compliance/monitoring/${rec.id}`);
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
      await apiClient.delete(`/api/compliance/monitoring/${recordToDelete.id}`);
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
      await Promise.all(selectedIds.map(id => apiClient.delete(`/api/compliance/monitoring/${id}`)));
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
      const res = await apiClient.get('/api/compliance/monitoring', {
        params: { limit: 9999, search, category: category || undefined, companyId: companyId || undefined, complianceStatus: complianceStatus || undefined }
      });
      const rows = res.data || [];
      const headers = ['Regulasi/Requirement', 'Kategori', 'Perusahaan', 'Regulatory Authority', 'Business Unit', 'PIC', 'Risk Level', 'Compliance Status', 'Finding Status', 'Due Date', 'Completion Date', 'Catatan'];
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const csvRows = [
        headers.join(','),
        ...rows.map(r => [
          r.doc_name, r.category, r.m_company?.name, r.regulatory_authority, r.business_unit, r.pic, r.risk_level, r.compliance_status, r.finding_status,
          r.due_date ? r.due_date.split('T')[0] : '', r.completion_date ? r.completion_date.split('T')[0] : '', r.notes
        ].map(escapeCSV).join(','))
      ];
      const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance_docs_${new Date().toISOString().split('T')[0]}.csv`;
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
    if (days > 0) return `Overdue ${days} hari`;
    if (days === 0) return 'Jatuh tempo hari ini';
    return `${Math.abs(days)} hari lagi`;
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-indigo-500" />
            Compliance Docs
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Monitoring kepatuhan regulasi internal dan eksternal GLC MRA.</p>
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
            Tambah Record
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
                placeholder="Cari regulasi, PIC, regulatory authority..."
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
            <select value={tempComplianceStatus} onChange={(e) => setTempComplianceStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Compliance Status</option>
              {COMPLIANCE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempFindingStatus} onChange={(e) => setTempFindingStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Finding Status</option>
              {FINDING_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempRiskLevel} onChange={(e) => setTempRiskLevel(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Risk Levels</option>
              {RISK_LEVEL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempTimelineStatus} onChange={(e) => setTempTimelineStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Timeline Status</option>
              {TIMELINE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2.5">
              {hasProcessed && (
                <button type="button" onClick={() => {
                  setTempSearch(''); setTempCategory(''); setTempCompanyMasterId(''); setTempCompanyId(''); setTempComplianceStatus(''); setTempFindingStatus(''); setTempRiskLevel(''); setTempTimelineStatus('');
                  setSearch(''); setCategory(''); setCompanyMasterId(''); setCompanyId(''); setComplianceStatus(''); setFindingStatus(''); setRiskLevel(''); setTimelineStatus('');
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
            Filter & Proses Data Compliance Docs
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
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-500/5 pointer-events-none"><ClipboardList className="w-28 h-28" /></div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30"><ClipboardList className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Record</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.totalCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ShieldCheck className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Comply</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.complyCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Overdue</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.overdueCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500"><FileText className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Open Finding</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.openFindingCount}</h3>
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
                <ClipboardList className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                Tidak ada record ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 w-10">
                        <input type="checkbox" checked={data.length > 0 && data.every(d => selectedIds.includes(d.id))} onChange={toggleSelectAll} className="rounded border-neutral-300 dark:border-neutral-700" title="Pilih semua baris" />
                      </th>
                      <th className="p-4">Regulasi / Requirement</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">PIC</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Risk</th>
                      <th className="p-4">Compliance Status</th>
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
                          {rec.regulatory_authority && <span className="block text-[10px] text-neutral-400 mt-0.5">{rec.regulatory_authority}</span>}
                        </td>
                        <td className="p-4 text-neutral-500">{rec.category}</td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium">{rec.m_company?.name || '-'}</td>
                        <td className="p-4 text-neutral-500">{rec.pic}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 font-medium ${rec.status === 'Overdue' ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {rec.due_date ? new Date(rec.due_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                          </span>
                          {rec.status && (
                            <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${TIMELINE_STATUS_BADGE[rec.status] || TIMELINE_STATUS_BADGE['On Track']}`}>{rec.status}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {rec.risk_level && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[rec.risk_level] || RISK_BADGE.Low}`}>{rec.risk_level}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${COMPLIANCE_STATUS_BADGE[rec.compliance_status] || COMPLIANCE_STATUS_BADGE['Under Review']}`}>{rec.compliance_status || 'Under Review'}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {rec.document_url && (
                              <a href={rec.document_url} target="_blank" rel="noopener noreferrer" className="p-1 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" title="Open Document Link">
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
                    Compliance Detail
                    {detailLoading && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                  </h3>
                  <button onClick={() => setSelectedRecord(null)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Regulasi / Requirement</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedRecord.doc_name}</h2>
                    <span className="text-xs text-indigo-500 font-semibold block mt-1">{selectedRecord.category}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Regulatory Authority</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.regulatory_authority || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Company</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.m_company?.name || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Business Unit</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.business_unit || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Process / Activity</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.process_activity || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Compliance Obligation</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.compliance_obligation || '-'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Control Owner / PIC</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.pic}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Department PIC</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.pic_department || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Risk Level</span>
                      {selectedRecord.risk_level ? <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[selectedRecord.risk_level] || RISK_BADGE.Low}`}>{selectedRecord.risk_level}</span> : <span className="text-xs text-neutral-400">-</span>}
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Compliance Status</span>
                      <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${COMPLIANCE_STATUS_BADGE[selectedRecord.compliance_status] || COMPLIANCE_STATUS_BADGE['Under Review']}`}>{selectedRecord.compliance_status}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Finding Status</span>
                      <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${FINDING_STATUS_BADGE[selectedRecord.finding_status] || FINDING_STATUS_BADGE.Open}`}>{selectedRecord.finding_status}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Klasifikasi</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium flex items-center gap-1"><Lock className="w-3 h-3 text-neutral-400" />{selectedRecord.confidentiality || 'Public'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status Approval</span>
                      {selectedRecord.approval_status ? <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${APPROVAL_STATUS_BADGE[selectedRecord.approval_status] || APPROVAL_STATUS_BADGE.Pending}`}>{selectedRecord.approval_status}</span> : <span className="text-xs text-neutral-400">-</span>}
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Approval By</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.approved_by || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Approval Date</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.approval_date ? new Date(selectedRecord.approval_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Audit Requirement</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.audit_requirement || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Audit Type</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.audit_type || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Last Audit Date</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.last_audit_date ? new Date(selectedRecord.last_audit_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Next Audit Date</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedRecord.next_audit_date ? new Date(selectedRecord.next_audit_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span>
                      {selectedRecord.audit_status && (
                        <span className={`inline-flex ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${AUDIT_STATUS_BADGE[selectedRecord.audit_status] || AUDIT_STATUS_BADGE.Valid}`}>{selectedRecord.audit_status}</span>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Due Date</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-slate-200">
                        {selectedRecord.due_date ? new Date(selectedRecord.due_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                        {selectedRecord.days_outstanding !== null && selectedRecord.days_outstanding !== undefined && (
                          <span className="ml-1 text-[10px] text-neutral-400 font-normal">({daysLabel(selectedRecord.days_outstanding)})</span>
                        )}
                      </span>
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Completion Date</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.completion_date ? new Date(selectedRecord.completion_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Monitoring Frequency</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.monitoring_frequency || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Review Frequency</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRecord.review_frequency || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Policy / SOP Reference</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.policy_sop_reference || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Catatan</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedRecord.notes || 'Tidak ada catatan.'}</p>
                  </div>

                  {selectedRecord.document_url && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><FileText className="w-4 h-4" /></div>
                        <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">Document Link / DMS</span>
                      </div>
                      <a href={selectedRecord.document_url} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />Open
                      </a>
                    </div>
                  )}

                  {selectedRecord.compliance_monitoring_audit_logs?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Riwayat Aktivitas</span>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedRecord.compliance_monitoring_audit_logs.map(log => (
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">{editingRecord ? `Edit — ${editingRecord.doc_name}` : 'Tambah Compliance Record'}</h3>
                  <button onClick={handleCloseAddDrawer} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
                  {/* Section: Identitas Regulasi */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Identitas Regulasi</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Regulasi / Requirement *</label>
                    <input required type="text" placeholder="e.g. UU No 8/1999 Perlindungan Konsumen" value={formData.doc_name} onChange={(e) => setFormData({ ...formData, doc_name: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Compliance Category *</label>
                      <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">— Pilih Kategori —</option>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Regulatory Authority</label>
                      <input type="text" placeholder="e.g. OJK / BPOM" value={formData.regulatory_authority} onChange={(e) => setFormData({ ...formData, regulatory_authority: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Perusahaan / Entitas</label>
                    <SearchableCompanySelect companies={companies} value={formData.company_id} onChange={(val) => setFormData({ ...formData, company_id: val })} placeholder="Select Company" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Business Unit</label>
                      <input type="text" placeholder="e.g. Retail Division" value={formData.business_unit} onChange={(e) => setFormData({ ...formData, business_unit: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Process / Activity</label>
                      <input type="text" placeholder="e.g. Pelaporan Pajak Bulanan" value={formData.process_activity} onChange={(e) => setFormData({ ...formData, process_activity: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>

                  {/* Section: Kewajiban & PIC */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Kewajiban & PIC</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Compliance Obligation</label>
                    <textarea rows={2} placeholder="Apa yang wajib dipenuhi..." value={formData.compliance_obligation} onChange={(e) => setFormData({ ...formData, compliance_obligation: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Control Owner / PIC *</label>
                      <input required type="text" placeholder="Nama PIC" value={formData.pic} onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Department PIC</label>
                      <input type="text" placeholder="e.g. Legal & Compliance" value={formData.pic_department} onChange={(e) => setFormData({ ...formData, pic_department: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>

                  {/* Section: Risk & Status */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Risk & Status</span>
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
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Compliance Status *</label>
                      <select required value={formData.compliance_status} onChange={(e) => setFormData({ ...formData, compliance_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        {COMPLIANCE_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Finding Status *</label>
                    <select required value={formData.finding_status} onChange={(e) => setFormData({ ...formData, finding_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                      {FINDING_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Section: Tanggal & Monitoring */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tanggal & Monitoring</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Due Date</label>
                      <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Completion Date</label>
                      <input type="date" value={formData.completion_date} onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Monitoring Frequency</label>
                      <select value={formData.monitoring_frequency} onChange={(e) => setFormData({ ...formData, monitoring_frequency: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {FREQUENCY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Review Frequency</label>
                      <select value={formData.review_frequency} onChange={(e) => setFormData({ ...formData, review_frequency: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {FREQUENCY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Section: Approval */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Approval</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status Approval</label>
                      <select value={formData.approval_status} onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {APPROVAL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Approval By</label>
                      <input type="text" placeholder="Nama approver" value={formData.approved_by} onChange={(e) => setFormData({ ...formData, approved_by: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Approval Date</label>
                    <input type="date" value={formData.approval_date} onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Audit */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Audit</span>
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
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Audit Type</label>
                      <select value={formData.audit_type} onChange={(e) => setFormData({ ...formData, audit_type: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {AUDIT_TYPE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Last Audit Date</label>
                      <input type="date" value={formData.last_audit_date} onChange={(e) => setFormData({ ...formData, last_audit_date: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Next Audit Date</label>
                      <input type="date" value={formData.next_audit_date} onChange={(e) => setFormData({ ...formData, next_audit_date: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>

                  {/* Section: Referensi & Kerahasiaan */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Referensi & Kerahasiaan</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Policy / SOP Reference</label>
                    <input type="text" placeholder="e.g. SOP-LEGAL-001" value={formData.policy_sop_reference} onChange={(e) => setFormData({ ...formData, policy_sop_reference: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Link / DMS</label>
                      <input type="url" placeholder="https://drive.google.com/..." value={formData.document_url} onChange={(e) => setFormData({ ...formData, document_url: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Klasifikasi Kerahasiaan *</label>
                      <select required value={formData.confidentiality} onChange={(e) => setFormData({ ...formData, confidentiality: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        {CONFIDENTIALITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Remarks / Notes</label>
                    <textarea rows={2} placeholder="Catatan tambahan..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button type="button" onClick={handleCloseAddDrawer} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center">Batal</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40">
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingRecord ? 'Simpan Perubahan' : 'Tambah Record')}
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
                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus Record</h3>
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
