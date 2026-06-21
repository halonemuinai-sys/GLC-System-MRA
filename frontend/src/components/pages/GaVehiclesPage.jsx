'use client';

import React, { useState, useEffect } from 'react';
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
  User,
  ShieldAlert,
  FileText,
  Clock,
  Car,
  Maximize2,
  Building,
  Filter,
  Activity,
  Pencil,
  Trash2,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import DatePicker from '@/components/ui/DatePicker';

const CHART_COLORS = [
  '#4f46e5', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl shadow-xl text-xs">
        <p className="font-bold text-neutral-850 dark:text-neutral-200 capitalize mb-1">{data.type}</p>
        <p className="text-indigo-500 font-semibold font-mono">Jumlah: {data.count} kendaraan</p>
      </div>
    );
  }
  return null;
};

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
            Vehicles Fleet
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
          Add Vehicle
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
                placeholder="Search vehicles by plate number, model, brand, driver..."
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Card */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[300px]">
              <div>
                <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" />
                  Jenis Kendaraan
                </h3>
                <p className="text-[10px] text-neutral-400 mt-1">Breakdown tipe armada kendaraan operasional</p>
              </div>
              
              <div className="h-44 w-full my-3 flex items-center justify-center relative">
                {summary.typeBreakdown && summary.typeBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary.typeBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="type"
                      >
                        {summary.typeBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-xs text-neutral-400 flex flex-col items-center gap-1.5">
                    <Car className="w-8 h-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                    <span>Tidak ada data jenis kendaraan</span>
                  </div>
                )}
              </div>

              {/* Legend / Breakdown List */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 max-h-20 overflow-y-auto text-[10px] pr-1 mt-1 border-t border-neutral-100 dark:border-neutral-800/60 pt-2.5">
                {summary.typeBreakdown && summary.typeBreakdown.map((entry, idx) => (
                  <div key={entry.type} className="flex items-center gap-1.5 truncate">
                    <span 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                    />
                    <span className="text-neutral-500 dark:text-neutral-400 capitalize truncate">{entry.type}</span>
                    <span className="font-bold text-neutral-700 dark:text-neutral-350 ml-auto font-mono">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Fleet Card (Spans 2 columns) */}
              <div className="sm:col-span-2 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 dark:from-indigo-950/20 dark:via-violet-950/25 dark:to-neutral-900 border border-indigo-500/20 dark:border-indigo-500/15 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-500/5 pointer-events-none">
                  <Truck className="w-36 h-36" />
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Fleet Armada</p>
                    <h3 className="text-2xl font-black text-neutral-800 dark:text-white tracking-tight mt-0.5">{meta.total}</h3>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-full font-bold">
                    Database Sync
                  </span>
                </div>
              </div>

              {/* Active Fleet */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Fleet</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.activeCount}</h3>
                </div>
              </div>

              {/* In Service */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">In Service</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.inServiceCount}</h3>
                </div>
              </div>

              {/* Tax Warning */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Tax Warning</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.taxWarningCount}</h3>
                </div>
              </div>

              {/* Entities */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Entities (PT)</p>
                  <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{summary.uniqueCompaniesCount}</h3>
                </div>
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
                  <th className="p-4">Driver Name</th>
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
                      <td className="p-4 text-neutral-500">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{vehicle.driver_name || '-'}</span>
                        </div>
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
      <AnimatePresence>
        {selectedVehicle && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVehicle(null)}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Vehicle Fleet Detail</h3>
                  <button 
                    onClick={() => setSelectedVehicle(null)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Plate Number</span>
                    <h2 className="text-xl font-black text-neutral-800 dark:text-white tracking-wide uppercase font-mono">{selectedVehicle.plate_number}</h2>
                    <span className="text-xs text-indigo-500 font-semibold block mt-1">{selectedVehicle.brand_model || 'Unknown model'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Vehicle Type</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium capitalize">{selectedVehicle.vehicle_type || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Manufacturing Year</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedVehicle.year || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Chassis Number</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium font-mono">{selectedVehicle.chassis_number || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Color</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium capitalize">{selectedVehicle.color || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedVehicle.status || 'Aktif'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Department</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedVehicle.department || '-'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Operation Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tax Payment Date</span>
                      <span className={`text-xs font-bold ${isTaxNearExpiration(selectedVehicle.tax_date) ? 'text-red-500' : 'text-neutral-800 dark:text-slate-200'}`}>
                        {selectedVehicle.tax_date ? new Date(selectedVehicle.tax_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Last Service Date</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedVehicle.last_service_date ? new Date(selectedVehicle.last_service_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Mileage (KM)</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-bold font-mono">
                        {selectedVehicle.last_km ? `${selectedVehicle.last_km.toLocaleString('id-ID')} KM` : '0 KM'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Holding Company</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedVehicle.m_company?.name || '-'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Description & Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Additional Info</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedVehicle.information || 'No info provided.'}</p>
                  </div>

                  {selectedVehicle.doc_url && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block leading-none">Document Reference</span>
                          <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold truncate block mt-0.5">Vehicle Document</span>
                        </div>
                      </div>
                      <a
                        href={selectedVehicle.doc_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/20 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Link
                      </a>
                    </div>
                  )}

                  {/* Driver Info */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">Assigned Driver</span>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedVehicle.driver_name || 'No Dedicated Driver'}</h4>
                        <span className="text-[10px] text-neutral-400">{selectedVehicle.department || 'GA Department'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(selectedVehicle);
                    setSelectedVehicle(null);
                  }}
                  className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-indigo-200/50 dark:border-indigo-900/30"
                >
                  Edit Vehicle
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteVehicle(selectedVehicle)}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-red-200/50 dark:border-red-900/30"
                >
                  Hapus Kendaraan
                </button>
                <button
                  onClick={() => setSelectedVehicle(null)}
                  className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-850 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Vehicle Drawer */}
      <AnimatePresence>
        {showAddDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddDrawer(false)}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">{editingVehicle ? 'Edit Operational Vehicle' : 'Add Operational Vehicle'}</h3>
                  <button 
                    onClick={() => {
                      setShowAddDrawer(false);
                      setEditingVehicle(null);
                    }}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddVehicle} className="mt-6 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Plate Number *</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. B 1234 ABC"
                        value={formData.plate_number}
                        onChange={(e) => setFormData({...formData, plate_number: e.target.value.toUpperCase()})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Vehicle Type *</label>
                      <select
                        required
                        value={formData.vehicle_type}
                        onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="">Select Type</option>
                        <option value="Minibus">Minibus</option>
                        <option value="Motor">Motor</option>
                        <option value="Blind Van">Blind Van</option>
                        <option value="Box">Box</option>
                        <option value="Pickup Box">Pickup Box</option>
                        <option value="Pick Up">Pick Up</option>
                        <option value="Truk">Truk</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Brand & Model *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Toyota Avanza 1.3G"
                      value={formData.brand_model}
                      onChange={(e) => setFormData({...formData, brand_model: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Manufacturing Year</label>
                      <input
                        type="number"
                        placeholder="e.g. 2021"
                        value={formData.year}
                        onChange={(e) => setFormData({...formData, year: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Color</label>
                      <input
                        type="text"
                        placeholder="e.g. Hitam Metalik"
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Chassis Number</label>
                      <input
                        type="text"
                        placeholder="e.g. MHXYF..."
                        value={formData.chassis_number}
                        onChange={(e) => setFormData({...formData, chassis_number: e.target.value.toUpperCase()})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Assigned Driver</label>
                      <input
                        type="text"
                        placeholder="e.g. Ahmad Mansur"
                        value={formData.driver_name}
                        onChange={(e) => setFormData({...formData, driver_name: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Tax Date *</label>
                      <DatePicker
                        required
                        value={formData.tax_date}
                        onChange={(val) => setFormData({...formData, tax_date: val})}
                        placeholder="Pilih tanggal pajak"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. GA / Sales"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Current Mileage (KM)</label>
                      <input
                        type="number"
                        placeholder="e.g. 54200"
                        value={formData.last_km}
                        onChange={(e) => setFormData({...formData, last_km: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Last Service Date</label>
                      <DatePicker
                        value={formData.last_service_date}
                        onChange={(val) => setFormData({...formData, last_service_date: val})}
                        placeholder="Pilih tanggal service"
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
                        <option value="Aktif">Aktif</option>
                        <option value="Perbaikan">Perbaikan</option>
                        <option value="Sewa">Sewa</option>
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
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Additional Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Note about vehicle insurance, keys, or tool kit..."
                      value={formData.information}
                      onChange={(e) => setFormData({...formData, information: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Document Link (e.g. Google Drive)</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
                      <input
                        type="url"
                        placeholder="https://drive.google.com/..."
                        value={formData.doc_url}
                        onChange={(e) => setFormData({...formData, doc_url: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-8 pr-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddDrawer(false);
                        setEditingVehicle(null);
                      }}
                      className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingVehicle ? 'Save Changes' : 'Save Vehicle')}
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
        {vehicleToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setVehicleToDelete(null)}
              className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                transition={{ type: 'spring', duration: 0.35 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center"
              >
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

                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus Kendaraan</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus kendaraan <strong className="text-red-500 dark:text-red-400 font-bold">"{vehicleToDelete.plate_number}"</strong>? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                </p>

                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button
                    type="button"
                    onClick={() => setVehicleToDelete(null)}
                    disabled={submitting}
                    className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteVehicle}
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
