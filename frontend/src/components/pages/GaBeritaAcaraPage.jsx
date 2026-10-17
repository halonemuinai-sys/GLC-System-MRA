'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, FileMinus, FileSignature, Loader2, Printer, Check, Ban, Eye, Download, X, Plus,
  Trash2, Send, Search, Activity, ChevronLeft, ChevronRight, AlertTriangle
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { buildDisposalPDF, buildHandoverPDF, docFileName } from './GaBeritaAcaraExport';
import GaAssetDisposalModal from './GaAssetDisposalModal';
import GaAssetHandoverModal from './GaAssetHandoverModal';
import Cookies from 'js-cookie';

const STATUS_STYLE = {
  DRAFT: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  PENDING_APPROVAL: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  APPROVED: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  REJECTED: 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
};

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' }
];
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]));

const PAGE_SIZE = 15;
const fmtDate = d => new Date(d).toLocaleDateString('en-GB');

const TYPES = {
  bap: {
    label: 'Asset Disposal (BAP)',
    newLabel: 'Disposal (BAP)',
    icon: FileMinus,
    accent: 'text-rose-400',
    endpoint: 'asset-disposals',
    buildPdf: buildDisposalPDF,
    number: d => d.disposal_number,
    date: d => d.disposal_date,
    fallbackName: 'Asset-Disposal',
    searchPlaceholder: 'Search BA number or reason...',
    extraHeaders: ['Reason', 'Requested By'],
    extraCells: d => [d.reason, d.requested_by?.full_name || '-']
  },
  bast: {
    label: 'Asset Handover (BAST)',
    newLabel: 'Handover (BAST)',
    icon: FileSignature,
    accent: 'text-sky-400',
    endpoint: 'asset-handovers',
    buildPdf: buildHandoverPDF,
    number: h => h.handover_number,
    date: h => h.handover_date,
    fallbackName: 'Asset-Handover',
    searchPlaceholder: 'Search BA number, first / second party...',
    extraHeaders: ['Type', 'First → Second Party'],
    extraCells: h => [h.handover_type, `${h.giver_name} → ${h.recipient_name}${h.recipient_department ? ` (${h.recipient_department})` : ''}`]
  }
};

const fieldCls = 'bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-300 focus:outline-none focus:border-indigo-500';
const iconBtn = 'p-1.5 rounded-lg transition-colors disabled:opacity-40 cursor-pointer inline-flex items-center justify-center';
const pillBtn = 'flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-lg disabled:opacity-50';

export default function GaBeritaAcaraPage({ initialType = 'bap' }) {
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [type, setType] = useState(initialType);
  const [companies, setCompanies] = useState([]);
  const [signers, setSigners] = useState([]);

  // Filter inputs (applied only on "Process Data")
  const [tempSearch, setTempSearch] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');
  const [tempStatus, setTempStatus] = useState('');
  const [filters, setFilters] = useState(null); // null = not processed yet
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [loadingPreviewId, setLoadingPreviewId] = useState(null);
  const [inlineAction, setInlineAction] = useState(null); // { id, kind: 'reject' | 'submit' }
  const [inlineValue, setInlineValue] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const iframeRef = useRef(null);

  const cfg = TYPES[type];
  const hasProcessed = filters !== null;

  useEffect(() => {
    setMounted(true);
    setUserRole((Cookies.get('glc_user_role') || '').toLowerCase());
    apiClient.get('/api/master/companies/all').then(setCompanies).catch(() => setCompanies([]));
    apiClient.get('/api/ga/asset-disposal-signers').then(setSigners).catch(() => setSigners([]));
  }, []);

  const isAdmin = mounted && (userRole === 'admin' || userRole === 'superadmin');

  useEffect(() => {
    if (!filters) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .get(`/api/ga/${TYPES[type].endpoint}`, {
        params: {
          search: filters.search || undefined,
          companyId: filters.companyId || undefined,
          status: filters.status || undefined,
          page,
          limit: PAGE_SIZE
        }
      })
      .then(res => {
        if (cancelled) return;
        setRows(res.data || []);
        setMeta(res.meta || { total: 0, totalPages: 1 });
      })
      .catch(e => { if (!cancelled) setError(e.message || 'Failed to load data.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [type, filters, page, reloadKey]);

  function switchType(next) {
    if (next === type) return;
    setType(next);
    setTempSearch('');
    setFilters(null);
    setRows([]);
    setPage(1);
    setInlineAction(null);
    window.history.replaceState(null, '', `?type=${next}`);
  }

  function handleProcess(e) {
    e.preventDefault();
    setPage(1);
    setInlineAction(null);
    setFilters({ search: tempSearch.trim(), companyId: tempCompanyId, status: tempStatus });
  }

  function handleReset() {
    setTempSearch('');
    setTempCompanyId('');
    setTempStatus('');
    setFilters(null);
    setRows([]);
    setPage(1);
  }

  const reload = () => setReloadKey(k => k + 1);

  async function openPreview(id) {
    setLoadingPreviewId(id);
    try {
      const detail = await apiClient.get(`/api/ga/${cfg.endpoint}/${id}`);
      const doc = cfg.buildPdf(detail);
      const number = cfg.number(detail);
      setPreview({ url: URL.createObjectURL(doc.output('blob')), doc, title: number, fileName: docFileName(number, cfg.fallbackName) });
    } catch (e) {
      alert(e.message || 'Failed to generate PDF.');
    } finally {
      setLoadingPreviewId(null);
    }
  }

  function closePreview() {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function runAction(id, fn) {
    setBusyId(id);
    try {
      await fn();
      setInlineAction(null);
      setInlineValue('');
      reload();
    } catch (e) {
      alert(e.message || 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  const approve = id => runAction(id, () => apiClient.put(`/api/ga/${cfg.endpoint}/${id}/approve`, {}));
  const reject = id => inlineValue.trim() && runAction(id, () => apiClient.put(`/api/ga/${cfg.endpoint}/${id}/reject`, { rejection_reason: inlineValue.trim() }));
  const submit = id => inlineValue && runAction(id, () => apiClient.put(`/api/ga/${cfg.endpoint}/${id}/submit`, { approver_signer_id: inlineValue }));
  const remove = id => confirm('Delete this report?') && runAction(id, () => apiClient.delete(`/api/ga/${cfg.endpoint}/${id}`));

  function toggleInline(id, kind) {
    setInlineValue('');
    setInlineAction(inlineAction?.id === id && inlineAction.kind === kind ? null : { id, kind });
  }

  function closeCreate() {
    setShowCreate(false);
    if (hasProcessed) reload();
  }

  const columnCount = 7 + cfg.extraHeaders.length;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#13223a] to-[#1e293b] rounded-3xl px-6 py-7 sm:px-8 sm:py-8">
        <FileText className="absolute -right-6 -top-6 w-48 h-48 text-white/[0.04] pointer-events-none" strokeWidth={1} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
              <FileText className="w-3.5 h-3.5" />
              General Affairs / Assets / Berita Acara
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">Berita Acara</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-lg">
              Official asset reports — disposals (BAP) and handovers (BAST). Approved reports can be previewed and printed.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-950/40 w-fit flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New {cfg.newLabel}
          </button>
        </div>
      </div>

      {/* Type switch */}
      <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
        {Object.entries(TYPES).map(([key, t]) => {
          const Icon = t.icon;
          const active = type === key;
          return (
            <button
              key={key}
              onClick={() => switchType(key)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                active ? 'bg-[#0f172a] text-white shadow' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? t.accent : ''}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
        <form onSubmit={handleProcess} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={tempSearch}
                onChange={e => setTempSearch(e.target.value)}
                placeholder={cfg.searchPlaceholder}
                className={`w-full pl-10 pr-4 ${fieldCls}`}
              />
            </div>
            <select value={tempCompanyId} onChange={e => setTempCompanyId(e.target.value)} className={fieldCls}>
              <option value="">All Companies (PT)</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={tempStatus} onChange={e => setTempStatus(e.target.value)} className={fieldCls}>
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            {hasProcessed && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl"
              >
                Reset Filter
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              <Activity className="w-4 h-4" />
              Process Data
            </button>
          </div>
        </form>
      </div>

      {!hasProcessed ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[340px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-5">
            <cfg.icon className={`w-7 h-7 ${type === 'bap' ? 'text-rose-500' : 'text-sky-500'}`} />
          </div>
          <h3 className="text-lg font-black text-neutral-800 dark:text-white">Filter & Process {cfg.label}</h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed">
            Select your filters above, then click <strong className="text-indigo-500 font-bold">"Process Data"</strong> to load the reports.
          </p>
        </motion.div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-xs text-neutral-400">Loading...</span>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500 text-xs">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              {error}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-20 text-center text-neutral-400 text-xs">
              <cfg.icon className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
              No reports found matching the criteria.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">BA Number</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Date</th>
                      {cfg.extraHeaders.map(h => <th key={h} className="p-4">{h}</th>)}
                      <th className="p-4 text-center">Assets</th>
                      <th className="p-4">Approver</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {rows.map(r => {
                      const editable = r.status === 'DRAFT' || r.status === 'REJECTED';
                      const busy = busyId === r.id;
                      const inline = inlineAction?.id === r.id ? inlineAction.kind : null;
                      return (
                        <React.Fragment key={r.id}>
                          <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                            <td className="p-4 font-mono font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{cfg.number(r) || `#${r.id}`}</td>
                            <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium">{r.m_company?.name || '-'}</td>
                            <td className="p-4 text-neutral-500 whitespace-nowrap">{fmtDate(cfg.date(r))}</td>
                            {cfg.extraCells(r).map((v, i) => <td key={i} className="p-4 text-neutral-600 dark:text-neutral-400">{v}</td>)}
                            <td className="p-4 text-center font-bold text-neutral-700 dark:text-neutral-300">{r.items?.length || 0}</td>
                            <td className="p-4 text-neutral-500">{r.approver?.name || '-'}</td>
                            <td className="p-4">
                              <span
                                title={r.status === 'REJECTED' && r.rejection_reason ? `Rejected: ${r.rejection_reason}` : undefined}
                                className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${STATUS_STYLE[r.status] || STATUS_STYLE.DRAFT}`}
                              >
                                {STATUS_LABEL[r.status] || r.status}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-end gap-1">
                                {r.status === 'APPROVED' && (
                                  <button title="Preview & Print" onClick={() => openPreview(r.id)} disabled={loadingPreviewId === r.id} className={`${iconBtn} text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40`}>
                                    {loadingPreviewId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                )}
                                {isAdmin && r.status === 'PENDING_APPROVAL' && (
                                  <>
                                    <button title="Approve" onClick={() => approve(r.id)} disabled={busy} className={`${iconBtn} text-neutral-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40`}>
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button title="Reject" onClick={() => toggleInline(r.id, 'reject')} className={`${iconBtn} ${inline === 'reject' ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40' : 'text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'}`}>
                                      <Ban className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {editable && (
                                  <>
                                    <button title="Request Approval" onClick={() => toggleInline(r.id, 'submit')} className={`${iconBtn} ${inline === 'submit' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' : 'text-neutral-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'}`}>
                                      <Send className="w-4 h-4" />
                                    </button>
                                    <button title="Delete" onClick={() => remove(r.id)} disabled={busy} className={`${iconBtn} text-neutral-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40`}>
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {r.status === 'PENDING_APPROVAL' && !isAdmin && (
                                  <span className="text-[10px] text-neutral-400 italic">Awaiting approver</span>
                                )}
                              </div>
                            </td>
                          </tr>
                          {inline && (
                            <tr className="bg-neutral-50/70 dark:bg-neutral-950/30">
                              <td colSpan={columnCount} className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-end">
                                  {inline === 'reject' ? (
                                    <>
                                      <input type="text" autoFocus value={inlineValue} onChange={e => setInlineValue(e.target.value)} placeholder="Rejection reason..." className={`w-full max-w-md ${fieldCls} py-2`} />
                                      <button onClick={() => reject(r.id)} disabled={!inlineValue.trim() || busy} className="px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg whitespace-nowrap">
                                        Submit Rejection
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <select autoFocus value={inlineValue} onChange={e => setInlineValue(e.target.value)} className={`w-full max-w-md ${fieldCls} py-2`}>
                                        <option value="">-- Select approver --</option>
                                        {signers.map(s => <option key={s.id} value={s.id}>{s.name}{s.position ? ` (${s.position})` : ''}</option>)}
                                      </select>
                                      <button onClick={() => submit(r.id)} disabled={!inlineValue || busy} className="flex items-center gap-1.5 px-3 py-2 bg-[#0f172a] hover:bg-[#1e293b] disabled:opacity-50 text-white text-xs font-bold rounded-lg whitespace-nowrap">
                                        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Send Approval Email
                                      </button>
                                    </>
                                  )}
                                  <button onClick={() => setInlineAction(null)} className="p-2 text-neutral-400 hover:text-neutral-600" title="Cancel">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
                <span>Total <strong className="text-neutral-700 dark:text-neutral-300">{meta.total}</strong> report(s)</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className={`${iconBtn} border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800`}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span>Page {page} of {Math.max(meta.totalPages, 1)}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages} className={`${iconBtn} border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800`}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* PDF Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-4xl h-[90vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shrink-0">
              <h2 className="font-bold text-sm truncate">Preview — {preview.title}</h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => iframeRef.current?.contentWindow?.print()} className={`${pillBtn} bg-white/10 hover:bg-white/20 text-white`}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={() => preview.doc.save(preview.fileName)} className={`${pillBtn} bg-white text-[#0f172a] hover:bg-slate-100`}>
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={closePreview} className="p-2 hover:bg-white/10 rounded-lg" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe ref={iframeRef} src={preview.url} title="Document Preview" className="flex-1 w-full bg-neutral-200" />
          </div>
        </div>
      )}

      <GaAssetDisposalModal isOpen={showCreate && type === 'bap'} onClose={closeCreate} />
      <GaAssetHandoverModal isOpen={showCreate && type === 'bast'} onClose={closeCreate} />
    </div>
  );
}
