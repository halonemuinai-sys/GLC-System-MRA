'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle, XCircle, FileMinus, FileSignature, Ban } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

// Public approval page (email magic link) for asset reports.
// kind = 'disposal' (BAP) | 'handover' (BAST)
const KINDS = {
  disposal: {
    endpoint: 'asset-disposals',
    title: 'Asset Disposal Approval',
    docLabel: 'Asset Disposal Report (BAP)',
    icon: FileMinus,
    iconColor: 'text-rose-400',
    number: d => d.disposal_number,
    date: d => d.disposal_date,
    info: d => [
      ['Reason', d.reason],
      ...(d.reason_detail ? [['Details', d.reason_detail]] : []),
      ['Submitted by', d.requested_by?.full_name]
    ]
  },
  handover: {
    endpoint: 'asset-handovers',
    title: 'Asset Handover Approval',
    docLabel: 'Asset Handover Report (BAST)',
    icon: FileSignature,
    iconColor: 'text-sky-400',
    number: d => d.handover_number,
    date: d => d.handover_date,
    info: d => [
      ['Type', d.handover_type],
      ['Handed over by', `${d.giver_name}${d.giver_position ? ` (${d.giver_position})` : ''}`],
      ['Received by', `${d.recipient_name}${d.recipient_position ? ` (${d.recipient_position})` : ''}${d.recipient_department ? ` - ${d.recipient_department}` : ''}`],
      ...(d.notes ? [['Notes', d.notes]] : []),
      ['Submitted by', d.created_by?.full_name]
    ]
  }
};

export default function PublicAssetDocApprovalPage({ token, kind = 'disposal' }) {
  const cfg = KINDS[kind];
  const Icon = cfg.icon;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [doc, setDoc] = useState(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDoc(await apiClient.get(`/api/ga/${cfg.endpoint}/magic/${token}`));
    } catch (err) {
      setLoadError(err.message || 'This approval link is invalid.');
    } finally {
      setLoading(false);
    }
  }, [token, cfg.endpoint]);

  useEffect(() => { load(); }, [load]);

  async function submitAction(action) {
    if (action === 'REJECT' && !rejectReason.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await apiClient.post(`/api/ga/${cfg.endpoint}/magic/${token}`, {
        action,
        rejection_reason: action === 'REJECT' ? rejectReason.trim() : undefined
      });
      setResult(action);
    } catch (err) {
      setActionError(err.message || 'Unable to process the approval.');
    } finally {
      setSubmitting(false);
    }
  }

  const showAccessories = kind === 'handover' && doc?.items?.some(it => it.accessories);

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-6 py-5 text-white">
          <div className="flex items-center gap-2.5">
            <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
            <h1 className="font-bold text-sm">MRA Hub — {cfg.title}</h1>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              <p className="text-xs text-neutral-400">Loading asset report details...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm font-bold text-neutral-700">{loadError}</p>
            </div>
          ) : result ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              {result === 'APPROVE' ? (
                <>
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                  <p className="text-sm font-bold text-neutral-800">You approved this {cfg.docLabel}.</p>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-rose-500" />
                  <p className="text-sm font-bold text-neutral-800">You rejected this {cfg.docLabel}.</p>
                </>
              )}
              <p className="text-xs text-neutral-400">You may now close this page.</p>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <p className="text-xs text-neutral-400 font-mono mb-1">{cfg.number(doc)}</p>
                <table className="w-full text-xs">
                  <tbody>
                    {[['Company (PT)', doc.m_company?.name], ['Date', new Date(cfg.date(doc)).toLocaleDateString('en-GB')], ...cfg.info(doc)].map(([label, value]) => (
                      <tr key={label}>
                        <td className="py-1 pr-3 text-neutral-500 w-32 align-top">{label}</td>
                        <td className="py-1 font-bold text-neutral-800">{value || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs font-bold text-neutral-700 mb-2">Asset List ({doc.items.length}):</p>
              <div className="border border-neutral-200 rounded-xl overflow-hidden mb-6 max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0f172a] text-white">
                    <tr>
                      <th className="p-2 text-left font-bold">Code</th>
                      <th className="p-2 text-left font-bold">Asset Name</th>
                      <th className="p-2 text-left font-bold">Category</th>
                      <th className="p-2 text-left font-bold">Condition</th>
                      {showAccessories && <th className="p-2 text-left font-bold">Accessories</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {doc.items.map(it => (
                      <tr key={it.id} className="border-b border-neutral-100 last:border-0">
                        <td className="p-2 font-mono text-neutral-600">{it.assets.asset_code || '-'}</td>
                        <td className="p-2 font-medium text-neutral-800">{it.assets.asset_name}</td>
                        <td className="p-2 text-neutral-500">{it.assets.m_asset_category?.name || '-'}</td>
                        <td className="p-2 text-neutral-500">{it.condition_snapshot || '-'}</td>
                        {showAccessories && <td className="p-2 text-neutral-500">{it.accessories || '-'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {actionError && (
                <div className="mb-4 px-3 py-2 bg-rose-50 text-rose-600 text-xs rounded-lg">{actionError}</div>
              )}

              {showRejectForm ? (
                <div className="space-y-2.5">
                  <textarea
                    autoFocus
                    rows={3}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (required)..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowRejectForm(false)} className="flex-1 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-700">
                      Cancel
                    </button>
                    <button
                      onClick={() => submitAction('REJECT')}
                      disabled={!rejectReason.trim() || submitting}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Send Rejection
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl"
                  >
                    <Ban className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => submitAction('APPROVE')}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0f172a] hover:bg-[#1e293b] disabled:opacity-50 text-white text-xs font-bold rounded-xl"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
