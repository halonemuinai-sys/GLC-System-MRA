'use client';

import React, { useState } from 'react';
import { X, Receipt, Loader2, Paperclip, Send } from 'lucide-react';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/apiClient';

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const localToday = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function MarketingReimbursementModal({ plan, metadata, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: '', expense_date: localToday(), amount: '', marketing_plan_item_id: '', coa_id: '',
    expense_vendor: '', reimbursement_payee: Cookies.get('glc_user_name') || '', notes: '', doc_url: '', confirmed_paid: false
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const change = (field, value) => setForm(previous => ({ ...previous, [field]: value }));

  async function uploadProof(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setError('Proof must be 4 MB or smaller.'); return; }
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await apiClient.postForm('/api/marketing/upload', body);
      if (!result.url) throw new Error('Proof upload failed.');
      change('doc_url', result.url);
    } catch (err) { setError(err.message || 'Proof upload failed.'); }
    finally { setUploading(false); }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || uploading) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.post('/api/marketing/claims', { ...form, marketing_plan_id: plan.id, amount: Number(form.amount) });
    } catch (err) {
      setError(err.message || 'Failed to submit the reimbursement.');
      setBusy(false);
      return;
    }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => !busy && !uploading && onClose()} />
      <section role="dialog" aria-modal="true" aria-labelledby="reimbursement-title" className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10"><Receipt className="h-5 w-5" /></span>
            <div><h3 id="reimbursement-title" className="text-base font-semibold text-slate-900 dark:text-white">Claim Reimbursement</h3><p className="mt-1 text-xs text-slate-500">Record personal expenses not yet recorded. Approved by Finance.</p></div>
          </div>
          <button type="button" aria-label="Close reimbursement" disabled={busy || uploading} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <fieldset disabled={busy || uploading} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 disabled:opacity-70">
            <p className="truncate rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300" title={plan.title}>{plan.title}</p>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">{error}</p>}
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Transaction / purpose *
              <input autoFocus required maxLength={200} value={form.title} onChange={e => change('title', e.target.value)} placeholder="e.g. Event parking and transport" className={inputClass} />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Transaction date *
                <input type="date" required max={localToday()} value={form.expense_date} onChange={e => change('expense_date', e.target.value)} className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Amount paid (Rp) *
                <input inputMode="numeric" required value={form.amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} onChange={e => change('amount', e.target.value.replace(/\D/g, ''))} placeholder="0" className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Paid by / reimbursement payee *
                <input required maxLength={150} value={form.reimbursement_payee} onChange={e => change('reimbursement_payee', e.target.value)} className={inputClass} />
              </label>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Vendor / place of purchase
                <input maxLength={200} value={form.expense_vendor} onChange={e => change('expense_vendor', e.target.value)} placeholder="Nama toko / penyedia jasa" className={inputClass} />
              </label>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-950/30">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Cost record
                <select value={form.marketing_plan_item_id} onChange={e => change('marketing_plan_item_id', e.target.value)} className={inputClass}>
                  <option value="">New line - not in the cost breakdown</option>
                  {(plan.items || []).map(item => <option key={item.id} value={item.id}>{item.m_coa?.code} - {item.description || item.m_coa?.name} (month {item.period_month})</option>)}
                </select>
              </label>
              {!form.marketing_plan_item_id && <label className="mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">Cost account / CoA *
                <select required value={form.coa_id} onChange={e => change('coa_id', e.target.value)} className={inputClass}>
                  <option value="">Select cost account</option>
                  {(metadata.coas || []).map(coa => <option key={coa.id} value={coa.id}>{coa.code} - {coa.name}</option>)}
                </select>
              </label>}
            </div>
            <div className="block text-xs font-medium text-slate-600 dark:text-slate-300"><label htmlFor="reimbursement-proof-url">Proof of payment *</label>
              <div className="mt-1.5 flex gap-2">
                <input id="reimbursement-proof-url" type="url" required value={form.doc_url} onChange={e => change('doc_url', e.target.value)} placeholder="Paste a proof link or upload" className={`${inputClass} !mt-0 min-w-0 flex-1`} />
                <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-blue-600 dark:border-slate-700 dark:text-blue-400">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />} Upload
                  <input type="file" aria-label="Upload reimbursement proof" accept="image/*,application/pdf" onChange={uploadProof} className="absolute inset-0 w-full cursor-pointer opacity-0" />
                </span>
              </div>
            </div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Notes
              <textarea rows={2} value={form.notes} onChange={e => change('notes', e.target.value)} className={inputClass} />
            </label>
            <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <input type="checkbox" required checked={form.confirmed_paid} onChange={e => change('confirmed_paid', e.target.checked)} className="mt-0.5 accent-blue-600" />
              The cost was paid personally and has never been reimbursed by the company.
            </label>
          </fieldset>
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <button type="button" disabled={busy || uploading} onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300">Cancel</button>
            <button type="submit" disabled={busy || uploading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit to Finance</button>
          </div>
        </form>
      </section>
    </div>
  );
}
