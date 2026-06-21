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
  Maximize2
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export default function GaDeviceRentalsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState(null);
  
  // Filter & Search states
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');

  // Detail drawer & Add modal
  const [selectedRental, setSelectedRental] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Rental Form State
  const [formData, setFormData] = useState({
    company_id: '',
    vendor_id: '',
    device_type: 'Photocopier', // Default general device
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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [rentalsList, vendorsList, compsList] = await Promise.all([
        apiClient.get('/api/ga/device-rentals'),
        apiClient.get('/api/ga/vendors').catch(() => ({ data: [] })),
        apiClient.get('/api/master/companies/all').catch(() => [])
      ]);

      setData(rentalsList || []);
      setVendors(vendorsList.data || vendorsList || []);
      setCompanies(compsList || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch device rentals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
        device_type: 'Photocopier',
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
      alert(err.message || 'Failed to add rental record');
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

  // Filter rentals on client-side (Devices only: filter out laptops, PCs, desktops)
  const itTypes = ['laptop', 'pc', 'desktop', 'computer', 'server', 'ipad', 'tablet', 'imac', 'tab', 'smartphone', 'phone', 'iphone', 'android'];
  const filteredRentals = data.filter(rental => {
    const isItType = itTypes.some(t => rental.device_type?.toLowerCase().includes(t));
    if (isItType) return false; // Skip IT rentals here

    // Apply Search
    const matchesSearch = 
      (rental.item_name && rental.item_name.toLowerCase().includes(search.toLowerCase())) ||
      (rental.device_type && rental.device_type.toLowerCase().includes(search.toLowerCase())) ||
      (rental.unit_code && rental.unit_code.toLowerCase().includes(search.toLowerCase())) ||
      (rental.order_id && rental.order_id.toLowerCase().includes(search.toLowerCase()));

    // Apply Status Filter
    const matchesStatus = !statusFilter || rental.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate totals for Devices only
  const activeRentalsCount = filteredRentals.filter(r => r.status === 'Active').length;
  const totalMonthlyCost = filteredRentals.reduce((acc, curr) => acc + Number(curr.price || 0), 0);

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
            Device Rental
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Pengelolaan sewa peralatan operasional kantor non-IT (AC, Dispenser, Mesin Fotokopi).</p>
        </div>
        <button
          onClick={() => setShowAddDrawer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit"
        >
          <Plus className="w-4 h-4" />
          Add Device Rental
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Leased</p>
            <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{filteredRentals.length}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Rental</p>
            <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{activeRentalsCount}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Monthly Cost</p>
            <h3 className="text-md font-black text-neutral-800 dark:text-white mt-0.5 truncate">{formatIDR(totalMonthlyCost)}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Expiring (30 Days)</p>
            <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{expiringCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by rental item name, code, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-500 focus:outline-none md:w-48"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
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
        ) : filteredRentals.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-xs">
            <Laptop className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
            No device rental records found matching the criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4">Unit Code</th>
                  <th className="p-4">Item Lease Name</th>
                  <th className="p-4">Device Type</th>
                  <th className="p-4">Vendor</th>
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
                      <td className="p-4 text-neutral-500">{rental.device_type || '-'}</td>
                      <td className="p-4 text-neutral-500">{rental.vendors?.vendor_name || '-'}</td>
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Lease Contract Detail</h3>
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
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedRental.device_type || '-'}</span>
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

                  {/* Vendor Info */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">Vendor Information</span>
                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedRental.vendors?.vendor_name || 'Generic Vendor'}</h4>
                      <p className="text-[10px] text-neutral-400">PIC: {selectedRental.vendors?.pic_name || 'N/A'} ({selectedRental.vendors?.phone || 'N/A'})</p>
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

      {/* Add Device Rental Drawer */}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Add Lease Record</h3>
                  <button 
                    onClick={() => setShowAddDrawer(false)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddRental} className="mt-6 space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Lease Item Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Fuji Xerox Versant 180"
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
                        placeholder="e.g. COP-MRA-01"
                        value={formData.unit_code}
                        onChange={(e) => setFormData({...formData, unit_code: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Device Type *</label>
                      <select
                        required
                        value={formData.device_type}
                        onChange={(e) => setFormData({...formData, device_type: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="Photocopier">Photocopier</option>
                        <option value="AC Unit">AC Unit</option>
                        <option value="Dispenser">Dispenser</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Printer">Printer</option>
                        <option value="Vehicle rental">Sewa Kendaraan</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Contract / Order ID</label>
                      <input
                        type="text"
                        placeholder="e.g. ORD-2026-9021"
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
                        placeholder="e.g. 2500000"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Duration (Months)</label>
                      <input
                        type="number"
                        placeholder="e.g. 12"
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
                        placeholder="e.g. Finance / Legal"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Holding Company *</label>
                      <select
                        required
                        value={formData.company_id}
                        onChange={(e) => setFormData({...formData, company_id: e.target.value})}
                        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                      >
                        <option value="">Select Company</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
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
                      {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : 'Save Rental'}
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
