'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Edit3, Trash2, ExternalLink, AlertTriangle, ShieldCheck, Car, Building, FileText, Save } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import SearchableSelect from '@/components/ui/SearchableSelect';

export const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
export const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val || 0));
export const formatDate = (val) => (val ? new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
export const isUsd = (ins) => Number(ins.premium_usd) > 0 || Number(ins.coverage_usd) > 0;
export const premiumText = (ins) => (Number(ins.premium_usd) > 0 ? formatUSD(ins.premium_usd) : formatIDR(ins.premium_idr));
export const coverageText = (ins) => (Number(ins.coverage_usd) > 0 ? formatUSD(ins.coverage_usd) : formatIDR(ins.coverage_idr));
export const insuredObject = (ins) => (ins.vehicles ? `${ins.vehicles.brand_model || 'Vehicle'} · ${ins.vehicles.plate_number}` : ins.vehicle_type || '');

export const daysLeft = (end) => {
  if (!end) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((new Date(end).getTime() - today) / 86400000);
};

export const STATE = {
  active: { label: 'Active', tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  expiring: { label: 'Expiring', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  expired: { label: 'Expired', tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
  inactive: { label: 'Inactive', tone: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

export function StatePill({ state }) {
  const s = STATE[state] || STATE.active;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.tone}`}><span className="h-1 w-1 rounded-full bg-current" />{s.label}</span>;
}

const fieldClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';

function Drawer({ onClose, title, subtitle, children, footer }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
      <motion.aside role="dialog" aria-label={title} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-slate-400">{subtitle}</p>}
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">{footer}</div>}
      </motion.aside>
    </>
  );
}

const Info = ({ name, children, wide }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <span className={label}>{name}</span>
    <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{children || '—'}</div>
  </div>
);

export function InsuranceDetailDrawer({ insurance: ins, canWrite, onClose, onEdit, onDelete }) {
  const left = daysLeft(ins.end_date);
  return (
    <Drawer
      onClose={onClose}
      title={ins.insurance_company || 'Insurance policy'}
      subtitle={`Policy ${ins.policy_number}`}
      footer={canWrite && <>
        <button type="button" onClick={onEdit} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Edit3 className="h-3.5 w-3.5" />Edit policy</button>
        <button type="button" aria-label="Delete policy" onClick={onDelete} className="inline-flex h-9 w-10 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
      </>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatePill state={ins.state} />
        {left !== null && ins.state !== 'inactive' && <span className={`text-[11px] ${left < 0 ? 'text-rose-600' : left <= 30 ? 'text-amber-600' : 'text-slate-400'}`}>{left < 0 ? `Ended ${-left} ${-left === 1 ? 'day' : 'days'} ago` : left === 0 ? 'Ends today' : `${left} ${left === 1 ? 'day' : 'days'} left`}</span>}
      </div>
      {ins.state === 'expired' && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">This policy has ended. Record the renewal as a new policy, or set this one to Inactive.</p>}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <Info name="Company">{ins.m_company?.name}</Info>
        <Info name="Line of insurance">{ins.insurance_type}</Info>
        <Info name="Coverage">{ins.category}</Info>
        <Info name="Insured object">{insuredObject(ins)}</Info>
        <Info name="Premium"><span className="tabular-nums">{premiumText(ins)}</span></Info>
        <Info name="Sum insured"><span className="tabular-nums">{coverageText(ins)}</span></Info>
        {Number(ins.tjh3) > 0 && <Info name="Third-party liability (TJH)"><span className="tabular-nums">{formatIDR(ins.tjh3)}</span></Info>}
        <Info name="Period">{formatDate(ins.start_date)} – {formatDate(ins.end_date)}</Info>
      </div>
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
        <Info name="Broker">{ins.broker}</Info>
        <Info name="Broker contact">{ins.contact_person}</Info>
        <Info name="Internal PIC" wide>{ins.pic}</Info>
        <Info name="Notes" wide><p className="whitespace-pre-line font-normal leading-relaxed text-slate-600 dark:text-slate-300">{ins.information}</p></Info>
      </div>
      {ins.doc_url && (
        <a href={ins.doc_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300">
          <span className="flex items-center gap-2"><FileText className="h-4 w-4" />Open policy document</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </Drawer>
  );
}

const EMPTY = {
  company_id: '', insurance_company: '', insurance_type: '', category: '', policy_number: '', start_date: '', end_date: '',
  vehicle_id: '', vehicle_type: '', premium_idr: '', premium_usd: '', coverage_idr: '', coverage_usd: '', tjh3: '',
  broker: '', pic: '', contact_person: '', information: '', doc_url: '', status: 'Active'
};
const toForm = (ins) => {
  if (!ins) return EMPTY;
  const f = { ...EMPTY };
  for (const key of Object.keys(EMPTY)) if (ins[key] !== null && ins[key] !== undefined) f[key] = String(ins[key]);
  f.start_date = ins.start_date ? ins.start_date.slice(0, 10) : '';
  f.end_date = ins.end_date ? ins.end_date.slice(0, 10) : '';
  for (const key of ['premium_idr', 'premium_usd', 'coverage_idr', 'coverage_usd', 'tjh3']) f[key] = Number(ins[key]) > 0 ? String(Number(ins[key])) : '';
  return f;
};
const digits = (v) => v.replace(/[^\d]/g, '');
const decimal = (v) => v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
const grouped = (v) => (v ? Number(v).toLocaleString('id-ID') : '');

export function InsuranceFormDrawer({ insurance, companies, vehicles, options, onClose, onSaved }) {
  const editing = !!insurance;
  const [form, setForm] = useState(() => toForm(insurance));
  const [currency, setCurrency] = useState(insurance && isUsd(insurance) ? 'USD' : 'IDR');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const companyVehicles = useMemo(() => vehicles.filter(v => !form.company_id || !v.company_id || String(v.company_id) === String(form.company_id)), [vehicles, form.company_id]);
  const isVehicleLine = /vehicle|kendaraan|motor/i.test(form.insurance_type);

  const problem = !form.company_id ? 'Select the company.'
    : !form.insurance_company.trim() ? 'Enter the insurer.'
    : !form.policy_number.trim() ? 'Enter the policy number.'
    : !form.start_date || !form.end_date ? 'Enter the policy period.'
    : form.end_date < form.start_date ? 'End date cannot be before the start date.'
    : form.doc_url && !/^https?:\/\//i.test(form.doc_url) ? 'Policy link must start with http:// or https://.'
    : null;

  const submit = async (e) => {
    e.preventDefault();
    if (problem || saving) return;
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      company_id: Number(form.company_id),
      vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
      premium_idr: currency === 'IDR' ? form.premium_idr || 0 : 0,
      coverage_idr: currency === 'IDR' ? form.coverage_idr || 0 : 0,
      premium_usd: currency === 'USD' ? form.premium_usd || 0 : 0,
      coverage_usd: currency === 'USD' ? form.coverage_usd || 0 : 0,
      tjh3: form.tjh3 || 0,
    };
    try {
      const saved = editing ? await apiClient.put(`/api/legal/insurances/${insurance.id}`, payload) : await apiClient.post('/api/legal/insurances', payload);
      onSaved(saved, editing);
    } catch (err) {
      setError(err.message || 'Failed to save the policy.');
      setSaving(false);
    }
  };

  return (
    <Drawer
      onClose={onClose}
      title={editing ? 'Edit insurance policy' : 'Add insurance policy'}
      subtitle={editing ? `Policy ${insurance.policy_number}` : 'Fields marked * are required.'}
      footer={<>
        <button type="button" onClick={onClose} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
        <button type="submit" form="insurance-form" disabled={!!problem || saving} title={problem || undefined} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}{editing ? 'Save changes' : 'Save policy'}</button>
      </>}
    >
      <form id="insurance-form" onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}

        <div>
          <span className={label}>Company *</span>
          <SearchableSelect value={form.company_id} onChange={(id) => set({ company_id: id ? String(id) : '', vehicle_id: '' })} options={companies} placeholder="Select company" searchPlaceholder="Type to search..." emptyText="No company found" />
        </div>

        <datalist id="ins-insurers">{options.insurers.map(o => <option key={o} value={o} />)}</datalist>
        <datalist id="ins-types">{options.types.map(o => <option key={o} value={o} />)}</datalist>
        <datalist id="ins-coverages">{options.coverages.map(o => <option key={o} value={o} />)}</datalist>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block"><span className={label}>Insurer *</span><input list="ins-insurers" value={form.insurance_company} maxLength={150} onChange={e => set({ insurance_company: e.target.value })} placeholder="e.g. PT Asuransi Sinar Mas" className={fieldClass} /></label>
          <label className="block"><span className={label}>Policy number *</span><input value={form.policy_number} maxLength={50} onChange={e => set({ policy_number: e.target.value })} placeholder="e.g. 0109903260000004" className={`${fieldClass} font-mono`} /></label>
          <label className="block"><span className={label}>Status</span>
            <select value={form.status} onChange={e => set({ status: e.target.value })} className={fieldClass}><option value="Active">Active</option><option value="Inactive">Inactive</option></select>
          </label>
          <label className="block"><span className={label}>Line of insurance</span><input list="ins-types" value={form.insurance_type} maxLength={50} onChange={e => set({ insurance_type: e.target.value })} placeholder="e.g. Building, Vehicle" className={fieldClass} /></label>
          <label className="block"><span className={label}>Coverage</span><input list="ins-coverages" value={form.category} maxLength={50} onChange={e => set({ category: e.target.value })} placeholder="e.g. PAR, TLO" className={fieldClass} /></label>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <label className="block"><span className={label}>Linked vehicle {isVehicleLine ? '' : '(optional)'}</span>
            <select value={form.vehicle_id} onChange={e => set({ vehicle_id: e.target.value })} className={fieldClass}>
              <option value="">Not a vehicle / not linked</option>
              {companyVehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}{v.brand_model ? ` · ${v.brand_model}` : ''}</option>)}
            </select>
            {form.company_id && !companyVehicles.length && <span className="mt-1 block text-[10px] text-slate-400">No vehicle registered for this company.</span>}
          </label>
          {!form.vehicle_id && <label className="block"><span className={label}>Insured object</span><input value={form.vehicle_type} maxLength={80} onChange={e => set({ vehicle_type: e.target.value })} placeholder="e.g. Head office building, store inventory" className={fieldClass} /></label>}
          {(isVehicleLine || form.vehicle_id) && <label className="block"><span className={label}>Third-party liability / TJH (IDR)</span><input inputMode="numeric" value={grouped(form.tjh3)} onChange={e => set({ tjh3: digits(e.target.value) })} placeholder="e.g. 10.000.000" className={`${fieldClass} text-right tabular-nums`} /></label>}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className={`${label} mb-0`}>Currency</span>
            <div className="flex gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
              {['IDR', 'USD'].map(c => (
                <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)} className={`relative rounded-md px-3 py-1 text-[11px] font-medium cursor-pointer ${currency === c ? 'text-white dark:text-slate-900' : 'text-slate-500'}`}>
                  {currency === c && <motion.span layoutId="ins-currency" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                  <span className="relative">{c}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {currency === 'IDR' ? <>
              <label className="block"><span className={label}>Premium (IDR)</span><input inputMode="numeric" value={grouped(form.premium_idr)} onChange={e => set({ premium_idr: digits(e.target.value) })} placeholder="0" className={`${fieldClass} text-right tabular-nums`} /></label>
              <label className="block"><span className={label}>Sum insured (IDR)</span><input inputMode="numeric" value={grouped(form.coverage_idr)} onChange={e => set({ coverage_idr: digits(e.target.value) })} placeholder="0" className={`${fieldClass} text-right tabular-nums`} /></label>
            </> : <>
              <label className="block"><span className={label}>Premium (USD)</span><input inputMode="decimal" value={form.premium_usd} onChange={e => set({ premium_usd: decimal(e.target.value) })} placeholder="0.00" className={`${fieldClass} text-right tabular-nums`} /></label>
              <label className="block"><span className={label}>Sum insured (USD)</span><input inputMode="decimal" value={form.coverage_usd} onChange={e => set({ coverage_usd: decimal(e.target.value) })} placeholder="0.00" className={`${fieldClass} text-right tabular-nums`} /></label>
            </>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className={label}>Start date *</span><input type="date" value={form.start_date} onChange={e => set({ start_date: e.target.value })} className={fieldClass} /></label>
            <label className="block"><span className={label}>End date *</span><input type="date" value={form.end_date} min={form.start_date || undefined} onChange={e => set({ end_date: e.target.value })} className={fieldClass} /></label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={label}>Broker</span><input value={form.broker} maxLength={100} onChange={e => set({ broker: e.target.value })} placeholder="e.g. Marsh Indonesia" className={fieldClass} /></label>
          <label className="block"><span className={label}>Broker contact</span><input value={form.contact_person} maxLength={50} onChange={e => set({ contact_person: e.target.value })} placeholder="Name / phone" className={fieldClass} /></label>
          <label className="col-span-2 block"><span className={label}>Internal PIC</span><input value={form.pic} maxLength={100} onChange={e => set({ pic: e.target.value })} placeholder="Who manages this policy" className={fieldClass} /></label>
          <label className="col-span-2 block"><span className={label}>Policy document link</span><input type="url" value={form.doc_url} onChange={e => set({ doc_url: e.target.value })} placeholder="https://drive.google.com/..." className={fieldClass} /></label>
          <label className="col-span-2 block"><span className={label}>Notes</span><textarea rows={3} maxLength={2000} value={form.information} onChange={e => set({ information: e.target.value })} placeholder="Deductible, exclusions, renewal notes..." className={`${fieldClass} h-auto py-2`} /></label>
        </div>
        {problem && <p className="text-[11px] text-amber-600 dark:text-amber-400">{problem}</p>}
      </form>
    </Drawer>
  );
}

export function DeleteInsuranceModal({ insurance, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiClient.delete(`/api/legal/insurances/${insurance.id}`);
      onDeleted(insurance);
    } catch (err) {
      setError(err.message || 'Failed to delete the policy.');
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <motion.div role="alertdialog" aria-label="Delete policy" initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><Trash2 className="h-5 w-5" /></span>
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Delete this policy?</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Policy “{insurance.policy_number}” from {insurance.insurance_company} will be deleted permanently. For an ended policy, setting it to Inactive keeps the history.</p>
        </div>
        {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer">Cancel</button>
          <button type="button" onClick={remove} disabled={busy} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

export const LineIcon = ({ ins, className }) => (ins.vehicles || /vehicle|kendaraan/i.test(ins.insurance_type || '') ? <Car className={className} /> : /building|property|gedung/i.test(ins.insurance_type || '') ? <Building className={className} /> : <ShieldCheck className={className} />);
