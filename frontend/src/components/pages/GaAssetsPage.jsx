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
  Upload,
  Edit3,
  ExternalLink,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
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
  const { lang, t } = useLanguage();
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
  const [exportingExcel, setExportingExcel] = useState(false);

  // Excel Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importPreview, setImportPreview] = useState([]);

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

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true);

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
      const selectedCompanyObj = companies.find(c => String(c.id) === String(companyId));
      const companyName = selectedCompanyObj ? selectedCompanyObj.name : 'Semua Perusahaan (PT)';

      const HEADER_DARK = 'FF1F2937';
      const HEADER_DARK_LIGHT = 'FF374151';
      const LIGHT_ROW = 'FFF8FAFC';
      const BORDER_COLOR = 'FFCBD5E1';
      const TOTAL_BG = 'FFF1F5F9';

      const thinBorder = {
        top: { style: 'thin', color: { argb: BORDER_COLOR } },
        left: { style: 'thin', color: { argb: BORDER_COLOR } },
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } }
      };

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GLC MRA Integrated GA Management Suite';
      workbook.created = new Date();

      // ── SHEET 1: Data Aset ──────────────────────────────────────────
      const sheet = workbook.addWorksheet('Data Aset', {
        views: [{ state: 'frozen', ySplit: 4 }],
        pageSetup: { orientation: 'landscape', fitToPage: true }
      });

      const columns = [
        { header: 'Kode Aset', key: 'asset_code', width: 16 },
        { header: 'Nama Aset', key: 'asset_name', width: 30 },
        { header: 'Kategori', key: 'category', width: 22 },
        { header: 'Tipe', key: 'type', width: 18 },
        { header: 'Perusahaan', key: 'company', width: 26 },
        { header: 'Lokasi', key: 'location', width: 20 },
        { header: 'PIC', key: 'pic', width: 20 },
        { header: 'Tgl Akuisisi', key: 'acquisition_date', width: 14 },
        { header: 'Nilai Akuisisi (Rp)', key: 'acquisition_cost', width: 18 },
        { header: 'Kondisi', key: 'condition', width: 14 },
        { header: 'Status', key: 'status', width: 14 },
        { header: 'Catatan', key: 'information', width: 30 }
      ];
      sheet.columns = columns;

      // Title row (merged)
      sheet.mergeCells(1, 1, 1, columns.length);
      const titleCell = sheet.getCell('A1');
      titleCell.value = 'LAPORAN DATA ASET — MRA GROUP';
      titleCell.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(1).height = 26;
      for (let c = 1; c <= columns.length; c++) sheet.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK } };

      // Subtitle row (merged)
      sheet.mergeCells(2, 1, 2, columns.length);
      const subtitleCell = sheet.getCell('A2');
      subtitleCell.value = `Perusahaan: ${companyName}   |   Total Unit: ${allAssets.length}   |   Total Nilai Buku: Rp ${Number(totalCostVal).toLocaleString('id-ID')}   |   Dicetak: ${new Date().toLocaleString('id-ID')}`;
      subtitleCell.font = { italic: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet.getRow(2).height = 20;
      for (let c = 1; c <= columns.length; c++) sheet.getCell(2, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK_LIGHT } };

      // Spacer row 3, header row 4
      sheet.getRow(3).height = 6;
      const headerRow = sheet.getRow(4);
      headerRow.values = columns.map(c => c.header);
      headerRow.height = 22;
      headerRow.eachCell(cell => {
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
      });
      sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: columns.length } };

      // Data rows
      allAssets.forEach((a, idx) => {
        const row = sheet.addRow({
          asset_code: a.asset_code || '-',
          asset_name: a.asset_name,
          category: a.m_asset_category?.name || '-',
          type: a.m_asset_type?.name || '-',
          company: a.m_company?.name || '-',
          location: a.m_location?.full_name || a.room || '-',
          pic: a.m_user?.full_name || '-',
          acquisition_date: a.acquisition_date ? new Date(a.acquisition_date) : null,
          acquisition_cost: Number(a.acquisition_cost) || 0,
          condition: a.m_condition?.name || '-',
          status: a.m_status?.name || '-',
          information: a.information || '-'
        });
        row.eachCell((cell, colNumber) => {
          cell.border = thinBorder;
          cell.font = { size: 9.5 };
          cell.alignment = { vertical: 'middle' };
          if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ROW } };
          if (columns[colNumber - 1].key === 'acquisition_cost') {
            cell.numFmt = '"Rp" #,##0';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
          if (columns[colNumber - 1].key === 'acquisition_date') {
            cell.numFmt = 'dd/mm/yyyy';
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      // Total summary row (live SUM formula)
      const lastDataRow = 4 + allAssets.length;
      const totalRow = sheet.getRow(lastDataRow + 1);
      sheet.mergeCells(lastDataRow + 1, 1, lastDataRow + 1, 8);
      const totalLabelCell = sheet.getCell(lastDataRow + 1, 1);
      totalLabelCell.value = `TOTAL (${allAssets.length} unit aset)`;
      totalLabelCell.font = { bold: true, size: 10 };
      totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
      const totalValueCell = sheet.getCell(lastDataRow + 1, 9);
      totalValueCell.value = { formula: `SUM(I5:I${lastDataRow})` };
      totalValueCell.numFmt = '"Rp" #,##0';
      totalValueCell.font = { bold: true, size: 10 };
      totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };
      totalRow.eachCell(cell => {
        cell.border = { top: { style: 'double', color: { argb: HEADER_DARK } } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_BG } };
      });

      // ── SHEET 2: Ringkasan (Category / Status / Condition breakdown) ──
      const summarySheet = workbook.addWorksheet('Ringkasan');
      summarySheet.mergeCells('A1:D1');
      const sumTitle = summarySheet.getCell('A1');
      sumTitle.value = 'RINGKASAN DISTRIBUSI ASET';
      sumTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
      sumTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      summarySheet.getRow(1).height = 24;
      for (let c = 1; c <= 4; c++) summarySheet.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK } };

      const catMap = {};
      const statusMap = {};
      const conditionMap = {};
      allAssets.forEach(a => {
        const catName = a.m_asset_category?.name || 'Uncategorized';
        const cost = Number(a.acquisition_cost) || 0;
        if (!catMap[catName]) catMap[catName] = { name: catName, count: 0, value: 0 };
        catMap[catName].count++;
        catMap[catName].value += cost;
        const statusName = a.m_status?.name || 'Unknown';
        statusMap[statusName] = (statusMap[statusName] || 0) + 1;
        const condName = a.m_condition?.name || 'Unknown';
        conditionMap[condName] = (conditionMap[condName] || 0) + 1;
      });

      summarySheet.getCell('A3').value = 'Distribusi per Kategori';
      summarySheet.getCell('A3').font = { bold: true, size: 11 };
      summarySheet.columns = [{ width: 28 }, { width: 14 }, { width: 18 }, { width: 14 }];
      const catHeaderRow = summarySheet.getRow(4);
      catHeaderRow.values = ['Kategori', 'Jumlah Unit', 'Total Nilai (Rp)', 'Persentase'];
      catHeaderRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK_LIGHT } };
        cell.border = thinBorder;
      });
      let r = 5;
      Object.values(catMap).sort((a, b) => b.value - a.value).forEach((c, idx) => {
        const row = summarySheet.getRow(r);
        row.values = [c.name, c.count, c.value, totalCostVal > 0 ? `${((c.value / totalCostVal) * 100).toFixed(1)}%` : '0%'];
        row.getCell(3).numFmt = '"Rp" #,##0';
        row.eachCell(cell => {
          cell.border = thinBorder;
          if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ROW } };
        });
        r++;
      });

      r += 1;
      summarySheet.getCell(`A${r}`).value = 'Distribusi per Status & Kondisi';
      summarySheet.getCell(`A${r}`).font = { bold: true, size: 11 };
      r += 1;
      const statHeaderRow = summarySheet.getRow(r);
      statHeaderRow.values = ['Status Operasional', 'Jumlah Unit', 'Kondisi Fisik', 'Jumlah Unit'];
      statHeaderRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_DARK_LIGHT } };
        cell.border = thinBorder;
      });
      r += 1;
      const statusEntries = Object.entries(statusMap);
      const condEntries = Object.entries(conditionMap);
      const maxRows = Math.max(statusEntries.length, condEntries.length);
      for (let i = 0; i < maxRows; i++) {
        const row = summarySheet.getRow(r);
        row.values = [
          statusEntries[i]?.[0] || '', statusEntries[i]?.[1] ?? '',
          condEntries[i]?.[0] || '', condEntries[i]?.[1] ?? ''
        ];
        row.eachCell(cell => { cell.border = thinBorder; if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_ROW } }; });
        r++;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_Data_Aset_MRA_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export Excel: ' + err.message);
    } finally {
      setExportingExcel(false);
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
    information: '',
    reference_link: ''
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

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Template Import Asset');

      // Styles
      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo
      const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      const centerAlignment = { horizontal: 'center', vertical: 'middle' };
      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };

      // Header row
      const headers = [
        'Nama Aset *',
        'Kode Aset',
        'Kategori Aset',
        'Tipe Aset',
        'Lokasi',
        'Ruangan',
        'PIC',
        'Tanggal Perolehan (YYYY-MM-DD)',
        'Harga Perolehan (IDR)',
        'Masa Manfaat (Bulan)',
        'Kondisi *',
        'Status *',
        'Nama Perusahaan (PT) *',
        'Deskripsi / Spesifikasi',
        'Informasi Tambahan',
        'Link Referensi'
      ];

      const headerRow = sheet.getRow(1);
      headerRow.values = headers;
      headerRow.height = 28;

      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = centerAlignment;
        cell.border = thinBorder;
      });

      // Sample Row
      const sampleRow = sheet.getRow(2);
      sampleRow.values = [
        'Laptop ThinkPad L13',
        'AST-2026-001',
        categories[0]?.name || 'Elektronik',
        'Laptop',
        locations[0]?.name || locations[0]?.full_name || 'MRA Head Office',
        'Lantai 5 - GA',
        'John Doe',
        '2026-01-15',
        15000000,
        36,
        conditions[0]?.name || 'Baik',
        statuses[0]?.name || 'Aktif',
        companies[0]?.name || 'PT MRA',
        'ThinkPad L13 Gen 2, Intel i5, 16GB RAM, 512GB SSD',
        'Aset untuk staff baru GA',
        'https://drive.google.com/drive/folders/example'
      ];
      sampleRow.height = 20;
      sampleRow.eachCell(cell => {
        cell.border = thinBorder;
        cell.font = { size: 9 };
      });

      // Adjust column widths
      sheet.columns = [
        { width: 25 }, // Nama Aset
        { width: 18 }, // Kode Aset
        { width: 20 }, // Kategori Aset
        { width: 18 }, // Tipe Aset
        { width: 22 }, // Lokasi
        { width: 18 }, // Ruangan
        { width: 18 }, // PIC
        { width: 25 }, // Tanggal Perolehan
        { width: 20 }, // Harga Perolehan
        { width: 20 }, // Masa Manfaat
        { width: 15 }, // Kondisi
        { width: 15 }, // Status
        { width: 25 }, // Nama Perusahaan (PT)
        { width: 35 }, // Deskripsi
        { width: 25 }, // Informasi Tambahan
        { width: 25 }  // Link Referensi
      ];

      // Add a sheet for reference data
      const refSheet = workbook.addWorksheet('Panduan & Referensi');
      refSheet.getColumn(1).width = 30;
      refSheet.getColumn(2).width = 30;
      refSheet.getColumn(3).width = 30;
      refSheet.getColumn(4).width = 30;
      refSheet.getColumn(5).width = 30;

      refSheet.getCell('A1').value = 'DAFTAR PERUSAHAAN (PT) *';
      refSheet.getCell('A1').font = { bold: true };
      companies.forEach((comp, index) => {
        refSheet.getCell(`A${index + 2}`).value = comp.name;
      });

      refSheet.getCell('B1').value = 'KATEGORI ASET';
      refSheet.getCell('B1').font = { bold: true };
      categories.forEach((cat, index) => {
        refSheet.getCell(`B${index + 2}`).value = cat.name;
      });

      refSheet.getCell('C1').value = 'LOKASI';
      refSheet.getCell('C1').font = { bold: true };
      locations.forEach((loc, index) => {
        refSheet.getCell(`C${index + 2}`).value = loc.name || loc.full_name;
      });

      refSheet.getCell('D1').value = 'KONDISI ASET *';
      refSheet.getCell('D1').font = { bold: true };
      conditions.forEach((cond, index) => {
        refSheet.getCell(`D${index + 2}`).value = cond.name;
      });

      refSheet.getCell('E1').value = 'STATUS ASET *';
      refSheet.getCell('E1').font = { bold: true };
      statuses.forEach((stat, index) => {
        refSheet.getCell(`E${index + 2}`).value = stat.name;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Template_Import_Asset.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mendownload template: ' + err.message);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(true);
    setImportErrors([]);
    setImportPreview([]);

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const sheet = workbook.getWorksheet(1);
      const parsedData = [];
      const validationErrors = [];

      let lastRow = 1;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const hasValue = row.values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
          if (hasValue) lastRow = rowNumber;
        }
      });

      const expectedHeaders = [
        'Nama Aset *',
        'Kode Aset',
        'Kategori Aset',
        'Tipe Aset',
        'Lokasi',
        'Ruangan',
        'PIC',
        'Tanggal Perolehan (YYYY-MM-DD)',
        'Harga Perolehan (IDR)',
        'Masa Manfaat (Bulan)',
        'Kondisi *',
        'Status *',
        'Nama Perusahaan (PT) *',
        'Deskripsi / Spesifikasi',
        'Informasi Tambahan',
        'Link Referensi'
      ];

      const firstRow = sheet.getRow(1);
      const headers = [];
      for (let c = 1; c <= expectedHeaders.length; c++) {
        headers.push(firstRow.getCell(c).value?.toString().trim());
      }

      const missingHeaders = expectedHeaders.filter((h, idx) => {
        const actual = headers[idx];
        return !actual || !actual.toLowerCase().includes(h.replace(/\s*\*+$/, '').toLowerCase().trim());
      });

      if (missingHeaders.length > 8) {
        validationErrors.push('Struktur header Excel tidak sesuai template. Pastikan Anda mengunduh dan menggunakan template yang benar.');
        setImportErrors(validationErrors);
        setImportingFile(false);
        return;
      }

      const parseExcelDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString().split('T')[0];
        if (typeof val === 'number') {
          const date = new Date(Math.round((val - 25569) * 86400 * 1000));
          return date.toISOString().split('T')[0];
        }
        const match = String(val).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (match) {
          return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
        }
        return String(val).trim();
      };

      for (let r = 2; r <= lastRow; r++) {
        const row = sheet.getRow(r);
        
        const asset_name = row.getCell(1).value?.toString().trim();
        const asset_code = row.getCell(2).value?.toString().trim() || null;
        const asset_category_name = row.getCell(3).value?.toString().trim() || null;
        const asset_type_name = row.getCell(4).value?.toString().trim() || null;
        const location_name = row.getCell(5).value?.toString().trim() || null;
        const room = row.getCell(6).value?.toString().trim() || null;
        const pic_name = row.getCell(7).value?.toString().trim() || null;
        const acquisition_date = parseExcelDate(row.getCell(8).value);
        const acquisition_cost = row.getCell(9).value ? Number(row.getCell(9).value) : 0;
        const useful_life_months = row.getCell(10).value ? Number(row.getCell(10).value) : null;
        const condition_name = row.getCell(11).value?.toString().trim() || null;
        const status_name = row.getCell(12).value?.toString().trim() || null;
        const company_name = row.getCell(13).value?.toString().trim();
        const details = row.getCell(14).value?.toString().trim() || null;
        const information = row.getCell(15).value?.toString().trim() || null;
        
        let reference_link = null;
        const cell16 = row.getCell(16);
        if (cell16.value && typeof cell16.value === 'object' && cell16.value.hyperlink) {
          reference_link = cell16.value.hyperlink;
        } else {
          reference_link = cell16.value?.toString().trim() || null;
        }

        if (!asset_name && !company_name) {
          continue;
        }

        const errorsInRow = [];
        if (!asset_name) errorsInRow.push('Nama Aset wajib diisi.');
        if (!company_name) {
          errorsInRow.push('Nama Perusahaan (PT) wajib diisi.');
        } else {
          const matchedCompany = companies.find(c => c.name.trim().toLowerCase() === company_name.trim().toLowerCase());
          if (!matchedCompany) {
            errorsInRow.push(`Perusahaan "${company_name}" tidak ditemukan.`);
          }
        }

        if (asset_category_name) {
          const matchedCat = categories.find(c => c.name.trim().toLowerCase() === asset_category_name.trim().toLowerCase());
          if (!matchedCat) {
            errorsInRow.push(`Kategori "${asset_category_name}" tidak ditemukan.`);
          }
        }

        if (location_name) {
          const matchedLoc = locations.find(l => (l.name || l.full_name || '').trim().toLowerCase() === location_name.trim().toLowerCase());
          if (!matchedLoc) {
            errorsInRow.push(`Lokasi "${location_name}" tidak ditemukan.`);
          }
        }

        if (condition_name) {
          const matchedCond = conditions.find(c => c.name.trim().toLowerCase() === condition_name.trim().toLowerCase());
          if (!matchedCond) {
            errorsInRow.push(`Kondisi "${condition_name}" tidak ditemukan.`);
          }
        }

        if (status_name) {
          const matchedStat = statuses.find(s => s.name.trim().toLowerCase() === status_name.trim().toLowerCase());
          if (!matchedStat) {
            errorsInRow.push(`Status "${status_name}" tidak ditemukan.`);
          }
        }

        if (acquisition_date && isNaN(Date.parse(acquisition_date))) {
          errorsInRow.push('Format Tanggal Perolehan tidak valid (harus YYYY-MM-DD).');
        }

        if (errorsInRow.length > 0) {
          validationErrors.push(`Baris ${r}: ${errorsInRow.join(' ')}`);
        }

        parsedData.push({
          rowNum: r,
          asset_name,
          asset_code,
          asset_category_name,
          asset_type_name,
          location_name,
          room,
          pic_name,
          acquisition_date,
          acquisition_cost,
          useful_life_months,
          condition_name,
          status_name,
          company_name,
          details,
          information,
          reference_link,
          hasError: errorsInRow.length > 0
        });
      }

      setImportPreview(parsedData);
      setImportErrors(validationErrors);
    } catch (err) {
      setImportErrors(['Gagal memproses file: ' + err.message]);
    } finally {
      setImportingFile(false);
    }
  };

  const handleUploadImport = async () => {
    if (importPreview.length === 0) return;
    if (importErrors.length > 0) {
      alert('Silakan perbaiki error sebelum mengimpor.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/ga/assets/bulk-import', {
        assets: importPreview
      });
      alert(`Berhasil mengimpor ${importPreview.length} aset.`);
      setShowImportModal(false);
      setImportPreview([]);
      setImportErrors([]);
      setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Gagal mengimpor data.');
    } finally {
      setSubmitting(false);
    }
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
        acquisition_date: formData.acquisition_date ? new Date(formData.acquisition_date).toISOString() : null,
        reference_link: formData.reference_link || null
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
      information: asset.information || '',
      reference_link: asset.reference_link || ''
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
      information: '',
      reference_link: ''
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
            {t('gaAssets_title')}
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
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-750 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-teal-600/20 w-fit"
            >
              {exportingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Excel...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  {t('exportExcel')}
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
            {t('ga_addAsset')}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 w-fit"
          >
            <Upload className="w-4 h-4" />
            {t('importExcel')}
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
                placeholder={t('ga_searchAssets')}
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

            {/* Category Dropdown */}
            <select
              value={tempCategoryId}
              onChange={(e) => setTempCategoryId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">{t('allCategories')}</option>
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
                <option value="">{t('allStatuses')}</option>
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
                            {t('gaAssets_unitView')}
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
                            {t('gaAssets_valueView')}
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
                <span className="text-xs text-neutral-400">{t('loading')}</span>
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
                            {asset.reference_link && (
                              <a 
                                href={asset.reference_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-neutral-450 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                title="Open Reference Document"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button 
                              onClick={() => setSelectedAsset(asset)}
                              className="p-1 text-neutral-455 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
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

                  {selectedAsset.reference_link && (
                    <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block leading-none">Document Reference</span>
                          <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold truncate block mt-0.5">Google Drive Document</span>
                        </div>
                      </div>
                      <a
                        href={selectedAsset.reference_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/20 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Link
                      </a>
                    </div>
                  )}

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

      {/* Excel Import Modal */}
      <AnimatePresence>
        {showImportModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm" />
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: 'spring', duration: 0.35 }}
                className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    Import Data from Excel - Asset Management
                  </h3>
                  <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-xs">
                  {/* Step 1: Download Template */}
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/60 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-bold text-neutral-850 dark:text-neutral-250 mb-1">1. Unduh Template Excel</h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">Gunakan template resmi kami agar format kolom sesuai dan proses import berjalan lancar.</p>
                    </div>
                    <button type="button" onClick={handleDownloadTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-md">
                      <Download className="w-3.5 h-3.5" />
                      Unduh Template
                    </button>
                  </div>

                  {/* Step 2: Upload File */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-neutral-850 dark:text-neutral-250">2. Pilih File Excel (.xlsx)</h4>
                    <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 text-center hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors relative cursor-pointer flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                      <input type="file" accept=".xlsx" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                      <p className="font-medium text-neutral-600 dark:text-neutral-400 text-[11px]">Klik untuk memilih file excel template yang telah diisi</p>
                    </div>
                  </div>

                  {/* Loading parsing */}
                  {importingFile && (
                    <div className="flex items-center justify-center py-4 gap-2 text-neutral-500">
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                      <span>Membaca dan memvalidasi file excel...</span>
                    </div>
                  )}

                  {/* Validation errors */}
                  {importErrors.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 p-4 rounded-2xl space-y-1">
                      <h5 className="font-bold flex items-center gap-1.5 text-[11px] mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 animate-pulse text-red-500" />
                        Ditemukan Kesalahan Validasi Data ({importErrors.length}):
                      </h5>
                      <div className="max-h-28 overflow-y-auto divide-y divide-red-500/10 text-[10px] space-y-1">
                        {importErrors.map((err, i) => (
                          <div key={i} className="pt-1">{err}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview parsed data */}
                  {importPreview.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-bold text-neutral-850 dark:text-neutral-250 flex items-center justify-between">
                        <span>Preview Data ({importPreview.length} baris ditemukan)</span>
                        {importErrors.length === 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold rounded-full">
                            Semua data valid
                          </span>
                        )}
                      </h4>
                      <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-[10px] text-left">
                          <thead className="bg-neutral-50 dark:bg-neutral-950 text-neutral-400 font-bold uppercase border-b border-neutral-100 dark:border-neutral-800 sticky top-0">
                            <tr>
                              <th className="p-2 text-center w-8">No</th>
                              <th className="p-2">Nama Aset</th>
                              <th className="p-2">Kode Aset</th>
                              <th className="p-2">Perusahaan (PT)</th>
                              <th className="p-2">Kategori</th>
                              <th className="p-2">Kondisi</th>
                              <th className="p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                            {importPreview.map((row, idx) => (
                              <tr key={idx} className={`${row.hasError ? 'bg-red-500/5 text-red-500' : 'hover:bg-neutral-50 dark:hover:bg-neutral-850/40 text-neutral-700 dark:text-neutral-300'}`}>
                                <td className="p-2 text-center font-medium">{row.rowNum}</td>
                                <td className="p-2 font-bold max-w-[120px] truncate" title={row.asset_name}>{row.asset_name || '-'}</td>
                                <td className="p-2 font-mono">{row.asset_code || '-'}</td>
                                <td className="p-2 truncate max-w-[100px]">{row.company_name || '-'}</td>
                                <td className="p-2">{row.asset_category_name || '-'}</td>
                                <td className="p-2">{row.condition_name || '-'}</td>
                                <td className="p-2">{row.status_name || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-2.5 pt-4 border-t border-neutral-100 dark:border-neutral-800 mt-2">
                  <button type="button" onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} disabled={submitting}
                    className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50">
                    Batal
                  </button>
                  <button type="button" onClick={handleUploadImport} disabled={submitting || importPreview.length === 0 || importErrors.length > 0}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Proses Import ({importPreview.length} Baris)
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
