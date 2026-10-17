'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Scale, Activity, Loader2, AlertTriangle, ChevronDown, ChevronRight, ExternalLink, ShieldCheck,
  CheckCircle2, FileSpreadsheet, BadgeCheck, Clock
} from 'lucide-react';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/apiClient';

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const fieldCls = 'bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-indigo-500';

const PLAN_STATUS = {
  PENDING_APPROVAL: { label: 'Pending', cls: 'bg-amber-500/10 text-amber-600' },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-500/10 text-emerald-600' },
  COMPLETED: { label: 'Completed', cls: 'bg-blue-500/10 text-blue-600' }
};
const PR_STATUS = {
  PENDING: 'text-amber-600', OVERBUDGET_WARN: 'text-amber-600', APPROVED: 'text-indigo-600', PAID: 'text-emerald-600', REJECTED: 'text-rose-500'
};

function VarianceBadge({ value }) {
  if (value === null || value === undefined) return <span className="text-neutral-300">-</span>;
  if (value > 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 whitespace-nowrap">Claim {formatIDR(value)}</span>;
  if (value < 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">Kelebihan {formatIDR(Math.abs(value))}</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800">Pas</span>;
}

function SummaryCard({ label, value, sub, tone = 'neutral' }) {
  const tones = {
    neutral: 'text-neutral-900 dark:text-white',
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400'
  };
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-black mt-1 ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-[10px] text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}

async function exportExcel(data, companyName) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const header = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } } };
  const money = '#,##0';

  const s1 = wb.addWorksheet('Plan vs Realisasi');
  s1.addRow([`Rekonsiliasi Marketing — ${companyName} — FY ${data.fiscal_year}`]).font = { bold: true, size: 13 };
  s1.addRow([`Cap ${formatIDR(data.summary.cap)} · Plan ${formatIDR(data.summary.plan)} · Realisasi ${formatIDR(data.summary.realization)}`]);
  s1.addRow([]);
  const h1 = s1.addRow(['Plan', 'Status', 'Event', 'Budget (Plan)', 'Diajukan PR', 'Dibayar', 'Realisasi', 'Selisih Closing', 'Hasil', 'Closing', 'Skor KPI', 'Invoice Terverifikasi', 'Settlement']);
  h1.eachCell(c => Object.assign(c, header));
  data.rows.forEach(r => {
    s1.addRow([
      r.title, r.status, `${fmtDate(r.event_start_date)} - ${fmtDate(r.event_end_date)}`, r.budget, r.requested, r.paid, r.realization,
      r.variance ?? '', r.settlement_type || '', r.closing_status || '-', r.kpi_score ?? '', `${r.verified_count}/${r.verifiable_count}`,
      r.settled_at ? `Settled ${fmtDate(r.settled_at)} (${r.settled_by})` : r.needs_settlement ? 'Belum settled' : '-'
    ]);
  });
  [4, 5, 6, 7, 8].forEach(i => { s1.getColumn(i).numFmt = money; });
  s1.columns.forEach((col, i) => { col.width = i === 0 ? 48 : 18; });

  const s2 = wb.addWorksheet('Payment Request');
  const h2 = s2.addRow(['Plan', 'Item', 'Vendor', 'Judul PR', 'Nominal', 'Status', 'PO', 'Tgl Bayar', 'Invoice', 'Verifikasi Finance', 'Catatan Finance']);
  h2.eachCell(c => Object.assign(c, header));
  data.rows.forEach(r => r.payments.forEach(p => {
    s2.addRow([r.title, p.item, p.vendor || '-', p.title, p.amount, p.status, p.po_number || '-', fmtDate(p.paid_at), p.doc_url || '-',
      p.finance_verified_at ? `${p.finance_verified_by} (${fmtDate(p.finance_verified_at)})` : 'Belum', p.finance_note || '']);
  }));
  s2.getColumn(5).numFmt = money;
  s2.columns.forEach((col, i) => { col.width = [40, 28, 22, 30][i] || 18; });

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Rekonsiliasi-Marketing-${companyName.replace(/\s+/g, '-')}-FY${data.fiscal_year}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// Rekonsiliasi Finance: Plan vs Realisasi per transaksi + verifikasi invoice + settlement closing.
export default function MarketingReconciliationPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [fiscalYear, setFiscalYear] = useState(String(CURRENT_YEAR));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    setUserRole((Cookies.get('glc_user_role') || '').toLowerCase());
    apiClient.get('/api/marketing/metadata')
      .then(m => {
        setCompanies(m.companies || []);
        if (m.companies?.length) setCompanyId(String(m.companies[0].id));
      })
      .catch(() => setCompanies([]));
  }, []);

  const isFinance = ['finance', 'admin', 'superadmin'].includes(userRole);
  const companyName = companies.find(c => String(c.id) === String(data?.company_id))?.name || '';

  async function load() {
    const res = await apiClient.get('/api/marketing/reports/reconciliation', { params: { company_id: companyId, fiscal_year: fiscalYear } });
    setData(res);
  }

  async function handleProcess(e) {
    e.preventDefault();
    if (!companyId) return;
    setLoading(true);
    setError(null);
    setExpanded({});
    try {
      await load();
    } catch (err) {
      setError(err.message || 'Gagal memuat data.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function act(key, fn) {
    setBusyKey(key);
    try {
      await fn();
      await load();
    } catch (err) {
      alert(err.message || 'Aksi gagal.');
    } finally {
      setBusyKey(null);
    }
  }

  const toggleVerify = (p) => {
    const verify = !p.finance_verified_at;
    const note = verify ? window.prompt('Verifikasi invoice & dokumen pendukung.\nCatatan (opsional):', '') : '';
    if (verify && note === null) return;
    act(`pr-${p.id}`, () => apiClient.put(`/api/marketing/payments/${p.id}/verify`, { verified: verify, note }));
  };

  const settle = (r) => {
    const label = r.variance < 0 ? `kelebihan dana ${formatIDR(Math.abs(r.variance))} sudah dikembalikan` : `claim ${formatIDR(r.variance)} sudah dibayarkan`;
    const note = window.prompt(`Konfirmasi ${label}?\nCatatan / nomor bukti transfer (opsional):`, '');
    if (note === null) return;
    act(`settle-${r.id}`, () => apiClient.put(`/api/marketing/plans/${r.id}/closing/settle`, { note }));
  };

  async function handleExport() {
    setExporting(true);
    try { await exportExcel(data, companyName); } catch (err) { alert(err.message || 'Gagal export.'); } finally { setExporting(false); }
  }

  const s = data?.summary;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#13223a] to-[#1e293b] rounded-3xl px-6 py-7 sm:px-8 sm:py-8">
        <Scale className="absolute -right-6 -top-6 w-48 h-48 text-white/[0.04] pointer-events-none" strokeWidth={1} />
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            <Scale className="w-3.5 h-3.5" />
            Marketing Budget / Finance Reconciliation
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">Rekonsiliasi Plan vs Realisasi</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-2xl">
            Ringkasan budget dua sisi — <strong className="text-slate-200">Plan</strong> (anggaran yang disetujui) dan <strong className="text-slate-200">Realisasi</strong> (dibayar / biaya final closing) — per transaksi, lengkap dengan verifikasi invoice dan settlement kelebihan dana / claim oleh Finance.
          </p>
        </div>
      </div>

      {/* Filter */}
      <form onSubmit={handleProcess} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Entitas (PT)</label>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={`w-full ${fieldCls}`}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="sm:w-40">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Tahun Fiskal</label>
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className={`w-full ${fieldCls}`}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="submit" disabled={!companyId || loading} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Process Data
        </button>
        {data && (
          <button type="button" onClick={handleExport} disabled={exporting} className="px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
            Export Excel
          </button>
        )}
      </form>

      {error && (
        <div className="py-10 text-center text-red-500 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <AlertTriangle className="w-7 h-7 mx-auto mb-2" />{error}
        </div>
      )}

      {!data && !error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
            <Scale className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-lg font-black text-neutral-800 dark:text-white">Pilih PT & Tahun Fiskal</h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed">
            Lalu klik <strong className="text-indigo-500">"Process Data"</strong> untuk melihat Plan vs Realisasi per transaksi.
          </p>
        </motion.div>
      ) : data && (
        <>
          {/* Summary: Plan vs Realisasi */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Cap Tahunan" value={formatIDR(s.cap)} sub={s.plan_utilization_pct !== null ? `${s.plan_utilization_pct}% sudah direncanakan` : 'Cap belum diset'} />
            <SummaryCard label="Plan (disetujui)" value={formatIDR(s.plan)} sub={s.pending_plan > 0 ? `+ ${formatIDR(s.pending_plan)} masih pending` : 'Approved + Completed'} tone="blue" />
            <SummaryCard label="Realisasi" value={formatIDR(s.realization)} sub={s.realization_pct_of_plan !== null ? `${s.realization_pct_of_plan}% dari plan · dibayar ${formatIDR(s.paid)}` : `Dibayar ${formatIDR(s.paid)}`} tone="emerald" />
            <SummaryCard label="Plan − Realisasi" value={formatIDR(s.plan_vs_realization)} sub={s.plan_vs_realization >= 0 ? 'Sisa anggaran belum terealisasi' : 'Realisasi melebihi plan'} tone={s.plan_vs_realization >= 0 ? 'neutral' : 'rose'} />
          </div>

          {/* Plan vs Realisasi bar */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
            {[
              { label: 'Plan', value: s.plan, cls: 'bg-blue-500' },
              { label: 'Realisasi', value: s.realization, cls: 'bg-emerald-500' }
            ].map(b => (
              <div key={b.label} className="flex items-center gap-3">
                <span className="w-20 text-[11px] font-bold text-neutral-500">{b.label}</span>
                <div className="flex-1 h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div className={`h-full ${b.cls}`} style={{ width: `${s.cap > 0 ? Math.min((b.value / s.cap) * 100, 100) : 0}%` }} />
                </div>
                <span className="w-36 text-right text-[11px] font-bold text-neutral-700 dark:text-neutral-300">{formatIDR(b.value)}</span>
              </div>
            ))}
            <p className="text-[10px] text-neutral-400">Skala terhadap cap tahunan {formatIDR(s.cap)}.</p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">Total kelebihan dana: {formatIDR(s.total_excess)}</span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">Total claim: {formatIDR(s.total_claim)}</span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${s.unverified_payments > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>{s.unverified_payments} invoice belum diverifikasi</span>
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${s.pending_settlement > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>{s.pending_settlement} settlement belum selesai</span>
              {s.budgets.map(b => (
                <span key={b.id} title={b.validated_by ? `Divalidasi ${b.validated_by} ${fmtDate(b.validated_at)}` : ''} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${b.validation_status === 'VALIDATED' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                  <ShieldCheck className="w-3 h-3" /> Budget {b.brand} · {b.lob}: {b.validation_status === 'VALIDATED' ? 'Validated' : 'Belum divalidasi'}
                </span>
              ))}
            </div>
          </div>

          {/* Per-transaction table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {data.rows.length === 0 ? (
              <div className="py-14 text-center text-xs text-neutral-400">Belum ada plan untuk PT & tahun ini.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                      <th className="p-4 w-8" />
                      <th className="p-4 text-left">Plan / Transaksi</th>
                      <th className="p-4 text-right">Plan</th>
                      <th className="p-4 text-right">Dibayar</th>
                      <th className="p-4 text-right">Realisasi</th>
                      <th className="p-4 text-left">Selisih Closing</th>
                      <th className="p-4 text-center">Invoice</th>
                      <th className="p-4 text-left">Settlement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {data.rows.map(r => {
                      const open = !!expanded[r.id];
                      return (
                        <React.Fragment key={r.id}>
                          <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 align-top">
                            <td className="p-4">
                              <button onClick={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))} className="text-neutral-400 hover:text-neutral-700" title="Lihat payment request">
                                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="p-4">
                              <p className="font-semibold text-neutral-800 dark:text-neutral-200">{r.title}</p>
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${PLAN_STATUS[r.status]?.cls}`}>{PLAN_STATUS[r.status]?.label}</span>
                                {r.is_late_submission && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/10 text-rose-600">Late</span>}
                                {r.kpi_score !== null && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-600">KPI {r.kpi_score}%</span>}
                                <span className="text-[10px] text-neutral-400">{fmtDate(r.event_start_date)} · {r.creator}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{formatIDR(r.budget)}</td>
                            <td className="p-4 text-right text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{formatIDR(r.paid)}</td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <p className="font-bold text-neutral-800 dark:text-neutral-200">{formatIDR(r.realization)}</p>
                              <p className="text-[10px] text-neutral-400">{r.final_cost !== null ? 'biaya final closing' : 'yang sudah dibayar'}</p>
                            </td>
                            <td className="p-4"><VarianceBadge value={r.variance} /></td>
                            <td className="p-4 text-center whitespace-nowrap">
                              {r.verifiable_count === 0 ? <span className="text-neutral-300">-</span> : (
                                <span className={`font-bold ${r.verified_count === r.verifiable_count ? 'text-emerald-600' : 'text-amber-600'}`}>{r.verified_count}/{r.verifiable_count}</span>
                              )}
                            </td>
                            <td className="p-4">
                              {r.settled_at ? (
                                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1" title={r.settlement_note || ''}>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Settled {fmtDate(r.settled_at)}
                                </span>
                              ) : r.needs_settlement ? (
                                isFinance ? (
                                  <button onClick={() => settle(r)} disabled={busyKey === `settle-${r.id}`} className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-[#0f172a] hover:bg-[#1e293b] text-white disabled:opacity-50 whitespace-nowrap flex items-center gap-1">
                                    {busyKey === `settle-${r.id}` && <Loader2 className="w-3 h-3 animate-spin" />} Tandai Settled
                                  </button>
                                ) : <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Menunggu Finance</span>
                              ) : r.closing_status === 'APPROVED' ? (
                                <span className="text-[10px] text-neutral-400">Tanpa selisih</span>
                              ) : (
                                <span className="text-[10px] text-neutral-400">{r.closing_status === 'PENDING_APPROVAL' ? 'Closing direview' : 'Belum closing'}</span>
                              )}
                            </td>
                          </tr>
                          {open && (
                            <tr className="bg-neutral-50/60 dark:bg-neutral-950/30">
                              <td />
                              <td colSpan={7} className="p-4">
                                {r.payments.length === 0 ? (
                                  <p className="text-[11px] text-neutral-400">Belum ada payment request.</p>
                                ) : (
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="text-neutral-400 font-bold uppercase text-[9px] tracking-wider">
                                        <th className="py-1.5 text-left">Item / Vendor</th>
                                        <th className="py-1.5 text-left">Payment Request</th>
                                        <th className="py-1.5 text-right">Nominal</th>
                                        <th className="py-1.5 text-left pl-4">Status</th>
                                        <th className="py-1.5 text-left">PO</th>
                                        <th className="py-1.5 text-left">Invoice</th>
                                        <th className="py-1.5 text-left">Verifikasi Finance</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.payments.map(p => {
                                        const canVerify = ['APPROVED', 'PAID'].includes(p.status);
                                        return (
                                          <tr key={p.id} className="border-t border-neutral-200/60 dark:border-neutral-800">
                                            <td className="py-2 pr-3"><p className="text-neutral-700 dark:text-neutral-300">{p.item}</p><p className="text-[10px] text-neutral-400">{p.vendor || '-'}</p></td>
                                            <td className="py-2 pr-3 text-neutral-700 dark:text-neutral-300">{p.title}</td>
                                            <td className="py-2 text-right font-bold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{formatIDR(p.amount)}</td>
                                            <td className={`py-2 pl-4 font-bold ${PR_STATUS[p.status] || ''}`}>{p.status}{p.paid_at ? <span className="block text-[10px] font-normal text-neutral-400">{fmtDate(p.paid_at)}</span> : null}</td>
                                            <td className="py-2 pr-3 text-neutral-500">{p.po_number || '-'}</td>
                                            <td className="py-2 pr-3">
                                              {p.doc_url ? <a href={p.doc_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:underline"><ExternalLink className="w-3 h-3" /> Lihat</a> : <span className="text-rose-500 text-[10px]">Tidak ada dokumen</span>}
                                            </td>
                                            <td className="py-2">
                                              {p.finance_verified_at ? (
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-emerald-600 font-bold flex items-center gap-1" title={p.finance_note || ''}><BadgeCheck className="w-3.5 h-3.5" /> {p.finance_verified_by}</span>
                                                  {isFinance && <button onClick={() => toggleVerify(p)} disabled={busyKey === `pr-${p.id}`} className="text-[10px] text-neutral-400 hover:text-rose-500 underline">batal</button>}
                                                </div>
                                              ) : canVerify ? (
                                                isFinance ? (
                                                  <button onClick={() => toggleVerify(p)} disabled={busyKey === `pr-${p.id}`} className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-50 flex items-center gap-1">
                                                    {busyKey === `pr-${p.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Verifikasi
                                                  </button>
                                                ) : <span className="text-amber-600 text-[10px] font-bold">Belum diverifikasi</span>
                                              ) : <span className="text-neutral-300">-</span>}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                )}
                                {r.settlement_note && <p className="text-[10px] text-neutral-500 mt-2">Catatan settlement: {r.settlement_note} ({r.settled_by})</p>}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
