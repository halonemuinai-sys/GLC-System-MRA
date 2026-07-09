'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Search,
  Plus,
  X,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Car,
  Maximize2,
  Building,
  Activity,
  Pencil,
  Trash2,
  ExternalLink,
  Download
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

// Import subcomponents
import GaVehiclesSummaryDashboard from './GaVehiclesSummaryDashboard';
import GaVehiclesDetailDrawer from './GaVehiclesDetailDrawer';
import GaVehiclesFormDrawer from './GaVehiclesFormDrawer';
import GaVehiclesDeleteModal from './GaVehiclesDeleteModal';
import { handleExportCSV } from './GaVehiclesExports';

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
                      className={`w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors font-medium ${
                        String(c.id) === String(value) ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'
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

// Modern Interactive Radar & Scanning Animation for Blank State
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

      {/* Center Icon: Animated Delivery Truck Outline SVG */}
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
            d="M14 18H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.path 
            d="M14 18h8v-5l-4-4h-4v9z"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 }}
          />
          <circle cx="7.5" cy="18.5" r="2.5" />
          <circle cx="16.5" cy="18.5" r="2.5" />
        </svg>
      </motion.div>
    </div>
  );
}

export default function GaVehiclesPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [summary, setSummary] = useState({ activeCount: 0, inServiceCount: 0, taxWarningCount: 0, uniqueCompaniesCount: 0, typeBreakdown: [] });
  const [error, setError] = useState(null);
  
  // Active filters (passed to the API)
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Temporary filters (bound to UI controls)
  const [tempSearch, setTempSearch] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');

  // Process control
  const [hasProcessed, setHasProcessed] = useState(false);

  // Dropdown options
  const [companies, setCompanies] = useState([]);

  // Detail drawer & Add modal
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  // New Vehicle Form State
  const [formData, setFormData] = useState({
    company_id: '',
    plate_number: '',
    brand_model: '',
    vehicle_type: '',
    year: '',
    color: '',
    chassis_number: '',
    driver_name: '',
    department: '',
    tax_date: '',
    last_km: '',
    last_service_date: '',
    status: 'Aktif',
    information: '',
    doc_url: ''
  });

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearch(q);
      setTempSearch(q);
      setHasProcessed(true);
    }
  }, [searchParams]);

  const formatIDR = (val) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiClient.get('/api/ga/vehicles', {
        params: {
          page,
          limit: 10,
          search,
          status: statusFilter || undefined,
          companyId: companyId || undefined
        }
      });
      
      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
      setSummary(res.summary || { activeCount: 0, inServiceCount: 0, taxWarningCount: 0, uniqueCompaniesCount: 0, typeBreakdown: [] });
      
      const searchParamVal = searchParams.get('search');
      if (searchParamVal && res.data && res.data.length === 1) {
        setSelectedVehicle(res.data[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const comps = await apiClient.get('/api/master/companies/all');
        setCompanies(comps || []);
      } catch (err) {
        console.error('Failed to fetch companies', err);
      }
    };
    fetchCompanies();
    setLoading(false);
  }, []);

  useEffect(() => {
    if (hasProcessed) {
      fetchData();
    }
  }, [page, search, statusFilter, companyId, hasProcessed]);

  const handleProcessFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setStatusFilter(tempStatusFilter);
    setCompanyId(tempCompanyId);
    setHasProcessed(true);
  };

  const handleOpenEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      company_id: vehicle.company_id || '',
      plate_number: vehicle.plate_number || '',
      brand_model: vehicle.brand_model || '',
      vehicle_type: vehicle.vehicle_type || '',
      year: vehicle.year || '',
      color: vehicle.color || '',
      chassis_number: vehicle.chassis_number || '',
      driver_name: vehicle.driver_name || '',
      department: vehicle.department || '',
      tax_date: vehicle.tax_date ? new Date(vehicle.tax_date).toISOString().split('T')[0] : '',
      last_km: vehicle.last_km || '',
      last_service_date: vehicle.last_service_date ? new Date(vehicle.last_service_date).toISOString().split('T')[0] : '',
      status: vehicle.status || 'Aktif',
      information: vehicle.information || '',
      doc_url: vehicle.doc_url || ''
    });
    setShowAddDrawer(true);
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!formData.company_id) {
      alert('Company is required.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        company_id: Number(formData.company_id),
        year: formData.year ? Number(formData.year) : null,
        last_km: formData.last_km ? Number(formData.last_km) : null,
        tax_date: formData.tax_date ? new Date(formData.tax_date).toISOString() : null,
        last_service_date: formData.last_service_date ? new Date(formData.last_service_date).toISOString() : null
      };

      if (editingVehicle) {
        await apiClient.put(`/api/ga/vehicles/${editingVehicle.id}`, payload);
      } else {
        await apiClient.post('/api/ga/vehicles', payload);
      }

      setShowAddDrawer(false);
      setEditingVehicle(null);
      // Reset form
      setFormData({
        company_id: '',
        plate_number: '',
        brand_model: '',
        vehicle_type: '',
        year: '',
        color: '',
        chassis_number: '',
        driver_name: '',
        department: '',
        tax_date: '',
        last_km: '',
        last_service_date: '',
        status: 'Aktif',
        information: '',
        doc_url: ''
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = (vehicle) => {
    setVehicleToDelete(vehicle);
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/ga/vehicles/${vehicleToDelete.id}`);
      fetchData();
      if (selectedVehicle && selectedVehicle.id === vehicleToDelete.id) {
        setSelectedVehicle(null);
      }
      setVehicleToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete vehicle');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if tax is near expiration (within 30 days)
  const isTaxNearExpiration = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const taxDate = new Date(dateStr);
    const diffTime = taxDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-indigo-500" />
            {t('gaVehicles_title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Daftar kendaraan operasional dan logistik perusahaan GLC MRA.</p>
        </div>
        <button
          onClick={() => {
            setEditingVehicle(null);
            setFormData({
              company_id: '',
              plate_number: '',
              brand_model: '',
              vehicle_type: '',
              year: '',
              color: '',
              chassis_number: '',
              driver_name: '',
              department: '',
              tax_date: '',
              last_km: '',
              last_service_date: '',
              status: 'Aktif',
              information: '',
              doc_url: ''
            });
            setShowAddDrawer(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit"
        >
          <Plus className="w-4 h-4" />
          {t('ga_addVehicle')}
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
        <form onSubmit={handleProcessFilter} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder={t('ga_searchVehicles')}
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

            {/* Status Dropdown */}
            <select
              value={tempStatusFilter}
              onChange={(e) => setTempStatusFilter(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">{t('allStatuses')}</option>
              <option value="Aktif">Aktif</option>
              <option value="Perbaikan">Perbaikan</option>
              <option value="Sewa">Sewa</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {hasProcessed && (
                <button
                  type="button"
                  onClick={() => {
                    setTempSearch('');
                    setTempStatusFilter('');
                    setTempCompanyId('');
                    setSearch('');
                    setStatusFilter('');
                    setCompanyId('');
                    setHasProcessed(false);
                    setData([]);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  {t('resetFilter')}
                </button>
              )}
              {hasProcessed && (
                <button
                  type="button"
                  onClick={() => handleExportCSV(search, statusFilter, companyId, setExporting)}
                  disabled={exporting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-emerald-650 hover:bg-emerald-700 active:bg-emerald-850 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/10 disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export Excel
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
            Filter & Proses Data Armada Kendaraan
          </motion.h3>
          
          <motion.p 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed relative z-10"
          >
            Pilih kriteria pencarian dan filter di atas, lalu klik tombol <strong className="text-indigo-500 font-bold">"Proses Data"</strong> untuk memuat data armada dan statistik ringkas.
          </motion.p>
        </motion.div>
      ) : (
        <>
          {/* Summary & Analytics Dashboard */}
          <GaVehiclesSummaryDashboard
            showDashboard={hasProcessed}
            summary={summary}
            meta={meta}
          />

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
                <Truck className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                No vehicles found matching the criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Plate Number</th>
                      <th className="p-4">Brand / Model</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Biaya Pajak (PKB)</th>
                      <th className="p-4">Tax Payment Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {data.map((vehicle, idx) => {
                      const nearTax = isTaxNearExpiration(vehicle.tax_date);
                      return (
                        <motion.tr 
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          key={vehicle.id} 
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                        >
                          <td className="p-4 font-mono font-bold text-neutral-800 dark:text-white uppercase">{vehicle.plate_number}</td>
                          <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">
                            {vehicle.brand_model || '-'}
                            {vehicle.year && <span className="text-[10px] text-neutral-400 ml-1.5 font-normal">({vehicle.year})</span>}
                          </td>
                          <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium">{vehicle.m_company?.name || '-'}</td>
                          <td className="p-4 text-neutral-500 capitalize">{vehicle.vehicle_type || '-'}</td>
                          <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {formatIDR(vehicle.last_km)}
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 font-medium ${nearTax ? 'text-red-500 font-bold' : 'text-neutral-500'}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {vehicle.tax_date ? new Date(vehicle.tax_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                              {nearTax && <span className="text-[8px] uppercase tracking-wider bg-red-100 dark:bg-red-950/40 text-red-500 px-1 rounded">Exp</span>}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              vehicle.status?.toLowerCase() === 'aktif' 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                              {vehicle.status || 'Aktif'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {vehicle.doc_url && (
                                <a
                                  href={vehicle.doc_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                  title="Open Document Link"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button
                                onClick={() => setSelectedVehicle(vehicle)}
                                className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(vehicle)}
                                className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Edit Vehicle"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <motion.button
                                type="button"
                                onClick={() => handleDeleteVehicle(vehicle)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Kendaraan"
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
      <GaVehiclesDetailDrawer
        selectedVehicle={selectedVehicle}
        setSelectedVehicle={setSelectedVehicle}
        handleOpenEdit={handleOpenEdit}
        handleDeleteVehicle={handleDeleteVehicle}
        isTaxNearExpiration={isTaxNearExpiration}
        formatIDR={formatIDR}
      />

      {/* Add / Edit Vehicle Drawer */}
      <GaVehiclesFormDrawer
        showAddDrawer={showAddDrawer}
        setShowAddDrawer={setShowAddDrawer}
        editingVehicle={editingVehicle}
        setEditingVehicle={setEditingVehicle}
        companies={companies}
        formData={formData}
        setFormData={setFormData}
        handleAddVehicle={handleAddVehicle}
        submitting={submitting}
      />

      {/* Custom Animated Delete Confirmation Modal */}
      <GaVehiclesDeleteModal
        vehicleToDelete={vehicleToDelete}
        setVehicleToDelete={setVehicleToDelete}
        confirmDeleteVehicle={confirmDeleteVehicle}
        submitting={submitting}
      />
    </div>
  );
}
