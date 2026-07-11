'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Search, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, Clock, XCircle, Banknote, Eye, Trash2,
  ChevronDown, Filter, Building, Calendar, FileSpreadsheet,
  AlertCircle, Check
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';
import Cookies from 'js-cookie';

const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(new Date().getFullYear() - 1 + i));

const formatIDR = (val) => {
  if (val === null || val === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
};

const STATUS_CONFIG = {
  PENDING:        { label: 'Pending',        color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-500/10',   icon: Clock },
  OVERBUDGET_WARN:{ label: 'Overbudget',     color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', icon: AlertCircle },
  APPROVED:       { label: 'Approved',       color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle },
  PAID:           { label: 'Paid',           color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-500/10',     icon: Banknote },
  REJECTED:       { label: 'Rejected',       color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-500/10',       icon: XCircle },
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

function KpiCard({ label, value, icon: Icon, color = 'blue', delay = 0 }) {
  const colors = {
    blue:    'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber:   'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red:     'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
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
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

// Modal detail + mark paid
function PaymentDetailModal({ payment, onClose, onMarkPaid, onDelete, userRole }) {
  const { t } = useLanguage();
  const [markingPaid, setMarkingPaid] = useState(false);
  const [paidNotes, setPaidNotes] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);

  if (!payment) return null;

  const plan = payment.marketing_plan_item?.marketing_plan;
  const canDelete = ['PENDING', 'OVERBUDGET_WARN'].includes(payment.status);
  const canMarkPaid = payment.status === 'APPROVED' && (userRole === 'admin');

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      await onMarkPaid(payment.id, paidNotes);
      onClose();
    } finally { setMarkingPaid(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Hapus payment request ini?')) return;
    setDeleting(true);
    try {
      await onDelete(payment.id);
      onClose();
    } finally { setDeleting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-lg bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-1">Payment Request</p>
            <h3 className="text-lg font-black text-neutral-900 dark:text-white leading-tight">{payment.title}</h3>
            <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{formatIDR(payment.amount)}</p>
          </div>
          <StatusBadge status={payment.status} />
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Perusahaan</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{plan?.company?.name || '-'}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Dibuat oleh</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{payment.creator?.name || '-'}</p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Tanggal</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {new Date(payment.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Marketing Plan</p>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">{plan?.title || '-'}</p>
            </div>
          </div>

          {payment.notes && (
            <div className="bg-neutral-50 dark:bg-neutral-900/60 rounded-xl p-3">
              <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider mb-0.5">Catatan</p>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{payment.notes}</p>
            </div>
          )}

          {payment.doc_url && (
            <a href={payment.doc_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
              <FileSpreadsheet className="w-4 h-4" /> Lihat dokumen pendukung
            </a>
          )}

          {/* Approval history */}
          {payment.approval_history?.length > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-2">Riwayat Approval</p>
              <div className="space-y-2">
                {payment.approval_history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl px-3 py-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                      h.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                      h.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>{h.step_number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{h.approver?.name || 'Menunggu approver'}</p>
                      {h.comment && <p className="text-[11px] text-neutral-400 truncate">{h.comment}</p>}
                    </div>
                    <StatusBadge status={h.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mark as Paid section */}
          {canMarkPaid && (
            <div className="border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-3">
              <button onClick={() => setShowMarkPaid(p => !p)}
                className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                <Banknote className="w-4 h-4" />
                Tandai Sudah Dibayar
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMarkPaid ? 'rotate-180' : ''}`} />
              </button>
              {showMarkPaid && (
                <div className="space-y-2">
                  <textarea
                    value={paidNotes} onChange={e => setPaidNotes(e.target.value)}
                    placeholder="Catatan pembayaran (opsional)..."
                    rows={2}
                    className="w-full text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button onClick={handleMarkPaid} disabled={markingPaid}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors disabled:opacity-60">
                    {markingPaid ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Konfirmasi Pembayaran
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-neutral-100 dark:border-neutral-800">
          {canDelete ? (
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50">
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Hapus
            </button>
          ) : <div />}
          <button onClick={onClose}
            className="text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 font-medium transition-colors px-4 py-2">
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function MarketingPaymentsPage() {
  const { t } = useLanguage();
  const userRole = useMemo(() => (typeof window !== 'undefined' ? (Cookies.get('glc_user_role') || '').toLowerCase() : ''), []);

  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [filter, setFilter] = useState({ status: '', fiscal_year: String(new Date().getFullYear()), search: '' });
  const [selectedPayment, setSelectedPayment] = useState(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filter.status) params.status = filter.status;
      if (filter.fiscal_year) params.fiscal_year = filter.fiscal_year;
      const res = await apiClient.get('/api/marketing/payments', { params });
      setPayments(res?.data || []);
      setTotal(res?.total || 0);
    } catch (err) {
      setError(err.message || 'Gagal memuat data payment.');
    } finally {
      setLoading(false);
    }
  }, [filter.status, filter.fiscal_year]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleMarkPaid = async (id, paidNotes) => {
    await apiClient.post(`/api/marketing/payments/${id}/mark-paid`, { paid_notes: paidNotes });
    showSuccess('Payment berhasil ditandai sebagai PAID.');
    loadPayments();
  };

  const handleDelete = async (id) => {
    await apiClient.delete(`/api/marketing/payments/${id}`);
    showSuccess('Payment request berhasil dihapus.');
    loadPayments();
  };

  const filtered = useMemo(() => {
    const q = filter.search.toLowerCase();
    if (!q) return payments;
    return payments.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.marketing_plan_item?.marketing_plan?.company?.name?.toLowerCase().includes(q) ||
      p.creator?.name?.toLowerCase().includes(q)
    );
  }, [payments, filter.search]);

  const kpis = useMemo(() => {
    const total = payments.length;
    const pending = payments.filter(p => ['PENDING', 'OVERBUDGET_WARN'].includes(p.status)).length;
    const approved = payments.filter(p => p.status === 'APPROVED').length;
    const paid = payments.filter(p => p.status === 'PAID').length;
    const totalAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const paidAmount = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount || 0), 0);
    return { total, pending, approved, paid, totalAmount, paidAmount };
  }, [payments]);

  const handleExportExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Payment Requests');

      ws.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Judul', key: 'title', width: 30 },
        { header: 'Perusahaan', key: 'company', width: 25 },
        { header: 'Marketing Plan', key: 'plan', width: 30 },
        { header: 'Jumlah (Rp)', key: 'amount', width: 18 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Dibuat oleh', key: 'creator', width: 20 },
        { header: 'Tanggal', key: 'date', width: 14 },
      ];

      ws.getRow(1).font = { bold: true };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      filtered.forEach((p, i) => {
        ws.addRow({
          no: i + 1,
          title: p.title,
          company: p.marketing_plan_item?.marketing_plan?.company?.name || '-',
          plan: p.marketing_plan_item?.marketing_plan?.title || '-',
          amount: Number(p.amount),
          status: p.status,
          creator: p.creator?.name || '-',
          date: new Date(p.created_at).toLocaleDateString('id-ID'),
        });
      });

      // Format kolom amount
      ws.getColumn('amount').numFmt = '#,##0';

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-requests-${filter.fiscal_year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal export: ' + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest">Marketing</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white">Payment Requests</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Kelola semua pengajuan pembayaran campaign marketing</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportExcel}
            className="flex items-center gap-1.5 text-sm font-semibold text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={loadPayments}
            className="flex items-center gap-1.5 text-sm font-semibold text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Success */}
      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-3">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Pengajuan" value={kpis.total} icon={CreditCard} color="blue" delay={0} />
        <KpiCard label="Menunggu Approval" value={kpis.pending} icon={Clock} color="amber" delay={0.05} />
        <KpiCard label="Approved" value={kpis.approved} icon={CheckCircle} color="emerald" delay={0.1} />
        <KpiCard label="Sudah Dibayar" value={kpis.paid} icon={Banknote} color="blue" delay={0.15} />
      </div>

      {/* Total Amount KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl p-5">
          <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-1">Total Nilai Pengajuan</p>
          <p className="text-xl font-black text-neutral-900 dark:text-white">{formatIDR(kpis.totalAmount)}</p>
        </div>
        <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl p-5">
          <p className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider mb-1">Total Sudah Dibayar</p>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{formatIDR(kpis.paidAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text" value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Cari judul, perusahaan, atau pembuat..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="">Semua Status</option>
          <option value="PENDING">Pending</option>
          <option value="OVERBUDGET_WARN">Overbudget</option>
          <option value="APPROVED">Approved</option>
          <option value="PAID">Paid</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select value={filter.fiscal_year} onChange={e => setFilter(f => ({ ...f, fiscal_year: e.target.value }))}
          className="text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <CreditCard className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Belum ada payment request</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  {['Judul', 'Perusahaan', 'Jumlah', 'Status', 'Dibuat oleh', 'Tanggal', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/60">
                {filtered.map((p, i) => (
                  <motion.tr key={p.id}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/30 transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">{p.title}</p>
                      {p.marketing_plan_item?.marketing_plan?.title && (
                        <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">{p.marketing_plan_item.marketing_plan.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 text-xs">
                      {p.marketing_plan_item?.marketing_plan?.company?.name || '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white whitespace-nowrap">
                      {formatIDR(p.amount)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400">{p.creator?.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-neutral-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedPayment(p)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-all">
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-400 text-center">Menampilkan {filtered.length} dari {total} total payment request</p>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPayment && (
          <PaymentDetailModal
            payment={selectedPayment}
            onClose={() => setSelectedPayment(null)}
            onMarkPaid={handleMarkPaid}
            onDelete={handleDelete}
            userRole={userRole}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
