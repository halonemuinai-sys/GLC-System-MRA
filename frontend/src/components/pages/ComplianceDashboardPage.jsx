'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  FileCheck,
  CalendarClock,
  ClockAlert,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  BadgeCheck,
  ClipboardList,
  BookOpen,
  UserCheck,
  Landmark,
  FlaskConical
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const MODULES = [
  { key: 'license', label: 'License & Permit', path: '/dashboard/compliance/licenses', icon: BadgeCheck, color: '#10b981' },
  { key: 'monitoring', label: 'Compliance Docs', path: '/dashboard/compliance/docs', icon: ClipboardList, color: '#f59e0b' },
  { key: 'sop', label: 'SOP & Policy', path: '/dashboard/compliance/sop', icon: BookOpen, color: '#8b5cf6' },
  { key: 'hr_compliance', label: 'HR & Employment', path: '/dashboard/compliance/hr', icon: UserCheck, color: '#f43f5e' },
  { key: 'tax_finance', label: 'Tax & Finance', path: '/dashboard/compliance/tax', icon: Landmark, color: '#06b6d4' },
  { key: 'product_regulatory', label: 'Product Regulatory', path: '/dashboard/compliance/product', icon: FlaskConical, color: '#ec4899' }
];

const DOC_STATUS_COLORS = {
  Draft: '#94a3b8',
  'Under Review': '#f59e0b',
  Approved: '#2563eb',
  Active: '#10b981',
  'Expiring Soon': '#f59e0b',
  Expired: '#ef4444',
  Archived: '#64748b'
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } }
};

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export default function ComplianceDashboardPage() {
  const { lang, t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');

  useEffect(() => {
    apiClient.get('/api/master/companies/all').then(setCompanies).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/compliance/summary', {
        params: { companyId: selectedCompany || undefined }
      });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load compliance dashboard.');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-neutral-400 gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <span className="text-sm font-medium tracking-wide">{t('compliance_loadingMsg')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-bold mb-2">Failed to Load Dashboard</h3>
          <p className="text-sm mb-4">{error}</p>
          <button onClick={load} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-2 mx-auto">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpi, byModule, byDocStatus, byExpiryStatus, criticalDocs, byCompany } = data;
  const pct = (part, total) => (total > 0 ? ((part / total) * 100).toFixed(1) : '0.0');

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-16">
      {/* Header */}
      <div className="pb-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-neutral-955 dark:text-white tracking-tight flex items-center gap-3">
            {t('compliance_dashTitle')} <span className="text-blue-550 dark:text-blue-400 font-medium text-lg px-2.5 py-0.5 bg-blue-500/10 rounded-full border border-blue-500/20">{t('compliance_dashBadge')}</span>
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">
            Ringkasan lintas modul: License & Permit, Compliance Docs, SOP & Policy, HR, Tax & Finance, Product Regulatory.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none shadow-sm"
            title="Filter Perusahaan"
          >
            <option value="">{t('allCompanies')}</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={load} className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 hover:text-blue-500 shadow-sm transition-colors cursor-pointer" title="Muat Ulang">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Critical Docs Alert Banner */}
      {criticalDocs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Dokumen Perlu Perhatian</span>
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{criticalDocs.length}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {criticalDocs.map(doc => {
              const days = doc.days_until_expiry;
              const isExpired = days < 0;
              const accent = isExpired || days <= 7 ? 'red' : days <= 14 ? 'orange' : days <= 30 ? 'amber' : 'indigo';
              const accentCls = {
                red: 'border-l-red-500 bg-red-50/60 dark:bg-red-950/15 text-red-600 dark:text-red-400',
                orange: 'border-l-orange-500 bg-orange-50/60 dark:bg-orange-950/15 text-orange-600 dark:text-orange-400',
                amber: 'border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/15 text-amber-600 dark:text-amber-400',
                indigo: 'border-l-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/15 text-indigo-600 dark:text-indigo-400'
              }[accent];
              const modCfg = MODULES.find(m => m.key === doc.module);
              const dayLabel = isExpired ? `Exp ${Math.abs(days)}h lalu` : days === 0 ? 'Hari ini!' : `${days} hari lagi`;
              return (
                <div key={doc.id} className={`min-w-[230px] flex-shrink-0 rounded-xl border border-neutral-200 dark:border-neutral-800 border-l-[3px] p-3 ${accentCls}`}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[9px] font-bold uppercase truncate max-w-[120px] text-neutral-500 dark:text-neutral-400">{modCfg?.label || doc.module}</span>
                    <span className="text-[10px] font-extrabold whitespace-nowrap">{dayLabel}</span>
                  </div>
                  <p className="text-xs font-bold text-neutral-800 dark:text-slate-200 truncate" title={doc.doc_name}>{doc.doc_name}</p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{doc.category}</p>
                  <p className="text-[10px] text-neutral-400">PIC: {doc.pic}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div variants={cardVariants}>
          <div className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-blue-100/60 dark:border-blue-950/50 hover:border-blue-300 dark:hover:border-blue-700/40 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] duration-300 ease-out group cursor-pointer flex flex-col justify-between min-h-[130px]">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-blue-500 shadow-sm shadow-blue-500/40 transition-transform duration-300 ease-out origin-center group-hover:scale-y-[1.5]" />
            <div className="flex items-start justify-between">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-extrabold uppercase tracking-widest leading-none">{t('compliance_kpiTotal')}</span>
              <ShieldCheck className="w-4 h-4 text-blue-500" />
            </div>
            <span className="text-2.5xl font-black text-neutral-900 dark:text-white tracking-tight leading-none font-mono">{kpi.total}</span>
          </div>
        </motion.div>
        <motion.div variants={cardVariants}>
          <div className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-emerald-100/60 dark:border-emerald-950/50 hover:border-emerald-300 dark:hover:border-emerald-700/40 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] duration-300 ease-out group cursor-pointer flex flex-col justify-between min-h-[130px]">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-emerald-500 shadow-sm shadow-emerald-500/40 transition-transform duration-300 ease-out origin-center group-hover:scale-y-[1.5]" />
            <div className="flex items-start justify-between">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-extrabold uppercase tracking-widest leading-none">{t('compliance_kpiActive')}</span>
              <FileCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2.5xl font-black text-neutral-900 dark:text-white tracking-tight leading-none font-mono">{kpi.active} <span className="text-xs font-bold text-neutral-400 font-sans">({pct(kpi.active, kpi.total)}%)</span></span>
          </div>
        </motion.div>
        <motion.div variants={cardVariants}>
          <div className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-amber-100/60 dark:border-amber-950/50 hover:border-amber-300 dark:hover:border-amber-700/40 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] duration-300 ease-out group cursor-pointer flex flex-col justify-between min-h-[130px]">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-amber-500 shadow-sm shadow-amber-500/40 transition-transform duration-300 ease-out origin-center group-hover:scale-y-[1.5]" />
            <div className="flex items-start justify-between">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-extrabold uppercase tracking-widest leading-none">{t('compliance_kpiExpiring')}</span>
              <CalendarClock className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-2.5xl font-black text-neutral-900 dark:text-white tracking-tight leading-none font-mono">{kpi.expiringSoon} <span className="text-xs font-bold text-neutral-400 font-sans">({pct(kpi.expiringSoon, kpi.total)}%)</span></span>
          </div>
        </motion.div>
        <motion.div variants={cardVariants}>
          <div className="relative overflow-hidden bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl border border-red-100/60 dark:border-red-950/50 hover:border-red-300 dark:hover:border-red-700/40 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-[transform,box-shadow,border-color] duration-300 ease-out group cursor-pointer flex flex-col justify-between min-h-[130px]">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 rounded-r-md bg-red-500 shadow-sm shadow-red-500/40 transition-transform duration-300 ease-out origin-center group-hover:scale-y-[1.5]" />
            <div className="flex items-start justify-between">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-extrabold uppercase tracking-widest leading-none">{t('compliance_kpiExpired')}</span>
              <ClockAlert className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-2.5xl font-black text-neutral-900 dark:text-white tracking-tight leading-none font-mono">{kpi.expired} <span className="text-xs font-bold text-neutral-400 font-sans">({pct(kpi.expired, kpi.total)}%)</span></span>
          </div>
        </motion.div>
      </div>

      {/* Per-Module Breakdown */}
      <motion.section variants={cardVariants} className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200 mb-5">Ringkasan Per Modul</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map(mod => {
            const m = byModule.find(b => b.module === mod.key);
            const total = m?.total ?? 0;
            const critical = m?.critical ?? 0;
            const p = kpi.total > 0 ? (total / kpi.total) * 100 : 0;
            const ModIcon = mod.icon;
            return (
              <Link key={mod.key} href={mod.path} className="block bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 p-4.5 rounded-2xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${mod.color}1f`, color: mod.color }}>
                      <ModIcon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{mod.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-700 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-xl font-black text-neutral-850 dark:text-white font-mono">{total}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{p.toFixed(1)}% dari total dokumen</p>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, backgroundColor: mod.color }} />
                </div>
                {critical > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-red-500">
                    <ShieldAlert className="w-3 h-3" /> {critical} Kritis/Kadaluarsa
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* Per-Company Health */}
      {byCompany.length > 0 && (
        <motion.section variants={cardVariants} className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200">{t('legal_healthPerCompany')}</h2>
            <span className="text-[10px] text-neutral-400 font-semibold">Menampilkan {byCompany.length} entitas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {byCompany.map((co, idx) => {
              const hasAlert = co.expired > 0 || co.critical > 0;
              const statusColor = co.expired > 0 ? 'border-l-red-500' : co.critical > 0 ? 'border-l-amber-500' : 'border-l-emerald-500';
              return (
                <div key={idx} className={`bg-neutral-50/40 dark:bg-neutral-950/40 border border-neutral-200/60 dark:border-neutral-900/60 border-l-[3px] ${statusColor} p-3.5 rounded-2xl`}>
                  <p className="text-xs font-extrabold text-neutral-800 dark:text-slate-200 truncate mb-2" title={co.name}>{co.name}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[9px] text-neutral-400 font-bold uppercase">Total Dok</p>
                      <p className="text-lg font-black text-neutral-900 dark:text-white font-mono leading-none">{co.total}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {co.expired > 0 && <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">{co.expired} Expired</span>}
                      {co.critical > 0 && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">{co.critical} Kritis</span>}
                      {!hasAlert && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Healthy</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.section variants={cardVariants} className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Expiry Status Per Modul</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byExpiryStatus} margin={{ top: 5, right: 10, bottom: 0, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: 9 }} iconSize={8} />
              <Bar dataKey="Valid" name="Valid" fill="#10b981" radius={[2, 2, 0, 0]} barSize={10} />
              <Bar dataKey="Warning" name="Warning" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={10} />
              <Bar dataKey="Critical" name="Critical" fill="#f97316" radius={[2, 2, 0, 0]} barSize={10} />
              <Bar dataKey="Expired" name="Expired" fill="#ef4444" radius={[2, 2, 0, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </motion.section>

        <motion.section variants={cardVariants} className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-4">Distribusi Status Dokumen</h3>
          <div className="flex items-center">
            <ResponsiveContainer width="60%" height={220}>
              <PieChart>
                <Pie data={byDocStatus} dataKey="count" nameKey="status" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {byDocStatus.map((entry, idx) => (
                    <Cell key={idx} fill={DOC_STATUS_COLORS[entry.status] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {byDocStatus.map(entry => (
                <div key={entry.status} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: DOC_STATUS_COLORS[entry.status] || '#94a3b8' }} />
                    <span className="text-neutral-600 dark:text-neutral-400 truncate">{entry.status}</span>
                  </div>
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 font-mono">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </div>

      {/* Critical Documents Table */}
      <motion.section variants={cardVariants} className="bg-white dark:bg-neutral-900/40 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 md:p-8 shadow-xl">
        <h2 className="text-lg font-bold text-neutral-850 dark:text-slate-200 mb-5">Dokumen Mendekati / Lewat Kadaluarsa</h2>
        {criticalDocs.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            Tidak ada dokumen kritis saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3">Judul Dokumen</th>
                  <th className="p-3">Modul</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                {criticalDocs.map(doc => {
                  const modCfg = MODULES.find(m => m.key === doc.module);
                  return (
                    <tr key={doc.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                      <td className="p-3 font-semibold text-neutral-800 dark:text-slate-200">{doc.doc_name}</td>
                      <td className="p-3 text-neutral-500">{modCfg?.label || doc.module}</td>
                      <td className="p-3 text-neutral-500">{fmtDate(doc.expiry_date)}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === 'Expired' ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                          : doc.status === 'Critical' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
