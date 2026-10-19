'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Loader2, FileMinus, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import GaAssetPicker from './GaAssetPicker';

const REASONS = ['Severely Damaged', 'Lost', 'Obsolete / Uneconomical', 'Other'];

const fieldCls = 'w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs';
const labelCls = 'text-[11px] font-bold text-neutral-500 uppercase mb-1 block';

const today = () => new Date().toLocaleDateString('en-CA');

export default function GaAssetDisposalModal({ isOpen, onClose }) {
  const [companies, setCompanies] = useState([]);
  const [signers, setSigners] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [disposalDate, setDisposalDate] = useState(today);
  const [reason, setReason] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [approverSignerId, setApproverSignerId] = useState('');
  const [selected, setSelected] = useState(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCompanyId('');
    setDisposalDate(today());
    setReason('');
    setReasonDetail('');
    setApproverSignerId('');
    setSelected(new Map());
    setCreated(null);
    apiClient.get('/api/master/companies/all').then(setCompanies).catch(() => setCompanies([]));
    apiClient.get('/api/ga/asset-disposal-signers').then(setSigners).catch(() => setSigners([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = companyId && disposalDate && reason && selected.size > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/ga/asset-disposals', {
        company_id: companyId,
        disposal_date: disposalDate,
        reason,
        reason_detail: reasonDetail || null,
        approver_signer_id: approverSignerId || null,
        asset_ids: Array.from(selected.keys())
      });
      setCreated(res);
    } catch (e) {
      alert(e.message || 'Failed to create disposal report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <FileMinus className="w-4 h-4 text-rose-400" />
            <h2 className="font-bold text-sm">New Asset Disposal Report (BAP)</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {created ? (
          <div className="flex flex-col items-center text-center gap-3 py-14 px-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Disposal report {created.disposal_number} created.</p>
            <p className="text-xs text-neutral-500 max-w-sm">
              {created.status === 'PENDING_APPROVAL'
                ? 'An approval email with a magic link has been sent to the approver.'
                : 'Saved as Draft (no approver selected).'}
            </p>
            <div className="flex gap-2 mt-2">
              <Link
                href="/dashboard/berita-acara?type=bap"
                className="px-4 py-2.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold rounded-xl"
              >
                Open Asset Reports
              </Link>
              <button onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-700">Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Company (PT) *</label>
                  <select value={companyId} onChange={e => { setCompanyId(e.target.value); setSelected(new Map()); }} className={fieldCls}>
                    <option value="">-- Select Company --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Disposal Date *</label>
                  <input type="date" value={disposalDate} onChange={e => setDisposalDate(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Disposal Reason *</label>
                  <select value={reason} onChange={e => setReason(e.target.value)} className={fieldCls}>
                    <option value="">-- Select Reason --</option>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Approver (optional — empty = save as Draft)</label>
                  <select value={approverSignerId} onChange={e => setApproverSignerId(e.target.value)} className={fieldCls}>
                    <option value="">-- Save as Draft --</option>
                    {signers.map(s => <option key={s.id} value={s.id}>{s.name}{s.position ? ` (${s.position})` : ''}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Reason Detail / Notes</label>
                  <textarea
                    value={reasonDetail}
                    onChange={e => setReasonDetail(e.target.value)}
                    rows={2}
                    placeholder="Additional explanation about the asset condition..."
                    className={`${fieldCls} resize-none`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase">Assets to Dispose *</label>
                  <span className="text-[11px] text-neutral-400">{selected.size} selected</span>
                </div>
                <GaAssetPicker companyId={companyId} selected={selected} onChange={setSelected} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-700">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0f172a] hover:bg-[#1e293b] disabled:opacity-50 text-white text-xs font-bold rounded-xl"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Report ({selected.size} Asset{selected.size === 1 ? '' : 's'})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
