'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, FileMinus, FileSignature, Loader2, Printer, Check, Ban, Eye, Download, X, Plus, Trash2, Send } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { buildDisposalPDF, buildHandoverPDF, docFileName } from './GaBeritaAcaraExport';
import GaAssetDisposalModal from './GaAssetDisposalModal';
import GaAssetHandoverModal from './GaAssetHandoverModal';
import Cookies from 'js-cookie';

const STATUS_STYLE = {
  DRAFT: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
};

const STATUS_LABEL = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

const STATUS_TABS = [
  { key: 'APPROVED', label: 'Ready to Print' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: '', label: 'All' }
];

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
    fallbackName: 'Asset-Disposal',
    summary: d => `${d.m_company?.name} · ${fmtDate(d.disposal_date)} · ${d.reason} · ${d.items?.length || 0} asset(s)`,
    people: d => `Requested by: ${d.requested_by?.full_name || '-'}${d.approver ? ` · Approver: ${d.approver.name}` : ''}`,
    badge: null
  },
  bast: {
    label: 'Asset Handover (BAST)',
    newLabel: 'Handover (BAST)',
    icon: FileSignature,
    accent: 'text-sky-400',
    endpoint: 'asset-handovers',
    buildPdf: buildHandoverPDF,
    number: h => h.handover_number,
    fallbackName: 'Asset-Handover',
    summary: h => `${h.m_company?.name} · ${fmtDate(h.handover_date)} · ${h.items?.length || 0} asset(s)`,
    people: h => `${h.giver_name} → ${h.recipient_name}${h.recipient_department ? ` (${h.recipient_department})` : ''}${h.approver ? ` · Approver: ${h.approver.name}` : ''}`,
    badge: h => h.handover_type
  }
};

const pillBtn = 'flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-lg disabled:opacity-50';
const inlineInput = 'flex-1 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-1.5 text-xs';

export default function GaBeritaAcaraPage({ initialType = 'bap' }) {
  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [type, setType] = useState(initialType);
  const [statusTab, setStatusTab] = useState('APPROVED');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [signers, setSigners] = useState([]);
  const [loadingPreviewId, setLoadingPreviewId] = useState(null);
  const [inlineAction, setInlineAction] = useState(null); // { id, kind: 'reject' | 'submit' }
  const [inlineValue, setInlineValue] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [preview, setPreview] = useState(null); // { url, doc, fileName, title }
  const [showCreate, setShowCreate] = useState(false);
  const iframeRef = useRef(null);

  const cfg = TYPES[type];

  useEffect(() => {
    setMounted(true);
    setUserRole((Cookies.get('glc_user_role') || '').toLowerCase());
    apiClient.get('/api/ga/asset-disposal-signers').then(setSigners).catch(() => setSigners([]));
  }, []);

  const isAdmin = mounted && (userRole === 'admin' || userRole === 'superadmin');

  function switchType(next) {
    setType(next);
    setInlineAction(null);
    window.history.replaceState(null, '', `?type=${next}`);
  }

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/ga/${TYPES[type].endpoint}`, { params: { status: statusTab || undefined, limit: 50 } });
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [type, statusTab]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function openPreview(id) {
    setLoadingPreviewId(id);
    try {
      const detail = await apiClient.get(`/api/ga/${cfg.endpoint}/${id}`);
      const doc = cfg.buildPdf(detail);
      const number = cfg.number(detail);
      setPreview({
        url: URL.createObjectURL(doc.output('blob')),
        doc,
        title: number,
        fileName: docFileName(number, cfg.fallbackName)
      });
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
      fetchRows();
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
    fetchRows();
  }

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

      {/* Status tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key || 'all'}
            onClick={() => setStatusTab(tab.key)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${
              statusTab === tab.key
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white'
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
        {loading ? (
          <div className="flex justify-center py-14"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-14 text-xs text-neutral-400">No reports in this category yet.</div>
        ) : (
          <div className="space-y-2.5">
            {rows.map(r => {
              const editable = r.status === 'DRAFT' || r.status === 'REJECTED';
              const busy = busyId === r.id;
              return (
                <div key={r.id} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-100">{cfg.number(r) || `#${r.id}`}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[r.status] || STATUS_STYLE.DRAFT}`}>
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                        {cfg.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400">{cfg.badge(r)}</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{cfg.summary(r)}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{cfg.people(r)}</p>
                      {r.status === 'REJECTED' && r.rejection_reason && (
                        <p className="text-[11px] text-rose-500 mt-1">Rejection reason: {r.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.status === 'APPROVED' && (
                        <button onClick={() => openPreview(r.id)} disabled={loadingPreviewId === r.id} className={`${pillBtn} bg-[#0f172a] hover:bg-[#1e293b] text-white`}>
                          {loadingPreviewId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          Preview
                        </button>
                      )}
                      {isAdmin && r.status === 'PENDING_APPROVAL' && (
                        <>
                          <button onClick={() => approve(r.id)} disabled={busy} className={`${pillBtn} bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400`}>
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button onClick={() => toggleInline(r.id, 'reject')} className={`${pillBtn} bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400`}>
                            <Ban className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {editable && (
                        <>
                          <button onClick={() => toggleInline(r.id, 'submit')} className={`${pillBtn} bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400`}>
                            <Send className="w-3.5 h-3.5" /> Request Approval
                          </button>
                          <button onClick={() => remove(r.id)} disabled={busy} title="Delete" className="p-2 bg-neutral-50 hover:bg-rose-50 dark:bg-neutral-800 text-neutral-400 hover:text-rose-500 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {inlineAction?.id === r.id && inlineAction.kind === 'reject' && (
                    <div className="mt-3 flex gap-2">
                      <input type="text" autoFocus value={inlineValue} onChange={e => setInlineValue(e.target.value)} placeholder="Rejection reason..." className={inlineInput} />
                      <button onClick={() => reject(r.id)} disabled={!inlineValue.trim() || busy} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg">
                        Submit
                      </button>
                    </div>
                  )}
                  {inlineAction?.id === r.id && inlineAction.kind === 'submit' && (
                    <div className="mt-3 flex gap-2">
                      <select autoFocus value={inlineValue} onChange={e => setInlineValue(e.target.value)} className={inlineInput}>
                        <option value="">-- Select approver --</option>
                        {signers.map(s => <option key={s.id} value={s.id}>{s.name}{s.position ? ` (${s.position})` : ''}</option>)}
                      </select>
                      <button onClick={() => submit(r.id)} disabled={!inlineValue || busy} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] disabled:opacity-50 text-white text-xs font-bold rounded-lg">
                        {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                        Send Approval Email
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
