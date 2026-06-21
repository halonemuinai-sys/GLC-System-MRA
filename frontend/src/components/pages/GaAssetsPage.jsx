'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, 
  Search, 
  Filter, 
  Plus, 
  X, 
  Eye, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  User, 
  Activity,
  Maximize2,
  Building,
  EyeOff,
  Trash2,
  Download,
  Edit3
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const CustomTooltip = ({ active, payload, mode, formatIDR, globalHidePrices }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const displayCount = globalHidePrices ? '••••' : data.count;
    return (
      <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl shadow-xl text-xs">
        <p className="font-bold text-neutral-850 dark:text-neutral-200 capitalize mb-1">{data.name}</p>
        <p className="text-indigo-500 font-semibold font-mono">
          {mode === 'count' ? `Jumlah: ${displayCount} unit` : `Nilai: ${formatIDR(data.value)}`}
        </p>
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
                              ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50'
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
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
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

// Modern Interactive Radar & Scanning Animation for Blank State (Assets themed)
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

      {/* Center Icon: Animated Box Outline SVG */}
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
            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.polyline 
            points="3.27 6.96 12 12.01 20.73 6.96"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.3 }}
          />
          <motion.line 
            x1="12" 
            y1="22.08" 
            x2="12" 
            y2="12"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.6 }}
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default function GaAssetsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [summary, setSummary] = useState({ totalAcquisitionCost: 0, goodConditionCount: 0, needRepairCount: 0, uniqueCompaniesCount: 0, categoryBreakdown: [] });
  const [chartMode, setChartMode] = useState('count'); // 'count' or 'value'
  const [showDashboard, setShowDashboard] = useState(true);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [globalHidePrices, setGlobalHidePrices] = useState(false);
  const [error, setError] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      
      // Fetch all assets with current filters (large limit)
      const res = await apiClient.get('/api/ga/assets', {
        params: {
          page: 1,
          limit: 9999,
          search: search || undefined,
          categoryId: categoryId || undefined,
          locationId: locationId || undefined,
          statusId: statusId || undefined,
          companyId: companyId || undefined
        }
      });
      
      const allAssets = res.data || [];
      const totalCostVal = res.summary?.totalAcquisitionCost || 0;
      const goodCount = res.summary?.goodConditionCount || 0;
      const repairCount = res.summary?.needRepairCount || 0;
      
      const selectedCompanyObj = companies.find(c => String(c.id) === String(companyId));
      const companyName = selectedCompanyObj ? selectedCompanyObj.name : 'All Companies (PT)';
      
      // Generate PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add report header
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 297, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('ASSET SUMMARY & ANALYSIS REPORT', 15, 18);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Company: ${companyName}`, 15, 26);
      doc.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 15, 31);
      doc.text(`Filters - Category: ${categories.find(c => String(c.id) === String(categoryId))?.name || 'All'} | Location: ${locations.find(l => String(l.id) === String(locationId))?.full_name || 'All'} | Status: ${statuses.find(s => String(s.id) === String(statusId))?.name || 'All'}`, 15, 36);
      
      // Draw summary blocks on the right of header
      doc.setFillColor(79, 70, 229); // Indigo-600
      doc.roundedRect(170, 8, 55, 28, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('TOTAL BOOK VALUE', 174, 14);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(formatIDR(totalCostVal), 174, 24);
      
      doc.setFillColor(15, 118, 110); // Teal-700
      doc.roundedRect(230, 8, 52, 28, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('TOTAL ASSET UNITS', 234, 14);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`${maskNum(allAssets.length)} units`, 234, 24);
      
      // Calculate group aggregations on client-side
      const conditionNameMap = {
        'Bagus': 'Good',
        'Good': 'Good',
        'Perlu Perbaikan': 'Damaged',
        'Need Repair': 'Damaged',
        'Repaired': 'Damaged',
        'Damaged': 'Damaged'
      };

      const statusNameMap = {
        'Aktif': 'Active',
        'Active': 'Active',
        'Tidak Aktif': 'Inactive',
        'Inactive': 'Inactive',
        'Dalam Perbaikan': 'Under Repair',
        'Under Repair': 'Under Repair',
        'Disposal': 'Disposed',
        'Disposed': 'Disposed',
        'Dipinjamkan': 'Loaned',
        'Loaned': 'Loaned',
        'Idle': 'Idle'
      };

      const catMap = {};
      const statusMap = {};
      const conditionMap = {};
      
      allAssets.forEach(asset => {
        // Category breakdown
        const catName = asset.m_asset_category?.name || 'Uncategorized';
        const cost = Number(asset.acquisition_cost || 0);
        if (!catMap[catName]) {
          catMap[catName] = { name: catName, count: 0, value: 0 };
        }
        catMap[catName].count++;
        catMap[catName].value += cost;
        
        // Status breakdown
        const rawStatusName = asset.m_status?.name || 'Unknown';
        const statusName = statusNameMap[rawStatusName] || rawStatusName;
        statusMap[statusName] = (statusMap[statusName] || 0) + 1;
        
        // Condition breakdown
        const rawCondName = asset.m_condition?.name || 'Unknown';
        const condName = conditionNameMap[rawCondName] || rawCondName;
        conditionMap[condName] = (conditionMap[condName] || 0) + 1;
      });
      
      // 1. Category Breakdown Table
      const catHeaders = [['Category Name', 'Total Units', 'Total Value', 'Percentage']];
      const catRows = Object.values(catMap).map(c => [
        c.name,
        maskNum(c.count) + ' unit',
        formatIDR(c.value),
        totalCostVal > 0 ? ((c.value / totalCostVal) * 100).toFixed(1) + '%' : '0%'
      ]);
      
      // 2. Health & Status Summary Table
      const healthHeaders = [['Physical Condition', 'Units', 'Asset Status', 'Units']];
      const healthRows = [];
      const condEntries = Object.entries(conditionMap);
      const statusEntries = Object.entries(statusMap);
      const maxRows = Math.max(condEntries.length, statusEntries.length);
      
      for (let i = 0; i < maxRows; i++) {
        const condPart = condEntries[i] ? [condEntries[i][0], maskNum(condEntries[i][1]) + ' unit'] : ['', ''];
        const statusPart = statusEntries[i] ? [statusEntries[i][0], maskNum(statusEntries[i][1]) + ' unit'] : ['', ''];
        healthRows.push([...condPart, ...statusPart]);
      }
      
      // Print tables
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('I. ASSET DISTRIBUTION BY CATEGORY', 15, 54);
      
      autoTable(doc, {
        head: catHeaders,
        body: catRows,
        startY: 58,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229], // Indigo-600
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'center' }
        }
      });
      
      const nextY = doc.lastAutoTable.finalY + 10;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('II. ASSET HEALTH & OPERATIONAL STATUS', 15, nextY);
      
      autoTable(doc, {
        head: healthHeaders,
        body: healthRows,
        startY: nextY + 4,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        headStyles: {
          fillColor: [15, 118, 110], // Teal-700
          textColor: 255,
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          1: { halign: 'center' },
          3: { halign: 'center' }
        }
      });
      
      const analysisY = doc.lastAutoTable.finalY + 10;
      
      // Insights calculations
      const catArray = Object.values(catMap);
      catArray.sort((a, b) => b.count - a.count);
      const topCatByCount = catArray[0] || { name: '-', count: 0 };
      
      catArray.sort((a, b) => b.value - a.value);
      const topCatByValue = catArray[0] || { name: '-', value: 0 };
      
      const goodPct = allAssets.length > 0 ? ((goodCount / allAssets.length) * 100).toFixed(1) : '0';
      const repairPct = allAssets.length > 0 ? ((repairCount / allAssets.length) * 100).toFixed(1) : '0';
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('III. EXECUTIVE SUMMARY & ANALYSIS INSIGHTS', 15, analysisY);
      
      // Draw background box for analysis
      doc.setFillColor(248, 250, 252); // Slate-50
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.setLineWidth(0.3);
      doc.rect(15, analysisY + 4, 267, 30, 'FD');
      
      doc.setTextColor(51, 65, 85); // Slate-700
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      
      // Dynamic Indonesian insight text
      const line1 = `• Berdasarkan data terfilter, total aset yang tercatat adalah sebanyak ${maskNum(allAssets.length)} unit dengan total nilai buku ${formatIDR(totalCostVal)}.`;
      const line2 = `• Kuantitas aset terbanyak didominasi oleh kategori "${topCatByCount.name}" dengan total ${maskNum(topCatByCount.count)} unit.`;
      const line3 = `• Nilai investasi (acquisition cost) tertinggi berada pada kategori "${topCatByValue.name}" dengan total nilai buku ${formatIDR(topCatByValue.value)}.`;
      const line4 = `• Dari aspek kondisi fisik, mayoritas aset dalam keadaan Bagus (${maskNum(goodPct)}%), sedangkan ${maskNum(repairCount)} unit (${maskNum(repairPct)}%) aset memerlukan perbaikan/pemeliharaan segera.`;
      
      doc.text(line1, 18, analysisY + 10);
      doc.text(line2, 18, analysisY + 15);
      doc.text(line3, 18, analysisY + 20);
      doc.text(line4, 18, analysisY + 25);
      
      // Footer page marking on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('GLC MRA Integrated GA Management Suite', 15, 202);
        doc.text(`Page ${i} of ${totalPages}`, 260, 202);
      }
      
      doc.save(`asset_summary_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF: ' + err.message);
    } finally {
      setExportingPDF(false);
    }
  };
  
  // Active filters (passed to the API)
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Temporary filters (bound to UI controls)
  const [tempSearch, setTempSearch] = useState('');
  const [tempCategoryId, setTempCategoryId] = useState('');
  const [tempLocationId, setTempLocationId] = useState('');
  const [tempStatusId, setTempStatusId] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');

  // Process control
  const [hasProcessed, setHasProcessed] = useState(false);

  // Dropdown options
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Detail drawer & Add modal
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Asset Form State
  const [formData, setFormData] = useState({
    company_id: '',
    asset_name: '',
    asset_code: '',
    asset_category_id: '',
    asset_type_id: '',
    location_id: '',
    room: '',
    acquisition_date: '',
    acquisition_cost: '',
    useful_life_months: '',
    condition_id: 1, // Default Good
    status_id: 1, // Default Active
    details: '',
    information: ''
  });

  // Fetch functions
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiClient.get('/api/ga/assets', {
        params: {
          page,
          limit: 15,
          search,
          categoryId: categoryId || undefined,
          locationId: locationId || undefined,
          statusId: statusId || undefined,
          companyId: companyId || undefined
        }
      });
      
      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 15, totalPages: 1 });
      const rawSummary = res.summary || { totalAcquisitionCost: 0, goodConditionCount: 0, needRepairCount: 0, uniqueCompaniesCount: 0 };
      if (rawSummary.categoryBreakdown) {
        rawSummary.categoryBreakdown = rawSummary.categoryBreakdown.map(item => ({
          ...item,
          count: Number(item.count || 0),
          value: Number(item.value || 0)
        }));
      }
      setSummary(rawSummary);
    } catch (err) {
      setError(err.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [cats, locs, stats, comps, conds] = await Promise.all([
        apiClient.get('/api/ga/assets-categories').catch(() => []),
        apiClient.get('/api/ga/assets-locations').catch(() => []),
        apiClient.get('/api/ga/assets-statuses').catch(() => []),
        apiClient.get('/api/master/companies/all').catch(() => []),
        apiClient.get('/api/ga/assets-conditions').catch(() => [])
      ]);
      setCategories(cats);
      setLocations(locs);
      setStatuses(stats);
      setCompanies(comps);
      setConditions(conds);
    } catch (err) {
      console.error('Failed to load filter options', err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    setLoading(false); // Do not block UI in initial loading

    const syncHidePrices = () => {
      setGlobalHidePrices(localStorage.getItem('hide-prices') === 'true');
    };
    syncHidePrices();
    window.addEventListener('hide-prices-changed', syncHidePrices);
    return () => window.removeEventListener('hide-prices-changed', syncHidePrices);
  }, []);

  useEffect(() => {
    if (hasProcessed) {
      fetchData();
    }
  }, [page, search, categoryId, locationId, statusId, companyId, hasProcessed]);

  const handleProcessFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setCategoryId(tempCategoryId);
    setLocationId(tempLocationId);
    setStatusId(tempStatusId);
    setCompanyId(tempCompanyId);
    setHasProcessed(true);
  };

  const handleAddAsset = async (e) => {
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
        asset_category_id: formData.asset_category_id ? Number(formData.asset_category_id) : null,
        asset_type_id: formData.asset_type_id ? Number(formData.asset_type_id) : null,
        location_id: formData.location_id ? Number(formData.location_id) : null,
        condition_id: Number(formData.condition_id),
        status_id: Number(formData.status_id),
        acquisition_cost: formData.acquisition_cost ? Number(formData.acquisition_cost) : 0,
        useful_life_months: formData.useful_life_months ? Number(formData.useful_life_months) : null,
        acquisition_date: formData.acquisition_date ? new Date(formData.acquisition_date).toISOString() : null
      };

      if (editingAsset) {
        await apiClient.put(`/api/ga/assets/${editingAsset.id}`, payload);
      } else {
        await apiClient.post('/api/ga/assets', payload);
      }
      
      handleCloseAddDrawer();
      if (!editingAsset) setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditAsset = (asset) => {
    setEditingAsset(asset);
    setFormData({
      company_id: String(asset.company_id),
      asset_name: asset.asset_name || '',
      asset_code: asset.asset_code || '',
      asset_category_id: asset.asset_category_id ? String(asset.asset_category_id) : '',
      asset_type_id: asset.asset_type_id ? String(asset.asset_type_id) : '',
      location_id: asset.location_id ? String(asset.location_id) : '',
      room: asset.room || '',
      acquisition_date: asset.acquisition_date ? asset.acquisition_date.split('T')[0] : '',
      acquisition_cost: asset.acquisition_cost ? String(asset.acquisition_cost) : '',
      useful_life_months: asset.useful_life_months ? String(asset.useful_life_months) : '',
      condition_id: asset.condition_id || 1,
      status_id: asset.status_id || 1,
      details: asset.details || '',
      information: asset.information || ''
    });
    setShowAddDrawer(true);
  };

  const handleCloseAddDrawer = () => {
    setShowAddDrawer(false);
    setEditingAsset(null);
    setFormData({
      company_id: '',
      asset_name: '',
      asset_code: '',
      asset_category_id: '',
      asset_type_id: '',
      location_id: '',
      room: '',
      acquisition_date: '',
      acquisition_cost: '',
      useful_life_months: '',
      condition_id: 1,
      status_id: 1,
      details: '',
      information: ''
    });
  };

  const handleDeleteAsset = (asset) => {
    setAssetToDelete(asset);
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/ga/assets/${assetToDelete.id}`);
      fetchData();
      if (selectedAsset && selectedAsset.id === assetToDelete.id) {
        setSelectedAsset(null);
      }
      setAssetToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete asset');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper format currency
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

  // Compute summary values from API
  const totalCost = summary.totalAcquisitionCost || 0;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Box className="w-6 h-6 text-indigo-500" />
            Asset Management
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Pengelolaan aset dan inventaris kantor di GLC MRA.</p>
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
          {hasProcessed && (
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-750 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 w-fit"
            >
              {exportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export PDF
                </>
              )}
            </button>
          )}
          <button
            onClick={() => {
              setEditingAsset(null);
              setFormData({
                company_id: '',
                asset_name: '',
                asset_code: '',
                asset_category_id: '',
                asset_type_id: '',
                location_id: '',
                room: '',
                acquisition_date: '',
                acquisition_cost: '',
                useful_life_months: '',
                condition_id: 1,
                status_id: 1,
                details: '',
                information: ''
              });
              setShowAddDrawer(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit"
          >
            <Plus className="w-4 h-4" />
            Add Asset
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
                placeholder="Search assets by code, name, room..."
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

            {/* Category Dropdown */}
            <select
              value={tempCategoryId}
              onChange={(e) => setTempCategoryId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Location Dropdown */}
            <select
              value={tempLocationId}
              onChange={(e) => setTempLocationId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">All Locations</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.full_name || l.building}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            {/* Status Dropdown */}
            <div className="w-full sm:w-60">
              <select
                value={tempStatusId}
                onChange={(e) => setTempStatusId(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
              >
                <option value="">All Statuses</option>
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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
                    setTempCategoryId('');
                    setTempLocationId('');
                    setTempStatusId('');
                    setTempCompanyId('');
                    setSearch('');
                    setCategoryId('');
                    setLocationId('');
                    setStatusId('');
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
            Filter & Proses Data Aset
          </motion.h3>
          
          <motion.p 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed relative z-10"
          >
            Pilih kriteria pencarian dan filter di atas, lalu klik tombol <strong className="text-indigo-500 font-bold">"Proses Data"</strong> untuk memuat data aset dan statistik ringkas.
          </motion.p>
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
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between min-h-[340px]">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-neutral-800 dark:text-slate-200 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-500" />
                          Breakdown Kategori
                        </h3>
                        <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5">
                          <button
                            type="button"
                            onClick={() => setChartMode('count')}
                            className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                              chartMode === 'count' 
                                ? 'bg-white dark:bg-neutral-950 text-indigo-650 dark:text-indigo-400 shadow-sm' 
                                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                            }`}
                          >
                            Unit
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartMode('value')}
                            className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                              chartMode === 'value' 
                                ? 'bg-white dark:bg-neutral-950 text-indigo-650 dark:text-indigo-400 shadow-sm' 
                                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                            }`}
                          >
                            Nilai
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">Distribusi aset berdasarkan pengelompokan kategori</p>
                    </div>
                    
                    <div className="h-40 w-full my-3 flex items-center justify-center relative">
                      {summary.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={summary.categoryBreakdown}
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={65}
                              paddingAngle={3}
                              dataKey={chartMode === 'count' ? 'count' : 'value'}
                              nameKey="name"
                            >
                              {summary.categoryBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip mode={chartMode} formatIDR={formatIDR} globalHidePrices={globalHidePrices} />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-neutral-400 flex flex-col items-center gap-1.5">
                          <Box className="w-8 h-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                          <span>Tidak ada data kategori</span>
                        </div>
                      )}
                    </div>

                    {/* Legend / Breakdown List */}
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 max-h-24 overflow-y-auto text-[10px] pr-1 mt-1 border-t border-neutral-100 dark:border-neutral-800/60 pt-2 bg-neutral-50/50 dark:bg-neutral-950/20 rounded-xl p-2">
                      {summary.categoryBreakdown && summary.categoryBreakdown.map((entry, idx) => (
                        <div key={entry.name} className="flex items-center py-1 gap-1.5 truncate">
                          <span 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <span className="text-neutral-500 dark:text-neutral-400 capitalize truncate font-medium">{entry.name}</span>
                          <span className="font-bold text-neutral-700 dark:text-neutral-350 ml-auto font-mono text-[9px]">
                            {maskNum(entry.count)} unit ({formatIDR(entry.value)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* KPI Cards Grid */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Card 1: Total Value (Spans 2 columns) */}
                    <div className="sm:col-span-2 bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/5 dark:from-indigo-950/20 dark:via-violet-950/25 dark:to-neutral-900 border border-indigo-500/20 dark:border-indigo-500/15 p-5 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden">
                      <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-indigo-500/5 pointer-events-none">
                        <DollarSign className="w-36 h-36" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                          <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Value Aset</p>
                          <h3 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-white tracking-tight mt-0.5">{formatIDR(totalCost)}</h3>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-full font-bold">
                          Acquisition Cost
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Total Aset */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <Box className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Aset</p>
                        <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(meta.total)}</h3>
                      </div>
                    </div>

                    {/* Card 3: Entitas (PT) */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Entitas (PT)</p>
                        <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(summary.uniqueCompaniesCount)}</h3>
                      </div>
                    </div>

                    {/* Card 4: Kondisi Bagus */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Kondisi Bagus</p>
                        <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(summary.goodConditionCount)}</h3>
                      </div>
                    </div>

                    {/* Card 5: Perlu Perbaikan */}
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4.5 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Perlu Perbaikan</p>
                        <h3 className="text-xl font-black text-neutral-800 dark:text-white mt-0.5">{maskNum(summary.needRepairCount)}</h3>
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
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                {error}
              </div>
            ) : data.length === 0 ? (
              <div className="py-20 text-center text-neutral-400 text-xs">
                <Box className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                No assets found matching the criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Code</th>
                      <th className="p-4">Asset Name</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Condition</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {data.map((asset, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={asset.id} 
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-neutral-600 dark:text-neutral-400">{asset.asset_code || '-'}</td>
                        <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{asset.asset_name}</td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium">{asset.m_company?.name || '-'}</td>
                        <td className="p-4 text-neutral-500">{asset.m_asset_category?.name || '-'}</td>
                        <td className="p-4 text-neutral-500">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{asset.m_location ? `${asset.m_location.name} - ${asset.m_location.location}` : '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            asset.m_condition?.name?.toLowerCase().includes('bagus') 
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {asset.m_condition?.name || 'Bagus'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1.5 text-neutral-600 dark:text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {asset.m_status?.name || 'Aktif'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={() => setSelectedAsset(asset)}
                              className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openEditAsset(asset)}
                              className="p-1 text-neutral-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit Aset"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <motion.button
                              type="button"
                              onClick={() => handleDeleteAsset(asset)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Aset"
                            >
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
        {selectedAsset && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAsset(null)}
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
                  <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Asset Detail</h3>
                  <button 
                    onClick={() => setSelectedAsset(null)}
                    className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Basic Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Asset Name</span>
                    <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedAsset.asset_name}</h2>
                    <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">{selectedAsset.asset_code || 'No Code'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Category</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_asset_category?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Asset Type</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_asset_type?.name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Location</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedAsset.m_location ? `${selectedAsset.m_location.name} - ${selectedAsset.m_location.location}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Room</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.room || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Condition</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_condition?.name || 'Bagus'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_status?.name || 'Aktif'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Financials / Useful life */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Acquisition Cost</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(selectedAsset.acquisition_cost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Acquisition Date</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedAsset.acquisition_date ? new Date(selectedAsset.acquisition_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Useful Life</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                        {selectedAsset.useful_life_months ? `${selectedAsset.useful_life_months} Months` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Company</span>
                      <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_company?.name || '-'}</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                  {/* Description & Info */}
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Details</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedAsset.details || 'No details provided.'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Additional Info</span>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedAsset.information || '-'}</p>
                  </div>

                  {/* PIC Info */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">Person In Charge (PIC)</span>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedAsset.m_user?.full_name || 'GA Department'}</h4>
                        <span className="text-[10px] text-neutral-400">{selectedAsset.m_user?.email || 'ga@mraretail.co.id'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAsset(null);
                    openEditAsset(selectedAsset);
                  }}
                  className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-indigo-200/50 dark:border-indigo-900/30"
                >
                  Edit Aset
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAsset(selectedAsset)}
                  className="flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-red-200/50 dark:border-red-900/30"
                >
                  Hapus Aset
                </button>
                <button
                  onClick={() => setSelectedAsset(null)}
                  className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-350 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Asset Drawer */}
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

      {/* Custom Animated Delete Confirmation Modal */}
      <AnimatePresence>
        {assetToDelete && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssetToDelete(null)}
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
                
                <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus Aset</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus aset <strong className="text-red-500 dark:text-red-400 font-bold">"{assetToDelete.asset_name}"</strong>? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2.5 w-full mt-6">
                  <button
                    type="button"
                    onClick={() => setAssetToDelete(null)}
                    disabled={submitting}
                    className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteAsset}
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
