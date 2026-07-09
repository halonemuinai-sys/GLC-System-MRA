'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2
} from 'lucide-react';

// Custom Premium Date Picker Component
function PremiumDatePicker({ value, onChange, placeholder = 'Select Date' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [value]);

  const toggleOpen = () => setIsOpen(!isOpen);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const totalDays = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  const prevMonthIndex = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const totalDaysPrev = getDaysInMonth(prevYear, prevMonthIndex);
  
  const daysArray = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysArray.push({
      day: totalDaysPrev - i,
      month: prevMonthIndex,
      year: prevYear,
      isCurrentMonth: false
    });
  }

  for (let i = 1; i <= totalDays; i++) {
    daysArray.push({
      day: i,
      month,
      year,
      isCurrentMonth: true
    });
  }

  const nextMonthIndex = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const remaining = 42 - daysArray.length;
  for (let i = 1; i <= remaining; i++) {
    daysArray.push({
      day: i,
      month: nextMonthIndex,
      year: nextYear,
      isCurrentMonth: false
    });
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDaySelect = (dayObj) => {
    const formattedMonth = String(dayObj.month + 1).padStart(2, '0');
    const formattedDay = String(dayObj.day).padStart(2, '0');
    const dateStr = `${dayObj.year}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return placeholder;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return placeholder;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const isSelected = (dayObj) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === dayObj.day &&
           selectedDate.getMonth() === dayObj.month &&
           selectedDate.getFullYear() === dayObj.year;
  };

  const isToday = (dayObj) => {
    const today = new Date();
    return today.getDate() === dayObj.day &&
           today.getMonth() === dayObj.month &&
           today.getFullYear() === dayObj.year;
  };

  return (
    <div className="relative w-full">
      <div 
        onClick={toggleOpen}
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[38px] select-none text-xs"
      >
        <span className={value ? 'text-neutral-850 dark:text-neutral-200 font-medium' : 'text-neutral-400'}>
          {formatDisplayDate(value)}
        </span>
        <Calendar className="w-4 h-4 text-neutral-400 flex-shrink-0" />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-[70] mt-1.5 w-[280px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-3.5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-xs font-bold text-neutral-800 dark:text-white select-none">
                  {months[month]} {year}
                </div>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-500 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-neutral-400 select-none">
                <span>Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {daysArray.map((dayObj, index) => {
                  const selected = isSelected(dayObj);
                  const today = isToday(dayObj);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDaySelect(dayObj)}
                      className={`h-7 w-7 text-[10px] font-semibold rounded-lg flex items-center justify-center transition-all ${
                        !dayObj.isCurrentMonth 
                          ? 'text-neutral-300 dark:text-neutral-700/60' 
                          : selected 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                            : today
                              ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
                              : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      {dayObj.day}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-850 pt-2.5 flex justify-between items-center text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    const formattedMonth = String(today.getMonth() + 1).padStart(2, '0');
                    const formattedDay = String(today.getDate()).padStart(2, '0');
                    onChange(`${today.getFullYear()}-${formattedMonth}-${formattedDay}`);
                    setIsOpen(false);
                  }}
                  className="font-bold text-indigo-650 dark:text-indigo-400 hover:underline"
                >
                  Hari Ini
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setIsOpen(false);
                    }}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-medium"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

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
                      className={`w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-605 dark:hover:text-indigo-400 transition-colors font-medium ${
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

export default function GaAssetsFormDrawer({
  showAddDrawer,
  editingAsset,
  formData,
  setFormData,
  categories,
  locations,
  conditions,
  statuses,
  companies,
  submitting,
  handleAddAsset,
  handleCloseAddDrawer
}) {
  return (
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
                  {editingAsset ? 'Edit Asset' : 'Add New Asset'}
                </h3>
                <button 
                  onClick={handleCloseAddDrawer}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="mt-6 space-y-4 text-xs">
                <div>
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Asset Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Printer Epson L3210"
                    value={formData.asset_name}
                    onChange={(e) => setFormData({...formData, asset_name: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Asset Code</label>
                    <input
                      type="text"
                      placeholder="e.g. AST-MRA-001"
                      value={formData.asset_code}
                      onChange={(e) => setFormData({...formData, asset_code: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Category *</label>
                    <select
                      required
                      value={formData.asset_category_id}
                      onChange={(e) => setFormData({...formData, asset_category_id: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
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
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Room</label>
                    <input
                      type="text"
                      placeholder="e.g. IT Support Room"
                      value={formData.room}
                      onChange={(e) => setFormData({...formData, room: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Acquisition Cost (IDR)</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000000"
                      value={formData.acquisition_cost}
                      onChange={(e) => setFormData({...formData, acquisition_cost: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Purchase Date</label>
                    <PremiumDatePicker
                      value={formData.acquisition_date}
                      onChange={(val) => setFormData({...formData, acquisition_date: val})}
                      placeholder="Pilih Tanggal Pembelian"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Useful Life (Months)</label>
                    <input
                      type="number"
                      placeholder="e.g. 36"
                      value={formData.useful_life_months}
                      onChange={(e) => setFormData({...formData, useful_life_months: e.target.value})}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Condition *</label>
                    <select
                      required
                      value={formData.condition_id}
                      onChange={(e) => setFormData({...formData, condition_id: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                    >
                      {conditions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Status *</label>
                    <select
                      required
                      value={formData.status_id}
                      onChange={(e) => setFormData({...formData, status_id: e.target.value})}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-500 focus:outline-none"
                    >
                      {statuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Description/Specs</label>
                  <textarea
                    rows={3}
                    placeholder="Processor core i5, 8GB RAM, 256GB SSD..."
                    value={formData.details}
                    onChange={(e) => setFormData({...formData, details: e.target.value})}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-neutral-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-1.5">Reference Link (e.g. Google Drive)</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={formData.reference_link}
                    onChange={(e) => setFormData({...formData, reference_link: e.target.value})}
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
                    {submitting ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : (editingAsset ? 'Update Asset' : 'Save Asset')}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
