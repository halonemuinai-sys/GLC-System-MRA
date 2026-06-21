const fs = require('fs');
const path = require('path');

const code = `'use client';

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
  Building,
  CheckCircle,
  XCircle,
  ShieldCheck
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';

const CHART_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#ec4899', // Pink
];

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [globalHidePrices, setGlobalHidePrices] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get('/api/ga/dashboard-stats');
        setStats(data);
      } catch (err) {
        setError(err.message || 'Gagal memuat data statistik dashboard.');
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
    return () => window.removeEventListener('hide-prices-changed', syncHidePrices);
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
    return val;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-neutral-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <span className="text-sm font-medium tracking-wide">Menghubungkan ke Database MRA...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="p-6 rounded-2xl bg-red-950/20 border border-red-500/20 text-red-200 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold mb-2">Gagal Memuat Dashboard</h3>
          <p className="text-sm text-red-350/80 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-red-850 hover:bg-red-800 active:bg-red-900 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg"
          >
            Coba Hubungkan Kembali
          </button>
        </div>
      </div>
    );
  }

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl text-xs text-neutral-850 dark:text-neutral-200">
          <p className="font-bold capitalize mb-1">{data.name}</p>
          <p className="text-indigo-500 font-semibold font-mono">
            {data.value > 100000 || data.name === 'Total Biaya'
              ? \`Nilai: \${maskPrice(data.value)}\`
              : \`Jumlah: \${maskNum(data.value)} unit\`}
          </p>
        </div>
      );
    }
    return null;
  };

  const totalValSum = (stats?.categoryBreakdown || []).reduce((acc, c) => acc + c.value, 0);

  return (
    <div className="space-y-10 pb-16">
      
      {/* ─── OVERVIEW HEADER ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-955 dark:text-white tracking-tight flex items-center gap-3">
            Overview Dashboard <span className="text-indigo-500 font-medium text-lg px-2.5 py-0.5 bg-indigo-500/10 rounded-full border border-indigo-500/20">GA Suite</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Visualisasi manajemen terpadu Aset, Rental, Kendaraan, dan Vendor.
          </p>
        </div>
      </div>

      {/* ─── POWERFUL KPI CARDS GRID ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* KPI 1: Total Asset */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Aset</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-neutral-850 dark:text-white block font-mono">
              {maskNum(stats?.totalAssets || 0)} <span className="text-xs font-semibold text-neutral-400">Unit</span>
            </span>
            <span className="text-sm font-extrabold text-blue-550 dark:text-blue-400 block mt-1 truncate">
              {maskPrice(stats?.totalAssetValue || 0)}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
            <span>Bagus: <span className="text-emerald-500 font-bold">{maskNum(stats?.goodAssets || 0)}</span></span>
            <span>Rusak/Servis: <span className="text-amber-500 font-bold">{maskNum(stats?.badAssets || 0)}</span></span>
          </div>
        </motion.div>

        {/* KPI 2: Device Rental */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Device Rental</span>
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
              <Laptop className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-neutral-850 dark:text-white block font-mono">
              {maskNum(stats?.totalDeviceRentals || 0)} <span className="text-xs font-semibold text-neutral-400">Unit</span>
            </span>
            <span className="text-sm font-extrabold text-violet-550 dark:text-violet-400 block mt-1 truncate">
              {maskPrice(stats?.totalDeviceRentalValue || 0)} <span className="text-[10px] font-normal text-neutral-400">/bln</span>
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
            <span>Alokasi User: <span className="text-indigo-500 font-bold">{maskNum(stats?.activeDeviceRentals || 0)}</span></span>
            <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded font-semibold uppercase">Sewa Aktif</span>
          </div>
        </motion.div>

        {/* KPI 3: Vehicle Fleet */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Armada Kendaraan</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-neutral-850 dark:text-white block font-mono">
              {maskNum(stats?.totalVehicles || 0)} <span className="text-xs font-semibold text-neutral-400">Unit</span>
            </span>
            <span className="text-sm font-extrabold text-amber-550 dark:text-amber-400 block mt-1 truncate">
              {maskPrice(stats?.totalVehicleValue || 0)} <span className="text-[10px] font-normal text-neutral-400">Pertanggungan</span>
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
            <span>Siap Jalan: <span className="text-emerald-500 font-bold">{maskNum(stats?.activeVehicles || 0)}</span></span>
            <span>Dalam Servis: <span className="text-amber-500 font-bold">{maskNum(stats?.inServiceVehicles || 0)}</span></span>
          </div>
        </motion.div>

        {/* KPI 4: Vendor Data */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-lg relative overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Database Vendor</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-neutral-850 dark:text-white block font-mono">
              {maskNum(stats?.totalVendors || 0)} <span className="text-xs font-semibold text-neutral-400">Mitra</span>
            </span>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mt-1 truncate">
              Aktif: <span className="text-emerald-500 font-bold">{maskNum(stats?.activeVendors || 0)}</span> | Inaktif: <span className="text-red-500 font-bold">{maskNum(stats?.inactiveVendors || 0)}</span>
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400 font-medium">
            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-semibold uppercase">Mitra Operasional</span>
            <span>Total: {maskNum(stats?.totalVendors || 0)}</span>
          </div>
        </motion.div>

      </div>

      {/* ─── 2. ANALYTIC & CHART SECTION ───────────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200">1. Analytic & Chart</h2>
            <p className="text-xs text-neutral-400">Analisis tren biaya pemeliharaan dan proporsi aset berdasarkan kategori.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Main Area Chart for cost trend */}
          <div className="xl:col-span-2 bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Tren Pengeluaran Pemeliharaan (Tahun Ini)</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.monthlyMaintenanceCost || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-neutral-250 dark:stroke-neutral-800" />
                  <XAxis dataKey="month" tick={{ fill: '#737373', fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => globalHidePrices ? '••••' : \`\${v / 1e6}M\`} tick={{ fill: '#737373', fontSize: 10 }} />
                  <RechartsTooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="cost" name="Total Biaya" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* List-Based Budget Breakdown of Asset Categories */}
          <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Proporsi Anggaran Kategori Aset</h3>
              <div className="space-y-4">
                {(stats?.categoryBreakdown || []).map((cat, idx) => {
                  const percentage = totalValSum > 0 ? (cat.value / totalValSum) * 100 : 0;
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                          <span className="text-neutral-800 dark:text-neutral-250 font-semibold truncate max-w-[110px]">{cat.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">({maskNum(cat.count)} unit)</span>
                        </div>
                        <span className="font-mono font-bold text-indigo-500 dark:text-indigo-400">{maskPrice(cat.value)}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: \`\${percentage}%\`,
                            backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </motion.section>

      {/* ─── 3. DEVICE RENTAL SUMMARY SECTION ──────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-violet-500/5 blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-500">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200">2. Device Rental Summary</h2>
            <p className="text-xs text-neutral-400">Manajemen pengadaan sewa laptop/PC operasional dan alokasi karyawan.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Total Sewa Perangkat</span>
              <span className="text-3xl font-extrabold text-neutral-850 dark:text-white block mt-1">
                {maskNum(stats?.totalDeviceRentals || 0)} <span className="text-sm font-semibold text-neutral-400">Unit</span>
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-indigo-500/10 rounded-lg text-indigo-500 border border-indigo-500/20 animate-pulse">
              Sewa Aktif
            </span>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Total Pengeluaran Sewa/Bulan</span>
              <span className="text-2xl font-extrabold text-violet-500 dark:text-violet-400 block mt-1">
                {maskPrice(stats?.totalDeviceRentalValue || 0)}
              </span>
            </div>
            <Activity className="w-6 h-6 text-neutral-300 dark:text-neutral-700" />
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Alokasi User Aktif</span>
              <span className="text-3xl font-extrabold text-emerald-550 block mt-1">
                {maskNum(stats?.activeDeviceRentals || 0)} <span className="text-sm font-semibold text-neutral-400">User</span>
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
              Terdistribusi
            </span>
          </div>
        </div>

        {/* Device type breakdowns */}
        <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Breakdown Tipe Perangkat Rental</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(stats?.deviceTypeBreakdown || []).map((dev) => (
              <div key={dev.type} className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200/40 dark:border-neutral-800 rounded-xl text-center">
                <span className="text-[10px] text-neutral-400 block truncate font-semibold uppercase">{dev.type}</span>
                <span className="text-xl font-bold text-indigo-500 block mt-1">{maskNum(dev.count)} <span className="text-xs font-normal text-neutral-400">Unit</span></span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ─── 4. VEHICLE SUMMARY SECTION ─────────────────────────────────── */}
      <motion.section 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200">3. Vehicle Summary</h2>
            <p className="text-xs text-neutral-400">Manajemen armada kendaraan operasional (Vehicles Fleet) dan status pajaknya.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl text-center">
            <span className="text-[10px] text-neutral-400 font-bold block uppercase">Total Armada</span>
            <span className="text-3xl font-extrabold text-neutral-850 dark:text-white block mt-1">
              {maskNum(stats?.totalVehicles || 0)} <span className="text-sm font-semibold text-neutral-400">Unit</span>
            </span>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl text-center">
            <span className="text-[10px] text-emerald-500 font-bold block uppercase flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Siap Jalan (Aktif)
            </span>
            <span className="text-3xl font-extrabold text-emerald-500 block mt-1">
              {maskNum(stats?.activeVehicles || 0)} <span className="text-sm font-semibold text-neutral-400">Unit</span>
            </span>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-5 rounded-2xl text-center">
            <span className="text-[10px] text-amber-500 font-bold block uppercase flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Dalam Service
            </span>
            <span className="text-3xl font-extrabold text-amber-500 block mt-1">
              {maskNum(stats?.inServiceVehicles || 0)} <span className="text-sm font-semibold text-neutral-400">Unit</span>
            </span>
          </div>
          <div className={`p-5 rounded-2xl border text-center flex flex-col justify-center ${
            stats?.expiringTaxVehicles > 0 
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
              : 'bg-neutral-50 dark:bg-neutral-950/40 border-neutral-200/60 dark:border-neutral-900/60 text-neutral-800'
          }`}>
            <span className="text-[10px] font-bold block uppercase opacity-70 flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Pajak STNK &lt;30 Hari
            </span>
            <span className={`text-3xl font-extrabold block mt-1 ${stats?.expiringTaxVehicles > 0 ? 'text-red-500' : 'text-neutral-400'}`}>
              {maskNum(stats?.expiringTaxVehicles || 0)} <span className="text-sm font-semibold opacity-70">Unit</span>
            </span>
          </div>
        </div>
      </motion.section>

    </div>
  );
}
`;

fs.writeFileSync(path.join(__dirname, '../../frontend/src/components/pages/DashboardPage.jsx'), code, 'utf8');
console.log('Successfully wrote clean DashboardPage.jsx file!');
