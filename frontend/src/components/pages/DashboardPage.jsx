'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Car, 
  Loader2,
  Laptop,
  TrendingUp,
  Activity,
  Calendar,
  AlertCircle,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileCheck2,
  MinusCircle,
  BarChart3,
  FileText,
  Building2,
  Sun,
  Moon,
  Eye,
  EyeOff,
  ChevronRight,
  MoreVertical,
  Printer,
  Tablet,
  Smartphone,
  HelpCircle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip
} from 'recharts';

const CHART_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent
} from '@/components/ui/tooltip';

// Motion Animation Config
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 22
    }
  },
  hover: {
    y: -6,
    scale: 1.02,
    boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.08), 0 8px 10px -6px rgba(59, 130, 246, 0.08)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 15
    }
  }
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 24
    }
  }
};

const conditionNameMap = {
  'Bagus': 'Good',
  'Good': 'Good',
  'Perlu Perbaikan': 'Damaged',
  'Need Repair': 'Damaged',
  'Repaired': 'Damaged',
  'Damaged': 'Damaged'
};

const displayConditionName = (name) => conditionNameMap[name] || name;

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
  'Loaned': 'Loaned'
};

const displayStatusName = (name) => statusNameMap[name] || name;

export default function DashboardPage() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [globalHidePrices, setGlobalHidePrices] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get('/api/ga/dashboard-stats');
        setStats(data);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();

    // Sync Hide Prices state
    const syncHidePrices = () => {
      setGlobalHidePrices(localStorage.getItem('hide-prices') === 'true');
    };
    syncHidePrices();
    window.addEventListener('hide-prices-changed', syncHidePrices);

    // Dark mode class sync
    setIsDark(document.documentElement.classList.contains('dark'));

    return () => {
      window.removeEventListener('hide-prices-changed', syncHidePrices);
    };
  }, []);



  // Format currency helper
  const formatIDR = (val) => {
    if (val === undefined || val === null) return 'Rp 0';
    const num = parseFloat(val);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const maskPrice = (val) => {
    if (globalHidePrices) return 'Rp ••••••';
    return formatIDR(val);
  };

  const maskNum = (val) => {
    if (globalHidePrices) return '••••';
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getConditionColor = (name) => {
    const norm = displayConditionName(name).toLowerCase();
    if (norm === 'good') return '#2563eb'; // Blue
    if (norm === 'damaged') return '#10b981'; // Green/Teal as in user image
    return '#cbd5e1';
  };

  const getDeviceIcon = (type) => {
    const lower = type.toLowerCase();
    if (lower.includes('mac') || lower.includes('imac') || lower.includes('all in one') || lower.includes('aio') || lower.includes('pc') || lower.includes('desktop')) return <Laptop className="w-4.5 h-4.5" />;
    if (lower.includes('laptop') || lower.includes('notebook') || lower.includes('macbook')) return <Laptop className="w-4.5 h-4.5" />;
    if (lower.includes('printer') || lower.includes('scanner') || lower.includes('copier')) return <Printer className="w-4.5 h-4.5" />;
    if (lower.includes('tab') || lower.includes('ipad') || lower.includes('tablet')) return <Tablet className="w-4.5 h-4.5" />;
    if (lower.includes('phone') || lower.includes('smartphone') || lower.includes('hp')) return <Smartphone className="w-4.5 h-4.5" />;
    return <Laptop className="w-4.5 h-4.5" />;
  };

  const renderCountDiff = (diff, unit = 'devices') => {
    if (diff === undefined || diff === null) return null;
    if (diff > 0) {
      return (
        <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
          <span>↑ {maskNum(diff)} {unit} vs last month</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
          <span>↓ {maskNum(Math.abs(diff))} {unit} vs last month</span>
        </div>
      );
    } else {
      return (
        <div className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1">
          <span>No change vs last month</span>
        </div>
      );
    }
  };

  const renderCostDiff = (diff) => {
    if (diff === undefined || diff === null) return null;
    if (diff > 0) {
      return (
        <div className="text-[10px] text-red-500 font-semibold flex items-center gap-1">
          <span>↑ {maskPrice(diff)} vs last month</span>
        </div>
      );
    } else if (diff < 0) {
      return (
        <div className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
          <span>↓ {maskPrice(Math.abs(diff))} vs last month</span>
        </div>
      );
    } else {
      return (
        <div className="text-[10px] text-neutral-400 font-semibold flex items-center gap-1">
          <span>No change vs last month</span>
        </div>
      );
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-neutral-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span className="text-sm font-medium tracking-wide">Connecting to MRA Database...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="p-6 rounded-2xl bg-red-955/20 border border-red-500/20 text-red-200 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold mb-2">Failed to Load Dashboard</h3>
          <p className="text-sm text-red-300/80 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-red-850 hover:bg-red-800 active:bg-red-900 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }



  const totalValSum = (stats?.categoryBreakdown || []).reduce((acc, c) => acc + c.value, 0);
  const sortedCategories = [...(stats?.categoryBreakdown || [])].sort((a, b) => (b.count || 0) - (a.count || 0));

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-16"
    >
      
      {/* ─── OVERVIEW HEADER ────────────────────────────────────────────────── */}
      <div className="pb-2">
        <h1 className="text-3xl font-extrabold text-neutral-955 dark:text-white tracking-tight flex items-center gap-3">
          {t('dashboard_title')} <span className="text-blue-550 dark:text-blue-400 font-medium text-lg px-2.5 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">{t('dashboard_badge')}</span>
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
          {t('dashboard_subtitle')}
        </p>
      </div>

      {/* ─── PREMIUM KPI CARDS GRID ───────────────────────────────────────── */}
      <TooltipProvider delay={100}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* KPI 1: TOTAL ASSETS */}
          <motion.div variants={cardVariants}>
            <div 
              className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-blue-100/60 dark:border-blue-950/50 hover:border-blue-300 dark:hover:border-blue-700/40 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] will-change-[transform,box-shadow] duration-300 ease-out group cursor-pointer flex flex-col justify-between min-h-[170px]"
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/[0.03] to-blue-500/0 dark:from-blue-500/[0.05] dark:to-blue-500/0 rounded-full blur-2xl -z-10 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              
              {/* Left Marker Bar */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-blue-500 shadow-sm shadow-blue-500/40 transition-transform duration-300 ease-out origin-center group-hover:scale-y-[1.5]" />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-4-50 font-extrabold uppercase tracking-widest leading-none truncate">{t('dashboard_kpiAssets')}</span>
                  <Tooltip>
                    <TooltipTrigger className="text-neutral-450 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                      <HelpCircle className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="max-w-[200px]">
                      Total unit dan nominal aset fisik yang terdaftar di dalam sistem.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Database className="w-4 h-4" />
                </div>
              </div>

              <div className="my-1.5">
                <span className="text-2.5xl font-black text-neutral-900 dark:text-white tracking-tight leading-none font-mono transition-colors">
                  {maskNum(stats?.totalAssets || 0)} <span className="text-xs font-bold text-neutral-400 dark:text-neutral-550 font-sans">{t('unit')}</span>
                </span>
                <span className="text-[10.5px] text-neutral-450 dark:text-neutral-400 font-semibold tracking-wide block mt-1 leading-snug">
                  {maskPrice(stats?.totalAssetValue || 0)}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-100/70 dark:border-neutral-800/80 mt-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 border-blue-100/50 dark:border-blue-900/30">
                  {t('dashboard_statGood')} {maskNum(stats?.goodAssets || 0)}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-455 border-emerald-100/50 dark:border-emerald-900/30">
                  {t('dashboard_statDamaged')} {maskNum(stats?.badAssets || 0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* KPI 2: INSURANCE POLICIES */}
          <motion.div variants={cardVariants}>
            <div 
              className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-cyan-100/60 dark:border-cyan-950/50 hover:border-cyan-300 dark:hover:border-cyan-700/40 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] will-change-[transform,box-shadow] duration-300 ease-out group cursor-pointer flex flex-col justify-between min-h-[170px]"
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-cyan-500/[0.03] to-cyan-500/0 dark:from-cyan-500/[0.05] dark:to-cyan-500/0 rounded-full blur-2xl -z-10 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              
              {/* Left Marker Bar */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-cyan-500 shadow-sm shadow-cyan-500/40 transition-transform duration-300 ease-out origin-center group-hover:scale-y-[1.5]" />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-450 font-extrabold uppercase tracking-widest leading-none truncate">{t('dashboard_kpiInsurance')}</span>
                  <Tooltip>
                    <TooltipTrigger className="text-neutral-455 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                      <HelpCircle className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="max-w-[200px]">
                      Jumlah polis asuransi aktif dan nilai premi tahunan perlindungan aset.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 dark:from-cyan-500/20 dark:to-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="my-1.5">
                <span className="text-2.5xl font-black text-neutral-900 dark:text-white tracking-tight leading-none font-mono transition-colors">
                  {maskNum(stats?.totalInsurances || 0)} <span className="text-xs font-bold text-neutral-400 dark:text-neutral-550 font-sans">policies</span>
                </span>
                <span className="text-[10.5px] text-neutral-455 dark:text-neutral-400 font-semibold tracking-wide block mt-1 leading-snug">
                  {maskPrice(stats?.totalInsurancePremium || 0)} <span className="text-[9px] font-normal text-neutral-450 dark:text-neutral-555 font-sans normal-case">annual</span>
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-100/70 dark:border-neutral-800/80 mt-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-455 border-emerald-100/50 dark:border-emerald-900/30">
                  {t('dashboard_statActive')} {maskNum(stats?.activeInsurances || 0)}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-amber-50 dark:bg-amber-955/30 text-amber-600 dark:text-amber-450 border-amber-100/50 dark:border-amber-900/30">
                  {t('dashboard_statExpiring')} {maskNum(stats?.expiringInsurances || 0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* KPI 3: VEHICLES FLEET */}
          <motion.div variants={cardVariants}>
            <div 
              className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-amber-100/60 dark:border-amber-955/50 hover:border-amber-300 dark:hover:border-amber-700/40 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] will-change-[transform,box-shadow] duration-300 ease-out group cursor-pointer flex flex-col justify-between min-h-[170px]"
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/[0.03] to-amber-500/0 dark:from-amber-500/[0.05] dark:to-amber-500/0 rounded-full blur-2xl -z-10 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              
              {/* Left Marker Bar */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-amber-500 shadow-sm shadow-amber-500/40 transition-transform duration-300 ease-out origin-center group-hover:scale-y-[1.5]" />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-450 font-extrabold uppercase tracking-widest leading-none truncate">{t('dashboard_kpiVehicles')}</span>
                  <Tooltip>
                    <TooltipTrigger className="text-neutral-455 hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                      <HelpCircle className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="max-w-[200px]">
                      Total armada kendaraan operasional dan logistik terdaftar beserta status perawatannya.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-amber-500/10 text-amber-500 dark:text-amber-455 border border-amber-500/20 dark:border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Car className="w-4 h-4" />
                </div>
              </div>

              <div className="my-1.5">
                <span className="text-2.5xl font-black text-neutral-900 dark:text-white tracking-tight leading-none font-mono transition-colors">
                  {maskNum(stats?.totalVehicles || 0)} <span className="text-xs font-bold text-neutral-400 dark:text-neutral-550 font-sans">{t('dashboard_kpiVehiclesUnit')}</span>
                </span>
                <span className="text-[10.5px] text-neutral-455 dark:text-neutral-400 font-semibold tracking-wide block mt-1 leading-snug">
                  {maskPrice(stats?.totalVehicleValue || 0)} <span className="text-[9px] font-normal text-neutral-450 dark:text-neutral-555 font-sans normal-case">insured</span>
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-neutral-100/70 dark:border-neutral-800/80 mt-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-455 border-emerald-100/50 dark:border-emerald-900/30">
                  {t('dashboard_statActive')} {maskNum(stats?.activeVehicles || 0)}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-amber-50 dark:bg-amber-955/30 text-amber-600 dark:text-amber-450 border-amber-100/50 dark:border-amber-900/30">
                  {t('dashboard_statInService')} {maskNum(stats?.inServiceVehicles || 0)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* KPI 4: VENDORS DIRECTORY */}
          <motion.div variants={cardVariants}>
            <div 
              className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-emerald-100/60 dark:border-emerald-950/50 hover:border-emerald-300 dark:hover:border-emerald-700/40 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] will-change-[transform,box-shadow] duration-300 ease-out group cursor-pointer flex flex-col justify-between min-h-[170px]"
            >
              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/[0.03] to-emerald-500/0 dark:from-emerald-500/[0.05] dark:to-emerald-500/0 rounded-full blur-2xl -z-10 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
              
              {/* Left Marker Bar */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-emerald-500 shadow-sm shadow-emerald-500/40 transition-transform duration-300 ease-out origin-center group-hover:scale-y-[1.5]" />

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-450 font-extrabold uppercase tracking-widest leading-none truncate">{t('dashboard_kpiVendors')}</span>
                  <Tooltip>
                    <TooltipTrigger className="text-neutral-455 hover:text-emerald-600 dark:hover:text-emerald-450 transition-colors">
                      <HelpCircle className="w-3 h-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="max-w-[200px]">
                      Daftar rekanan, penyedia jasa pemeliharaan, sewa, dan pengadaan di dalam sistem.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 dark:from-emerald-500/20 dark:to-emerald-500/10 text-emerald-500 dark:text-emerald-450 border border-emerald-500/20 dark:border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="my-1.5">
                <span className="text-2.5xl font-black text-neutral-900 dark:text-white tracking-tight leading-none font-mono transition-colors">
                  {maskNum(stats?.totalVendors || 0)} <span className="text-xs font-bold text-neutral-400 dark:text-neutral-550 font-sans">{t('dashboard_kpiPartners')}</span>
                </span>
                <span className="text-[10.5px] text-neutral-450 dark:text-neutral-550 font-semibold tracking-wide block mt-1 leading-snug">
                  {t('dashboard_partnersDir')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-neutral-100/70 dark:border-neutral-800/80 mt-2 flex-wrap">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-455 border-emerald-100/50 dark:border-emerald-900/30">
                Active: {maskNum(stats?.activeVendors || 0)}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-455 border-rose-100/50 dark:border-rose-900/30">
                Inactive: {maskNum(stats?.inactiveVendors || 0)}
              </span>
            </div>
          </motion.div>
        </div>
      </TooltipProvider>

      {/* ─── 2. ASSET OVERVIEW ────────────────────────────────────────────── */}
      <motion.section 
        variants={sectionVariants}
        className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-blue-500/5 blur-[80px] pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200">Asset Overview</h2>
              <p className="text-xs text-neutral-400">Physical condition breakdown and operational status of all registered assets.</p>
            </div>
          </div>

          {/* Interactive Date filter select and vertical dots */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-600 dark:text-neutral-400 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span>This Year</span>
            </button>
            <button className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-neutral-400">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Panel A: Category Breakdown */}
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-6 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-555">CATEGORY BREAKDOWN</h3>
            </div>
            {sortedCategories.length > 0 ? (
              <div className="space-y-4">
                {sortedCategories.map((cat, idx) => {
                  const percentage = totalValSum > 0 ? (cat.value / totalValSum) * 100 : 0;
                  const color = CHART_COLORS[idx % CHART_COLORS.length];
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate mr-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="font-mono text-[10px] text-neutral-450 dark:text-neutral-550">{maskNum(cat.count)} units</span>
                          <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{maskPrice(cat.value)} <span className="text-[10px] font-normal text-neutral-450 dark:text-neutral-550">({percentage.toFixed(1)}%)</span></span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-700" 
                          style={{ width: `${percentage}%`, backgroundColor: color }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-xs text-neutral-400">No category data available</div>
            )}
          </div>

          {/* Panel B: Asset Condition — Donut Chart with Centered Number */}
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-6 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-555">ASSET CONDITION</h3>
            </div>
            {(stats?.assetConditionBreakdown || []).length > 0 ? (() => {
              const totalConditionCount = (stats?.assetConditionBreakdown || []).reduce((acc, c) => acc + c.count, 0);
              
              // Process and map condition names to be consistent (e.g. Good & Damaged)
              const processedConditions = (stats?.assetConditionBreakdown || []).map(c => ({
                name: displayConditionName(c.name),
                count: c.count
              })).reduce((acc, current) => {
                const found = acc.find(item => item.name === current.name);
                if (found) {
                  found.count += current.count;
                } else {
                  acc.push({ ...current });
                }
                return acc;
              }, []);

              return (
                <div className="flex flex-col items-center">
                  <div className="relative w-full h-56 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={processedConditions.map(c => ({ name: c.name, value: c.count }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {processedConditions.map((c, idx) => (
                            <Cell key={idx} fill={getConditionColor(c.name)} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const pct = totalConditionCount > 0 ? (payload[0].value / totalConditionCount) * 100 : 0;
                              return (
                                <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-xl shadow-xl text-xs">
                                  <p className="font-bold text-neutral-700 dark:text-neutral-200">{payload[0].name}</p>
                                  <p className="text-blue-500 font-mono font-semibold">{maskNum(payload[0].value)} units ({pct.toFixed(1)}%)</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Donut Center Label matching image exactly */}
                    <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2.5xl font-black text-neutral-800 dark:text-white font-mono leading-none">
                        {maskNum(stats?.totalAssets || 0)}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1.5 font-sans">
                        Total Assets
                      </span>
                    </div>
                  </div>

                  {/* Legend below the Donut Chart */}
                  <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center mt-3">
                    {processedConditions.map((c, idx) => {
                      const pct = totalConditionCount > 0 ? (c.count / totalConditionCount) * 100 : 0;
                      return (
                        <div key={c.name} className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getConditionColor(c.name) }} />
                          <span className="font-medium">{c.name}</span>
                          <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                            {maskNum(c.count)} <span className="text-[9px] font-normal text-neutral-450 dark:text-neutral-500">({pct.toFixed(1)}%)</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <div className="h-56 flex items-center justify-center text-xs text-neutral-400">No condition data available</div>
            )}
          </div>

          {/* Panel C: Asset Status — Horizontal Bars */}
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-6 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-555">ASSET STATUS</h3>
            </div>
            {(stats?.assetStatusBreakdown || []).length > 0 ? (() => {
              const statusColors = {
                'Aktif': '#10b981', 'Active': '#10b981',
                'Tidak Aktif': '#ef4444', 'Inactive': '#ef4444',
                'Dalam Perbaikan': '#f59e0b', 'Under Repair': '#f59e0b', 'Repair': '#f59e0b',
                'Disposal': '#6b7280', 'Disposed': '#6b7280',
                'Dipinjamkan': '#0284c7', 'Loaned': '#0284c7',
                'Idle': '#f59e0b',
              };
              const totalStatusCount = (stats?.assetStatusBreakdown || []).reduce((acc, s) => acc + s.count, 0);
              const maxCount = Math.max(...(stats?.assetStatusBreakdown || []).map(s => s.count), 1);
              return (
                <div className="space-y-4">
                  {(stats?.assetStatusBreakdown || []).map((s, idx) => {
                    const pct = (s.count / maxCount) * 100;
                    const pctOfTotal = totalStatusCount > 0 ? (s.count / totalStatusCount) * 100 : 0;
                    const color = statusColors[s.name] || CHART_COLORS[idx % CHART_COLORS.length];
                    const displayName = displayStatusName(s.name);
                    return (
                      <div key={s.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{displayName}</span>
                          </div>
                          <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{maskNum(s.count)} <span className="text-[10px] font-normal text-neutral-450 dark:text-neutral-500 font-sans">units ({pctOfTotal.toFixed(1)}%)</span></span>
                        </div>
                        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700" 
                            style={{ width: `${pct}%`, backgroundColor: color }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <div className="h-56 flex items-center justify-center text-xs text-neutral-400">No status data available</div>
            )}
          </div>

        </div>
      </motion.section>

      {/* ─── 3. INSURANCE & AGREEMENTS ────────────────────────────────────── */}
      <motion.section 
        variants={sectionVariants}
        className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-teal-500/5 blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200">Insurance & Agreements</h2>
            <p className="text-xs text-neutral-400">Insurer policy distribution and contract agreement status monitoring.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Panel A: Insurer Distribution */}
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">INSURER DISTRIBUTION</h3>
              </div>
              {(stats?.insurerDistribution || []).length > 0 ? (
                <div className="space-y-3.5">
                  {(stats?.insurerDistribution || []).map((ins, idx) => {
                    const maxCount = Math.max(...(stats?.insurerDistribution || []).map(i => i.count), 1);
                    const pct = (ins.count / maxCount) * 100;
                    return (
                      <div key={ins.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">{ins.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-neutral-450">{maskPrice(ins.premium)}</span>
                            <span className="font-mono font-bold text-teal-650 dark:text-teal-400">{maskNum(ins.count)} <span className="text-[10px] font-normal text-neutral-450 font-sans">policies</span></span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700" 
                            style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[(idx + 1) % CHART_COLORS.length] }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-xs text-neutral-400">No insurer data available</div>
              )}
            </div>
          </div>

          {/* Panel B: Policy Type Breakdown */}
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-6 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">POLICY TYPE BREAKDOWN</h3>
            </div>
            {(stats?.policyTypeBreakdown || []).length > 0 ? (() => {
              const totalCount = (stats?.policyTypeBreakdown || []).reduce((acc, p) => acc + p.count, 0);
              return (
                <div className="space-y-3.5">
                  {(stats?.policyTypeBreakdown || []).map((pt, idx) => {
                    const pct = totalCount > 0 ? (pt.count / totalCount) * 100 : 0;
                    return (
                      <div key={pt.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-neutral-700 dark:text-neutral-300 truncate max-w-[150px]">{pt.name}</span>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="font-mono text-[10px] text-neutral-450 mr-1.5">{maskPrice(pt.premium)}</span>
                            <span className="font-mono font-bold text-teal-650 dark:text-teal-400">{maskNum(pt.count)} <span className="text-[10px] font-normal text-neutral-450 font-sans">policies</span></span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-700" 
                            style={{ width: `${pct || 5}%`, backgroundColor: CHART_COLORS[(idx + 3) % CHART_COLORS.length] }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <div className="h-52 flex items-center justify-center text-xs text-neutral-400">No policy type data available</div>
            )}
          </div>

          {/* Panel C: Agreement Summary */}
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-6 rounded-2xl">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">AGREEMENT SUMMARY</h3>
            </div>

            <div className="space-y-3.5">
              {/* Total */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500"><FileCheck2 className="w-4 h-4" /></div>
                  <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">Total Agreements</span>
                </div>
                <span className="text-lg font-black text-neutral-850 dark:text-white font-mono">{maskNum(stats?.totalAgreements || 0)}</span>
              </div>

              {/* Active */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200/40 dark:border-emerald-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 className="w-4 h-4" /></div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Active</span>
                </div>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{maskNum(stats?.activeAgreements || 0)}</span>
              </div>

              {/* Expiring Soon */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/40 dark:border-amber-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500"><AlertTriangle className="w-4 h-4" /></div>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Expiring Soon</span>
                </div>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">{maskNum(stats?.expiringAgreements || 0)}</span>
              </div>

              {/* Expired */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-red-50/50 dark:bg-red-950/10 border border-red-200/40 dark:border-red-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500"><MinusCircle className="w-4 h-4" /></div>
                  <span className="text-xs font-semibold text-red-700 dark:text-red-400">Expired</span>
                </div>
                <span className="text-lg font-black text-red-600 dark:text-red-400 font-mono">{maskNum(stats?.expiredAgreements || 0)}</span>
              </div>

              {/* Total Value */}
              <div className="pt-3 border-t border-neutral-200/60 dark:border-neutral-800/50">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 dark:text-neutral-555 font-bold uppercase tracking-wider">Contract Value</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{maskPrice(stats?.totalAgreementValue || 0)}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Navigation Link */}
        <div className="mt-6 flex justify-center border-t border-neutral-100 dark:border-neutral-800/80 pt-4">
          <a href="/dashboard/insurances" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-350 flex items-center gap-1.5 group transition-colors">
            <span>View all policies & Agreements</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </a>
        </div>
      </motion.section>

      {/* ─── 4. DEVICE RENTALS SUMMARY ────────────────────────────────────── */}
      <motion.section 
        variants={sectionVariants}
        className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-cyan-500/5 blur-[80px] pointer-events-none" />
        
        {/* Title Block */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500 shadow-inner">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200">Device Rentals Summary</h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-505">Procurement management of PC leases and active employee allocation.</p>
          </div>
        </div>

        {/* 3 Columns Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Card 1: TOTAL LEASED DEVICES */}
          <div className="relative bg-neutral-50/50 dark:bg-neutral-950/40 border border-neutral-200/50 dark:border-neutral-800 p-5 rounded-2xl flex flex-col justify-between min-h-[125px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-450 dark:text-neutral-500 font-bold uppercase tracking-wider">Total Leased Devices</span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-lg">
                Leased
              </span>
            </div>
            <div className="my-2">
              <span className="text-3xl font-black text-neutral-850 dark:text-white block font-mono">
                {maskNum(stats?.totalDeviceRentals || 0)} <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-555 font-sans">devices</span>
              </span>
            </div>
            {renderCountDiff(stats?.deviceRentalsDiff, 'devices')}
          </div>

          {/* Card 2: TOTAL MONTHLY COST */}
          <div className="relative bg-neutral-50/50 dark:bg-neutral-950/40 border border-neutral-200/50 dark:border-neutral-800 p-5 rounded-2xl flex flex-col justify-between min-h-[125px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-455 dark:text-neutral-500 font-bold uppercase tracking-wider">Total Monthly Cost</span>
              
              {/* Sparkline line SVG */}
              <svg className="w-12 h-6 text-cyan-500" viewBox="0 0 60 25" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M0,18 Q12,12 24,16 T48,6 T60,11" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="my-2">
              <span className="text-2.5xl font-black text-cyan-600 dark:text-cyan-400 block font-mono tracking-tight">
                {maskPrice(stats?.totalDeviceRentalValue || 0)}
              </span>
            </div>
            {renderCostDiff(stats?.deviceRentalValueDiff)}
          </div>

          {/* Card 3: ACTIVE ALLOCATIONS */}
          <div className="relative bg-neutral-50/50 dark:bg-neutral-950/40 border border-neutral-200/50 dark:border-neutral-800 p-5 rounded-2xl flex flex-col justify-between min-h-[125px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-neutral-455 dark:text-neutral-500 font-bold uppercase tracking-wider">Active Allocations</span>
              
              {/* Sparkline line SVG */}
              <svg className="w-12 h-6 text-emerald-500" viewBox="0 0 60 25" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M0,22 Q12,16 24,20 T48,8 T60,4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="my-2">
              <span className="text-3xl font-black text-emerald-555 block font-mono">
                {maskNum(stats?.activeDeviceRentals || 0)} <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-555 font-sans">users</span>
              </span>
            </div>
            {renderCountDiff(stats?.activeDeviceRentalsDiff, 'users')}
          </div>

        </div>

        {/* Device Types Breakdown */}
        {stats?.deviceTypeBreakdown && stats.deviceTypeBreakdown.length > 0 && (
          <div className="mb-6 p-5 bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 rounded-2xl">
            <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-555 uppercase tracking-wider mb-3">Rented Devices by Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {stats.deviceTypeBreakdown.map((item, idx) => (
                <div key={item.type} className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-xs shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                    {getDeviceIcon(item.type)}
                  </div>
                  <div>
                    <span className="font-semibold text-neutral-500 dark:text-neutral-405 block text-[10px] uppercase tracking-wider truncate max-w-[70px]" title={item.type}>{item.type}</span>
                    <span className="font-mono font-bold text-neutral-850 dark:text-white mt-0.5 block">{maskNum(item.count)} <span className="text-[10px] font-normal text-neutral-450 dark:text-neutral-500 font-sans">units</span></span>
                    <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 font-mono block mt-0.5">{maskPrice(item.value || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Details Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-6 border-t border-neutral-200/60 dark:border-neutral-800/80">
          
          {/* Item 1: Active Leases */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-bold block uppercase tracking-wider">Active Leases</span>
              <span className="text-sm font-bold text-emerald-555 block mt-0.5 font-mono">
                {maskNum(stats?.activeDeviceRentals || 0)} <span className="text-xs font-semibold text-neutral-450 dark:text-neutral-555 font-sans">devices</span>
              </span>
            </div>
          </div>

          {/* Item 2: Expiring Soon */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-bold block uppercase tracking-wider">Expiring Soon</span>
              <span className="text-sm font-bold text-amber-555 block mt-0.5 font-mono">
                {maskNum(stats?.expiringSoonLeases || 0)} <span className="text-xs font-semibold text-neutral-450 dark:text-neutral-555 font-sans">devices</span>
              </span>
            </div>
          </div>

          {/* Item 3: Returned This Month */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-550 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-550 font-bold block uppercase tracking-wider">Returned This Month</span>
              <span className="text-sm font-bold text-neutral-550 dark:text-neutral-400 block mt-0.5 font-mono">
                {maskNum(stats?.returnedThisMonth || 0)} <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-555 font-sans">devices</span>
              </span>
            </div>
          </div>

          {/* Item 4: Available Devices */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-bold block uppercase tracking-wider">Available Devices</span>
              <span className="text-sm font-bold text-emerald-555 block mt-0.5 font-mono">
                {maskNum(stats?.availableDeviceRentals || 0)} <span className="text-xs font-semibold text-neutral-450 dark:text-neutral-555 font-sans">devices</span>
              </span>
            </div>
          </div>

        </div>

        {/* Footer Navigation Link */}
        <div className="mt-6 flex justify-center border-t border-neutral-100 dark:border-neutral-800/80 pt-4">
          <a href="/dashboard/device-rentals" className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1.5 group transition-colors">
            <span>View device rentals</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </a>
        </div>
      </motion.section>

      {/* ─── 5. VEHICLE SUMMARY ───────────────────────────────────────────── */}
      <motion.section 
        variants={sectionVariants}
        className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200">Vehicles Summary</h2>
            <p className="text-xs text-neutral-400 dark:text-neutral-505">Fleet operational dispatch status, service logs, and tax dates monitoring.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl text-center">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold block uppercase">Total Fleet</span>
            <span className="text-3xl font-extrabold text-neutral-850 dark:text-white block mt-1 font-mono">
              {maskNum(stats?.totalVehicles || 0)} <span className="text-sm font-semibold text-neutral-400 dark:text-neutral-505 font-sans">units</span>
            </span>
          </div>
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl text-center">
            <span className="text-[10px] text-emerald-555 font-bold block uppercase flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Operational (Active)
            </span>
            <span className="text-3xl font-extrabold text-emerald-555 block mt-1 font-mono">
              {maskNum(stats?.activeVehicles || 0)} <span className="text-sm font-semibold text-neutral-450 font-sans">units</span>
            </span>
          </div>
          <div className="bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl text-center">
            <span className="text-[10px] text-amber-555 font-bold block uppercase flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              In Service
            </span>
            <span className="text-3xl font-extrabold text-amber-555 block mt-1 font-mono">
              {maskNum(stats?.inServiceVehicles || 0)} <span className="text-sm font-semibold text-neutral-455 font-sans">units</span>
            </span>
          </div>
          <div className={`p-5 rounded-2xl border text-center flex flex-col justify-center ${
            stats?.expiringTaxVehicles > 0 
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-805 dark:text-red-305'
              : 'bg-neutral-50/40 dark:bg-neutral-950/40 border-neutral-200/60 dark:border-neutral-900/60 text-neutral-800'
          }`}>
            <span className="text-[10px] font-bold block uppercase opacity-70 flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Tax Expiry &lt; 30 Days
            </span>
            <span className={`text-3xl font-extrabold block mt-1 font-mono ${stats?.expiringTaxVehicles > 0 ? 'text-red-550' : 'text-neutral-400 dark:text-neutral-500'}`}>
              {maskNum(stats?.expiringTaxVehicles || 0)} <span className="text-sm font-semibold opacity-70 font-sans">units</span>
            </span>
          </div>
        </div>

        {/* Vehicles Breakdown */}
        {stats?.vehicleTypeBreakdown && stats.vehicleTypeBreakdown.length > 0 && (
          <div className="mt-6 p-5 bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 rounded-2xl">
            <h3 className="text-xs font-bold text-neutral-400 dark:text-neutral-555 uppercase tracking-wider mb-3">Vehicles by Type</h3>
            <div className="flex flex-wrap gap-3">
              {stats.vehicleTypeBreakdown.map((item, idx) => (
                <div key={item.type} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-xl text-xs shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[(idx + 2) % CHART_COLORS.length] }} />
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">{item.type}</span>
                  <span className="font-mono font-bold text-amber-655 dark:text-amber-400 ml-1">{maskNum(item.count)} <span className="text-[10px] font-normal text-neutral-450 font-sans">units</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>

    </motion.div>
  );
}
