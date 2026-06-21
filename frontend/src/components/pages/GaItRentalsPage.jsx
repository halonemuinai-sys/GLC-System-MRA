'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Laptop, 
  Search, 
  Plus, 
  X, 
  Calendar, 
  Loader2, 
  User, 
  ShieldAlert,
  FileText,
  Clock,
  DollarSign,
  Maximize2,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';

const CHART_COLORS = [
  '#4f46e5', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];


const CustomTooltip = ({ active, payload, globalHidePrices }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const displayVal = globalHidePrices ? '••••' : data.value;
    return (
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-850 p-2.5 rounded-xl shadow-xl text-xs">
        <p className="font-bold text-neutral-850 dark:text-neutral-200 capitalize mb-1">{data.name}</p>
        <p className="text-indigo-500 font-semibold font-mono">Jumlah: {displayVal} unit</p>
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
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-44 overflow-y-auto font-medium">
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
                      className={`w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
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

// Modern Interactive Radar & Scanning Animation for Blank State (IT Rentals)
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

      {/* Center Icon: Animated Laptop Screen SVG */}
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
          <motion.rect 
            x="3" 
            y="4" 
            width="18" 
            height="12" 
            rx="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.path 
            d="M2 20h20"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 }}
          />
          <motion.path 
            d="M9 16v4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.6 }}
          />
          <motion.path 
            d="M15 16v4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.6 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default function GaItRentalsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);
  const [showDashboard, setShowDashboard] = useState(true);
  const [globalHidePrices, setGlobalHidePrices] = useState(false);
  
  // Filter & Search states (Active filters)
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [companyId, setCompanyId] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('');

  // Temporary filters (bound to UI controls)
  const [tempSearch, setTempSearch] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState('Active');
  const [tempCompanyId, setTempCompanyId] = useState('');
  const [tempDeviceTypeFilter, setTempDeviceTypeFilter] = useState('');

  // Process control
  const [hasProcessed, setHasProcessed] = useState(false);

  // Detail drawer & Add modal
  const [selectedRental, setSelectedRental] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helpdesk User Assignment states
  const [helpdeskUsers, setHelpdeskUsers] = useState([]);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);

  // New IT Rental Form State
  const [formData, setFormData] = useState({
    company_id: '',
    vendor_id: '',
    device_type: 'Laptop', // Default IT device
    order_id: '',
    item_name: '',
    price: '',
    unit_code: '',
    duration_months: '',
    start_rent: '',
    end_rent: '',
    department: '',
    status: 'Active'
  });

  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const [vendorsList, compsList] = await Promise.all([
        apiClient.get('/api/ga/vendors').catch(() => ({ data: [] })),
        apiClient.get('/api/master/companies/all').catch(() => [])
      ]);
      setVendors(vendorsList.data || vendorsList || []);
      setCompanies(compsList || []);
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const rentalsList = await apiClient.get('/api/ga/device-rentals');
      setData(rentalsList || []);
      return rentalsList || [];
    } catch (err) {
      setError(err.message || 'Failed to fetch IT rentals');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
    apiClient.get('/api/ga/helpdesk-users')
      .then(res => setHelpdeskUsers(res || []))
      .catch(err => console.error('Failed to fetch helpdesk users:', err));

    const syncHidePrices = () => {
      setGlobalHidePrices(localStorage.getItem('hide-prices') === 'true');
    };
    syncHidePrices();
    window.addEventListener('hide-prices-changed', syncHidePrices);
    return () => window.removeEventListener('hide-prices-changed', syncHidePrices);
  }, []);

  const handleProcessFilter = async (e) => {
    e.preventDefault();
    setSearch(tempSearch);
    setStatusFilter(tempStatusFilter);
    setCompanyId(tempCompanyId);
    setDeviceTypeFilter(tempDeviceTypeFilter);
    setHasProcessed(true);
    await fetchData();
  };

  useEffect(() => {
    if (!selectedRental) {
      setIsEditingUser(false);
      setUserSearch('');
      setSelectedEmployeeId('');
    }
  }, [selectedRental]);

  const handleAssignUser = async (e) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert('Please select an employee.');
      return;
    }

    try {
      setSubmittingUser(true);
      const res = await apiClient.post(`/api/ga/it-rentals/${selectedRental.id}/assign-user`, {
        employeeId: selectedEmployeeId
      });
      
      alert(res.message || 'Approval request submitted successfully!');
      setIsEditingUser(false);
      setUserSearch('');
      setSelectedEmployeeId('');

      // Refresh data
      const updatedList = await fetchData();
      const updatedRental = updatedList.find(r => r.id === selectedRental.id);
      if (updatedRental) {
        setSelectedRental(updatedRental);
      }
    } catch (err) {
      alert(err.message || 'Failed to submit assignment request');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleAddRental = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        company_id: Number(formData.company_id),
        vendor_id: formData.vendor_id ? Number(formData.vendor_id) : null,
        price: formData.price ? Number(formData.price) : 0,
        duration_months: formData.duration_months ? Number(formData.duration_months) : null,
        start_rent: formData.start_rent ? new Date(formData.start_rent).toISOString() : null,
        end_rent: formData.end_rent ? new Date(formData.end_rent).toISOString() : null
      };

      await apiClient.post('/api/ga/device-rentals', payload);
      setShowAddDrawer(false);
      // Reset form
      setFormData({
        company_id: '',
        vendor_id: '',
        device_type: 'Laptop',
        order_id: '',
        item_name: '',
        price: '',
        unit_code: '',
        duration_months: '',
        start_rent: '',
        end_rent: '',
        department: '',
        status: 'Active'
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to add IT rental record');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formats
  const formatIDR = (val) => {
    if (globalHidePrices) return 'Rp ••••••';
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const maskNum = (val) => {
    if (globalHidePrices) return '••••';
    return val;
  };

  // Filter rentals on client-side (IT Devices only: filter in laptops, PCs, desktops)
  const itTypes = ['laptop', 'pc', 'desktop', 'computer', 'server', 'ipad', 'tablet', 'imac', 'tab', 'smartphone', 'phone', 'iphone', 'android'];
  const filteredRentals = data.filter(rental => {
    const isItType = itTypes.some(t => rental.device_type?.toLowerCase().includes(t));
    if (!isItType) return false; // Skip general rentals here

    // Apply Search
    const matchesSearch = 
      (rental.item_name && rental.item_name.toLowerCase().includes(search.toLowerCase())) ||
      (rental.device_type && rental.device_type.toLowerCase().includes(search.toLowerCase())) ||
      (rental.unit_code && rental.unit_code.toLowerCase().includes(search.toLowerCase())) ||
      (rental.order_id && rental.order_id.toLowerCase().includes(search.toLowerCase()));

    // Apply Status Filter
    const matchesStatus = !statusFilter || rental.status === statusFilter;

    // Apply Company Filter
    const matchesCompany = !companyId || String(rental.company_id) === String(companyId);

    // Apply Device Type Filter
    let matchesDeviceType = true;
    if (deviceTypeFilter) {
      const typeLower = deviceTypeFilter.toLowerCase();
      if (typeLower === 'tab') {
        matchesDeviceType = rental.device_type?.toLowerCase().includes('tab') || 
                            rental.device_type?.toLowerCase().includes('ipad') || 
                            rental.device_type?.toLowerCase().includes('tablet');
      } else if (typeLower === 'smartphone') {
        matchesDeviceType = rental.device_type?.toLowerCase().includes('smartphone') || 
                            rental.device_type?.toLowerCase().includes('phone');
      } else {
        matchesDeviceType = rental.device_type?.toLowerCase().includes(typeLower);
      }
    }

    return matchesSearch && matchesStatus && matchesCompany && matchesDeviceType;
  });

  // Dynamic Device Type Breakdown for Chart
  const deviceTypeBreakdownMap = filteredRentals.reduce((acc, rental) => {
    let type = rental.device_type || 'Unknown';
    let key = type.trim();
    if (/laptop/i.test(key)) key = 'Laptop';
    else if (/smartphone|phone|iphone/i.test(key)) key = 'Smartphone';
    else if (/tab|ipad|tablet/i.test(key)) key = 'Tablet';
    else if (/imac/i.test(key)) key = 'iMac';
    else if (/printer/i.test(key)) key = 'Printer';
    else if (/server/i.test(key)) key = 'Server';
    else if (/pc|desktop|computer/i.test(key)) key = 'PC Desktop';
    
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const deviceTypeBreakdown = Object.entries(deviceTypeBreakdownMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);


  // IT Allocation Breakdown Calculations
  const assignedCount = filteredRentals.filter(r => r.assigned_user && !r.pending_approval).length;
  const pendingCount = filteredRentals.filter(r => r.pending_approval).length;
  const unassignedCount = filteredRentals.length - assignedCount - pendingCount;

  // Average rent cost
  const totalMonthlyCost = filteredRentals.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
  const avgCost = filteredRentals.length > 0 ? Math.round(totalMonthlyCost / filteredRentals.length) : 0;

  // Check if near expiration (within 30 days)
  const isEndRentNear = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date();
    const endDate = new Date(dateStr);
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  };

  const expiringCount = filteredRentals.filter(r => isEndRentNear(r.end_rent) && r.status === 'Active').length;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Laptop className="w-6 h-6 text-indigo-500" />
            IT Rentals
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Pengelolaan sewa infrastruktur IT (Laptop, PC Desktop, Server, Printer IT).</p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasProcessed && (
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-neutral-200 dark:border-neutral-800 shadow-sm w-fit"
            >
              {showDashboard ? (
                <>
                  <EyeOff className="w-4 h-4 text-neutral-500" />
                  Sembunyikan Grafik
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-neutral-500" />
                  Tampilkan Grafik
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowAddDrawer(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit"
          >
            <Plus className="w-4 h-4" />
            Add IT Rental
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
        <form onSubmit={handleProcessFilter} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search IT rentals by model, unit code, order ID..."
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

            {/* Device Type Dropdown */}
            <select
              value={tempDeviceTypeFilter}
              onChange={(e) => setTempDeviceTypeFilter(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">All IT Devices</option>
              <option value="Laptop">Laptop</option>
              <option value="Smartphone">Smartphone</option>
              <option value="Tab">Tab / Tablet</option>
              <option value="iMac">iMac</option>
              <option value="Server">Server</option>
            </select>

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
                    setTempStatusFilter('Active');
                    setTempCompanyId('');
                    setTempDeviceTypeFilter('');
                    setSearch('');
                    setStatusFilter('Active');
                    setCompanyId('');
                    setDeviceTypeFilter('');
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
              className="absolute w-72 h-72 rounded-full bg-indigo-500/5 dark:bg-indigo-400/5 -top-12 -left-12 blur-3xl"
              animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute w-80 h-80 rounded-full bg-violet-500/5 dark:bg-violet-400/5 -bottom-20 -right-20 blur-3xl"
              animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
          </div>

          <div className="relative z-10 flex flex-col items-center max-w-sm mx-auto">
            <SearchingRadarAnimation />
            <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-4">Database Sewa IT Siap Dipindai</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-[11px] mt-1.5 leading-relaxed">
              Tentukan filter pencarian, tipe perangkat IT, atau entitas perusahaan di atas, lalu klik <strong>Proses Data</strong> untuk memulai pemindaian database real-time.
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          <AnimatePresence initial={false}>
          {showDashboard && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {/* Summary & Analytics Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Card */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[300px]">
                  <div>
                    <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />
                      Jenis Perangkat
                    </h3>
                    <p className="text-[10px] text-neutral-400 mt-1">Breakdown tipe infrastruktur IT</p>
                  </div>
                  
                  <div className="h-44 w-full my-3 flex items-center justify-center relative">
                    {deviceTypeBreakdown && deviceTypeBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deviceTypeBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={68}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                          >
                            {deviceTypeBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip globalHidePrices={globalHidePrices} />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-neutral-400 flex flex-col items-center gap-1.5">
                        <Laptop className="w-8 h-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                        <span>Tidak ada data jenis perangkat</span>
                      </div>
                    )}
                  </div>

                  {/* Legend / Breakdown List */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 max-h-20 overflow-y-auto text-[10px] pr-1 mt-1 border-t border-neutral-100 dark:border-neutral-800/60 pt-2.5">
                    {deviceTypeBreakdown && deviceTypeBreakdown.map((entry, idx) => (
                      <div key={entry.name} className="flex items-center gap-1.5 truncate">
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="text-neutral-500 dark:text-neutral-400 capitalize truncate">{entry.name}</span>
                        <span className="font-bold text-neutral-700 dark:text-neutral-350 ml-auto font-mono">{maskNum(entry.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1: Total IT Leased */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mt-0.5 flex-shrink-0">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total IT Leased</p>
                      <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(filteredRentals.length)} Perangkat</h3>
                      <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-1 font-medium">
                        Infrastruktur IT aktif yang disewa perusahaan
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Alokasi Karyawan */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mt-0.5 flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Alokasi Karyawan</p>
                      <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">
                        {maskNum(assignedCount + pendingCount)} / {maskNum(filteredRentals.length)}
                      </h3>
                      <div className="text-[9px] text-neutral-400 mt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5 font-bold">
                        <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                          {maskNum(assignedCount)} Aktif
                        </span>
                        {pendingCount > 0 && (
                          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                            {maskNum(pendingCount)} Pending
                          </span>
                        )}
                        {unassignedCount > 0 && (
                          <span className="bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 px-1.5 py-0.5 rounded">
                            {maskNum(unassignedCount)} Kosong
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Monthly Cost */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mt-0.5 flex-shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Monthly Cost</p>
                      <h3 className="text-md font-black text-neutral-800 dark:text-white mt-1 truncate">{formatIDR(totalMonthlyCost)}</h3>
                      <p className="text-[9px] text-neutral-400 mt-1.5 font-semibold">
                        Rata-rata: <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded font-mono">{formatIDR(avgCost)}</span>
                      </p>
                    </div>
                  </div>

                  {/* Card 4: Kontrak Kedaluwarsa */}
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-start gap-4 shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 mt-0.5 flex-shrink-0">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Kontrak Kedaluwarsa</p>
                      <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(expiringCount)} Kontrak</h3>
                      <div className="text-[9px] text-neutral-400 mt-1.5 font-bold">
                        {expiringCount > 0 ? (
                          <span className="text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                            Perlu Perpanjangan (≤ 30 hari)
                          </span>
                        ) : (
                          <span className="text-emerald-650 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                            Semua Kontrak Aman
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
            ) : filteredRentals.length === 0 ? (
              <div className="py-20 text-center text-neutral-400 text-xs">
                <Laptop className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                No IT rental records found matching the criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Unit Code</th>
                      <th className="p-4">Device Lease Model</th>
                      <th className="p-4">IT Device Type</th>
                      <th className="p-4">Vendor</th>
                      <th className="p-4">Assigned To</th>
                      <th className="p-4">Monthly Rental</th>
                      <th className="p-4">Lease Period</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {filteredRentals.map((rental, idx) => {
                      const nearEnd = isEndRentNear(rental.end_rent);
                      return (
                        <motion.tr 
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          key={rental.id} 
                          className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                        >
                          <td className="p-4 font-mono font-bold text-neutral-600 dark:text-neutral-400">{rental.unit_code || '-'}</td>
                          <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{rental.item_name}</td>
                          <td className="p-4 text-neutral-500 capitalize">{rental.device_type || '-'}</td>
                          <td className="p-4 text-neutral-500">{rental.vendors?.vendor_name || '-'}</td>
                          <td className="p-4">
                            {rental.pending_approval ? (
                              <div className="flex flex-col">
                                <span className="text-neutral-400 line-through truncate max-w-[120px]" title="Current user">
                                  {rental.assigned_user?.name || 'Not Assigned'}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-md mt-0.5 w-fit">
                                  <Clock className="w-2.5 h-2.5 animate-spin" />
                                  Pending: {rental.pending_approval.target_user_name}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-semibold text-neutral-800 dark:text-slate-200">
                                  {rental.assigned_user?.name || '-'}
                                </span>
                                <span className="text-[10px] text-neutral-400">
                                  {rental.assigned_user?.department || ''}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(rental.price)}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 font-medium ${nearEnd ? 'text-red-500 font-bold animate-pulse' : 'text-neutral-500'}`}>
                              <Calendar className="w-3.5 h-3.5" />
                              {rental.end_rent ? new Date(rental.end_rent).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => setSelectedRental(rental)}
                              className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Details Slide-Over Drawer */}
      <AnimatePresence>
        {selectedRental && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRental(null)}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">IT Lease Contract Detail</h3>
                  <button 
                    onClick={() => setSelectedRental(null)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Lease Item Name</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedRental.item_name}</h2>
                    <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">{selectedRental.unit_code || 'No Unit Code'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Order / Contract ID</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-mono font-semibold">{selectedRental.order_id || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Device Type</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium capitalize">{selectedRental.device_type || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Monthly Rental</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(selectedRental.price)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Duration</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedRental.duration_months ? `${selectedRental.duration_months} Months` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Start Date</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedRental.start_rent ? new Date(selectedRental.start_rent).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">End Date</span>
                      <span className={`text-xs font-bold ${isEndRentNear(selectedRental.end_rent) ? 'text-red-500' : 'text-neutral-800 dark:text-slate-200'}`}>
                        {selectedRental.end_rent ? new Date(selectedRental.end_rent).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Allocation Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Allocated Dept</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold">{selectedRental.department || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Location / Floor</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRental.m_location?.full_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRental.status || 'Active'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Company Party</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRental.m_company?.name || '-'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Helpdesk User Assignment Section */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Assigned Employee (Helpdesk)</span>
                      {!isEditingUser && !selectedRental.pending_approval && (
                        <button
                          onClick={() => {
                            setIsEditingUser(true);
                            setSelectedEmployeeId(selectedRental.assigned_user?.id || '');
                          }}
                          className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 cursor-pointer"
                        >
                          Edit Assignment
                        </button>
                      )}
                    </div>

                    {isEditingUser ? (
                      <form onSubmit={handleAssignUser} className="space-y-3 mt-2">
                        <div>
                          <label className="text-[9px] text-neutral-400 block mb-1">Search & Select Employee</label>
                          <input
                            type="text"
                            placeholder="Type name or department to search..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none mb-1.5"
                          />
                          <select
                            required
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-neutral-500 focus:outline-none"
                          >
                            <option value="">-- Choose Employee --</option>
                            {helpdeskUsers
                              .filter(u => {
                                const q = userSearch.toLowerCase();
                                return (u.name || '').toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q) || (u.id || '').includes(q);
                              })
                              .slice(0, 100) // limit options to 100 for performance
                              .map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({u.department} - {u.jobPosition})
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingUser(false);
                              setUserSearch('');
                              setSelectedEmployeeId('');
                            }}
                            className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-850 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submittingUser}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-40 text-[10px]"
                          >
                            {submittingUser ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Request Approval'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-1.5">
                        {selectedRental.assigned_user ? (
                          <>
                            <p className="text-xs font-bold text-neutral-800 dark:text-slate-200">
                              {selectedRental.assigned_user.name} ({selectedRental.assigned_user.id})
                            </p>
                            <p className="text-[10px] text-neutral-500 font-semibold">
                              Dept: {selectedRental.assigned_user.department}
                            </p>
                            <p className="text-[10px] text-neutral-400">
                              Email: {selectedRental.assigned_user.email || '-'}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-neutral-400 italic">Not assigned to any employee.</p>
                        )}

                        {selectedRental.pending_approval && (
                          <div className="mt-2.5 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 animate-spin" />
                            <div>
                              <p className="font-bold">Pending Allocation Approval</p>
                              <p className="mt-0.5">Currently waiting for IT Admin to approve allocation to <strong>{selectedRental.pending_approval.target_user_name}</strong>.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Vendor Info */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">Vendor Information</span>
                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedRental.vendors?.vendor_name || 'Generic IT Vendor'}</h4>
                      <p className="text-[10px] text-neutral-400 font-semibold">PIC: {selectedRental.vendors?.pic_name || 'N/A'} ({selectedRental.vendors?.phone || 'N/A'})</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setSelectedRental(null)}
                  className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add IT Rental Drawer */}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Add Lease IT Record</h3>
                  <button 
                    onClick={() => setShowAddDrawer(false)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddRental} className="mt-6 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Lease IT Model *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. ThinkPad L14 Gen 3 / iMac 24"
                      value={formData.item_name}
                      onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Unit Code</label>
                      <input
                        type="text"
                        placeholder="e.g. IT-LAP-024"
                        value={formData.unit_code}
                        onChange={(e) => setFormData({...formData, unit_code: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">IT Device Type *</label>
                      <select
                        required
                        value={formData.device_type}
                        onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-505 focus:outline-none"
                      >
                        <option value="Laptop">Laptop</option>
                        <option value="PC Desktop">PC Desktop</option>
                        <option value="Server">Server</option>
                        <option value="iPad / Tablet">iPad / Tablet</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Contract / Order ID</label>
                      <input
                        type="text"
                        placeholder="e.g. ORD-IT-2026-001"
                        value={formData.order_id}
                        onChange={(e) => setFormData({...formData, order_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Vendor *</label>
                      <select
                        required
                        value={formData.vendor_id}
                        onChange={(e) => setFormData({...formData, vendor_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map(v => (
                          <option key={v.id} value={v.id}>{v.vendor_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Monthly Price (IDR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500000"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Duration (Months)</label>
                      <input
                        type="number"
                        placeholder="e.g. 24"
                        value={formData.duration_months}
                        onChange={(e) => setFormData({...formData, duration_months: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Start Rent Date</label>
                      <input
                        type="date"
                        value={formData.start_rent}
                        onChange={(e) => setFormData({...formData, start_rent: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">End Rent Date *</label>
                      <input
                        required
                        type="date"
                        value={formData.end_rent}
                        onChange={(e) => setFormData({...formData, end_rent: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Department</label>
                      <input
                        type="text"
                        placeholder="e.g. IT Department"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Holding Company *</label>
                      <SearchableCompanySelect
                        companies={companies}
                        value={formData.company_id}
                        onChange={(val) => setFormData({...formData, company_id: val})}
                        placeholder="Select Company (PT)"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setShowAddDrawer(false)}
                      className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Save Lease IT'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
