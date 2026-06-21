'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Search, 
  Plus, 
  X, 
  Calendar, 
  Loader2, 
  ShieldAlert,
  Clock,
  DollarSign,
  Maximize2,
  Car,
  Briefcase,
  Building,
  Activity,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  ExternalLink,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

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
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-805 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[38px] select-none"
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

// Modern Interactive Radar & Scanning Animation for Blank State (Insurance themed)
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

      {/* Center Icon: Animated Shield Outline SVG */}
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
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default function GaInsurancesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [summary, setSummary] = useState({ totalCount: 0, activeCount: 0, totalPremiumIdr: 0, totalCoverageIdr: 0, expiringCount: 0, uniqueCompaniesCount: 0 });
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

  // Detail drawer & Add modal
  const [selectedInsurance, setSelectedInsurance] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New Insurance Form State
  const [formData, setFormData] = useState({
    company_id: '',
    insurance_company: '',
    insurance_type: 'All Risk',
    category: 'Kendaraan',
    policy_number: '',
    start_date: '',
    end_date: '',
    vehicle_id: '',
    vehicle_type: '',
    premium_idr: '',
    premium_usd: '',
    coverage_idr: '',
    coverage_usd: '',
    broker: '',
    pic: '',
    contact_person: '',
    information: '',
    doc_url: '',
    status: 'Active'
  });

  const handleCloseAddDrawer = () => {
    setShowAddDrawer(false);
    setEditingInsurance(null);
    setFormData({
      company_id: '',
      insurance_company: '',
      insurance_type: 'All Risk',
      category: 'Kendaraan',
      policy_number: '',
      start_date: '',
      end_date: '',
      vehicle_id: '',
      vehicle_type: '',
      premium_idr: '',
      premium_usd: '',
      coverage_idr: '',
      coverage_usd: '',
      broker: '',
      pic: '',
      contact_person: '',
      information: '',
      doc_url: '',
      status: 'Active'
    });
  };

  const openEditInsurance = (ins) => {
    setEditingInsurance(ins);
    setFormData({
      company_id: ins.company_id ? String(ins.company_id) : '',
      insurance_company: ins.insurance_company || '',
      insurance_type: ins.insurance_type || 'All Risk',
      category: ins.category || 'Kendaraan',
      policy_number: ins.policy_number || '',
      start_date: ins.start_date ? ins.start_date.split('T')[0] : '',
      end_date: ins.end_date ? ins.end_date.split('T')[0] : '',
      vehicle_id: ins.vehicle_id ? String(ins.vehicle_id) : '',
      vehicle_type: ins.vehicle_type || '',
      premium_idr: ins.premium_idr ? String(ins.premium_idr) : '',
      premium_usd: ins.premium_usd ? String(ins.premium_usd) : '',
      coverage_idr: ins.coverage_idr ? String(ins.coverage_idr) : '',
      coverage_usd: ins.coverage_usd ? String(ins.coverage_usd) : '',
      broker: ins.broker || '',
      pic: ins.pic || '',
      contact_person: ins.contact_person || '',
      information: ins.information || '',
      doc_url: ins.doc_url || '',
      status: ins.status || 'Active'
    });
    setShowAddDrawer(true);
  };

  const [insuranceToDelete, setInsuranceToDelete] = useState(null);

  const handleDeleteInsurance = (ins) => {
    setInsuranceToDelete(ins);
  };

  const confirmDeleteInsurance = async () => {
    if (!insuranceToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/legal/insurances/${insuranceToDelete.id}`);
      if (selectedInsurance && selectedInsurance.id === insuranceToDelete.id) {
        setSelectedInsurance(null);
      }
      setInsuranceToDelete(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete insurance record');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiClient.get('/api/legal/insurances', {
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
      setSummary(res.summary || { totalCount: 0, activeCount: 0, totalPremiumIdr: 0, totalCoverageIdr: 0, expiringCount: 0, uniqueCompaniesCount: 0 });
    } catch (err) {
      setError(err.message || 'Failed to fetch insurance records');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [vehList, compsList] = await Promise.all([
        apiClient.get('/api/ga/vehicles').catch(() => ({ data: [] })),
        apiClient.get('/api/master/companies/all').catch(() => [])
      ]);
      setVehicles(vehList.data || vehList || []);
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
  }, [page, search, statusFilter, companyId, hasProcessed]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setStatusFilter(tempStatusFilter);
    setCompanyId(tempCompanyId);
    setHasProcessed(true);
  };

  const handleAddInsurance = async (e) => {
    e.preventDefault();
    if (!formData.company_id) {
      alert('Please select a company.');
      return;
    }
    try {
      setSubmitting(true);

      // Look up vehicle plate number/type if vehicle_id is provided
      let selectedVehType = formData.vehicle_type;
      if (formData.vehicle_id) {
        const matchingVeh = vehicles.find(v => v.id === Number(formData.vehicle_id));
        if (matchingVeh) selectedVehType = `${matchingVeh.brand_model} (${matchingVeh.plate_number})`;
      }

      const payload = {
        ...formData,
        company_id: Number(formData.company_id),
        vehicle_id: formData.vehicle_id ? Number(formData.vehicle_id) : null,
        vehicle_type: selectedVehType,
        premium_idr: formData.premium_idr ? Number(formData.premium_idr) : 0,
        premium_usd: formData.premium_usd ? Number(formData.premium_usd) : 0,
        coverage_idr: formData.coverage_idr ? Number(formData.coverage_idr) : 0,
        coverage_usd: formData.coverage_usd ? Number(formData.coverage_usd) : 0,
        start_date: formData.start_date ? new Date(formData.start_date).toISOString() : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
      };

      if (editingInsurance) {
        await apiClient.put(`/api/legal/insurances/${editingInsurance.id}`, payload);
      } else {
        await apiClient.post('/api/legal/insurances', payload);
      }
      
      handleCloseAddDrawer();
      if (!editingInsurance) setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save insurance record');
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

  // Check if policy is near expiration (within 30 days)
  const isEndRentNear = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const endDate = new Date(dateStr);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  // Filter policies client-side
  const filteredInsurances = data.filter(ins => {
    const matchesSearch = 
      (ins.policy_number && ins.policy_number.toLowerCase().includes(search.toLowerCase())) ||
      (ins.insurance_company && ins.insurance_company.toLowerCase().includes(search.toLowerCase())) ||
      (ins.insurance_type && ins.insurance_type.toLowerCase().includes(search.toLowerCase())) ||
      (ins.vehicle_type && ins.vehicle_type.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = !statusFilter || ins.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPremiums = filteredInsurances.reduce((acc, curr) => acc + Number(curr.premium_idr || 0), 0);
  const expiringCount = filteredInsurances.filter(ins => isEndRentNear(ins.end_date) && ins.status === 'Active').length;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            Insurance Policies
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Daftar polis asuransi aset gedung, inventaris kantor, dan kendaraan operasional.</p>
        </div>
        <button
          onClick={() => setShowAddDrawer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit"
        >
          <Plus className="w-4 h-4" />
          Add Policy
        </button>
      </div>      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by policy number, insurance company, broker..."
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
              placeholder="All Companies (PT)"
            />

            {/* Status Dropdown */}
            <select
              value={tempStatusFilter}
              onChange={(e) => setTempStatusFilter(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
                  Reset Filter
                </button>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
              >
                <Activity className="w-4 h-4" />
                Proses Data
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
            Filter & Proses Polis Asuransi
          </motion.h3>
          
          <motion.p 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed relative z-10"
          >
            Pilih kriteria pencarian dan filter di atas, lalu klik tombol <strong className="text-indigo-500 font-bold">"Proses Data"</strong> untuk memuat polis asuransi aset dan total nilai premi.
          </motion.p>
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Policies</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{meta.total}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Policies</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.activeCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Premium Total</p>
                <h3 className="text-md font-black text-neutral-800 dark:text-white mt-0.5 truncate">{formatIDR(summary.totalPremiumIdr)}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Expiring (30 Days)</p>
                <h3 className="text-xl font-black text-rose-600 dark:text-rose-450 mt-0.5">{summary.expiringCount}</h3>
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Entities (PT)</p>
                <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.uniqueCompaniesCount}</h3>
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
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-red-500" />
                {error}
              </div>
            ) : data.length === 0 ? (
              <div className="py-20 text-center text-neutral-400 text-xs">
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                No insurance policies found matching the criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Policy Number</th>
                      <th className="p-4">Insurance Company</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Category / Type</th>
                      <th className="p-4">Protected Asset</th>
                      <th className="p-4">Premium (IDR)</th>
                      <th className="p-4">Expiration Date</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {data.map((ins, idx) => {
                      const nearEnd = isEndRentNear(ins.end_date);
                      return (
                        <motion.tr 
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          key={ins.id} 
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                        >
                          <td className="p-4 font-mono font-bold text-neutral-600 dark:text-neutral-400">{ins.policy_number || '-'}</td>
                          <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{ins.insurance_company}</td>
                          <td className="p-4 text-neutral-500 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                              <span className="truncate max-w-[150px]">{ins.m_company?.name || '-'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-neutral-500">
                            {ins.category} <span className="text-[10px] text-neutral-400">({ins.insurance_type})</span>
                          </td>
                          <td className="p-4 text-neutral-500">
                            <div className="flex items-center gap-1.5">
                              {ins.category?.toLowerCase() === 'kendaraan' ? <Car className="w-3.5 h-3.5 text-neutral-400" /> : <Briefcase className="w-3.5 h-3.5 text-neutral-400" />}
                              <span className="truncate max-w-[150px]">{ins.vehicle_type || 'Gedung / Inventaris'}</span>
                            </div>
                          </td>
                          <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(ins.premium_idr)}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 font-medium ${nearEnd ? 'text-red-500 font-bold animate-pulse' : 'text-neutral-500'}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {ins.end_date ? new Date(ins.end_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {ins.doc_url && (
                                <a 
                                  href={ins.doc_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 text-neutral-450 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                  title="Open Policy File"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                              <button 
                                onClick={() => setSelectedInsurance(ins)}
                                className="p-1 text-neutral-455 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                              >
                                <Maximize2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => openEditInsurance(ins)}
                                className="p-1 text-neutral-455 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Edit Policy"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <motion.button
                                type="button"
                                onClick={() => handleDeleteInsurance(ins)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 text-neutral-455 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Delete Policy"
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
        {selectedInsurance && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInsurance(null)}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Insurance Policy Detail</h3>
                  <button 
                    onClick={() => setSelectedInsurance(null)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Insurance Company</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedInsurance.insurance_company}</h2>
                    <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">Policy: {selectedInsurance.policy_number || 'No Policy Number'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Category</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">{selectedInsurance.category || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Policy Type</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedInsurance.insurance_type || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Premium (IDR)</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(selectedInsurance.premium_idr)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Coverage Value</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-bold">{formatIDR(selectedInsurance.coverage_idr)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Policy Start</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedInsurance.start_date ? new Date(selectedInsurance.start_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Policy End</span>
                      <span className={`text-xs font-bold ${isEndRentNear(selectedInsurance.end_date) ? 'text-red-500' : 'text-neutral-800 dark:text-slate-200'}`}>
                        {selectedInsurance.end_date ? new Date(selectedInsurance.end_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Vehicle / Protected asset Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Protected Asset / Vehicle</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">{selectedInsurance.vehicle_type || 'Gedung Kantor / Aset GA'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">TJH3 Liability</span>
                      <span className="text-xs font-mono font-medium">{formatIDR(selectedInsurance.tjh3) || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Broker Firm</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedInsurance.broker || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedInsurance.status || 'Active'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Company Party</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedInsurance.m_company?.name || '-'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Broker Contacts */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800 text-xs">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">Policy Administration</span>
                    <p className="font-semibold text-neutral-850 dark:text-slate-200">PIC Internal: {selectedInsurance.pic || '-'}</p>
                    <p className="text-neutral-400 mt-1">Contact: {selectedInsurance.contact_person || 'Generic Agent'}</p>
                  </div>

                  {/* Description & Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Additional Information</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedInsurance.information || 'No additional details provided.'}</p>
                  </div>

                  {selectedInsurance.doc_url && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block leading-none">Policy File</span>
                          <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold truncate block mt-0.5">Insurance Contract File</span>
                        </div>
                      </div>
                      <a
                        href={selectedInsurance.doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/20 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Link
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedInsurance(null);
                    openEditInsurance(selectedInsurance);
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Policy
                </button>
                <button
                  onClick={() => handleDeleteInsurance(selectedInsurance)}
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

      {/* Add Insurance Drawer */}
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
                    {editingInsurance ? 'Edit Insurance Policy' : 'Add Insurance Policy'}
                  </h3>
                  <button 
                    onClick={handleCloseAddDrawer}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddInsurance} className="mt-6 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Insurance Company Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Asuransi Sinarmas / Allianz"
                      value={formData.insurance_company}
                      onChange={(e) => setFormData({...formData, insurance_company: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Policy Number *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. POL-12345-MRA"
                        value={formData.policy_number}
                        onChange={(e) => setFormData({...formData, policy_number: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Policy Type</label>
                      <select
                        required
                        value={formData.insurance_type}
                        onChange={(e) => setFormData({...formData, insurance_type: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="All Risk">All Risk / Comprehensive</option>
                        <option value="TLO">Total Loss Only (TLO)</option>
                        <option value="Fire Insurance">Fire Insurance</option>
                        <option value="Property Insurance">Property Damage</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Category *</label>
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="Kendaraan">Kendaraan (Vehicle)</option>
                        <option value="Gedung / Properti">Gedung / Properti</option>
                        <option value="Inventaris Kantor">Inventaris Kantor</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Link Vehicle Fleet (Optional)</label>
                      <select
                        value={formData.vehicle_id}
                        onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-505 focus:outline-none"
                      >
                        <option value="">-- Non-Vehicle / Unlinked --</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.plate_number} - {v.brand_model}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Premium Cost (IDR) *</label>
                      <input
                        required
                        type="number"
                        placeholder="e.g. 3500000"
                        value={formData.premium_idr}
                        onChange={(e) => setFormData({...formData, premium_idr: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Coverage Limit (IDR) *</label>
                      <input
                        required
                        type="number"
                        placeholder="e.g. 150000000"
                        value={formData.coverage_idr}
                        onChange={(e) => setFormData({...formData, coverage_idr: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Policy Start Date *</label>
                      <input
                        required
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Policy End Date *</label>
                      <input
                        required
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Broker Firm</label>
                      <input
                        type="text"
                        placeholder="e.g. Marsh / Willis Towers Watson"
                        value={formData.broker}
                        onChange={(e) => setFormData({...formData, broker: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Internal PIC</label>
                      <input
                        type="text"
                        placeholder="e.g. Maria / Legal GA"
                        value={formData.pic}
                        onChange={(e) => setFormData({...formData, pic: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Broker Agent Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Robert Setiawan"
                        value={formData.contact_person}
                        onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
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
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Policy Attachment Link (URL)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://drive.google.com/..."
                      value={formData.doc_url}
                      onChange={(e) => setFormData({...formData, doc_url: e.target.value})}
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
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingInsurance ? 'Update Policy' : 'Save Policy')}
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
        {insuranceToDelete && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setInsuranceToDelete(null)}
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
                
                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus Polis Asuransi</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus polis asuransi <strong className="text-red-500 dark:text-red-400 font-bold">"{insuranceToDelete.policy_number}"</strong>? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button
                    type="button"
                    onClick={() => setInsuranceToDelete(null)}
                    disabled={submitting}
                    className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteInsurance}
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
