'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Save, Send, Check, Ban, Upload, ExternalLink, AlertTriangle, CheckCircle, XCircle, Clock, Receipt, Target, CalendarClock
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import InlineHelp from '@/components/ui/InlineHelp';

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const formatThousands = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
};
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');

const STATUS_META = {
  DRAFT: { label: 'Draft', cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300' },
  PENDING_APPROVAL: { label: 'Pending Approval', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  REJECTED: { label: 'Rejected', cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' }
};

const STEP_STATUS = {
  WAITING: { label: 'Waiting', cls: 'text-neutral-400', icon: Clock },
  PENDING: { label: 'In review', cls: 'text-amber-600', icon: Clock },
  APPROVED: { label: 'Approved', cls: 'text-emerald-600', icon: CheckCircle },
  REJECTED: { label: 'Rejected', cls: 'text-rose-600', icon: XCircle }
};

const RATING_META = {
  ACHIEVED: { label: 'Target Tercapai', cls: 'text-emerald-700 dark:text-emerald-400' },
  NEARLY: { label: 'Hampir Tercapai', cls: 'text-amber-700 dark:text-amber-400' },
  NOT_ACHIEVED: { label: 'Not Achieved', cls: 'text-rose-700 dark:text-rose-400' },
  NO_TARGET: { label: 'KPI targets not set', cls: 'text-neutral-500' }
};

function SettlementBadge({ variance }) {
  if (variance > 0) return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">CLAIM {formatIDR(variance)}</span>;
  if (variance < 0) return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">KELEBIHAN {formatIDR(Math.abs(variance))}</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800">Pas</span>;
}

const fmtKpiValue = (row, v) => (v === null || v === undefined ? '-' : row.currency ? formatIDR(v) : Number(v).toLocaleString('en-GB'));

async function uploadProof(file) {
  const formData = new FormData();
  formData.append('folder', 'marketing-closing');
  formData.append('file', file);
  const token = Cookies.get('glc_mra_token');
  const apiBase = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:5005';
  const res = await fetch(`${apiBase}/api/marketing/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed.');
  return json.url;
}

// Closing Marketing Plan: biaya final per item vs dibayar (kelebihan / claim) + evaluasi KPI,
// diajukan ke Marketing Head (tahap 1) lalu Kadiv (tahap 2). Disetujui semua -> plan COMPLETED.
export default function MarketingPlanClosingSection({ planId, planStatus, userRole, onChanged }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState('');
  const [signers, setSigners] = useState([]);
  const [headId, setHeadId] = useState('');
  const [kadivId, setKadivId] = useState('');
  const [busy, setBusy] = useState(null); // 'save' | 'submit' | 'approve' | 'reject'
  const [uploadingId, setUploadingId] = useState(null);
  const [message, setMessage] = useState(null); // { type, text }
  const [decision, setDecision] = useState(null); // null | 'approve' | 'reject'
  const [decisionText, setDecisionText] = useState('');

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const canEditRole = isAdmin || userRole === 'marketing';

  const applyResponse = useCallback((res) => {
    setData(res);
    setRows(res.rows.map(r => ({ ...r, final_input: r.final_amount === null ? '' : String(Math.round(r.final_amount)) })));
    setNotes(res.closing?.notes || '');
    const steps = res.closing?.approvers || [];
    setHeadId(String(steps.find(s => s.step_number === 1)?.signer_id || ''));
    setKadivId(String(steps.find(s => s.step_number === 2)?.signer_id || ''));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyResponse(await apiClient.get(`/api/marketing/plans/${planId}/closing`));
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Failed to load closing.' });
    } finally {
      setLoading(false);
    }
  }, [planId, applyResponse]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiClient.get('/api/ga/asset-disposal-signers').then(setSigners).catch(() => setSigners([]));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-neutral-400" /></div>;
  }
  if (!data) return null;

  const closing = data.closing;
  const status = closing?.status || null;
  const steps = closing?.approvers || [];
  const currentStep = steps.find(s => s.step_number === closing?.current_step);
  const editable = planStatus === 'APPROVED' && canEditRole && (!status || status === 'DRAFT' || status === 'REJECTED');
  const legacyCompleted = planStatus === 'COMPLETED' && !closing;
  const win = data.window;
  const kpi = data.kpi;

  const liveRows = rows.map(r => {
    const final = r.final_input === '' ? null : Number(r.final_input);
    return { ...r, final_amount: final, variance: final === null ? 0 : final - r.paid };
  });
  const totalPaid = liveRows.reduce((s, r) => s + r.paid, 0);
  const totalFinal = liveRows.reduce((s, r) => s + (r.final_amount ?? 0), 0);
  const totalVariance = totalFinal - totalPaid;
  const missingFinal = liveRows.filter(r => r.final_amount === null).length;
  const missingProof = liveRows.filter(r => r.variance !== 0 && !r.proof_url).length;
  const sameApprover = headId && kadivId && headId === kadivId;

  function updateRow(id, patch) {
    setRows(prev => prev.map(r => (r.plan_item_id === id ? { ...r, ...patch } : r)));
  }

  const payload = () => ({
    notes,
    items: liveRows.map(r => ({ plan_item_id: r.plan_item_id, final_amount: r.final_amount, note: r.note, proof_url: r.proof_url }))
  });

  async function run(kind, fn, successText) {
    setBusy(kind);
    setMessage(null);
    try {
      applyResponse(await fn());
      setMessage({ type: 'success', text: successText });
      setDecision(null);
      setDecisionText('');
      if (onChanged) onChanged();
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Action failed.' });
    } finally {
      setBusy(null);
    }
  }

  const handleSave = () => run('save', () => apiClient.put(`/api/marketing/plans/${planId}/closing`, payload()), 'Draft closing tersimpan.');
  const handleSubmit = () => run('submit', () => apiClient.post(`/api/marketing/plans/${planId}/closing/submit`, {
    ...payload(), head_signer_id: headId, kadiv_signer_id: kadivId
  }), 'Closing submitted. Approval email sent to the Marketing Head (step 1).');
  const handleApprove = () => run('approve', () => apiClient.put(`/api/marketing/plans/${planId}/closing/approve`, { comment: decisionText.trim() }),
    closing?.current_step < steps.length ? 'Step approved. Forwarded to the next approver.' : 'Closing approved. The plan is now COMPLETED.');
  const handleReject = () => run('reject', () => apiClient.put(`/api/marketing/plans/${planId}/closing/reject`, { rejection_reason: decisionText.trim() }), 'Closing rejected and returned to the requester.');

  async function handleUpload(id, file) {
    if (!file) return;
    setUploadingId(id);
    try {
      updateRow(id, { proof_url: await uploadProof(file) });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setUploadingId(null);
    }
  }

  const inputCls = 'w-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500';
  const selectCls = 'bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs w-full';

  return (
    <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-xs font-black text-neutral-800 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
            <Receipt className="w-4 h-4 text-indigo-500" />
            Closing & Cost Accountability
          </h4>
          <p className="text-[11px] text-neutral-500 mt-1 max-w-xl">
            <InlineHelp summary="Complete the final costs, then submit the closing." label="About final costs and the closing flow">
              Enter the final cost of each item after the event. Lower than paid = <strong>excess funds</strong> (to be returned), higher = <strong>claim</strong>. Submitted to <strong>Marketing Head</strong> (evaluasi KPI) lalu <strong>Kadiv</strong>; the plan becomes COMPLETED once both approve.
            </InlineHelp>
          </p>
        </div>
        {status && <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_META[status].cls}`}>{STATUS_META[status].label}</span>}
      </div>

      {/* Closing window (M+1 s/d M+3) */}
      {win && ['NOT_YET', 'OPEN', 'OVERDUE'].includes(win.state) && (
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium ${
          win.state === 'OVERDUE' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
            : win.state === 'OPEN' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
              : 'bg-neutral-50 dark:bg-neutral-950 text-neutral-500'
        }`}>
          <CalendarClock className="w-4 h-4 flex-shrink-0" />
          {win.state === 'NOT_YET' && <InlineHelp summary={`Closing dibuka ${fmtDate(win.opens_at)}. Batas ${fmtDate(win.due_at)}.`} label="Penjelasan periode closing">Closing opens at M+1 and is due at M+3 after the event. A draft can be prepared before the closing window opens.</InlineHelp>}
          {win.state === 'OPEN' && <InlineHelp summary={`Closing due ${fmtDate(win.due_at)} - ${win.days_left} days left.`} label="Penjelasan batas closing">Closing is due M+3 after the event.</InlineHelp>}
          {win.state === 'OVERDUE' && <InlineHelp summary={`${Math.abs(win.days_left)} days overdue. Due ${fmtDate(win.due_at)}.`} label="About late closing">Closing can still be submitted after the M+3 deadline, but it is recorded as overdue.</InlineHelp>}
        </div>
      )}

      {/* Approval chain */}
      {steps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map(s => {
            const meta = STEP_STATUS[s.status] || STEP_STATUS.WAITING;
            const Icon = meta.icon;
            return (
              <div key={s.id} className="p-3 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-950/40">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Tahap {s.step_number} · {s.role_label}</p>
                <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">{s.signer?.name}{s.signer?.position ? ` (${s.signer.position})` : ''}</p>
                <p className={`text-[10px] font-semibold mt-1 flex items-center gap-1 ${meta.cls}`}>
                  <Icon className="w-3 h-3" /> {meta.label}{s.action_at ? ` · ${fmtDate(s.action_at)}` : ''}
                </p>
                {s.comment && <p className="text-[10px] text-neutral-500 mt-1 italic">"{s.comment}"</p>}
              </div>
            );
          })}
        </div>
      )}

      {status === 'APPROVED' && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Closing completed on {fmtDate(closing.approved_at)}.
        </div>
      )}
      {status === 'REJECTED' && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 text-[11px] font-medium">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Closing rejected: “{closing.rejection_reason}”. Fix it and submit again.</span>
        </div>
      )}
      {legacyCompleted && (
        <div className="px-3 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 text-neutral-500 text-[11px]">
          <InlineHelp summary="Plan completed without closing data." label="About legacy closing data">This plan was closed before the closing feature existed. The summary below uses paid actuals.</InlineHelp>
        </div>
      )}
      {editable && !data.actuals_filled && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Enter the event results before submitting the closing.
        </div>
      )}
      {editable && data.unsettled_payments > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px]">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {data.unsettled_payments} payment requests are not PAID/REJECTED yet.
        </div>
      )}

      {/* Items table */}
      <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-950/40 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-right">Budget</th>
              <th className="p-3 text-right">Paid</th>
              <th className="p-3 text-right w-36">Final Cost</th>
              <th className="p-3 text-right">Variance</th>
              <th className="p-3 text-left w-44">Notes</th>
              <th className="p-3 text-left">Proof</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {liveRows.map(r => {
              const proofMissing = editable && r.variance !== 0 && !r.proof_url;
              return (
                <tr key={r.plan_item_id}>
                  <td className="p-3">
                    <p className="font-semibold text-neutral-800 dark:text-neutral-200">{r.label}</p>
                    <p className="text-[10px] text-neutral-400">{[r.coa, r.vendor].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="p-3 text-right text-neutral-500 whitespace-nowrap">{formatIDR(r.budget)}</td>
                  <td className="p-3 text-right font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{formatIDR(r.paid)}</td>
                  <td className="p-3 text-right">
                    {editable ? (
                      <input
                        inputMode="numeric"
                        value={formatThousands(r.final_input)}
                        onChange={e => updateRow(r.plan_item_id, { final_input: e.target.value.replace(/\D/g, '') })}
                        placeholder="0"
                        className={`${inputCls} text-right`}
                      />
                    ) : (
                      <span className="font-bold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">{r.final_amount === null ? '-' : formatIDR(r.final_amount)}</span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">{r.final_amount === null ? <span className="text-neutral-300">-</span> : <SettlementBadge variance={r.variance} />}</td>
                  <td className="p-3">
                    {editable ? (
                      <input value={r.note} onChange={e => updateRow(r.plan_item_id, { note: e.target.value })} placeholder="Variance notes" className={inputCls} />
                    ) : (
                      <span className="text-neutral-500">{r.note || '-'}</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {r.proof_url && (
                        <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline">
                          <ExternalLink className="w-3 h-3" /> View
                        </a>
                      )}
                      {editable && (
                        <label className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${proofMissing ? 'border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-950/30' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}>
                          {uploadingId === r.plan_item_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {r.proof_url ? 'Ganti' : proofMissing ? 'Required' : 'Upload'}
                          <input type="file" accept="image/*,application/pdf" className="hidden" onChange={e => handleUpload(r.plan_item_id, e.target.files?.[0])} />
                        </label>
                      )}
                      {!editable && !r.proof_url && <span className="text-neutral-300">-</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Total Paid</p>
          <p className="text-sm font-extrabold text-neutral-800 dark:text-white mt-0.5">{formatIDR(totalPaid)}</p>
        </div>
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800">
          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Total Final Cost</p>
          <p className="text-sm font-extrabold text-neutral-800 dark:text-white mt-0.5">{legacyCompleted ? '-' : formatIDR(totalFinal)}</p>
        </div>
        <div className={`p-3 rounded-xl border ${totalVariance > 0 ? 'bg-amber-500/5 border-amber-500/20' : totalVariance < 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-neutral-50 dark:bg-neutral-950 border-neutral-100 dark:border-neutral-800'}`}>
          <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Closing Result</p>
          {legacyCompleted ? (
            <p className="text-sm font-extrabold text-neutral-500 mt-0.5">-</p>
          ) : (
            <>
              <p className={`text-sm font-extrabold mt-0.5 ${totalVariance > 0 ? 'text-amber-700 dark:text-amber-400' : totalVariance < 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-600'}`}>
                {totalVariance > 0 ? `Claim ${formatIDR(totalVariance)}` : totalVariance < 0 ? `Excess ${formatIDR(Math.abs(totalVariance))}` : 'Exact / No variance'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {totalVariance > 0 ? 'Shortfall to be reimbursed.' : totalVariance < 0 ? 'Remaining funds to be returned.' : 'Final cost equals the amount paid.'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* KPI evaluation */}
      {kpi && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 bg-neutral-50 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-800">
            <span className="text-[10px] font-black text-neutral-600 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" /> Evaluasi KPI (dinilai Marketing Head)
            </span>
            <span className={`text-[11px] font-extrabold ${RATING_META[kpi.rating]?.cls || ''}`}>
              {kpi.score !== null ? `Skor ${kpi.score}% · ` : ''}{RATING_META[kpi.rating]?.label}
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-3 py-2 text-left">Indikator</th>
                <th className="px-3 py-2 text-right">Target</th>
                <th className="px-3 py-2 text-right">Aktual</th>
                <th className="px-3 py-2 text-right">Capaian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {kpi.rows.map(k => (
                <tr key={k.key}>
                  <td className="px-3 py-2 font-semibold text-neutral-700 dark:text-neutral-300">{k.label}</td>
                  <td className="px-3 py-2 text-right text-neutral-500">{fmtKpiValue(k, k.target)}</td>
                  <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">{fmtKpiValue(k, k.actual)}</td>
                  <td className={`px-3 py-2 text-right font-bold ${k.achievement === null ? 'text-neutral-300' : k.achievement >= 100 ? 'text-emerald-600' : k.achievement >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {k.achievement === null ? '-' : `${k.achievement}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {(editable || closing?.notes) && (
        <div>
          <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Closing Notes</label>
          {editable ? (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Accountability summary, refund / claim plan..." className={`${inputCls} resize-none`} />
          ) : (
            <p className="text-xs text-neutral-600 dark:text-neutral-400">{closing.notes}</p>
          )}
        </div>
      )}

      {message && (
        <div className={`px-3 py-2 rounded-xl text-[11px] font-bold ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}

      {/* Submit (marketing) */}
      {editable && (
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Tahap 1 · Marketing Head (evaluasi KPI)</label>
              <select value={headId} onChange={e => setHeadId(e.target.value)} className={selectCls}>
                <option value="">-- Select Marketing Head --</option>
                {signers.map(s => <option key={s.id} value={s.id}>{s.name}{s.position ? ` (${s.position})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Tahap 2 · Kadiv</label>
              <select value={kadivId} onChange={e => setKadivId(e.target.value)} className={selectCls}>
                <option value="">-- Select Division Head --</option>
                {signers.map(s => <option key={s.id} value={s.id}>{s.name}{s.position ? ` (${s.position})` : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <p className="text-[10px] text-neutral-400">
              {missingFinal > 0 ? `${missingFinal} items have no final cost yet. ` : ''}
              {missingProof > 0 ? `${missingProof} items with a variance have no proof yet. ` : ''}
              {sameApprover ? 'Marketing Head and Division Head must be different people.' : ''}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!!busy}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {busy === 'save' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                disabled={!!busy || !headId || !kadivId || sameApprover || missingFinal > 0 || missingProof > 0 || !data.actuals_filled || data.unsettled_payments > 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {busy === 'submit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Submit Closing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision (admin, tahap aktif) */}
      {status === 'PENDING_APPROVAL' && isAdmin && currentStep && (
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
          <p className="text-[10px] text-neutral-400">
            Decision on behalf of the active step: <strong>Tahap {currentStep.step_number} · {currentStep.role_label}</strong> ({currentStep.signer?.name}).
          </p>
          {decision ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={decisionText}
                onChange={e => setDecisionText(e.target.value)}
                placeholder={decision === 'reject' ? 'Rejection reason (required)...' : 'Evaluation notes (optional)...'}
                className={inputCls}
              />
              <button onClick={() => { setDecision(null); setDecisionText(''); }} className="px-3 py-2 text-xs font-bold text-neutral-500">Cancel</button>
              <button
                onClick={decision === 'reject' ? handleReject : handleApprove}
                disabled={!!busy || (decision === 'reject' && !decisionText.trim())}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-white rounded-xl text-xs font-bold disabled:opacity-50 whitespace-nowrap ${decision === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {decision === 'reject' ? 'Send Rejection' : 'Confirm Approval'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDecision('reject')} className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 rounded-xl text-xs font-bold">
                <Ban className="w-3.5 h-3.5" /> Tolak
              </button>
              <button onClick={() => setDecision('approve')} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                <Check className="w-3.5 h-3.5" /> Setujui Tahap {currentStep.step_number}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
