'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Loader2, FileSignature, CheckCircle, ArrowRight, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import GaAssetPicker from './GaAssetPicker';
import InlineHelp from '@/components/ui/InlineHelp';

export const HANDOVER_TYPES = [
  { value: 'Assignment', label: 'Assignment (to employee / PIC)' },
  { value: 'Return', label: 'Return (back to GA)' },
  { value: 'Transfer', label: 'Transfer (between units / locations)' }
];

const fieldCls = 'w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs';
const labelCls = 'text-[11px] font-bold text-neutral-500 uppercase mb-1 block';

const today = () => new Date().toLocaleDateString('en-CA');

// Field label with a Codex-style help tooltip.
function HelpLabel({ text, children, className = labelCls }) {
  return (
    <span className={`${className} normal-case`}>
      <InlineHelp summary={<span className="uppercase">{text}</span>} label={`About ${text}`}>{children}</InlineHelp>
    </span>
  );
}

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
  const [locations, setLocations] = useState([]);
  const [toCompanyId, setToCompanyId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [toRoom, setToRoom] = useState('');
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
    setToCompanyId('');
    setToLocationId('');
    setToRoom('');
    setSelected(new Map());
    setAccessories({});
    setApproverSignerId('');
    setCreated(null);
    apiClient.get('/api/master/companies/all').then(setCompanies).catch(() => setCompanies([]));
    apiClient.get('/api/ga/asset-disposal-signers').then(setSigners).catch(() => setSigners([]));
    apiClient.get('/api/ga/assets-locations').then(setLocations).catch(() => setLocations([]));
    apiClient.get('/api/auth/me').then(u => {
      setGiverName(u.full_name || '');
      setGiverPosition(u.position || 'General Affairs');
    }).catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  // Destination: another company and/or location and room, applied to the assets on approval.
  const destCompanyId = toCompanyId || companyId;
  const destCompany = companies.find(c => String(c.id) === String(destCompanyId));
  const holdingLocations = locations.filter(l => l.is_active !== false && (!destCompany?.company_master_id || !l.company_master_id || l.company_master_id === destCompany.company_master_id));
  const locationOptions = holdingLocations.length ? holdingLocations : locations;
  const otherCompany = toCompanyId && String(toCompanyId) !== String(companyId);
  const movesAssets = otherCompany || toLocationId || toRoom.trim();
  const destinationProblem = handoverType === 'Transfer' && !toLocationId && !otherCompany ? 'A transfer needs a destination location or another company.' : null;
  const locName = (id) => { const l = locations.find(x => String(x.id) === String(id)); return l ? (l.full_name || l.name) : null; };

  const canSubmit = companyId && handoverDate && handoverType && giverName.trim() && recipientName.trim() && selected.size > 0 && !destinationProblem && !submitting;

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
        to_company_id: otherCompany ? toCompanyId : null,
        to_location_id: toLocationId || null,
        to_room: toRoom.trim() || null,
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
                : 'Saved as Draft (no approver selected). You can request approval later from Asset Reports.'}
              {(created.to_company_id || created.to_location_id || created.to_room) ? ' The assets move to the new company / location when the report is approved.' : ''}
            </p>
            <div className="flex gap-2 mt-2">
              <Link
                href="/dashboard/berita-acara?type=bast"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <HelpLabel text="Company (PT) *">The company that owns the assets now. Only its assets can be picked below, and it is the starting point of the handover.</HelpLabel>
                  <select value={companyId} onChange={e => { setCompanyId(e.target.value); setSelected(new Map()); setToCompanyId(''); setToLocationId(''); }} className={fieldCls}>
                    <option value="">-- Select Company --</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <HelpLabel text="Handover Date *">The date the assets physically change hands. It is printed on the BAST.</HelpLabel>
                  <input type="date" value={handoverDate} onChange={e => setHandoverDate(e.target.value)} className={fieldCls} />
                </div>
                <div>
                  <HelpLabel text="Handover Type *"><b>Assignment</b>: assets given to an employee or PIC. <b>Return</b>: assets come back to GA. <b>Transfer</b>: assets move to another location or company — a destination is required.</HelpLabel>
                  <select value={handoverType} onChange={e => setHandoverType(e.target.value)} className={fieldCls}>
                    {HANDOVER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-2.5">
                  <HelpLabel text="First Party (Handed Over By)" className="text-[11px] font-black text-neutral-700 dark:text-neutral-200">The person who hands over the assets — usually GA. Filled with your account; change it if someone else hands over.</HelpLabel>
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
                  <HelpLabel text="Second Party (Received By)" className="text-[11px] font-black text-neutral-700 dark:text-neutral-200">The person who receives the assets and signs as recipient. For a return, this is the GA staff receiving them.</HelpLabel>
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
                  <HelpLabel text="Assets to Hand Over *" className="text-[11px] font-bold text-neutral-500">Pick the assets of the company above. An asset that is already in another open BAST (draft or waiting for approval) cannot be added again.</HelpLabel>
                  <span className="text-[11px] text-neutral-400">{selected.size} selected</span>
                </div>
                <GaAssetPicker companyId={companyId} selected={selected} onChange={setSelected} />
              </div>

              <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-[11px] font-black text-neutral-700 dark:text-neutral-200 uppercase flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-sky-500" />Asset Destination {handoverType === 'Transfer' ? '*' : '(optional)'}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">When the report is approved, the selected assets are moved to this company, location and room automatically. Leave empty to keep them where they are.</p>
                  {!companyId && <p className="mt-1.5 text-[11px] font-medium text-amber-600">Select the Company (PT) at the top first to choose a destination.</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <HelpLabel text="To Company (PT)">Choose another company only when ownership moves (e.g. inventory moved between PTs). &ldquo;Same company&rdquo; keeps the owner.</HelpLabel>
                    <select value={toCompanyId} onChange={e => { setToCompanyId(e.target.value); setToLocationId(''); }} className={fieldCls} disabled={!companyId}>
                      <option value="">Same company</option>
                      {companies.filter(c => String(c.id) !== String(companyId)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <HelpLabel text="To Location">The branch / site the assets move to. The list follows the holding group of the destination company.</HelpLabel>
                    <select value={toLocationId} onChange={e => setToLocationId(e.target.value)} className={fieldCls} disabled={!companyId}>
                      <option value="">Keep current location</option>
                      {locationOptions.map(l => <option key={l.id} value={l.id}>{l.full_name || l.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <HelpLabel text="To Room">Optional room or area at the destination, e.g. &ldquo;Meeting Room 2&rdquo;. Leave empty to keep the current room.</HelpLabel>
                    <input value={toRoom} maxLength={100} onChange={e => setToRoom(e.target.value)} placeholder="Keep current room" className={fieldCls} disabled={!companyId} />
                  </div>
                </div>
                {destinationProblem && selected.size > 0 && <p className="text-[11px] text-amber-600">{destinationProblem}</p>}
                {movesAssets && selected.size > 0 && (
                  <div className="rounded-lg bg-sky-50/60 dark:bg-sky-500/5 border border-sky-100 dark:border-sky-500/20 p-2.5 space-y-1 max-h-40 overflow-y-auto">
                    {Array.from(selected.values()).map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                        <span className="w-1/4 truncate font-medium" title={a.asset_name}>{a.asset_code || a.asset_name}</span>
                        <span className="flex-1 truncate text-neutral-400" title="Current">{a.m_company?.name || '-'} · {a.m_location ? (a.m_location.name) : 'No location'}{a.room ? ` · ${a.room}` : ''}</span>
                        <ArrowRight className="w-3 h-3 shrink-0 text-sky-500" />
                        <span className="flex-1 truncate font-medium text-sky-700 dark:text-sky-300">{(otherCompany ? destCompany?.name : a.m_company?.name) || '-'} · {toLocationId ? locName(toLocationId) : (a.m_location?.name || 'No location')}{(toRoom.trim() || a.room) ? ` · ${toRoom.trim() || a.room}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selected.size > 0 && (
                <div>
                  <HelpLabel text="Accessories / Completeness per Asset (optional)">Items handed over together with each asset (charger, bag, mouse). They are listed on the printed BAST.</HelpLabel>
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
                  <HelpLabel text="Approver (optional — empty = save as Draft)">The approver gets an e-mail with a secure link. Assets are moved to the destination only after approval. Leave empty to save a draft and send it later from Asset Reports.</HelpLabel>
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
