'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, 
  Search, 
  Plus, 
  X, 
  Calendar, 
  Loader2, 
  User, 
  ShieldAlert,
  Clock,
  DollarSign,
  Maximize2,
  CheckCircle2,
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Building,
  Edit3,
  Trash2,
  ExternalLink,
  FileText,
  Layers,
  List,
  CalendarRange
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';
import GaMaintenanceBulkModal from './GaMaintenanceBulkModal';
import GaMaintenanceJourney from './GaMaintenanceJourney';

// Display label mappings for raw Indonesian status/service_type values stored in the database.
// The underlying stored values (used for filtering, payloads, and color-matching) must stay untouched.
const STATUS_LABELS = { 'Pending': 'Pending', 'Proses': 'In Progress', 'Selesai': 'Completed' };
const statusLabel = (s) => STATUS_LABELS[s] || s || 'Pending';
const SERVICE_TYPE_LABELS = { 'Perbaikan': 'Repair', 'Maintenance Rutin': 'Routine Maintenance', 'Renovasi': 'Renovation', 'Servis Berkala': 'Periodic Service' };
const serviceTypeLabel = (t) => SERVICE_TYPE_LABELS[t] || t || '-';

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
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-white focus-within:border-blue-500 flex items-center justify-between cursor-pointer min-h-[38px] select-none"
      >
        <span className={selectedCompany ? 'text-neutral-900 dark:text-neutral-200 font-medium truncate' : 'text-neutral-400 truncate'}>
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
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500"
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
                      className={`w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium ${
                        String(c.id) === String(value) ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'text-neutral-700 dark:text-neutral-300'
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

// Modern Interactive Radar & Scanning Animation for Blank State (Maintenance themed)
function SearchingRadarAnimation() {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center select-none pointer-events-none mb-3">
      {/* Background Pulse Rings */}
      <motion.div
        className="absolute w-36 h-36 rounded-full border border-blue-500/20 dark:border-blue-400/10 bg-blue-500/5 dark:bg-blue-400/5"
        animate={{ scale: [0.9, 1.2, 0.9], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute w-44 h-44 rounded-full border border-sky-500/15 dark:border-sky-400/5"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Rotating Radar Sweep Line */}
      <motion.div
        className="absolute w-40 h-40 rounded-full border border-dashed border-blue-500/30 dark:border-blue-400/20"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Rotating sweep gradient */}
      <div className="absolute w-40 h-40 overflow-hidden rounded-full pointer-events-none z-10">
        <motion.div
          className="w-full h-full bg-gradient-to-tr from-transparent via-transparent to-blue-500/10 origin-center"
          style={{ transformOrigin: '50% 50%' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Animated Floating Radar Nodes */}
      <motion.div
        className="absolute w-2 h-2 rounded-full bg-blue-500 top-12 left-16 shadow-lg shadow-blue-500/50"
        animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-sky-500 bottom-16 right-12 shadow-lg shadow-sky-500/50"
        animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="absolute w-1.5 h-1.5 rounded-full bg-emerald-500 top-20 right-16 shadow-lg shadow-emerald-500/50"
        animate={{ scale: [0.5, 1.2, 0.5], opacity: [0.2, 1, 0.2] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />

      {/* Center Icon: Animated Wrench Outline SVG */}
      <motion.div
        className="relative z-20 w-16 h-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl flex items-center justify-center shadow-lg shadow-neutral-900/5 dark:shadow-black/40"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg 
          className="w-8 h-8 text-blue-500" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <motion.path 
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default function GaMaintenancesPage() {
  const { lang, t } = useLanguage();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [assets, setAssets] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCost: 0, pendingCount: 0, completedCount: 0, uniqueCompaniesCount: 0 });
  const [error, setError] = useState(null);
  
  // Active filters (passed to the API)
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearch(q);
      setTempSearch(q);
      setHasProcessed(true);
    }
  }, [searchParams]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [view, setView] = useState('list');
  const [monthFilter, setMonthFilter] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Temporary filters (bound to UI controls)
  const [tempSearch, setTempSearch] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');

  // Process control
  const [hasProcessed, setHasProcessed] = useState(false);

  // Detail drawer & Add modal
  const [selectedMaint, setSelectedMaint] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState(null);

  const defaultFormData = {
    company_id: '',
    location_id: '',
    room_area: '',
    asset_id: '',
    asset_name: '',
    detail: '',
    pic: '',
    service_type: 'Perbaikan',
    expired_date: '',
    qty: 1,
    est_cost: '',
    total_cost: '',
    vendor_id: '',
    status: 'Pending',
    information: '',
    reference_link: ''
  };

  // New Maintenance Form State
  const [formData, setFormData] = useState({ ...defaultFormData });

  const handleCloseAddDrawer = () => {
    setShowAddDrawer(false);
    setEditingMaintenance(null);
    setFormData({ ...defaultFormData });
  };

  const openEditMaintenance = (maint) => {
    setEditingMaintenance(maint);
    setFormData({
      company_id: maint.company_id ? String(maint.company_id) : '',
      location_id: maint.location_id ? String(maint.location_id) : '',
      room_area: maint.room_area || '',
      asset_id: maint.asset_id ? String(maint.asset_id) : '',
      asset_name: maint.asset_name || maint.assets?.asset_name || '',
      detail: maint.detail || '',
      pic: maint.pic || '',
      service_type: maint.service_type || 'Perbaikan',
      expired_date: maint.expired_date ? maint.expired_date.split('T')[0] : '',
      qty: maint.qty || 1,
      est_cost: maint.est_cost ? String(maint.est_cost) : '',
      total_cost: maint.total_cost ? String(maint.total_cost) : '',
      vendor_id: maint.vendor_id ? String(maint.vendor_id) : '',
      status: maint.status || 'Pending',
      information: maint.information || '',
      reference_link: maint.reference_link || ''
    });
    setShowAddDrawer(true);
  };

  const handleDeleteMaintenance = (maint) => {
    setMaintenanceToDelete(maint);
  };

  const confirmDeleteMaintenance = async () => {
    if (!maintenanceToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/ga/maintenances/${maintenanceToDelete.id}`);
      if (selectedMaint && selectedMaint.id === maintenanceToDelete.id) {
        setSelectedMaint(null);
      }
      setMaintenanceToDelete(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete maintenance record');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiClient.get('/api/ga/maintenances', {
        params: {
          page,
          limit: pageSize,
          search,
          status: statusFilter || undefined,
          companyId: companyId || undefined,
          month: monthFilter || undefined
        }
      });
      
      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
      setSummary(res.summary || { totalCost: 0, pendingCount: 0, completedCount: 0, uniqueCompaniesCount: 0 });
      
      const searchParamVal = searchParams.get('search');
      if (searchParamVal && res.data && res.data.length === 1) {
        setSelectedMaint(res.data[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch maintenances');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [assetsList, vendorsList, locationsList, compsList] = await Promise.all([
        apiClient.get('/api/ga/assets').catch(() => ({ data: [] })),
        apiClient.get('/api/ga/vendors').catch(() => ({ data: [] })),
        apiClient.get('/api/ga/assets-locations').catch(() => []),
        apiClient.get('/api/master/companies/all').catch(() => [])
      ]);
      setAssets(assetsList.data || assetsList || []);
      setVendors(vendorsList.data || vendorsList || []);
      setLocations(locationsList || []);
      setCompanies(compsList || []);
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
  }, [page, pageSize, search, statusFilter, companyId, monthFilter, hasProcessed]);

  const handleProcessFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setStatusFilter(tempStatusFilter);
    setCompanyId(tempCompanyId);
    setHasProcessed(true);
  };

  const handleAddMaintenance = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      // Look up asset name if asset_id is provided
      let assetName = formData.asset_name;
      if (formData.asset_id) {
        const matchingAsset = assets.find(a => a.id === Number(formData.asset_id));
        if (matchingAsset) assetName = matchingAsset.asset_name;
      }

      const payload = {
        ...formData,
        company_id: Number(formData.company_id),
        location_id: formData.location_id ? Number(formData.location_id) : null,
        asset_id: formData.asset_id ? Number(formData.asset_id) : null,
        asset_name: assetName,
        vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
        qty: Number(formData.qty),
        est_cost: formData.est_cost ? Number(formData.est_cost) : 0,
        total_cost: formData.total_cost ? Number(formData.total_cost) : 0,
        expired_date: formData.expired_date ? new Date(formData.expired_date).toISOString() : null
      };

      if (editingMaintenance) {
        await apiClient.put(`/api/ga/maintenances/${editingMaintenance.id}`, payload);
      } else {
        await apiClient.post('/api/ga/maintenances', payload);
      }
      
      handleCloseAddDrawer();
      if (!editingMaintenance) setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save maintenance record');
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

  const statusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s === 'selesai' || s === 'completed') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
    if (s === 'proses' || s === 'in progress') return 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
    return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400';
  };
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
  const fieldClass = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';
  const rangeStart = meta.total ? (meta.page - 1) * meta.limit + 1 : 0;
  const rangeEnd = Math.min(meta.page * meta.limit, meta.total);
  const summaryCards = [
    { label: 'Total Tickets', value: meta.total, icon: Wrench, tone: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Pending / In Progress', value: summary.pendingCount, icon: Clock, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Completed', value: summary.completedCount, icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { label: 'Total Expense', value: formatIDR(summary.totalCost), icon: DollarSign, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { label: 'Entities (PT)', value: summary.uniqueCompaniesCount, icon: Building, tone: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300' },
  ];

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <div aria-hidden="true" className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-white/[0.03]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><Wrench className="h-4 w-4" />General Affairs</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('gaMaintenances_title')}</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">AC maintenance, vehicle repairs, laptop servicing, and office renovations for GLC MRA.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowBulk(true)} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer">
              <Layers className="h-4 w-4" />Bulk by Company
            </button>
            <button type="button" onClick={() => setShowAddDrawer(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-blue-50 cursor-pointer">
              <Plus className="h-4 w-4" />{t('ga_requestService')}
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleProcessFilter} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-[2]">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search maintenance" type="text" placeholder={t('ga_searchMaintenance')} value={tempSearch} onChange={(e) => setTempSearch(e.target.value)} className={`${fieldClass} pl-9 pr-9`} />
            {tempSearch && <button type="button" aria-label="Clear search" onClick={() => setTempSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="min-w-48 flex-1">
            <SearchableCompanySelect companies={companies} value={tempCompanyId} onChange={(val) => setTempCompanyId(val)} placeholder={t('allCompanies')} />
          </div>
          <select aria-label="Filter status" value={tempStatusFilter} onChange={(e) => setTempStatusFilter(e.target.value)} className={`${fieldClass} w-auto min-w-36 bg-white px-3 dark:bg-slate-900`}>
            <option value="">{t('allStatuses')}</option>
            <option value="Pending">Pending</option>
            <option value="Proses">In Progress</option>
            <option value="Selesai">Completed</option>
          </select>
          <div className="ml-auto flex items-center gap-2">
            {hasProcessed && (
              <button type="button" onClick={() => { setTempSearch(''); setTempStatusFilter(''); setTempCompanyId(''); setSearch(''); setStatusFilter(''); setCompanyId(''); setMonthFilter(''); setHasProcessed(false); setData([]); }} className="h-9 rounded-lg border border-slate-200 px-3.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                {t('resetFilter')}
              </button>
            )}
            <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-blue-700 cursor-pointer">
              <Activity className="h-3.5 w-3.5" />{t('processData')}
            </button>
          </div>
        </div>
      </form>

      {!hasProcessed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <SearchingRadarAnimation />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Filter & Process Maintenance Tasks</h3>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Choose your search criteria above, then click <strong className="font-semibold text-blue-600 dark:text-blue-400">Process Data</strong> to load maintenance tickets and total costs.
          </p>
        </motion.div>
      ) : (
        <>
          {/* View switch */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-700 dark:bg-slate-900">
              {[['list', 'Task List', List], ['journey', 'Monthly Journey', CalendarRange]].map(([key, label, Icon]) => (
                <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer ${view === key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}><Icon className="h-3.5 w-3.5" />{label}</button>
              ))}
            </div>
            {view === 'list' && monthFilter && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <Calendar className="h-3 w-3" />{new Date(`${monthFilter}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                <button type="button" aria-label="Clear month filter" onClick={() => { setMonthFilter(''); setPage(1); }} className="rounded-full p-0.5 hover:bg-blue-100 dark:hover:bg-blue-500/20 cursor-pointer"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>

          {view === 'journey' ? (
            <GaMaintenanceJourney
              filters={{ search, status: statusFilter, companyId }}
              refreshKey={refreshKey}
              onOpenMonth={(month, cid) => {
                setMonthFilter(month);
                if (cid) { setCompanyId(String(cid)); setTempCompanyId(String(cid)); }
                setPage(1);
                setView('list');
              }}
            />
          ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {summaryCards.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Loading data...</div>
            ) : error ? (
              <div className="py-16 text-center text-xs text-rose-500"><ShieldAlert className="mx-auto mb-2 h-6 w-6" />{error}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] table-fixed text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                    <tr>
                      <th className="w-[24%] px-4 py-2.5 font-semibold">Asset Name</th>
                      <th className="w-[14%] px-3 py-2.5 font-semibold">Service Type</th>
                      <th className="w-[17%] px-3 py-2.5 font-semibold">Vendor Partner</th>
                      <th className="w-[13%] px-3 py-2.5 text-right font-semibold">Actual Cost</th>
                      <th className="w-[12%] px-3 py-2.5 font-semibold">Date Completed</th>
                      <th className="w-[10%] px-3 py-2.5 font-semibold">Status</th>
                      <th className="w-[10%] px-3 py-2.5 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {!data.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No maintenance records found matching the criteria.</td></tr>}
                    {data.map((maint) => {
                      const assetName = maint.asset_name || maint.assets?.asset_name || '-';
                      return (
                        <tr key={maint.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td title={assetName} className="truncate px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{assetName}</td>
                          <td className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{serviceTypeLabel(maint.service_type || 'Perbaikan')}</td>
                          <td title={maint.vendors?.vendor_name || ''} className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{maint.vendors?.vendor_name || '—'}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatIDR(maint.total_cost)}</td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{maint.expired_date ? new Date(maint.expired_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'}</td>
                          <td className="px-3 py-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge(maint.status)}`}><span className="h-1 w-1 rounded-full bg-current" />{statusLabel(maint.status || 'Pending')}</span></td>
                          <td className="px-3 py-1.5">
                            <div className="flex items-center justify-end gap-0.5">
                              {maint.reference_link && <a href={maint.reference_link} target="_blank" rel="noopener noreferrer" title="Open reference doc" className={`${actionClass} hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800`}><ExternalLink className="h-3.5 w-3.5" /></a>}
                              <button type="button" title="View details" onClick={() => setSelectedMaint(maint)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Maximize2 className="h-3.5 w-3.5" /></button>
                              <button type="button" title="Edit maintenance" onClick={() => openEditMaintenance(maint)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                              <button type="button" title="Delete maintenance" onClick={() => handleDeleteMaintenance(maint)} className={`${actionClass} hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10`}><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
              <label className="flex items-center gap-2">Rows per page
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {[10, 25, 50].map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{meta.total ? `${rangeStart}–${rangeEnd}` : '0'} of {meta.total}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-10 text-center tabular-nums">{meta.page} / {Math.max(1, meta.totalPages)}</span>
                  <button type="button" aria-label="Next page" disabled={page >= meta.totalPages} onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </>
          )}
        </>
      )}

      <GaMaintenanceBulkModal
        open={showBulk}
        onClose={() => setShowBulk(false)}
        onCreated={() => { setRefreshKey(k => k + 1); if (hasProcessed) fetchData(); }}
        companies={companies}
        vendors={vendors}
        defaultCompanyId={companyId || tempCompanyId}
      />

      {/* Details Slide-Over Drawer */}
      <AnimatePresence>
        {selectedMaint && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMaint(null)}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Maintenance Detail</h3>
                  <button 
                    onClick={() => setSelectedMaint(null)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Asset Under Maintenance</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white mt-0.5">
                      {selectedMaint.asset_name || selectedMaint.assets?.asset_name}
                    </h2>
                    <span className="text-xs text-blue-500 font-semibold font-mono block mt-1">Ticket ID: #{selectedMaint.id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Service Type</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">{serviceTypeLabel(selectedMaint.service_type)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Quantity</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium font-mono">{selectedMaint.qty || 1} Unit</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Estimated Cost</span>
                      <span className="text-xs text-neutral-700 dark:text-slate-300 font-semibold">{formatIDR(selectedMaint.est_cost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Actual Total Cost</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(selectedMaint.total_cost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Service Date</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedMaint.expired_date ? new Date(selectedMaint.expired_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{statusLabel(selectedMaint.status)}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Allocation Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Location Area</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium capitalize">{selectedMaint.m_location?.full_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Room Details</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedMaint.room_area || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">PIC Internal</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedMaint.pic || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Contracting Party</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedMaint.m_company?.name || '-'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Repair Details */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Problem Description</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedMaint.detail || 'No details provided.'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Action Taken / Info</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedMaint.information || '-'}</p>
                  </div>

                  {/* Vendor Details */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">Service Vendor Partner</span>
                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedMaint.vendors?.vendor_name || 'Generic Service Partner'}</h4>
                      <p className="text-[10px] text-neutral-400">Contact: {selectedMaint.vendors?.pic_name || 'N/A'} ({selectedMaint.vendors?.phone || 'N/A'})</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setSelectedMaint(null)}
                  className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Maintenance Drawer */}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">{editingMaintenance ? 'Edit Service Ticket' : 'Request Service Ticket'}</h3>
                  <button 
                    onClick={handleCloseAddDrawer}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddMaintenance} className="mt-6 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Link Asset ID (Optional)</label>
                    <select
                      value={formData.asset_id}
                      onChange={(e) => setFormData({...formData, asset_id: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                    >
                      <option value="">-- Generic/Unlinked Maintenance --</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.asset_code} - {a.asset_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Asset / Item Name *</label>
                    <input
                      required
                      disabled={!!formData.asset_id}
                      type="text"
                      placeholder="e.g. Daikin Split AC Floor 2"
                      value={formData.asset_name}
                      onChange={(e) => setFormData({...formData, asset_name: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Service Type *</label>
                      <select
                        required
                        value={formData.service_type}
                        onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="Perbaikan">Repair</option>
                        <option value="Maintenance Rutin">Routine Maintenance</option>
                        <option value="Renovasi">Renovation</option>
                        <option value="Servis Berkala">Periodic Service</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">PIC Internal *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Budi / GA"
                        value={formData.pic}
                        onChange={(e) => setFormData({...formData, pic: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Location *</label>
                      <select
                        required
                        value={formData.location_id}
                        onChange={(e) => setFormData({...formData, location_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="">Select Location</option>
                        {locations.map(l => (
                          <option key={l.id} value={l.id}>{l.full_name || l.building}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Room / Area</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Lobby"
                        value={formData.room_area}
                        onChange={(e) => setFormData({...formData, room_area: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Estimated Cost</label>
                      <input
                        type="number"
                        placeholder="e.g. 500000"
                        value={formData.est_cost}
                        onChange={(e) => setFormData({...formData, est_cost: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Actual Cost</label>
                      <input
                        type="number"
                        placeholder="e.g. 520000"
                        value={formData.total_cost}
                        onChange={(e) => setFormData({...formData, total_cost: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Vendor Partner</label>
                      <select
                        value={formData.vendor_id}
                        onChange={(e) => setFormData({...formData, vendor_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="">Select Vendor Partner</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.vendor_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Service Date *</label>
                      <input
                        required
                        type="date"
                        value={formData.expired_date}
                        onChange={(e) => setFormData({...formData, expired_date: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status *</label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Proses">In Progress</option>
                        <option value="Selesai">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Company *</label>
                      <SearchableCompanySelect
                        companies={companies}
                        value={formData.company_id}
                        onChange={(val) => setFormData({...formData, company_id: val})}
                        placeholder="Select Company *"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Problem Details *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. AC is leaking water and not cooling..."
                      value={formData.detail}
                      onChange={(e) => setFormData({...formData, detail: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Reference Document Link</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                      <input
                        type="url"
                        placeholder="e.g. https://drive.google.com/..."
                        value={formData.reference_link}
                        onChange={(e) => setFormData({...formData, reference_link: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
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
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingMaintenance ? 'Update Ticket' : 'Submit Ticket')}
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
        {maintenanceToDelete && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMaintenanceToDelete(null)}
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
                
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Confirm Delete Maintenance</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Are you sure you want to delete the maintenance ticket <strong className="text-red-500 dark:text-red-400 font-bold">"{maintenanceToDelete.asset_name || maintenanceToDelete.assets?.asset_name || `#${maintenanceToDelete.id}`}"</strong>? This action is permanent and cannot be undone.
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button
                    type="button"
                    onClick={() => setMaintenanceToDelete(null)}
                    disabled={submitting}
                    className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteMaintenance}
                    disabled={submitting}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/25 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Yes, Delete
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
