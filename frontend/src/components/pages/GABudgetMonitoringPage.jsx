'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Search, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, Clock, Banknote, Eye, ChevronDown,
  Building, FileSpreadsheet, AlertCircle, Check, XCircle, X
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';

const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - 1 + i));

const formatIDR = (val) => {
  if (val === null || val === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
};

const formatIDRCompact = (val) => {
  const n = Number(val || 0);
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}Jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}Rb`;
  return `Rp ${n}`;
};

const STATUS_CONFIG = {
  PENDING:         { label: 'Pending',    color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10',   icon: Clock },
  OVERBUDGET_WARN: { label: 'Overbudget', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', icon: AlertCircle },
  APPROVED:        { label: 'Approved',   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle },
  PAID:            { label: 'Paid',       color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-500/10',     icon: Banknote },
  REJECTED:        { label: 'Rejected',   color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-500/10',       icon: XCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color = 'blue', delay = 0 }) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl p-5"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-black text-neutral-900 dark:text-white mt-1">{value}</p>
          {sub && <p className="text-[11px] text-neutral-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

// Modal konfirmasi mark-paid + detail
function MarkPaidModal({ payment, onClose, onConfirm, loading }) {
  const [notes, setNotes] = useState('');
  if (!payment) return null;

  const plan = payment.marketing_plan_item?.marketing_plan;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-md bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-start justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-1">Konfirmasi Pembayaran</p>
            <h3 className="text-base font-black text-neutral-900 dark:text-white leading-tight">{payment.title}</h3>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatIDR(payment.amount)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Perusahaan</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">{plan?.company?.name || '-'}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Dibuat oleh</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">{payment.creator?.name || '-'}</p>
            </div>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
            <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Campaign</p>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{plan?.title || '-'}</p>
          </div>

          {payment.doc_url && (
            <a href={payment.doc_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              <FileSpreadsheet className="w-4 h-4" /> Lihat dokumen pendukung
            </a>
          )}

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-2">
            <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Catatan Pembayaran (opsional)</label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="No. bukti, nama bank, atau keterangan lain..."
              rows={2}
              className="w-full text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-100 dark:border-neutral-800">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold transition-all cursor-pointer">
            Batal
          </button>
          <button onClick={() => onConfirm(payment.id, notes)} disabled={loading}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg px-5 py-2.5 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Konfirmasi Sudah Dibayar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const TABS = [
  { key: 'APPROVED', label: 'Menunggu Bayar', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  { key: 'PAID',     label: 'Sudah Dibayar', color: 'text-blue-600 dark:text-blue-400',       badge: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  { key: '',         label: 'Semua',          color: 'text-neutral-600 dark:text-neutral-400', badge: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300' },
];

export default function GABudgetMonitoringPage() {
  const userRole = useMemo(() => (typeof window !== 'undefined' ? (Cookies.get('glc_user_role') || '').toLowerCase() : ''), []);
  const canMarkPaid = ['admin', 'ga'].includes(userRole);

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [activeTab, setActiveTab] = useState('APPROVED');
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [markTarget, setMarkTarget] = useState(null);
  const [marking, setMarking] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { fiscal_year: fiscalYear };
      if (activeTab) params.status = activeTab;
      const res = await apiClient.get('/api/marketing/payments', { params });
      setPayments(res?.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, fiscalYear]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleMarkPaid = async (id, notes) => {
    setMarking(true);
    try {
      await apiClient.post(`/api/marketing/payments/${id}/mark-paid`, { paid_notes: notes });
      setMarkTarget(null);
      showSuccess('Pembayaran berhasil dikonfirmasi.');
      loadPayments();
    } catch (err) {
      setError(err.message || 'Gagal mengkonfirmasi pembayaran.');
    } finally {
      setMarking(false); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return payments;
    return payments.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.marketing_plan_item?.marketing_plan?.title?.toLowerCase().includes(q) ||
      p.marketing_plan_item?.marketing_plan?.company?.name?.toLowerCase().includes(q) ||
      p.creator?.name?.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const kpis = useMemo(() => {
    const all = payments;
    const approved = all.filter(p => p.status === 'APPROVED');
    const paid = all.filter(p => p.status === 'PAID');
    return {
      approvedCount: approved.length,
      approvedAmount: approved.reduce((s, p) => s + Number(p.amount || 0), 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((s, p) => s + Number(p.amount || 0), 0),
    };
  }, [payments]);

  const tabCounts = useMemo(() => {
    const map = {};
    payments.forEach(p => { map[p.status] = (map[p.status] || 0) + 1; });
    return map;
  }, [payments]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">Monitoring Anggaran</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Verifikasi & konfirmasi pembayaran Marketing Budget</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)}
            className="text-sm font-semibold bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer">
            {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={loadPayments} disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all disabled:opacity-50 cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Menunggu Bayar" value={kpis.approvedCount} sub={formatIDRCompact(kpis.approvedAmount)} icon={Clock} color="amber" delay={0} />
        <KpiCard label="Nilai Menunggu" value={formatIDRCompact(kpis.approvedAmount)} sub={`${kpis.approvedCount} tagihan`} icon={AlertCircle} color="amber" delay={0.05} />
        <KpiCard label="Sudah Dibayar" value={kpis.paidCount} sub={formatIDRCompact(kpis.paidAmount)} icon={CheckCircle} color="emerald" delay={0.1} />
        <KpiCard label="Total Terbayar" value={formatIDRCompact(kpis.paidAmount)} sub={`${kpis.paidCount} pembayaran`} icon={Banknote} color="blue" delay={0.15} />
      </div>

      {/* Toast */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm font-semibold">
            <CheckCircle className="w-4 h-4 shrink-0" />{successMsg}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Tabs + Search */}
        <div className="px-5 pt-4 pb-0 flex flex-col sm:flex-row sm:items-center gap-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1">
            {TABS.map(tab => {
              const count = tab.key ? (tabCounts[tab.key] || 0) : payments.length;
              const isActive = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? `${tab.color} border-current`
                      : 'text-neutral-400 dark:text-neutral-500 border-transparent hover:text-neutral-600 dark:hover:text-neutral-300'
                  }`}>
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${isActive ? tab.badge : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="sm:ml-auto relative mb-2 sm:mb-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari tagihan, campaign, perusahaan..."
              className="pl-8 pr-3 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl w-72 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Memuat data...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-neutral-400">
              <Banknote className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">Tidak ada data pembayaran</p>
              <p className="text-xs mt-1">{activeTab === 'APPROVED' ? 'Belum ada tagihan yang perlu dikonfirmasi.' : 'Kosong untuk filter ini.'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Campaign / Perusahaan</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Tagihan</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Nominal</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Dibuat oleh</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                  <th className="text-center px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                  {canMarkPaid && (
                    <th className="text-center px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                {filtered.map((p, idx) => {
                  const plan = p.marketing_plan_item?.marketing_plan;
                  return (
                    <motion.tr key={p.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">{plan?.title || '-'}</p>
                        <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          {plan?.company?.name || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">{p.title}</p>
                        {p.notes && <p className="text-[11px] text-neutral-400 truncate max-w-[180px]">{p.notes}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-neutral-900 dark:text-white whitespace-nowrap tabular-nums">
                        {formatIDR(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
                        {p.creator?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-500 whitespace-nowrap text-[12px]">
                        {new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      {canMarkPaid && (
                        <td className="px-4 py-3 text-center">
                          {p.status === 'APPROVED' ? (
                            <button onClick={() => setMarkTarget(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer">
                              <Check className="w-3 h-3" />
                              Bayar
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-300 dark:text-neutral-600">—</span>
                          )}
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-400">
            {filtered.length} tagihan ditampilkan
          </div>
        )}
      </div>

      {/* Mark Paid Modal */}
      <AnimatePresence>
        {markTarget && (
          <MarkPaidModal
            payment={markTarget}
            onClose={() => setMarkTarget(null)}
            onConfirm={handleMarkPaid}
            loading={marking}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
