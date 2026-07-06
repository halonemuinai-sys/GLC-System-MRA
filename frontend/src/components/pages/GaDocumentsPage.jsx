'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Plus, 
  X, 
  Calendar, 
  Loader2, 
  ShieldAlert,
  Clock,
  DollarSign,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Users,
  MapPin,
  Building,
  Activity,
  Edit3,
  Trash2,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

// Searchable Dropdown for Companies (PT)
function SearchableCompanySelect({ companies, value, onChange, placeholder = 'Select Company (Type to search...)' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCompany = companies.find(c => String(c.id) === String(value));

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchQuery('');
              }}
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
                  onClick={() => {
                    onChange('');
                    setSearchQuery('');
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-neutral-50 dark:hover:bg-neutral-800/45 text-neutral-400 transition-colors"
                >
                  All Companies (PT)
                </button>
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-3 text-center text-xs text-neutral-400">
                    No companies found
                  </div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onChange(c.id);
                        setSearchQuery('');
                        setIsOpen(false);
                      }}
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

// Modern Interactive Radar & Scanning Animation for Blank State (Documents themed)
function SearchingRadarAnimation() {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center select-none pointer-events-none mb-3">
      {/* Background Pulse Rings */}
      <motion.div
        className="absolute w-36 h-36 rounded-full border border-indigo-500/20 dark:border-indigo-400/10 bg-indigo-500/5 dark:bg-indigo-400/5"
        animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-violet-500/15 dark:border-violet-400/5"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Rotating Radar Sweep Line */}
      <motion.div
        className="absolute w-40 h-40 rounded-full border border-dashed border-indigo-500/30 dark:border-indigo-400/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Rotating sweep gradient */}
      <div className="absolute w-40 h-40 overflow-hidden rounded-full pointer-events-none z-10">
        <motion.div
          className="w-full h-full bg-gradient-to-tr from-transparent via-transparent to-indigo-500/10 origin-center"
          style={{ transformOrigin: '50% 50%' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Animated Floating Radar Nodes */}
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-indigo-500 top-12 left-16 shadow-lg shadow-indigo-500/50"
        animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-violet-500 bottom-16 right-12 shadow-lg shadow-violet-500/50"
        animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 top-20 right-16 shadow-lg shadow-emerald-500/50"
        animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />

      {/* Center Icon: Animated FileText Outline SVG */}
      <motion.div
        className="relative z-20 w-16 h-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl flex items-center justify-center shadow-lg shadow-neutral-900/5 dark:shadow-black/40"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg 
          className="w-8 h-8 text-indigo-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <motion.path 
            d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.polyline 
            points="14 2 14 8 20 8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 }}
          />
          <motion.line 
            x1="16" y1="13" x2="8" y2="13"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.6 }}
          />
          <motion.line 
            x1="16" y1="17" x2="8" y2="17"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.9 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default function GaDocumentsPage() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [summary, setSummary] = useState({ totalDocuments: 0, activeCount: 0, totalValue: 0, expiringCount: 0, uniqueCompaniesCount: 0 });
  const [error, setError] = useState(null);
  
  // Active filters (passed to the API)
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [docSubtype, setDocSubtype] = useState('');
  const [divisionId, setDivisionId] = useState('');
  const [docTypeId, setDocTypeId] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Temporary filters (bound to UI controls)
  const [tempSearch, setTempSearch] = useState('');
  const [tempDocSubtype, setTempDocSubtype] = useState('');
  const [tempDivisionId, setTempDivisionId] = useState('');
  const [tempDocTypeId, setTempDocTypeId] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');

  // Process control
  const [hasProcessed, setHasProcessed] = useState(false);

  // Dropdown options
  const [divisions, setDivisions] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Detail drawer & Add modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Document Form State
  const [formData, setFormData] = useState({
    doc_number: '',
    doc_title: '',
    doc_type_id: '',
    doc_subtype: 'agreement',
    division_id: '',
    mra_party_id: '',
    counter_party: '',
    vendor_id: '',
    pic_internal: '',
    valid_from: '',
    valid_until: '',
    physical_location: '',
    auto_renewal: false,
    digital_doc_url: '',
    amount: '',
    notes: '',
    status: 'Active'
  });

  const handleCloseAddDrawer = () => {
    setShowAddDrawer(false);
    setEditingDoc(null);
    setFormData({
      doc_number: '',
      doc_title: '',
      doc_type_id: '',
      doc_subtype: 'agreement',
      division_id: '',
      mra_party_id: '',
      counter_party: '',
      vendor_id: '',
      pic_internal: '',
      valid_from: '',
      valid_until: '',
      physical_location: '',
      auto_renewal: false,
      digital_doc_url: '',
      amount: '',
      notes: '',
      status: 'Active'
    });
  };

  const openEditDoc = (doc) => {
    setEditingDoc(doc);
    setFormData({
      doc_number: doc.doc_number || '',
      doc_title: doc.doc_title || '',
      doc_type_id: doc.doc_type_id ? String(doc.doc_type_id) : '',
      doc_subtype: doc.doc_subtype || 'agreement',
      division_id: doc.division_id ? String(doc.division_id) : '',
      mra_party_id: doc.mra_party_id ? String(doc.mra_party_id) : '',
      counter_party: doc.counter_party || '',
      vendor_id: doc.vendor_id ? String(doc.vendor_id) : '',
      pic_internal: doc.pic_internal || '',
      valid_from: doc.valid_from ? doc.valid_from.split('T')[0] : '',
      valid_until: doc.valid_until ? doc.valid_until.split('T')[0] : '',
      physical_location: doc.physical_location || '',
      auto_renewal: doc.auto_renewal || false,
      digital_doc_url: doc.digital_doc_url || '',
      amount: doc.amount ? String(doc.amount) : '',
      notes: doc.notes || '',
      status: doc.status || 'Active'
    });
    setShowAddDrawer(true);
  };

  const [docToDelete, setDocToDelete] = useState(null);

  const handleDeleteDoc = (doc) => {
    setDocToDelete(doc);
  };

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/legal/documents/${docToDelete.id}`);
      if (selectedDoc && selectedDoc.id === docToDelete.id) {
        setSelectedDoc(null);
      }
      setDocToDelete(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiClient.get('/api/legal/documents', {
        params: {
          page,
          limit: 10,
          search,
          docSubtype: docSubtype || undefined,
          divisionId: divisionId || undefined,
          docTypeId: docTypeId || undefined,
          companyId: companyId || undefined
        }
      });
      
      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
      setSummary(res.summary || { totalDocuments: 0, activeCount: 0, totalValue: 0, expiringCount: 0, uniqueCompaniesCount: 0 });
    } catch (err) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [divs, types, vends, comps] = await Promise.all([
        apiClient.get('/api/legal/divisions').catch(() => []),
        apiClient.get('/api/legal/document-types').catch(() => []),
        apiClient.get('/api/ga/vendors').catch(() => ({ data: [] })),
        apiClient.get('/api/master/companies/all').catch(() => [])
      ]);
      setDivisions(divs);
      setDocTypes(types);
      setVendors(vends.data || vends || []);
      setCompanies(comps);
    } catch (err) {
      console.error('Failed to load filter options', err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasProcessed) {
      fetchData();
    }
  }, [page, search, docSubtype, divisionId, docTypeId, companyId, hasProcessed]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setDocSubtype(tempDocSubtype);
    setDivisionId(tempDivisionId);
    setDocTypeId(tempDocTypeId);
    setCompanyId(tempCompanyId);
    setHasProcessed(true);
  };

  const handleAddDoc = async (e) => {
    e.preventDefault();
    if (!formData.mra_party_id) {
      alert('Please select a company.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        doc_type_id: formData.doc_type_id ? Number(formData.doc_type_id) : null,
        division_id: formData.division_id ? Number(formData.division_id) : null,
        mra_party_id: Number(formData.mra_party_id),
        vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
        amount: formData.amount ? Number(formData.amount) : null,
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
      };

      if (editingDoc) {
        await apiClient.put(`/api/legal/documents/${editingDoc.id}`, payload);
      } else {
        await apiClient.post('/api/legal/documents', payload);
      }
      
      handleCloseAddDrawer();
      if (!editingDoc) setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save document');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formats
  const formatIDR = (val) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  // Check if contract is near expiration (within 30 days)
  const isEndRentNear = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const endDate = new Date(dateStr);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const totalValue = data.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const expiringCount = data.filter(doc => isEndRentNear(doc.valid_until) && doc.status === 'Active').length;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-500" />
            {t('gaDocuments_title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Daftar Kontrak Kerja Sama (PKS), NDA, Surat Keputusan, dan dokumen legal korporat.</p>
        </div>
        <button
          onClick={() => setShowAddDrawer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit"
        >
          <Plus className="w-4 h-4" />
          {t('ga_addDocument')}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder={t('ga_searchDocuments')}
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
              />
            </div>
            
            {/* Company Dropdown */}
            <SearchableCompanySelect
              companies={companies}
              value={tempCompanyId}
              onChange={(val) => setTempCompanyId(val)}
              placeholder={t('allCompanies')}
            />

            {/* Subtypes Dropdown */}
            <select
              value={tempDocSubtype}
              onChange={(e) => setTempDocSubtype(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">All Subtypes</option>
              <option value="agreement">Agreement / PKS</option>
              <option value="legal">Legal / Permit</option>
              <option value="policy">Corporate Policy</option>
            </select>

            {/* Division Dropdown */}
            <select
              value={tempDivisionId}
              onChange={(e) => setTempDivisionId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">All Divisions</option>
              {divisions.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            {/* Doc Types dropdown */}
            <div className="w-full sm:w-60">
              <select
                value={tempDocTypeId}
                onChange={(e) => setTempDocTypeId(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
              >
                <option value="">All Types</option>
                {docTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {hasProcessed && (
                <button
                  type="button"
                  onClick={() => {
                    setTempSearch('');
                    setTempDocSubtype('');
                    setTempDivisionId('');
                    setTempDocTypeId('');
                    setTempCompanyId('');
                    setSearch('');
                    setDocSubtype('');
                    setDivisionId('');
                    setDocTypeId('');
                    setCompanyId('');
                    setHasProcessed(false);
                    setData([]);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  {t('resetFilter')}
                </button>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
              >
                <Activity className="w-4 h-4" />
                {t('processData')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {!hasProcessed ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[380px] overflow-hidden"
        >
          {/* Floating abstract backdrop blur circles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
            <motion.div 
              className="absolute w-32 h-32 rounded-full bg-indigo-500/5 -top-10 -left-10 blur-2xl"
              animate={{ x: [0, 15, 0], y: [0, 20, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute w-44 h-44 rounded-full bg-violet-500/5 -bottom-16 -right-16 blur-2xl"
              animate={{ x: [0, -20, 0], y: [0, -15, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Modern Interactive Radar Animation */}
          <SearchingRadarAnimation />

          <motion.h3 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-lg font-black text-neutral-800 dark:text-white relative z-10"
          >
            Filter & Proses Dokumen Legal
          </motion.h3>
          
          <motion.p 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed relative z-10"
          >
            Pilih kriteria pencarian dan filter di atas, lalu klik tombol <strong className="text-indigo-500 font-bold">"Proses Data"</strong> untuk memuat dokumen legal, kontrak kerja sama (PKS), dan nilai kontrak.
          </motion.p>
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('gaDocuments_kpiTotal')}</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{meta.total}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('gaDocuments_kpiActive')}</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.activeCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('gaDocuments_kpiValue')}</p>
                <h3 className="text-md font-black text-neutral-800 dark:text-white mt-0.5 truncate">{formatIDR(summary.totalValue)}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('gaDocuments_kpiExpiring')}</p>
                <h3 className="text-xl font-black text-rose-600 dark:text-rose-450 mt-0.5">{summary.expiringCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{t('gaDocuments_kpiCompanies')}</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.uniqueCompaniesCount}</h3>
              </div>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-neutral-400">{t('loading')}</span>
              </div>
            ) : error ? (
          <div className="py-20 text-center text-red-500 text-xs">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-red-500" />
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
            No documents found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">Doc Number</th>
                  <th className="p-4">Title</th>
                  <th className="p-4">Company</th>
                  <th className="p-4">Division</th>
                  <th className="p-4">Counterparty</th>
                  <th className="p-4">Value</th>
                  <th className="p-4">Valid Until</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {data.map((doc, idx) => {
                  const nearEnd = isEndRentNear(doc.valid_until);
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      key={doc.id} 
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-neutral-600 dark:text-neutral-400">{doc.doc_number || '-'}</td>
                      <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{doc.doc_title || '-'}</td>
                      <td className="p-4 text-neutral-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                          <span className="truncate max-w-[150px]">{doc.m_company?.name || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-neutral-500">{doc.m_division?.name || '-'}</td>
                      <td className="p-4 text-neutral-500">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{doc.counter_party || '-'}</span>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(doc.amount)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 font-medium ${nearEnd ? 'text-red-500 font-bold animate-pulse' : 'text-neutral-500'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {doc.valid_until ? new Date(doc.valid_until).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Lifetime'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status?.toLowerCase() === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-neutral-500/10 text-neutral-500'
                        }`}>
                          {doc.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {doc.digital_doc_url && (
                            <a 
                              href={doc.digital_doc_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-neutral-450 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Open Digital Contract"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button 
                            onClick={() => setSelectedDoc(doc)}
                            className="p-1 text-neutral-455 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => openEditDoc(doc)}
                            className="p-1 text-neutral-455 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Edit Document"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <motion.button
                            type="button"
                            onClick={() => handleDeleteDoc(doc)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1 text-neutral-455 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400 select-none">
            <span>Showing Page {meta.page} of {meta.totalPages} ({meta.total} items)</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page === meta.totalPages}
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )}

      {/* Details Slide-Over Drawer */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Contract Document Detail</h3>
                  <button 
                    onClick={() => setSelectedDoc(null)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Document Title</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white mt-0.5">{selectedDoc.doc_title || 'Untitled Document'}</h2>
                    <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">No: {selectedDoc.doc_number}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Document Type</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">{selectedDoc.m_document_type?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Subtype</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium capitalize">{selectedDoc.doc_subtype || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Contract Value</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(selectedDoc.amount)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Division</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedDoc.m_division?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Valid From</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedDoc.valid_from ? new Date(selectedDoc.valid_from).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Valid Until</span>
                      <span className={`text-xs font-bold ${isEndRentNear(selectedDoc.valid_until) ? 'text-red-500' : 'text-neutral-800 dark:text-slate-200'}`}>
                        {selectedDoc.valid_until ? new Date(selectedDoc.valid_until).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : 'Lifetime'}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Counterparty & internal PIC */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Counter Party</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">{selectedDoc.counter_party || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Internal PIC</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedDoc.pic_internal || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Auto Renewal</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedDoc.auto_renewal ? 'Yes' : 'No'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Physical Location</span>
                      <p className="text-xs text-neutral-850 dark:text-slate-200 font-mono mt-0.5 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selectedDoc.physical_location || '-'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Holding Company</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedDoc.m_company?.name || '-'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Description & Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Contract Scope / Details</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedDoc.notes || 'No notes provided.'}</p>
                  </div>

                  {/* Digital Link */}
                  {selectedDoc.digital_doc_url && (
                    <a 
                      href={selectedDoc.digital_doc_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-200/50 transition-colors"
                    >
                      Open Digital Contract File
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedDoc(null);
                    openEditDoc(selectedDoc);
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Document
                </button>
                <button
                  onClick={() => handleDeleteDoc(selectedDoc)}
                  className="px-3.5 py-2 bg-red-50 hover:bg-red-100 active:bg-red-200 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200/40 dark:border-red-900/30 rounded-xl transition-all cursor-pointer"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Document Drawer */}
      <AnimatePresence>
        {showAddDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseAddDrawer}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">
                    {editingDoc ? 'Edit Legal Document' : 'Create Legal Document'}
                  </h3>
                  <button 
                    onClick={handleCloseAddDrawer}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddDoc} className="mt-6 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Title *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Perjanjian Sewa Kantor Menara Ares"
                      value={formData.doc_title}
                      onChange={(e) => setFormData({...formData, doc_title: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Number *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. 021/PKS/MRA/VI/2026"
                        value={formData.doc_number}
                        onChange={(e) => setFormData({...formData, doc_number: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Type *</label>
                      <select
                        required
                        value={formData.doc_type_id}
                        onChange={(e) => setFormData({...formData, doc_type_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="">Select Type</option>
                        {docTypes.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Doc Subtype</label>
                      <select
                        required
                        value={formData.doc_subtype}
                        onChange={(e) => setFormData({...formData, doc_subtype: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="agreement">Agreement / PKS</option>
                        <option value="legal">Legal / Permit</option>
                        <option value="policy">Corporate Policy</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Division *</label>
                      <select
                        required
                        value={formData.division_id}
                        onChange={(e) => setFormData({...formData, division_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-505 focus:outline-none"
                      >
                        <option value="">Select Division</option>
                        {divisions.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Counter Party Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. PT Telekomunikasi Indonesia"
                        value={formData.counter_party}
                        onChange={(e) => setFormData({...formData, counter_party: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Link Vendor (Optional)</label>
                      <select
                        value={formData.vendor_id}
                        onChange={(e) => setFormData({...formData, vendor_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-505 focus:outline-none"
                      >
                        <option value="">-- Unlinked --</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.vendor_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Contract Value (IDR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 15000000"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Internal PIC *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Sarah / Legal"
                        value={formData.pic_internal}
                        onChange={(e) => setFormData({...formData, pic_internal: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Valid From</label>
                      <input
                        type="date"
                        value={formData.valid_from}
                        onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Valid Until</label>
                      <input
                        type="date"
                        value={formData.valid_until}
                        onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Physical Filing Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Cabinet A, Shelf 2"
                        value={formData.physical_location}
                        onChange={(e) => setFormData({...formData, physical_location: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="auto_renewal"
                        checked={formData.auto_renewal}
                        onChange={(e) => setFormData({...formData, auto_renewal: e.target.checked})}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 cursor-pointer"
                      />
                      <label htmlFor="auto_renewal" className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider cursor-pointer">Auto Renewal</label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Digital File Link (URL)</label>
                      <input
                        type="url"
                        placeholder="e.g. https://drive.google.com/..."
                        value={formData.digital_doc_url}
                        onChange={(e) => setFormData({...formData, digital_doc_url: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Holding Company *</label>
                      <SearchableCompanySelect
                        companies={companies}
                        value={formData.mra_party_id}
                        onChange={(val) => setFormData({...formData, mra_party_id: val})}
                        placeholder="Select Company *"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Contract Scope / Notes</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Perjanjian sewa bandwidth internet 100Mbps..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={handleCloseAddDrawer}
                      className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingDoc ? 'Update Document' : 'Save Document')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Animated Delete Confirmation Modal */}
      <AnimatePresence>
        {docToDelete && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDocToDelete(null)}
              className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm"
            />
            {/* Modal Card */}
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: 'spring', duration: 0.35 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center"
              >
                {/* Warning Icon Container with Pulses */}
                <div className="relative mb-4">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-sm"
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <div className="relative w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  </div>
                </div>
                
                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus Dokumen</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus dokumen <strong className="text-red-500 dark:text-red-400 font-bold">"{docToDelete.doc_title}"</strong>? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button
                    type="button"
                    onClick={() => setDocToDelete(null)}
                    disabled={submitting}
                    className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteDoc}
                    disabled={submitting}
                    className="flex-1 py-2 bg-red-650 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/25 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
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
