'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Loader2, FileSignature, CheckCircle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import GaAssetPicker from './GaAssetPicker';

export const HANDOVER_TYPES = [
  { value: 'Assignment', label: 'Assignment (to employee / PIC)' },
  { value: 'Return', label: 'Return (back to GA)' },
  { value: 'Transfer', label: 'Transfer (between units / locations)' }
];

const fieldCls = 'w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs';
const labelCls = 'text-[11px] font-bold text-neutral-500 uppercase mb-1 block';

const today = () => new Date().toLocaleDateString('en-CA');

export default function GaAssetHandoverModal({ isOpen, onClose }) {
  const [companies, setCompanies] = useState([]);
  const [signers, setSigners] = useState([]);
  const [approverSignerId, setApproverSignerId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [handoverDate, setHandoverDate] = useState(today);
  const [handoverType, setHandoverType] = useState('Assignment');
  const [giverName, setGiverName] = useState('');
  const [giverPosition, setGiverPosition] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPosition, setRecipientPosition] = useState('');
  const [recipientDepartment, setRecipientDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState(new Map());
  const [accessories, setAccessories] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCompanyId('');
    setHandoverDate(today());
    setHandoverType('Assignment');
    setRecipientName('');
    setRecipientPosition('');
    setRecipientDepartment('');
    setNotes('');
    setSelected(new Map());
    setAccessories({});
    setApproverSignerId('');
    setCreated(null);
    apiClient.get('/api/master/companies/all').then(setCompanies).catch(() => setCompanies([]));
    apiClient.get('/api/ga/asset-disposal-signers').then(setSigners).catch(() => setSigners([]));
    apiClient.get('/api/auth/me').then(u => {
      setGiverName(u.full_name || '');
      setGiverPosition(u.position || 'General Affairs');
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const canSubmit = companyId && handoverDate && handoverType && giverName.trim() && recipientName.trim() && selected.size > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/ga/asset-handovers', {
        company_id: companyId,
        handover_date: handoverDate,
        handover_type: handoverType,
        giver_name: giverName.trim(),
        giver_position: giverPosition.trim() || null,
        recipient_name: recipientName.trim(),
        recipient_position: recipientPosition.trim() || null,
        recipient_department: recipientDepartment.trim() || null,
        notes: notes.trim() || null,
        approver_signer_id: approverSignerId || null,
        items: Array.from(selected.keys()).map(id => ({ asset_id: id, accessories: accessories[id]?.trim() || null }))
      });
      setCreated(res);
    } catch (e) {
      alert(e.message || 'Failed to create handover report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSignature className="w-4 h-4 text-sky-400" />
            <h2 className="font-bold text-sm">New Asset Handover Report (BAST)</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        {created ? (
          <div className="flex flex-col items-center text-center gap-3 py-14 px-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Handover report {created.handover_number} created.</p>
            <p className="text-xs text-neutral-500 max-w-sm">
              {created.status === 'PENDING_APPROVAL'
                ? 'An approval email with a magic link has been sent to the approver. It can be printed once approved.'
                : 'Saved as Draft (no approver selected). You can request approval later from the Berita Acara menu.'}
            </p>
            <div className="flex gap-2 mt-2">
              <Link
                href="/dashboard/berita-acara?type=bast"
                className="px-4 py-2.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold rounded-xl"
              >
                Open Berita Acara
              </Link>
              <button onClick={onClose} className="px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-700">Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Company (PT) *</label>
                  <select value={companyId} onChange={e => { setCompanyId(e.target.value); setSelected(new Map()); }} className={fieldCls}>
                    <option value="">-- Select Company --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Handover Date *</label>
                  <input type="date" value={handoverDate} onChange={e => setHandoverDate(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Handover Type *</label>
                  <select value={handoverType} onChange={e => setHandoverType(e.target.value)} className={fieldCls}>
                    {HANDOVER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-2.5">
                  <p className="text-[11px] font-black text-neutral-700 dark:text-neutral-200 uppercase">First Party (Handed Over By)</p>
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input value={giverName} onChange={e => setGiverName(e.target.value)} className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Position</label>
                    <input value={giverPosition} onChange={e => setGiverPosition(e.target.value)} className={fieldCls} />
                  </div>
                </div>
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-2.5">
                  <p className="text-[11px] font-black text-neutral-700 dark:text-neutral-200 uppercase">Second Party (Received By)</p>
                  <div>
                    <label className={labelCls}>Name *</label>
                    <input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="Recipient full name" className={fieldCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Position</label>
                      <input value={recipientPosition} onChange={e => setRecipientPosition(e.target.value)} className={fieldCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Department / Unit</label>
                      <input value={recipientDepartment} onChange={e => setRecipientDepartment(e.target.value)} className={fieldCls} />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase">Assets to Hand Over *</label>
                  <span className="text-[11px] text-neutral-400">{selected.size} selected</span>
                </div>
                <GaAssetPicker companyId={companyId} selected={selected} onChange={setSelected} />
              </div>

              {selected.size > 0 && (
                <div>
                  <label className={labelCls}>Accessories / Completeness per Asset (optional)</label>
                  <div className="space-y-2">
                    {Array.from(selected.values()).map(a => (
                      <div key={a.id} className="flex items-center gap-3">
                        <span className="w-2/5 text-xs text-neutral-700 dark:text-neutral-300 truncate">
                          <span className="font-mono text-neutral-400 mr-1.5">{a.asset_code || '-'}</span>{a.asset_name}
                        </span>
                        <input
                          value={accessories[a.id] || ''}
                          onChange={e => setAccessories(prev => ({ ...prev, [a.id]: e.target.value }))}
                          placeholder="e.g. Charger, Bag, Mouse"
                          className={`flex-1 ${fieldCls} py-2`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${fieldCls} resize-none`} />
                </div>
                <div>
                  <label className={labelCls}>Approver (optional — empty = save as Draft)</label>
                  <select value={approverSignerId} onChange={e => setApproverSignerId(e.target.value)} className={fieldCls}>
                    <option value="">-- Save as Draft --</option>
                    {signers.map(s => <option key={s.id} value={s.id}>{s.name}{s.position ? ` (${s.position})` : ''}</option>)}
                  </select>
                </div>
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
