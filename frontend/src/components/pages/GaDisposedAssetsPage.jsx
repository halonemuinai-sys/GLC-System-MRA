'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  Archive, Search, X, Eye, FileText, Printer, ChevronLeft, ChevronRight, RefreshCw, Database, Loader2,
  AlertTriangle, CalendarRange, Coins, FileSignature, Download, MapPin, Building2, ExternalLink
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';
import SearchableSelect from '@/components/ui/SearchableSelect';
import DatePicker from '@/components/ui/DatePicker';
import { buildDisposalPDF } from './GaBeritaAcaraExport';

const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
const MASK = 'Rp ••••••';

const formatIDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v || 0));
const compactIDR = (v) => {
  const n = Number(v || 0);
  if (n >= 1e9) return `Rp ${(n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })} B`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 })} M`;
  return formatIDR(n);
};
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const locationText = (a) => [a.location?.name, a.room].filter(Boolean).join(' · ');

function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-US') }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.8, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{format(display)}</>;
}

// Build the BAP PDF and either show it in a new tab or send it straight to the printer.
async function openBap(bapId, mode) {
  const win = mode === 'preview' ? window.open('', '_blank') : null;
  try {
    const detail = await apiClient.get(`/api/ga/asset-disposals/${bapId}`);
    const doc = await buildDisposalPDF(detail);
    const url = URL.createObjectURL(doc.output('blob'));
    if (win) { win.location.href = url; return; }
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    frame.src = url;
    frame.onload = () => setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60000);
    }, 300);
    document.body.appendChild(frame);
  } catch (e) {
    if (win) win.close();
    alert(e.message || 'Failed to generate the BAP PDF.');
  }
}

function DetailRow({ label, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-0.5 text-xs text-slate-700 dark:text-slate-200">{children || '—'}</div>
    </div>
  );
}

function DisposedDetailDrawer({ asset, money, busy, onBap, onClose }) {
  const bap = asset.bap;
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]" />
      <motion.aside
        role="dialog" aria-label={`Disposed asset ${asset.asset_name}`}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-500">Disposed asset</p>
            <h3 className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{asset.asset_name}</h3>
            <p className="font-mono text-[11px] text-slate-400">{asset.asset_code || 'No code'}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="grid grid-cols-2 gap-4">
            <DetailRow label="Company">{asset.company?.name}</DetailRow>
            <DetailRow label="Category">{asset.category?.name}</DetailRow>
            <DetailRow label="Last location">{locationText(asset)}</DetailRow>
            <DetailRow label="Condition at disposal">{asset.condition_snapshot}</DetailRow>
            <DetailRow label="Acquired">{formatDate(asset.acquisition_date)}</DetailRow>
            <DetailRow label="Book value written off"><span className="font-semibold tabular-nums">{money(asset.acquisition_cost)}</span></DetailRow>
          </section>

          <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200"><FileSignature className="h-3.5 w-3.5 text-blue-600" />Disposal report (BAP)</p>
            {bap ? (
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="BAP number"><span className="font-mono">{bap.number || `#${bap.id}`}</span></DetailRow>
                <DetailRow label="Disposal date">{formatDate(bap.date)}</DetailRow>
                <div className="col-span-2"><DetailRow label="Reason">{bap.reason}{bap.reason_detail && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{bap.reason_detail}</p>}</DetailRow></div>
                {asset.item_notes && <div className="col-span-2"><DetailRow label="Note for this asset">{asset.item_notes}</DetailRow></div>}
                <DetailRow label="Requested by">{bap.requested_by}</DetailRow>
                <DetailRow label="Approved by">{bap.approver ? <>{bap.approver.name}{bap.approver.position && <span className="block text-[10px] text-slate-400">{bap.approver.position}</span>}</> : null}</DetailRow>
                <DetailRow label="Approved on">{formatDate(bap.approved_at)}</DetailRow>
              </div>
            ) : (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />This asset is marked Disposed without an approved BAP. Create a disposal report for it in Asset Reports so the write-off is documented.</p>
            )}
          </section>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          {bap && <>
            <button type="button" onClick={() => onBap(bap.id, 'preview')} disabled={!!busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer">{busy === `preview-${bap.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}Preview BAP</button>
            <button type="button" onClick={() => onBap(bap.id, 'print')} disabled={!!busy} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">{busy === `print-${bap.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}Print BAP</button>
          </>}
          <a href="/dashboard/berita-acara" className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"><ExternalLink className="h-3.5 w-3.5" />Asset Reports</a>
        </div>
      </motion.aside>
    </>
  );
}

export default function GaDisposedAssetsPage() {
  const [processed, setProcessed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [summary, setSummary] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reasons, setReasons] = useState([]);
  const [hidePrices, setHidePrices] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [reason, setReason] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Follow the "hide prices" toggle in the app header.
  useEffect(() => {
    const sync = () => { try { setHidePrices(localStorage.getItem('hide-prices') === 'true'); } catch { /* ignore */ } };
    sync();
    window.addEventListener('hide-prices-changed', sync);
    return () => window.removeEventListener('hide-prices-changed', sync);
  }, []);
  const money = (v) => (hidePrices ? MASK : formatIDR(v));

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useCallback((extra = {}) => ({
    search: search || undefined, companyId: companyId || undefined, categoryId: categoryId || undefined,
    reason: reason || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, ...extra,
  }), [search, companyId, categoryId, reason, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/ga/assets-disposed', { params: params({ page, limit: pageSize }) });
      setRows(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, totalPages: 1 });
      setSummary(res.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to load disposed assets.');
    } finally {
      setLoading(false);
    }
  }, [params, page, pageSize]);

  const loadLookups = useCallback(async () => {
    const [comps, cats, rs] = await Promise.all([
      apiClient.get('/api/master/companies/all').catch(() => []),
      apiClient.get('/api/ga/assets-categories').catch(() => []),
      apiClient.get('/api/ga/assets-disposed/reasons').catch(() => []),
    ]);
    setCompanies(Array.isArray(comps) ? comps : comps?.data || []);
    setCategories(Array.isArray(cats) ? cats : []);
    setReasons(Array.isArray(rs) ? rs : []);
  }, []);

  useEffect(() => { if (processed) load(); }, [processed, load]);

  const handleProcess = () => { setProcessed(true); loadLookups(); };
  const resetFilters = () => { setSearchInput(''); setSearch(''); setCompanyId(''); setCategoryId(''); setReason(''); setDateFrom(''); setDateTo(''); setPage(1); };
  const filtered = !!(search || companyId || categoryId || reason || dateFrom || dateTo);

  const onBap = async (id, mode) => {
    setBusy(`${mode}-${id}`);
    try { await openBap(id, mode); } finally { setBusy(null); }
  };

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await apiClient.get('/api/ga/assets-disposed', { params: params({ all: '1' }) });
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Disposed Assets', { views: [{ state: 'frozen', ySplit: 1 }] });
      ws.columns = [
        { header: 'No', key: 'no', width: 6 }, { header: 'Asset Code', key: 'code', width: 18 }, { header: 'Asset Name', key: 'name', width: 40 },
        { header: 'Company', key: 'company', width: 30 }, { header: 'Category', key: 'category', width: 20 }, { header: 'Last Location', key: 'location', width: 30 },
        { header: 'Acquired', key: 'acquired', width: 13 }, { header: 'Book Value (IDR)', key: 'value', width: 18 }, { header: 'Disposal Date', key: 'date', width: 13 },
        { header: 'BAP Number', key: 'bap', width: 24 }, { header: 'Reason', key: 'reason', width: 28 }, { header: 'Reason Detail', key: 'detail', width: 36 },
        { header: 'Requested By', key: 'requested', width: 20 }, { header: 'Approved By', key: 'approver', width: 24 }, { header: 'Approved On', key: 'approvedOn', width: 13 },
      ];
      (res.data || []).forEach((a, i) => ws.addRow({
        no: i + 1, code: a.asset_code || '', name: a.asset_name, company: a.company?.name || '', category: a.category?.name || '', location: locationText(a),
        acquired: a.acquisition_date ? new Date(a.acquisition_date) : null, value: hidePrices ? null : Number(a.acquisition_cost || 0),
        date: a.bap?.date ? new Date(a.bap.date) : null, bap: a.bap?.number || (a.bap ? `#${a.bap.id}` : 'No BAP'), reason: a.bap?.reason || '', detail: a.bap?.reason_detail || '',
        requested: a.bap?.requested_by || '', approver: a.bap?.approver?.name || '', approvedOn: a.bap?.approved_at ? new Date(a.bap.approved_at) : null,
      }));
      const head = ws.getRow(1);
      head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      head.alignment = { vertical: 'middle' };
      ['acquired', 'date', 'approvedOn'].forEach((k) => { ws.getColumn(k).numFmt = 'dd-mmm-yyyy'; });
      ws.getColumn('value').numFmt = '#,##0';
      ws.autoFilter = { from: 'A1', to: `O${(res.data || []).length + 1}` };
      const blob = new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Disposed Assets ${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    } catch (e) {
      alert(e.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const year = new Date().getFullYear();
  const cards = summary ? [
    { name: 'Disposed assets', help: 'Assets with status Disposed for the current filter. They are excluded from the Assets menu and the GA dashboard totals.', value: summary.totalDisposed, sub: summary.withoutBap ? `${summary.withoutBap} without an approved BAP` : 'All documented by an approved BAP', icon: Archive, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
    { name: 'Book value written off', help: 'Sum of the acquisition cost of the disposed assets in the current filter.', value: summary.totalValue, money: true, sub: 'Acquisition cost', icon: Coins, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { name: `Disposed in ${year}`, help: 'Assets whose approved BAP disposal date falls in the current calendar year.', value: summary.disposedThisYear, sub: 'By BAP disposal date', icon: CalendarRange, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { name: 'BAP reports', help: 'Number of approved disposal reports (Berita Acara Penghapusan) behind these assets. One report can cover several assets.', value: summary.bapCount, sub: 'Approved reports', icon: FileSignature, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  ] : [];

  const start = (meta.page - 1) * pageSize;
  const reasonOptions = reasons.map((r) => ({ id: r.reason, name: `${r.reason} (${r.count})` }));

  return (
    <div className="space-y-5 pb-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><Archive className="h-4 w-4" />General Affairs · Asset Register</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Disposed Assets</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Read-only record of assets written off through an approved disposal report (BAP): when, why, who approved, and the book value removed.</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {processed && (
              <>
                <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-60 cursor-pointer">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Reload
                </button>
                <button type="button" onClick={exportExcel} disabled={exporting || !meta.total} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 hover:bg-blue-50 disabled:opacity-60 cursor-pointer">
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Export Excel
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Database className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load disposed assets</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Click Load data to see every written-off asset with its disposal report. Filters apply right away afterwards.</p>
          <button type="button" onClick={handleProcess} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Database className="h-3.5 w-3.5" />Load data</button>
        </motion.div>
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map(({ name, help, value, money: isMoney, sub, icon: Icon, tone }, i) => (
                <motion.div key={name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <div className="-my-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><InlineHelp summary={name} label={`About ${name}`}><span className="normal-case tracking-normal">{help}</span></InlineHelp></div>
                    <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{isMoney && hidePrices ? MASK : <CountUp value={value} format={isMoney ? compactIDR : undefined} />}</p>
                    <p className={`truncate text-[10px] ${name === 'Disposed assets' && summary.withoutBap ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>{sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" />{error}</span>
              <button type="button" onClick={load} className="font-semibold underline cursor-pointer">Try again</button>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
              <div className="relative min-w-56 flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input aria-label="Search disposed assets" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search asset name or code..." className={`${fieldClass} w-full bg-slate-50 pl-9 pr-9 dark:bg-slate-950`} />
                {searchInput && <button type="button" aria-label="Clear search" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <div className="w-56"><SearchableSelect value={companyId} onChange={(id) => { setCompanyId(id ? String(id) : ''); setPage(1); }} options={companies} placeholder="All companies" allOptionLabel="All companies" searchPlaceholder="Type to search..." emptyText="No company found" /></div>
              <div className="w-48"><SearchableSelect value={categoryId} onChange={(id) => { setCategoryId(id ? String(id) : ''); setPage(1); }} options={categories} placeholder="All categories" allOptionLabel="All categories" searchPlaceholder="Type to search..." emptyText="No category found" /></div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-56"><SearchableSelect value={reason} onChange={(id) => { setReason(id || ''); setPage(1); }} options={reasonOptions} placeholder="All reasons" allOptionLabel="All reasons" searchPlaceholder="Type to search..." emptyText="No reason found" /></div>
                <span className="text-[11px] text-slate-400"><InlineHelp summary="Disposed between" label="About the date filter">Filters by the disposal date on the approved BAP.</InlineHelp></span>
                <div className="w-36"><DatePicker value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} placeholder="From" /></div>
                <span className="text-[11px] text-slate-400">–</span>
                <div className="w-36"><DatePicker value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} placeholder="To" /></div>
              </div>
              <span aria-live="polite" className="flex items-center gap-2 text-[11px] text-slate-400">
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                {meta.total} {meta.total === 1 ? 'asset' : 'assets'}
                {filtered && <button type="button" onClick={resetFilters} className="text-blue-600 hover:underline dark:text-blue-400 cursor-pointer">Reset filters</button>}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] table-fixed text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                  <tr>
                    <th className="w-[22%] px-4 py-2.5 font-semibold">Asset</th>
                    <th className="w-[15%] px-3 py-2.5 font-semibold">Company</th>
                    <th className="w-[14%] px-3 py-2.5 font-semibold">Last location</th>
                    <th className="w-[16%] px-3 py-2.5 font-semibold"><InlineHelp summary="Disposed" label="About disposal date">Disposal date and reason from the approved BAP. Newest first.</InlineHelp></th>
                    <th className="w-[13%] px-3 py-2.5 font-semibold">BAP / Approver</th>
                    <th className="w-[11%] px-3 py-2.5 text-right font-semibold"><InlineHelp summary="Book value" label="About book value">Acquisition cost removed from the asset register.</InlineHelp></th>
                    <th className="w-[9%] px-3 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {!loading && !rows.length && (
                    <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400">
                      {filtered ? <>No disposed asset matches these filters. <button type="button" onClick={resetFilters} className="text-blue-600 hover:underline cursor-pointer">Reset filters</button></> : 'No asset has been disposed yet.'}
                    </td></tr>
                  )}
                  {loading && !rows.length && <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>}
                  <AnimatePresence initial={false}>
                    {rows.map((a, i) => (
                      <motion.tr key={a.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }} className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${loading ? 'opacity-60' : ''}`}>
                        <td className="px-4 py-2.5">
                          <button type="button" onClick={() => setDetail(a)} className="block max-w-full text-left cursor-pointer">
                            <p title={a.asset_name} className="truncate font-medium text-slate-800 hover:text-blue-600 dark:text-slate-200">{a.asset_name}</p>
                            <p className="truncate font-mono text-[10px] text-slate-400">{a.asset_code || 'No code'}{a.category?.name ? ` · ${a.category.name}` : ''}</p>
                          </button>
                        </td>
                        <td className="px-3 py-2.5"><p title={a.company?.name} className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300"><Building2 className="h-3 w-3 shrink-0 text-slate-300" /><span className="truncate">{a.company?.name || '—'}</span></p></td>
                        <td className="px-3 py-2.5"><p title={locationText(a)} className="flex items-center gap-1.5 truncate text-slate-600 dark:text-slate-300"><MapPin className="h-3 w-3 shrink-0 text-slate-300" /><span className="truncate">{locationText(a) || '—'}</span></p></td>
                        <td className="px-3 py-2.5">
                          {a.bap ? <>
                            <p className="tabular-nums text-slate-700 dark:text-slate-200">{formatDate(a.bap.date)}</p>
                            <p title={a.bap.reason} className="truncate text-[10px] text-slate-400">{a.bap.reason}</p>
                          </> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><span className="h-1 w-1 rounded-full bg-current" />No approved BAP</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {a.bap ? <>
                            <p title={a.bap.number} className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-200">{a.bap.number || `#${a.bap.id}`}</p>
                            <p title={a.bap.approver?.name} className="truncate text-[10px] text-slate-400">{a.bap.approver?.name || '—'}</p>
                          </> : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{money(a.acquisition_cost)}</td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <button type="button" title="View details" aria-label={`View ${a.asset_name}`} onClick={() => setDetail(a)} className={`${actionClass} hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800`}><Eye className="h-3.5 w-3.5" /></button>
                            {a.bap && <>
                              <button type="button" title="Preview BAP" aria-label={`Preview BAP of ${a.asset_name}`} disabled={!!busy} onClick={() => onBap(a.bap.id, 'preview')} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}>{busy === `preview-${a.bap.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}</button>
                              <button type="button" title="Print BAP" aria-label={`Print BAP of ${a.asset_name}`} disabled={!!busy} onClick={() => onBap(a.bap.id, 'print')} className={`${actionClass} hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800`}>{busy === `print-${a.bap.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}</button>
                            </>}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
              <label className="flex items-center gap-2">Rows per page
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map((s) => <option key={s} value={s}>{s}</option>)}</select>
              </label>
              <div className="flex items-center gap-3">
                <span className="tabular-nums">{meta.total ? `${start + 1}–${Math.min(start + pageSize, meta.total)}` : '0'} of {meta.total}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Previous page" disabled={meta.page <= 1 || loading} onClick={() => setPage(meta.page - 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-10 text-center tabular-nums">{meta.page} / {meta.totalPages}</span>
                  <button type="button" aria-label="Next page" disabled={meta.page >= meta.totalPages || loading} onClick={() => setPage(meta.page + 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {detail && <DisposedDetailDrawer key="detail" asset={detail} money={money} busy={busy} onBap={onBap} onClose={() => setDetail(null)} />}
      </AnimatePresence>
    </div>
  );
}
