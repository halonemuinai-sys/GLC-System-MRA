'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
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
  Link2
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import ComplianceDatePicker from '@/components/ui/ComplianceDatePicker';

const CATEGORY_OPTIONS = ['NIB', 'BPOM', 'Halal', 'OSS', 'API', 'NPIK', 'SIUP', 'TDG', 'Sertifikat ISO', 'Izin Reklame', 'IPP', 'ISR', 'Health Certificate', 'Import License', 'Lainnya'];
const DOC_STATUS_OPTIONS = ['Draft', 'Under Review', 'Active', 'Expiring Soon', 'Expired', 'Suspended', 'Archived'];
const RENEWAL_STATUS_OPTIONS = ['Not Started', 'On Process', 'Submitted', 'Approved', 'Rejected', 'Need Revision'];
const REGULATOR_SUBMISSION_OPTIONS = ['Not Submitted', 'Submitted', 'Under Verification', 'Approved', 'Rejected'];
const RISK_LEVEL_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const CONFIDENTIALITY_OPTIONS = ['Public', 'Internal', 'Restricted', 'Confidential', 'Strictly Confidential'];
const EXPIRY_STATUS_OPTIONS = ['Valid', 'Warning', 'Critical', 'Expired'];
const YES_NO_OPTIONS = ['Yes', 'No'];

const DOC_STATUS_BADGE = {
  Draft: 'bg-neutral-200/60 text-neutral-600 dark:bg-neutral-700/40 dark:text-neutral-300',
  'Under Review': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'Expiring Soon': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Expired: 'bg-red-500/10 text-red-600 dark:text-red-400',
  Suspended: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
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

const ACTION_LABEL = { CREATE: 'Dibuat', UPDATE: 'Diubah', DELETE: 'Dihapus' };

const defaultFormData = {
  company_id: '',
  doc_name: '',
  category: '',
  sub_category: '',
  id_number: '',
  issuing_authority: '',
  business_unit: '',
  site_location: '',
  related_product: '',
  pic: '',
  pic_department: '',
  backup_pic: '',
  issue_date: '',
  effective_date: '',
  expiry_date: '',
  doc_status: 'Draft',
  renewal_status: '',
  regulator_submission_status: '',
  risk_level: '',
  confidentiality: 'Public',
  approval_authority: '',
  audit_requirement: '',
  last_audit_date: '',
  next_audit_date: '',
  regulator_url: '',
  file_url: '',
  file_name: '',
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
        <BadgeCheck className="w-7 h-7 text-indigo-500" />
      </motion.div>
    </div>
  );
}

export default function ComplianceLicensesPage() {
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
  const [renewalStatus, setRenewalStatus] = useState('');
  const [expiryStatus, setExpiryStatus] = useState('');

  const [tempSearch, setTempSearch] = useState('');
  const [tempCategory, setTempCategory] = useState('');
  const [tempCompanyMasterId, setTempCompanyMasterId] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');
  const [tempDocStatus, setTempDocStatus] = useState('');
  const [tempRiskLevel, setTempRiskLevel] = useState('');
  const [tempRenewalStatus, setTempRenewalStatus] = useState('');
  const [tempExpiryStatus, setTempExpiryStatus] = useState('');

  const [hasProcessed, setHasProcessed] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [companyMasters, setCompanyMasters] = useState([]);

  const [selectedLicense, setSelectedLicense] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingLicense, setEditingLicense] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [licenseToDelete, setLicenseToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingBulk, setDeletingBulk] = useState(false);

  const [formData, setFormData] = useState({ ...defaultFormData });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedIds([]);

      const res = await apiClient.get('/api/compliance/licenses', {
        params: {
          page,
          limit: 20,
          search,
          category: category || undefined,
          companyId: companyId || undefined,
          companyMasterId: !companyId && companyMasterId ? companyMasterId : undefined,
          docStatus: docStatus || undefined,
          riskLevel: riskLevel || undefined,
          renewalStatus: renewalStatus || undefined,
          expiryStatus: expiryStatus || undefined
        }
      });

      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
      setSummary(res.summary || { totalCount: 0, activeCount: 0, expiringSoonCount: 0, expiredCount: 0 });
    } catch (err) {
      setError(err.message || 'Failed to fetch licenses');
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
  }, [page, search, category, companyMasterId, companyId, docStatus, riskLevel, renewalStatus, expiryStatus, hasProcessed]);

  const handleProcessFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setCategory(tempCategory);
    setCompanyMasterId(tempCompanyMasterId);
    setCompanyId(tempCompanyId);
    setDocStatus(tempDocStatus);
    setRiskLevel(tempRiskLevel);
    setRenewalStatus(tempRenewalStatus);
    setExpiryStatus(tempExpiryStatus);
    setHasProcessed(true);
  };

  // Saat Holding Group dipilih, persempit pilihan PT ke entitas di bawah grup tersebut
  const filteredCompaniesForGroup = tempCompanyMasterId
    ? companies.filter(c => String(c.company_master_id) === String(tempCompanyMasterId))
    : companies;

  const handleCloseAddDrawer = () => {
    setShowAddDrawer(false);
    setEditingLicense(null);
    setFormData({ ...defaultFormData });
  };

  const openEditLicense = (lic) => {
    setEditingLicense(lic);
    setFormData({
      company_id: lic.company_id ? String(lic.company_id) : '',
      doc_name: lic.doc_name || '',
      category: lic.category || '',
      sub_category: lic.sub_category || '',
      id_number: lic.id_number || '',
      issuing_authority: lic.issuing_authority || '',
      business_unit: lic.business_unit || '',
      site_location: lic.site_location || '',
      related_product: lic.related_product || '',
      pic: lic.pic || '',
      pic_department: lic.pic_department || '',
      backup_pic: lic.backup_pic || '',
      issue_date: lic.issue_date ? lic.issue_date.split('T')[0] : '',
      effective_date: lic.effective_date ? lic.effective_date.split('T')[0] : '',
      expiry_date: lic.expiry_date ? lic.expiry_date.split('T')[0] : '',
      doc_status: lic.doc_status || 'Draft',
      renewal_status: lic.renewal_status || '',
      regulator_submission_status: lic.regulator_submission_status || '',
      risk_level: lic.risk_level || '',
      confidentiality: lic.confidentiality || 'Public',
      approval_authority: lic.approval_authority || '',
      audit_requirement: lic.audit_requirement || '',
      last_audit_date: lic.last_audit_date ? lic.last_audit_date.split('T')[0] : '',
      next_audit_date: lic.next_audit_date ? lic.next_audit_date.split('T')[0] : '',
      regulator_url: lic.regulator_url || '',
      file_url: lic.file_url || '',
      file_name: lic.file_name || '',
      notes: lic.notes || ''
    });
    setShowAddDrawer(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.doc_name || !formData.category || !formData.pic) {
      alert('Nama Izin, Kategori, dan PIC Utama wajib diisi.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = { ...formData, company_id: formData.company_id ? Number(formData.company_id) : null };

      if (editingLicense) {
        await apiClient.put(`/api/compliance/licenses/${editingLicense.id}`, payload);
      } else {
        await apiClient.post('/api/compliance/licenses', payload);
      }

      handleCloseAddDrawer();
      if (!editingLicense) setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save license');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (lic) => {
    setSelectedLicense(lic);
    setDetailLoading(true);
    try {
      const full = await apiClient.get(`/api/compliance/licenses/${lic.id}`);
      setSelectedLicense(full);
    } catch (err) {
      console.error('Failed to fetch license detail', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteLicense = (lic) => setLicenseToDelete(lic);

  const confirmDeleteLicense = async () => {
    if (!licenseToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/compliance/licenses/${licenseToDelete.id}`);
      fetchData();
      if (selectedLicense && selectedLicense.id === licenseToDelete.id) setSelectedLicense(null);
      setLicenseToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete license');
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
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} izin terpilih?`)) return;
    setDeletingBulk(true);
    try {
      await Promise.all(selectedIds.map(id => apiClient.delete(`/api/compliance/licenses/${id}`)));
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      alert('Gagal menghapus beberapa izin');
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/api/compliance/licenses', {
        params: { limit: 9999, search, category: category || undefined, companyId: companyId || undefined, docStatus: docStatus || undefined }
      });
      const rows = res.data || [];
      const headers = ['Nomor Izin/Sertifikat', 'Nama Izin', 'Kategori', 'Sub Kategori', 'Perusahaan', 'Business Unit', 'Lokasi/Site', 'Instansi Penerbit', 'PIC Utama', 'Tanggal Terbit', 'Tanggal Berlaku', 'Tanggal Kadaluarsa', 'Status Dokumen', 'Status Perpanjangan', 'Risk Level', 'Klasifikasi', 'Catatan'];
      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      const csvRows = [
        headers.join(','),
        ...rows.map(r => [
          r.id_number, r.doc_name, r.category, r.sub_category, r.m_company?.name, r.business_unit, r.site_location, r.issuing_authority, r.pic,
          r.issue_date ? r.issue_date.split('T')[0] : '', r.effective_date ? r.effective_date.split('T')[0] : '', r.expiry_date ? r.expiry_date.split('T')[0] : '',
          r.doc_status, r.renewal_status, r.risk_level, r.confidentiality, r.notes
        ].map(escapeCSV).join(','))
      ];
      const blob = new Blob(['﻿' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `license_permit_${new Date().toISOString().split('T')[0]}.csv`;
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
            <BadgeCheck className="w-6 h-6 text-indigo-500" />
            License & Permit
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Pemantauan seluruh izin dan perizinan perusahaan GLC MRA — dengan tracking risiko & renewal.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasProcessed && (
            <button onClick={handleExportCSV} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-neutral-200 dark:border-neutral-800 shadow-sm w-fit disabled:opacity-50">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export CSV
            </button>
          )}
          <button onClick={() => { setEditingLicense(null); setFormData({ ...defaultFormData }); setShowAddDrawer(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit">
            <Plus className="w-4 h-4" />
            Tambah Izin
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
                placeholder="Cari nama izin, nomor izin, PIC..."
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
            <select value={tempRenewalStatus} onChange={(e) => setTempRenewalStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Renewal Status</option>
              {RENEWAL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={tempExpiryStatus} onChange={(e) => setTempExpiryStatus(e.target.value)} className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none">
              <option value="">All Expiry Status</option>
              {EXPIRY_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-2.5">
              {hasProcessed && (
                <button type="button" onClick={() => {
                  setTempSearch(''); setTempCategory(''); setTempCompanyMasterId(''); setTempCompanyId(''); setTempDocStatus(''); setTempRiskLevel(''); setTempRenewalStatus(''); setTempExpiryStatus('');
                  setSearch(''); setCategory(''); setCompanyMasterId(''); setCompanyId(''); setDocStatus(''); setRiskLevel(''); setRenewalStatus(''); setExpiryStatus('');
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
            Filter & Proses Data License & Permit
          </motion.h3>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }} className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed relative z-10">
            Pilih kriteria pencarian dan filter di atas, lalu klik tombol <strong className="text-indigo-500 font-bold">"Proses Data"</strong> untuk memuat data izin dan statistik ringkas.
          </motion.p>
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 dark:from-indigo-950/20 dark:via-violet-950/25 dark:to-neutral-900 border border-indigo-500/20 dark:border-indigo-500/15 p-4.5 rounded-2xl flex items-center gap-4 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-500/5 pointer-events-none"><BadgeCheck className="w-28 h-28" /></div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30"><BadgeCheck className="w-5 h-5" /></div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Izin</p>
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
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Mendekati Exp</p>
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
                <BadgeCheck className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                Tidak ada izin ditemukan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4 w-10">
                        <input type="checkbox" checked={data.length > 0 && data.every(d => selectedIds.includes(d.id))} onChange={toggleSelectAll} className="rounded border-neutral-300 dark:border-neutral-700" title="Pilih semua baris" />
                      </th>
                      <th className="p-4">Nama Izin</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">PIC Utama</th>
                      <th className="p-4">Tgl Kadaluarsa</th>
                      <th className="p-4">Risk</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {data.map((lic, idx) => (
                      <motion.tr
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={lic.id}
                        className={`hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors ${selectedIds.includes(lic.id) ? 'bg-indigo-50/40 dark:bg-indigo-950/10' : ''}`}
                      >
                        <td className="p-4">
                          <input type="checkbox" checked={selectedIds.includes(lic.id)} onChange={() => toggleSelect(lic.id)} className="rounded border-neutral-300 dark:border-neutral-700" title={`Pilih ${lic.doc_name}`} />
                        </td>
                        <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">
                          {lic.doc_name}
                          {lic.id_number && <span className="block text-[10px] font-mono text-neutral-400 mt-0.5">{lic.id_number}</span>}
                        </td>
                        <td className="p-4 text-neutral-500">{lic.category}</td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium">{lic.m_company?.name || '-'}</td>
                        <td className="p-4 text-neutral-500">{lic.pic}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 font-medium ${lic.status === 'Critical' || lic.status === 'Expired' ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {lic.expiry_date ? new Date(lic.expiry_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                          </span>
                          {lic.status && (
                            <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${EXPIRY_STATUS_BADGE[lic.status] || EXPIRY_STATUS_BADGE.Valid}`}>{lic.status}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {lic.risk_level && (
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[lic.risk_level] || RISK_BADGE.Low}`}>{lic.risk_level}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${DOC_STATUS_BADGE[lic.doc_status] || DOC_STATUS_BADGE.Draft}`}>{lic.doc_status || 'Draft'}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {lic.regulator_url && (
                              <a href={lic.regulator_url} target="_blank" rel="noopener noreferrer" className="p-1 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" title="Open Regulator Link">
                                <Link2 className="w-4 h-4" />
                              </a>
                            )}
                            {lic.file_url && (
                              <a href={lic.file_url} target="_blank" rel="noopener noreferrer" className="p-1 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" title="Open Document File">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button onClick={() => handleViewDetail(lic)} className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer" title="View Details">
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => openEditLicense(lic)} className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer" title="Edit">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <motion.button type="button" onClick={() => handleDeleteLicense(lic)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
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
        {selectedLicense && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setSelectedLicense(null)} className="fixed inset-0 bg-black z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-lg bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm flex items-center gap-2">
                    License Detail
                    {detailLoading && <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                  </h3>
                  <button onClick={() => setSelectedLicense(null)} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                </div>

                <div className="mt-6 space-y-6">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Nama Izin</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedLicense.doc_name}</h2>
                    <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">{selectedLicense.id_number || 'Nomor Izin / Sertifikat'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Kategori</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.category}{selectedLicense.sub_category ? ` — ${selectedLicense.sub_category}` : ''}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Instansi Penerbit</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.issuing_authority || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Company</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.m_company?.name || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Business Unit</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.business_unit || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Lokasi / Site</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.site_location || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Produk/Aktivitas</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.related_product || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">PIC Utama</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.pic}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Department PIC</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.pic_department || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Backup PIC</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.backup_pic || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Terbit</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.issue_date ? new Date(selectedLicense.issue_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Berlaku</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.effective_date ? new Date(selectedLicense.effective_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tgl Kadaluarsa</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-slate-200">
                        {selectedLicense.expiry_date ? new Date(selectedLicense.expiry_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                        {selectedLicense.days_until_expiry !== null && selectedLicense.days_until_expiry !== undefined && (
                          <span className="ml-1 text-[10px] text-neutral-400 font-normal">({daysLabel(selectedLicense.days_until_expiry)})</span>
                        )}
                      </span>
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status Dokumen</span><span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${DOC_STATUS_BADGE[selectedLicense.doc_status] || DOC_STATUS_BADGE.Draft}`}>{selectedLicense.doc_status || 'Draft'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status Perpanjangan</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.renewal_status || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status Submission Regulator</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.regulator_submission_status || '-'}</span></div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Risk Level</span>
                      {selectedLicense.risk_level ? <span className={`inline-flex mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${RISK_BADGE[selectedLicense.risk_level] || RISK_BADGE.Low}`}>{selectedLicense.risk_level}</span> : <span className="text-xs text-neutral-400">-</span>}
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Klasifikasi</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium flex items-center gap-1"><Lock className="w-3 h-3 text-neutral-400" />{selectedLicense.confidentiality || 'Public'}</span>
                    </div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Approval Authority</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.approval_authority || '-'}</span></div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Audit Requirement</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.audit_requirement || '-'}</span></div>
                    <div><span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Last Audit Date</span><span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedLicense.last_audit_date ? new Date(selectedLicense.last_audit_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span></div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Next Audit Date</span>
                      <span className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedLicense.next_audit_date ? new Date(selectedLicense.next_audit_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}</span>
                      {selectedLicense.audit_status && (
                        <span className={`inline-flex ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${EXPIRY_STATUS_BADGE[selectedLicense.audit_status] || EXPIRY_STATUS_BADGE.Valid}`}>{selectedLicense.audit_status}</span>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Catatan</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedLicense.notes || 'Tidak ada catatan.'}</p>
                  </div>

                  {(selectedLicense.regulator_url || selectedLicense.file_url) && (
                    <div className="space-y-2">
                      {selectedLicense.regulator_url && (
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3 rounded-xl border border-indigo-100/30 dark:border-indigo-900/20 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0"><Link2 className="w-4 h-4" /></div>
                            <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">Link OSS / Regulator</span>
                          </div>
                          <a href={selectedLicense.regulator_url} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shrink-0">
                            <ExternalLink className="w-3.5 h-3.5" />Open
                          </a>
                        </div>
                      )}
                      {selectedLicense.file_url && (
                        <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><FileText className="w-4 h-4" /></div>
                            <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold truncate">{selectedLicense.file_name || 'Dokumen File'}</span>
                          </div>
                          <a href={selectedLicense.file_url} target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shrink-0">
                            <ExternalLink className="w-3.5 h-3.5" />Open
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedLicense.compliance_license_audit_logs?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5" /> Riwayat Aktivitas</span>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {selectedLicense.compliance_license_audit_logs.map(log => (
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
                <button type="button" onClick={() => { setSelectedLicense(null); openEditLicense(selectedLicense); }} className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-indigo-200/50 dark:border-indigo-900/30">Edit</button>
                <button type="button" onClick={() => handleDeleteLicense(selectedLicense)} className="flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-red-200/50 dark:border-red-900/30">Hapus</button>
                <button onClick={() => setSelectedLicense(null)} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-850 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center">Tutup</button>
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">{editingLicense ? `Edit — ${editingLicense.doc_name}` : 'Tambah License & Permit'}</h3>
                  <button onClick={handleCloseAddDrawer} className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5 text-xs">
                  {/* Section: Informasi Dokumen */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Informasi Dokumen</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nama Izin / Sertifikat *</label>
                    <input required type="text" placeholder="e.g. Nomor Induk Berusaha (NIB)" value={formData.doc_name} onChange={(e) => setFormData({ ...formData, doc_name: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Kategori Izin *</label>
                      <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">— Pilih Kategori —</option>
                        {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Sub Kategori</label>
                      <input type="text" placeholder="e.g. Sektor Perdagangan" value={formData.sub_category} onChange={(e) => setFormData({ ...formData, sub_category: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nomor Izin / Sertifikat</label>
                      <input type="text" placeholder="No. referensi" value={formData.id_number} onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Instansi Penerbit</label>
                      <input type="text" placeholder="e.g. BKPM / OSS" value={formData.issuing_authority} onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>

                  {/* Section: Entitas & Lokasi */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Entitas & Lokasi</span>
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
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Lokasi / Site</label>
                      <input type="text" placeholder="e.g. Jakarta Pusat" value={formData.site_location} onChange={(e) => setFormData({ ...formData, site_location: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Produk / Aktivitas Terkait</label>
                    <input type="text" placeholder="e.g. Penjualan produk kosmetik" value={formData.related_product} onChange={(e) => setFormData({ ...formData, related_product: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: PIC */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">PIC</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">PIC Utama *</label>
                      <input required type="text" placeholder="Nama PIC" value={formData.pic} onChange={(e) => setFormData({ ...formData, pic: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Department PIC</label>
                      <input type="text" placeholder="e.g. Legal & Compliance" value={formData.pic_department} onChange={(e) => setFormData({ ...formData, pic_department: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Backup PIC</label>
                    <input type="text" placeholder="Nama backup PIC" value={formData.backup_pic} onChange={(e) => setFormData({ ...formData, backup_pic: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Tanggal & Status */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-amber-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tanggal & Status</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tanggal Terbit</label>
                      <ComplianceDatePicker value={formData.issue_date} onChange={(val) => setFormData({ ...formData, issue_date: val })} placeholder="Pilih tanggal terbit" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tanggal Berlaku</label>
                      <ComplianceDatePicker value={formData.effective_date} onChange={(val) => setFormData({ ...formData, effective_date: val })} placeholder="Pilih tanggal berlaku" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tanggal Kadaluarsa Izin *</label>
                    <ComplianceDatePicker value={formData.expiry_date} onChange={(val) => setFormData({ ...formData, expiry_date: val })} placeholder="Pilih tanggal kadaluarsa" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status Dokumen *</label>
                      <select required value={formData.doc_status} onChange={(e) => setFormData({ ...formData, doc_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        {DOC_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status Perpanjangan</label>
                      <select value={formData.renewal_status} onChange={(e) => setFormData({ ...formData, renewal_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                        <option value="">—</option>
                        {RENEWAL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status Submission Regulator</label>
                    <select value={formData.regulator_submission_status} onChange={(e) => setFormData({ ...formData, regulator_submission_status: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                      <option value="">—</option>
                      {REGULATOR_SUBMISSION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Approval Authority</label>
                    <input type="text" placeholder="e.g. Direktur Legal & Compliance" value={formData.approval_authority} onChange={(e) => setFormData({ ...formData, approval_authority: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  {/* Section: Audit */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Audit</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Audit Requirement</label>
                    <select value={formData.audit_requirement} onChange={(e) => setFormData({ ...formData, audit_requirement: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none">
                      <option value="">—</option>
                      {YES_NO_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
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

                  {/* Section: Dokumen Pendukung */}
                  <div className="flex items-center gap-2 pb-1 border-b border-neutral-100 dark:border-neutral-800 pt-2">
                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Dokumen Pendukung</span>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Link OSS / Regulator</label>
                    <input type="url" placeholder="https://oss.go.id/..." value={formData.regulator_url} onChange={(e) => setFormData({ ...formData, regulator_url: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">URL File / DMS</label>
                      <input type="url" placeholder="https://drive.google.com/..." value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Nama File</label>
                      <input type="text" placeholder="e.g. NIB_2026.pdf" value={formData.file_name} onChange={(e) => setFormData({ ...formData, file_name: e.target.value })}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Catatan Internal</label>
                    <textarea rows={2} placeholder="Catatan tambahan..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none" />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button type="button" onClick={handleCloseAddDrawer} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center">Batal</button>
                    <button type="submit" disabled={submitting} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40">
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingLicense ? 'Simpan Perubahan' : 'Tambah Izin')}
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
        {licenseToDelete && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setLicenseToDelete(null)} className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.9, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 15 }} transition={{ type: 'spring', duration: 0.35 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <motion.div className="absolute inset-0 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-sm" animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
                  <div className="relative w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center"><AlertTriangle className="w-6 h-6 animate-pulse" /></div>
                </div>
                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus Izin</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong className="text-red-500 dark:text-red-400 font-bold">"{licenseToDelete.doc_name}"</strong>? Tindakan ini bersifat permanen dan akan tercatat di riwayat aktivitas.
                </p>
                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button type="button" onClick={() => setLicenseToDelete(null)} disabled={submitting} className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50">Batal</button>
                  <button type="button" onClick={confirmDeleteLicense} disabled={submitting} className="flex-1 py-2 bg-red-650 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/25 disabled:opacity-50">
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
