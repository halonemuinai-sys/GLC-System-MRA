'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Search, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, Clock, Banknote, Eye, ChevronDown,
  Building, FileSpreadsheet, AlertCircle, Check, XCircle, X,
  FileText, Printer, Download, ExternalLink, Calendar, User,
  DollarSign, ShoppingCart, Tag, ShieldCheck, FileCheck
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
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2.5 rounded-xl ${colors[color] || colors.blue}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">{value}</span>
        {sub && <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ── Mark Paid Confirmation Modal ──────────────────────────────────────────────
function MarkPaidModal({ payment, onClose, onConfirm, loading }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white">Konfirmasi Pembayaran</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Tandai tagihan ini telah selesai dibayar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl space-y-2 border border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-400 uppercase font-bold">Detail Tagihan</p>
          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{payment.title}</p>
          <p className="text-xs text-neutral-500">{payment.marketing_plan_item?.marketing_plan?.company?.name || '-'}</p>
          <p className="text-base font-black text-emerald-600 dark:text-emerald-400 pt-1">{formatIDR(payment.amount)}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">Catatan Pembayaran (Opsional)</label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Contoh: No. Reff Transfer BCI-881920, Lunas..."
            className="w-full text-xs p-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer">
            Batal
          </button>
          <button onClick={() => onConfirm(payment.id, notes)} disabled={loading}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Konfirmasi Lunas
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Detail Budget Modal ───────────────────────────────────────────────────────
function DetailBudgetModal({ payment, onClose, onCreatePo }) {
  const plan = payment?.marketing_plan_item?.marketing_plan;
  const item = payment?.marketing_plan_item;
  const company = plan?.company;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-955/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Detail Budget & Campaign</span>
              <h3 className="text-base font-black text-neutral-900 dark:text-white leading-tight">{plan?.title || payment.title}</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Info Card Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Perusahaan</span>
              <p className="font-extrabold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{company?.name || '-'}</span>
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Fiscal Year</span>
              <p className="font-extrabold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Tahun {plan?.fiscal_year || '-'}</span>
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Dibuat Oleh</span>
              <p className="font-extrabold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{payment.creator?.name || '-'}</span>
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Status Tagihan</span>
              <div className="mt-0.5">
                <StatusBadge status={payment.status} />
              </div>
            </div>
          </div>

          {/* Payment Request Highlight */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 rounded-2xl text-white shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-100">Nominal Tagihan Saat Ini</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-bold text-white">Item Bulan ke-{item?.period_month || '-'}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <h4 className="text-xl font-black">{formatIDR(payment.amount)}</h4>
              <span className="text-xs font-semibold text-blue-100">Tagihan: {payment.title}</span>
            </div>
            {payment.notes && (
              <p className="text-[11px] text-blue-100/90 pt-1 border-t border-white/10 font-medium">
                Catatan: {payment.notes}
              </p>
            )}
          </div>

          {/* Budget Breakdown Comparison */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">Rincian Budget Item Campaign</h4>
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-[10px] uppercase text-neutral-400 font-black">
                  <tr>
                    <th className="px-4 py-2.5">Deskripsi Item</th>
                    <th className="px-4 py-2.5 text-center">Bulan</th>
                    <th className="px-4 py-2.5 text-right">Anggaran</th>
                    <th className="px-4 py-2.5 text-right">Realisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-neutral-800 dark:text-neutral-200">
                      {item?.description || payment.title}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-neutral-500">
                      Bulan {item?.period_month || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-700 dark:text-neutral-300">
                      {formatIDR(item?.budget_amount || payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {formatIDR(item?.actual_amount || payment.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-955/50 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer">
            Tutup
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onClose(); onCreatePo(payment); }}
              className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              Buat PO (Purchase Order)
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Create PO Modal (Purchase Order Generator) ────────────────────────────────
function CreatePoModal({ payment, onClose, onPoGenerated }) {
  const plan = payment?.marketing_plan_item?.marketing_plan;
  const company = plan?.company;

  const [poNumber, setPoNumber] = useState(`PO/GA-MKT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(Math.floor(100 + Math.random() * 900))}`);
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [vendorName, setVendorName] = useState('PT Qontak Digital Indonesia');
  const [vendorAddress, setVendorAddress] = useState('Gedung Cyber 2, Lt. 18, Jl. H.R. Rasuna Said, Jakarta');
  const [shipTo, setShipTo] = useState(company?.name || 'PT Mogens Putri International');
  const [itemDesc, setItemDesc] = useState(payment?.title || 'Whatsapp Blast Luxury Brand Campaign');
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(payment?.amount || 1000000);
  const [includePpn, setIncludePpn] = useState(true);
  const [notes, setNotes] = useState('Pembayaran H+30 setelah penyerahan bukti campaign & invoice resmi.');
  const [signatory, setSignatory] = useState('Administrator GA');
  const [previewMode, setPreviewMode] = useState(false);

  const subtotal = Number(qty) * Number(unitPrice);
  const ppnAmount = includePpn ? Math.round(subtotal * 0.11) : 0;
  const grandTotal = subtotal + ppnAmount;

  const handlePrint = () => {
    window.print();
  };

  const handleSavePo = () => {
    onPoGenerated(`Purchase Order ${poNumber} berhasil diterbitkan!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-955">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Generasi Dokumen PO</span>
              <h3 className="text-base font-black text-neutral-900 dark:text-white leading-tight">Buat Purchase Order (PO)</h3>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className="px-3 py-1.5 bg-neutral-200/60 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold hover:bg-neutral-300/60 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              {previewMode ? 'Edit Form' : 'Preview Document'}
            </button>
            <button onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-5">
          {!previewMode ? (
            /* FORM EDITOR MODE */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block mb-1">No. Purchase Order</label>
                  <input
                    type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block mb-1">Tanggal PO</label>
                  <input
                    type="date" value={poDate} onChange={e => setPoDate(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block mb-1">Jatuh Tempo (Due Date)</label>
                  <input
                    type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Vendor / Supplier</span>
                  <input
                    type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Nama Vendor"
                    className="w-full p-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-800 dark:text-white"
                  />
                  <input
                    type="text" value={vendorAddress} onChange={e => setVendorAddress(e.target.value)} placeholder="Alamat Vendor"
                    className="w-full p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-300"
                  />
                </div>

                <div className="space-y-2 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">Penerima / Ship To</span>
                  <input
                    type="text" value={shipTo} onChange={e => setShipTo(e.target.value)} placeholder="Nama Perusahaan MRA"
                    className="w-full p-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-neutral-800 dark:text-white"
                  />
                  <input
                    type="text" value={signatory} onChange={e => setSignatory(e.target.value)} placeholder="Penanggung Jawab (GA)"
                    className="w-full p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-300"
                  />
                </div>
              </div>

              {/* Items Table Input */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">Rincian Barang / Jasa</span>
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3 bg-neutral-50/50 dark:bg-neutral-800/20">
                  <div className="grid grid-cols-12 gap-2 font-bold text-neutral-400 text-[10px] uppercase">
                    <div className="col-span-6">Item Description</div>
                    <div className="col-span-2 text-center">Qty</div>
                    <div className="col-span-4 text-right">Harga Satuan (Rp)</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text" value={itemDesc} onChange={e => setItemDesc(e.target.value)}
                      className="col-span-6 p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-semibold text-neutral-800 dark:text-white"
                    />
                    <input
                      type="number" value={qty} onChange={e => setQty(Number(e.target.value))} min={1}
                      className="col-span-2 p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-semibold text-center text-neutral-800 dark:text-white"
                    />
                    <input
                      type="number" value={unitPrice} onChange={e => setUnitPrice(Number(e.target.value))}
                      className="col-span-4 p-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl font-bold text-right text-neutral-800 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      <input
                        type="checkbox" checked={includePpn} onChange={e => setIncludePpn(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      Hitung PPN 11%
                    </label>
                    <div className="text-right space-y-0.5">
                      <p className="text-[11px] text-neutral-400">Subtotal: {formatIDR(subtotal)}</p>
                      {includePpn && <p className="text-[11px] text-neutral-400">PPN 11%: {formatIDR(ppnAmount)}</p>}
                      <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">Total PO: {formatIDR(grandTotal)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block mb-1">Catatan & Syarat Ketentuan</label>
                <textarea
                  rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-300"
                />
              </div>
            </div>
          ) : (
            /* PRINT / PREVIEW DOCUMENT LAYOUT */
            <div className="bg-white text-neutral-900 p-8 rounded-2xl border border-neutral-200 shadow-sm space-y-6 font-sans">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-black text-indigo-950">PURCHASE ORDER</h2>
                  <p className="text-xs font-bold text-neutral-500 mt-1">{shipTo}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-black text-indigo-900">{poNumber}</p>
                  <p className="text-neutral-500 mt-0.5">Tanggal: {poDate}</p>
                  <p className="text-neutral-500">Jatuh Tempo: {dueDate}</p>
                </div>
              </div>

              {/* Vendor & Ship To */}
              <div className="grid grid-cols-2 gap-6 text-xs">
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-150">
                  <p className="font-black text-neutral-400 uppercase text-[10px] mb-1">VENDOR / SUPPLIER</p>
                  <p className="font-extrabold text-neutral-900">{vendorName}</p>
                  <p className="text-neutral-600 mt-0.5">{vendorAddress}</p>
                </div>
                <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-150">
                  <p className="font-black text-neutral-400 uppercase text-[10px] mb-1">SHIP TO / ALAMAT KIRIM</p>
                  <p className="font-extrabold text-neutral-900">{shipTo}</p>
                  <p className="text-neutral-600 mt-0.5">GA Procurement Department</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-neutral-200 text-neutral-400 uppercase text-[10px] font-black">
                    <th className="py-2">No</th>
                    <th className="py-2">Deskripsi Barang / Jasa</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Harga Satuan</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 font-medium text-neutral-800">
                  <tr>
                    <td className="py-3">1</td>
                    <td className="py-3 font-semibold">{itemDesc}</td>
                    <td className="py-3 text-center">{qty}</td>
                    <td className="py-3 text-right">{formatIDR(unitPrice)}</td>
                    <td className="py-3 text-right font-bold">{formatIDR(subtotal)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Total Summary */}
              <div className="flex justify-between items-end pt-2 border-t">
                <div className="max-w-xs text-[11px] text-neutral-500">
                  <p className="font-bold text-neutral-700 mb-0.5">Catatan:</p>
                  <p className="leading-relaxed">{notes}</p>
                </div>
                <div className="w-56 text-xs space-y-1.5 text-right">
                  <div className="flex justify-between text-neutral-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-neutral-800">{formatIDR(subtotal)}</span>
                  </div>
                  {includePpn && (
                    <div className="flex justify-between text-neutral-500">
                      <span>PPN 11%:</span>
                      <span className="font-semibold text-neutral-800">{formatIDR(ppnAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-indigo-900 pt-1.5 border-t">
                    <span>TOTAL PO:</span>
                    <span>{formatIDR(grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                <div>
                  <p className="text-neutral-400 text-[10px] uppercase font-bold">Disetujui Oleh (GA Manager)</p>
                  <div className="h-14"></div>
                  <p className="font-extrabold text-neutral-800 underline">{signatory}</p>
                </div>
                <div>
                  <p className="text-neutral-400 text-[10px] uppercase font-bold">Vendor / Supplier</p>
                  <div className="h-14"></div>
                  <p className="font-extrabold text-neutral-800 underline">{vendorName}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-955 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 rounded-xl transition-all cursor-pointer">
            Batal
          </button>
          
          <div className="flex items-center gap-2">
            {previewMode && (
              <button
                onClick={handlePrint}
                className="px-4 py-2 font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-200/70 dark:bg-neutral-800 rounded-xl hover:bg-neutral-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak / Print
              </button>
            )}
            <button
              onClick={handleSavePo}
              className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" /> Terbitkan & Simpan PO
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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
  const [detailTarget, setDetailTarget] = useState(null);
  const [poTarget, setPoTarget] = useState(null);
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
      setMarking(false);
    }
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
                  <th className="text-center px-4 py-3 text-[10px] font-black text-neutral-400 uppercase tracking-wider whitespace-nowrap">Aksi</th>
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
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Detail Budget Action */}
                          <button
                            onClick={() => setDetailTarget(p)}
                            title="Lihat Detail Budget"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-blue-500" />
                            Detail
                          </button>

                          {/* Buat PO Action */}
                          <button
                            onClick={() => setPoTarget(p)}
                            title="Buat Purchase Order (PO)"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                          >
                            <FileText className="w-3 h-3 text-indigo-500" />
                            Buat PO
                          </button>

                          {/* Bayar Action */}
                          {canMarkPaid && p.status === 'APPROVED' && (
                            <button
                              onClick={() => setMarkTarget(p)}
                              title="Konfirmasi Pembayaran Lunas"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Bayar
                            </button>
                          )}
                        </div>
                      </td>
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

      {/* Detail Budget Modal */}
      <AnimatePresence>
        {detailTarget && (
          <DetailBudgetModal
            payment={detailTarget}
            onClose={() => setDetailTarget(null)}
            onCreatePo={(p) => setPoTarget(p)}
          />
        )}
      </AnimatePresence>

      {/* Create PO Modal */}
      <AnimatePresence>
        {poTarget && (
          <CreatePoModal
            payment={poTarget}
            onClose={() => setPoTarget(null)}
            onPoGenerated={(msg) => showSuccess(msg)}
          />
        )}
      </AnimatePresence>

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
