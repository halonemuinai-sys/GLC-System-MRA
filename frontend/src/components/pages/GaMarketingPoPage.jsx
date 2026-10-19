'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  ShoppingCart, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Search, X, FileSpreadsheet,
  ClipboardList, FileText, Send, CloudUpload, ChevronLeft, ChevronRight, Plus, Lock
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getUserRoles, hasRole } from '@/lib/userRoles';
import SearchableSelect from '@/components/ui/SearchableSelect';
import InlineHelp from '@/components/ui/InlineHelp';
import GaMarketingPoForm, { MONTHS, formatIDR } from './GaMarketingPoForm';
import GaMarketingPoDetail, { StatusPill, NS_STATUS, formatDate } from './GaMarketingPoDetail';

const PO_TABS = [['', 'All'], ['DRAFT', 'Draft'], ['ISSUED', 'Issued'], ['CLOSED', 'Closed'], ['CANCELLED', 'Cancelled']];

function CountUp({ value, money = false }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.8, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{money ? formatIDR(Math.round(display)) : Math.round(display).toLocaleString('en-US')}</>;
}

// Builds the NetSuite PO import workbook: one row per PO line, header fields repeated (External ID groups lines).
async function buildNetsuiteWorkbook(pos) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Purchase Orders');
  ws.columns = [
    { header: 'External ID', key: 'ext', width: 24 },
    { header: 'Vendor', key: 'vendor', width: 16 },
    { header: 'Vendor Name', key: 'vendor_name', width: 30 },
    { header: 'Subsidiary', key: 'subsidiary', width: 30 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Receive By', key: 'receive', width: 12 },
    { header: 'Terms', key: 'terms', width: 10 },
    { header: 'Memo', key: 'memo', width: 30 },
    { header: 'Account', key: 'account', width: 12 },
    { header: 'Account Name', key: 'account_name', width: 26 },
    { header: 'Description', key: 'description', width: 34 },
    { header: 'Quantity', key: 'qty', width: 10 },
    { header: 'Rate', key: 'rate', width: 14 },
    { header: 'Amount', key: 'amount', width: 16 },
    { header: 'Tax Rate %', key: 'tax', width: 10 },
    { header: 'Department (Brand)', key: 'department', width: 20 },
    { header: 'Class (LOB)', key: 'class', width: 18 },
    { header: 'Marketing Plan', key: 'plan', width: 34 },
  ];
  ws.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; });
  const iso = v => (v ? String(v).slice(0, 10) : '');
  pos.forEach(po => po.lines.forEach(line => {
    const item = line.marketing_plan_item;
    ws.addRow({
      ext: po.po_number, vendor: po.vendor?.vendor_code || '', vendor_name: po.vendor?.vendor_name || '', subsidiary: po.company?.name || '',
      date: iso(po.order_date), receive: iso(po.delivery_date), terms: po.payment_terms_days != null ? `Net ${po.payment_terms_days}` : '', memo: po.notes || '',
      account: item?.m_coa?.code || '', account_name: item?.m_coa?.name || '', description: line.description, qty: Number(line.qty), rate: Number(line.unit_price), amount: Number(line.amount),
      tax: Number(po.tax_rate), department: item?.m_brand?.name || '', class: item?.m_line_business?.name || '', plan: item?.marketing_plan?.title || '',
    });
  }));
  ['rate', 'amount'].forEach(key => { ws.getColumn(key).numFmt = '#,##0'; });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `netsuite-po-import-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GaMarketingPoPage() {
  const canWrite = useMemo(() => hasRole(getUserRoles(), 'admin', 'ga'), []);

  const [processed, setProcessed] = useState(false);
  const [tab, setTab] = useState('queue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [companyId, setCompanyId] = useState('');

  const [queue, setQueue] = useState([]);
  const [queueSearch, setQueueSearch] = useState('');
  const [selected, setSelected] = useState([]);

  const [pos, setPos] = useState([]);
  const [poMeta, setPoMeta] = useState({ total: 0, totalPages: 1, summary: {}, not_exported: 0 });
  const [poStatus, setPoStatus] = useState('');
  const [poSearchInput, setPoSearchInput] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exportIds, setExportIds] = useState([]);
  const [exporting, setExporting] = useState(false);

  const [formState, setFormState] = useState(null); // { seedItems } | { po }
  const [detail, setDetail] = useState(null);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };

  useEffect(() => {
    const handle = setTimeout(() => { setPoSearch(poSearchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(handle);
  }, [poSearchInput]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meta, vendorList, queueRes, poRes] = await Promise.all([
        apiClient.get('/api/marketing/metadata').catch(() => null),
        apiClient.get('/api/ga/marketing-po/vendors'),
        apiClient.get('/api/ga/marketing-po/queue', { params: { company_id: companyId || undefined } }),
        apiClient.get('/api/ga/marketing-po', { params: { company_id: companyId || undefined, status: poStatus || undefined, search: poSearch || undefined, page, limit: pageSize } }),
      ]);
      if (meta?.companies) setCompanies(meta.companies);
      setVendors(vendorList || []);
      setQueue(queueRes?.data || []);
      setPos(poRes?.data || []);
      setPoMeta({ total: poRes?.total || 0, totalPages: poRes?.totalPages || 1, summary: poRes?.summary || {}, not_exported: poRes?.not_exported || 0 });
    } catch (err) {
      setError(err.message || 'Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  }, [companyId, poStatus, poSearch, page, pageSize]);

  useEffect(() => { if (processed) loadAll(); }, [processed, loadAll]);

  const filteredQueue = useMemo(() => {
    const q = queueSearch.trim().toLowerCase();
    return queue.filter(item => !q || [item.marketing_plan?.title, item.description, item.m_coa?.name, item.m_coa?.code, item.m_brand?.name, item.vendors?.vendor_name].some(v => String(v || '').toLowerCase().includes(q)));
  }, [queue, queueSearch]);
  const selectedItems = queue.filter(item => selected.includes(item.id));
  const selectedCompany = selectedItems[0]?.marketing_plan?.company?.id;
  const selectedVendor = selectedItems.find(item => item.vendors)?.vendors?.id;
  // A PO is one company + one vendor: items with a different Marketing vendor cannot join the selection.
  const blockReason = (item) => {
    if (selectedCompany && selectedCompany !== item.marketing_plan?.company?.id) return 'A PO can only contain items of one company';
    if (selectedVendor && item.vendors && item.vendors.id !== selectedVendor) return 'This item has a different vendor from Marketing';
    return null;
  };
  const pendingVendors = useMemo(() => [...new Map(queue.filter(item => item.vendors && !item.vendors.active).map(item => [item.vendors.id, item.vendors.vendor_name])).values()], [queue]);
  const toggleItem = (item) => setSelected(prev => (prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]));

  const summary = poMeta.summary;
  const kpis = [
    { label: 'Items to order', value: queue.length, sub: `${formatIDR(queue.reduce((s, i) => s + i.remaining, 0))} not ordered yet`, icon: ClipboardList, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', help: 'Items of approved Marketing Plans whose budget is not fully covered by POs yet.' },
    { label: 'Draft POs', value: summary.DRAFT?.count || 0, sub: formatIDR(summary.DRAFT?.total || 0), icon: FileText, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Issued POs', value: summary.ISSUED?.count || 0, sub: formatIDR(summary.ISSUED?.total || 0), icon: Send, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { label: 'Not in NetSuite yet', value: poMeta.not_exported, sub: 'Issued, not exported', icon: CloudUpload, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', help: 'Issued POs that have not been exported for the NetSuite import.' },
  ];

  const handleExport = async (ids) => {
    if (!ids.length || exporting) return;
    setExporting(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/ga/marketing-po/netsuite-export', { ids });
      await buildNetsuiteWorkbook(res.data || []);
      flash(`${res.data.length} PO${res.data.length === 1 ? '' : 's'} exported for NetSuite.`);
      setExportIds([]);
      loadAll();
      if (detail) setDetail(prev => (prev ? { ...prev, netsuite_status: prev.netsuite_status === 'NOT_SENT' ? 'EXPORTED' : prev.netsuite_status } : prev));
    } catch (err) {
      setError(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const openDetail = async (id) => {
    try {
      setDetail(await apiClient.get(`/api/ga/marketing-po/${id}`));
    } catch (err) {
      setError(err.message || 'Failed to open the PO.');
    }
  };

  // Deep link from a Marketing Plan (…/marketing-po?po=ID): load the page and open that PO.
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get('po'));
    if (!id) return;
    setProcessed(true);
    setTab('orders');
    openDetail(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
  const exportable = pos.filter(po => ['ISSUED', 'CLOSED'].includes(po.status));
  const rangeStart = poMeta.total ? (page - 1) * pageSize + 1 : 0;

  return (
    <div className="space-y-6 pb-24">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><ShoppingCart className="h-4 w-4" />GA procurement</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Marketing Purchase Orders</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Turn approved Marketing Plan items into vendor POs. Issued POs become the basis for the PO in NetSuite and for payment requests.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {processed && canWrite && <button type="button" onClick={() => handleExport(exportIds)} disabled={!exportIds.length || exporting} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50 cursor-pointer">{exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}Export for NetSuite{exportIds.length ? ` (${exportIds.length})` : ''}</button>}
            <button type="button" onClick={() => (processed ? loadAll() : setProcessed(true))} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-blue-50 disabled:opacity-60 cursor-pointer"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{processed ? 'Reload' : 'Load data'}</button>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex w-fit gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
        {[['queue', 'To order', ClipboardList, queue.length], ['orders', 'Purchase orders', FileText, Object.values(summary).reduce((s, v) => s + v.count, 0)]].map(([key, text, Icon, count]) => (
          <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)} className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${tab === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
            {tab === key && <motion.span layoutId="po-tab" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
            <Icon className="relative h-3.5 w-3.5" /><span className="relative">{text}{processed ? ` ${count}` : ''}</span>
          </button>
        ))}
      </div>

      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><ShoppingCart className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load purchase orders</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Click Load data to see approved plan items that still need a PO and the POs already created.</p>
          <button type="button" onClick={() => setProcessed(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Load data</button>
        </motion.div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map(({ label, value, sub, icon: Icon, tone, help }, i) => (
              <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}{help && <InlineHelp label={label}>{help}</InlineHelp>}</div>
                  <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100"><CountUp value={value} /></p>
                  <p className="truncate text-[10px] text-slate-400">{sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>{notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />{notice}</motion.div>}</AnimatePresence>
          {tab === 'queue' && pendingVendors.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{pendingVendors.length} vendor{pendingVendors.length === 1 ? '' : 's'} chosen by Marketing {pendingVendors.length === 1 ? 'is' : 'are'} not registered yet: {pendingVendors.slice(0, 3).join(', ')}{pendingVendors.length > 3 ? '…' : ''}. Complete and activate {pendingVendors.length === 1 ? 'it' : 'them'} before creating the PO.</span>
              <a href="/dashboard/vendors" className="font-semibold underline-offset-2 hover:underline">Open Vendors</a>
            </div>
          )}
          {error && <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="cursor-pointer"><X className="h-3.5 w-3.5" /></button></div>}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Toolbar */}
            <div className="space-y-3 border-b border-slate-100 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-48 flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  {tab === 'queue'
                    ? <input aria-label="Search plan items" value={queueSearch} onChange={e => setQueueSearch(e.target.value)} placeholder="Search plan, item, CoA, brand or vendor..." className={`${fieldClass} w-full pl-9 pr-9`} />
                    : <input aria-label="Search purchase orders" value={poSearchInput} onChange={e => setPoSearchInput(e.target.value)} placeholder="Search PO number, vendor or plan..." className={`${fieldClass} w-full pl-9 pr-9`} />}
                  {(tab === 'queue' ? queueSearch : poSearchInput) && <button type="button" aria-label="Clear search" onClick={() => (tab === 'queue' ? setQueueSearch('') : setPoSearchInput(''))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
                </div>
                <div className="w-full sm:w-64"><SearchableSelect value={companyId} onChange={val => { setCompanyId(val); setPage(1); setSelected([]); setExportIds([]); }} options={companies} placeholder="All companies" allOptionLabel="All companies" searchPlaceholder="Search company..." /></div>
              </div>
              {tab === 'orders' && (
                <div className="flex flex-wrap gap-1">
                  {PO_TABS.map(([key, text]) => {
                    const count = key ? summary[key]?.count || 0 : Object.values(summary).reduce((s, v) => s + v.count, 0);
                    const active = poStatus === key;
                    return (
                      <button key={key || 'all'} type="button" aria-pressed={active} onClick={() => { setPoStatus(key); setPage(1); setExportIds([]); }} className={`relative rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${active ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                        {active && <motion.span layoutId="po-status-tab" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                        <span className="relative">{text} <span className={active ? 'opacity-70' : 'text-slate-400'}>{count}</span></span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              {loading && !(tab === 'queue' ? queue.length : pos.length) ? (
                <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Loading...</div>
              ) : tab === 'queue' ? (
                <table className={`w-full min-w-[980px] table-fixed text-left text-xs ${loading ? 'opacity-60' : ''}`}>
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                    <tr>
                      <th className="w-[4%] px-4 py-2.5" />
                      <th className="w-[28%] px-2 py-2.5 font-semibold">Plan / item</th>
                      <th className="w-[16%] px-3 py-2.5 font-semibold">Company</th>
                      <th className="w-[14%] px-3 py-2.5 font-semibold">CoA / month</th>
                      <th className="w-[12%] px-3 py-2.5 font-semibold">Vendor (Marketing)</th>
                      <th className="w-[13%] px-3 py-2.5 text-right font-semibold">Budget / ordered</th>
                      <th className="w-[13%] px-4 py-2.5 text-right font-semibold">To order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {!filteredQueue.length && <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400"><ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-30" />{queue.length ? 'No items match the search.' : 'Every approved plan item already has a PO.'}</td></tr>}
                    {filteredQueue.map((item, i) => {
                      const otherCompany = blockReason(item);
                      const checked = selected.includes(item.id);
                      return (
                        <motion.tr key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }} onClick={() => canWrite && !otherCompany && toggleItem(item)} className={`transition-colors ${checked ? 'bg-blue-50/60 dark:bg-blue-500/5' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'} ${canWrite && !otherCompany ? 'cursor-pointer' : ''} ${otherCompany ? 'opacity-45' : ''}`}>
                          <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                            {canWrite && <input type="checkbox" aria-label={`Select ${item.description || item.m_coa?.name}`} checked={checked} disabled={!!otherCompany} title={otherCompany || ''} onChange={() => toggleItem(item)} className="h-3.5 w-3.5 accent-blue-600" />}
                          </td>
                          <td className="px-2 py-2"><p title={item.description || ''} className="truncate font-medium text-slate-800 dark:text-slate-200">{item.description || item.m_coa?.name}</p><p title={item.marketing_plan?.title} className="truncate text-[10px] text-slate-400">#{item.marketing_plan?.id} · {item.marketing_plan?.title}</p></td>
                          <td title={item.marketing_plan?.company?.name} className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{item.marketing_plan?.company?.name}</td>
                          <td className="px-3 py-2"><p className="truncate text-slate-600 dark:text-slate-300">{item.m_coa?.code} {item.m_coa?.name}</p><p className="text-[10px] text-slate-400">{MONTHS[(item.period_month || 1) - 1]} {item.marketing_plan?.fiscal_year}{item.m_brand ? ` · ${item.m_brand.name}` : ''}</p></td>
                          <td className="px-3 py-2">{item.vendors ? <><p title={item.vendors.vendor_name} className="truncate text-slate-600 dark:text-slate-300">{item.vendors.vendor_name}</p>{!item.vendors.active && <span className="mt-0.5 inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Not registered</span>}</> : <span className="text-slate-300 dark:text-slate-600">Not set</span>}</td>
                          <td className="px-3 py-2 text-right tabular-nums"><p className="text-slate-600 dark:text-slate-300">{formatIDR(item.budget_amount)}</p>{item.ordered > 0 && <p className="text-[10px] text-slate-400">{formatIDR(item.ordered)} ordered</p>}</td>
                          <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(item.remaining)}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className={`w-full min-w-[980px] table-fixed text-left text-xs ${loading ? 'opacity-60' : ''}`}>
                  <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                    <tr>
                      <th className="w-[4%] px-4 py-2.5">{canWrite && exportable.length > 0 && <input type="checkbox" aria-label="Select all exportable POs" checked={exportable.every(po => exportIds.includes(po.id))} onChange={e => setExportIds(e.target.checked ? exportable.map(po => po.id) : [])} className="h-3.5 w-3.5 accent-blue-600" />}</th>
                      <th className="w-[19%] px-2 py-2.5 font-semibold">PO number</th>
                      <th className="w-[20%] px-3 py-2.5 font-semibold">Vendor</th>
                      <th className="w-[22%] px-3 py-2.5 font-semibold">Company / plans</th>
                      <th className="w-[13%] px-3 py-2.5 text-right font-semibold">Total</th>
                      <th className="w-[11%] px-3 py-2.5 font-semibold">Status</th>
                      <th className="w-[11%] px-3 py-2.5 font-semibold">NetSuite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {!pos.length && <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400"><FileText className="mx-auto mb-2 h-8 w-8 opacity-30" />{poSearch || poStatus ? 'No POs match the filters.' : 'No purchase orders yet. Pick items in “To order” to create one.'}</td></tr>}
                    {pos.map((po, i) => {
                      const canExport = ['ISSUED', 'CLOSED'].includes(po.status);
                      return (
                        <motion.tr key={po.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }} onClick={() => openDetail(po.id)} className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2" onClick={e => e.stopPropagation()}>{canWrite && (canExport ? <input type="checkbox" aria-label={`Select ${po.po_number} for export`} checked={exportIds.includes(po.id)} onChange={() => setExportIds(prev => (prev.includes(po.id) ? prev.filter(x => x !== po.id) : [...prev, po.id]))} className="h-3.5 w-3.5 accent-blue-600" /> : <Lock className="h-3 w-3 text-slate-300" aria-hidden="true" />)}</td>
                          <td className="px-2 py-2"><p className="truncate font-mono text-[11px] font-medium text-slate-800 dark:text-slate-200">{po.po_number}</p><p className="text-[10px] text-slate-400">{formatDate(po.order_date)} · {po.line_count} line{po.line_count === 1 ? '' : 's'}</p></td>
                          <td className="px-3 py-2"><p title={po.vendor?.vendor_name} className="truncate text-slate-700 dark:text-slate-300">{po.vendor?.vendor_name}</p><p className="text-[10px] text-slate-400">{po.vendor?.vendor_code || 'No vendor code'}</p></td>
                          <td className="px-3 py-2"><p title={po.company?.name} className="truncate text-slate-600 dark:text-slate-300">{po.company?.name}</p><p title={po.plan_titles.join(', ')} className="truncate text-[10px] text-slate-400">{po.plan_titles.join(', ')}</p></td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(po.total)}{po.payment_count > 0 && <p className="text-[10px] font-normal text-slate-400">{po.payment_count} payment{po.payment_count === 1 ? '' : 's'}</p>}</td>
                          <td className="px-3 py-2"><StatusPill status={po.status} /></td>
                          <td className={`px-3 py-2 text-[11px] font-medium ${NS_STATUS[po.netsuite_status]?.cls}`}>{NS_STATUS[po.netsuite_status]?.label}{po.netsuite_ref && <p className="truncate text-[10px] font-normal text-slate-400">{po.netsuite_ref}</p>}</td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {tab === 'orders' && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
                <label className="flex items-center gap-2">Rows per page
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select>
                </label>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{poMeta.total ? `${rangeStart}–${Math.min(page * pageSize, poMeta.total)}` : '0'} of {poMeta.total}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
                    <span className="min-w-10 text-center tabular-nums">{page} / {poMeta.totalPages}</span>
                    <button type="button" aria-label="Next page" disabled={page >= poMeta.totalPages} onClick={() => setPage(p => Math.min(poMeta.totalPages, p + 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Selection bar */}
      <AnimatePresence>
        {processed && tab === 'queue' && selectedItems.length > 0 && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="text-xs"><p className="font-semibold text-slate-800 dark:text-slate-100">{selectedItems.length} item{selectedItems.length === 1 ? '' : 's'} · {formatIDR(selectedItems.reduce((s, i) => s + i.remaining, 0))}</p><p className="text-[10px] text-slate-400">{selectedItems[0].marketing_plan?.company?.name}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelected([])} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Clear</button>
              <button type="button" onClick={() => setFormState({ seedItems: selectedItems })} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Plus className="h-3.5 w-3.5" />Create PO</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formState && (
          <GaMarketingPoForm
            key={formState.po?.id || 'new'}
            seedItems={formState.seedItems}
            po={formState.po}
            queue={queue}
            vendors={vendors}
            onClose={() => setFormState(null)}
            onSaved={(saved, message) => { setFormState(null); setSelected([]); setDetail(null); flash(message); setTab('orders'); loadAll(); }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {detail && !formState && (
          <GaMarketingPoDetail
            key={detail.id}
            po={detail}
            canWrite={canWrite}
            onClose={() => setDetail(null)}
            onEdit={() => setFormState({ po: detail })}
            onExport={handleExport}
            onChanged={(updated, message) => { flash(message); setDetail(updated); loadAll(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
