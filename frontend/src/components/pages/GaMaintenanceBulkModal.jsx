'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Layers, Loader2, Wrench, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import GaAssetPicker from './GaAssetPicker';

const SERVICE_TYPES = [
  ['Perbaikan', 'Repair'],
  ['Maintenance Rutin', 'Routine Maintenance'],
  ['Servis Berkala', 'Periodic Service'],
  ['Renovasi', 'Renovation'],
];
const today = () => new Date().toLocaleDateString('en-CA');
const emptyForm = () => ({ service_type: 'Maintenance Rutin', expired_date: today(), pic: '', vendor_id: '', est_cost: '', total_cost: '', status: 'Pending', detail: '', information: '' });

// Bulk maintenance: pick several assets of one company (filter-aware like the
// Berita Acara picker) and create one ticket per asset with shared service details.
export default function GaMaintenanceBulkModal({ open, onClose, onCreated, companies, vendors, defaultCompanyId }) {
  const [companyId, setCompanyId] = useState('');
  const [selected, setSelected] = useState(new Map());
  const [marks, setMarks] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (!open) return;
    setCompanyId(defaultCompanyId ? String(defaultCompanyId) : '');
    setSelected(new Map());
    setForm(emptyForm());
    setError(null);
    setCreated(null);
  }, [open, defaultCompanyId]);

  useEffect(() => {
    if (!open || !companyId) { setMarks({}); return; }
    apiClient.get('/api/ga/maintenances/asset-marks', { params: { companyId } }).then(setMarks).catch(() => setMarks({}));
  }, [open, companyId]);

  if (!open) return null;

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }));
  const count = selected.size;
  const perAsset = Number(form.total_cost || form.est_cost || 0);
  const canSubmit = companyId && form.service_type && count > 0 && !submitting;

  const badgeFor = (asset) => {
    const mark = marks[asset.id];
    if (!mark) return null;
    const last = mark.last_date ? new Date(mark.last_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : '';
    return (
      <span title={`${mark.count} maintenance record(s)${mark.open ? `, ${mark.open} still open` : ''}`} className={`ml-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 align-middle text-[9px] font-medium ${mark.open ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
        <Wrench className="h-2.5 w-2.5" />{mark.count}× {last && `· ${last}`}{mark.open ? ' · open' : ''}
      </span>
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/ga/maintenances/bulk', {
        ...form,
        company_id: Number(companyId),
        vendor_id: form.vendor_id ? Number(form.vendor_id) : null,
        asset_ids: Array.from(selected.keys()),
      });
      setCreated(res.created);
      onCreated?.();
    } catch (err) {
      setError(err.message || 'Failed to create bulk maintenance.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';
  const labelCls = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';
  const formatIDR = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={submit} className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Layers className="h-4 w-4" /></span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bulk Maintenance by Company</h2>
              <p className="text-[11px] text-slate-400">Pick assets, then one maintenance ticket is created for each selected asset.</p>
            </div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        {created !== null ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{created} maintenance ticket(s) created</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">They now appear in the list and in the monthly journey.</p>
            <button type="button" onClick={onClose} className="mt-2 h-9 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer">Done</button>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div>
                <label className={labelCls}>Company (PT)</label>
                <select value={companyId} onChange={e => { setCompanyId(e.target.value); setSelected(new Map()); }} className={fieldCls}>
                  <option value="">Select company...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={labelCls}>Assets</span>
                  <span className="text-[11px] text-slate-400"><span className="font-semibold text-slate-600 dark:text-slate-300">{count}</span> selected · <Wrench className="inline h-3 w-3" /> = already has maintenance history</span>
                </div>
                <GaAssetPicker companyId={companyId} selected={selected} onChange={setSelected} badgeFor={badgeFor} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Service Type</label>
                  <select value={form.service_type} onChange={set('service_type')} className={fieldCls}>
                    {SERVICE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Service Date</label>
                  <input type="date" value={form.expired_date} onChange={set('expired_date')} className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select value={form.status} onChange={set('status')} className={fieldCls}>
                    <option value="Pending">Pending</option>
                    <option value="Proses">In Progress</option>
                    <option value="Selesai">Completed</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Vendor Partner</label>
                  <select value={form.vendor_id} onChange={set('vendor_id')} className={fieldCls}>
                    <option value="">—</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Est. Cost / asset</label>
                  <input type="number" min="0" value={form.est_cost} onChange={set('est_cost')} placeholder="0" className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>Actual Cost / asset</label>
                  <input type="number" min="0" value={form.total_cost} onChange={set('total_cost')} placeholder="0" className={fieldCls} />
                </div>
                <div>
                  <label className={labelCls}>PIC</label>
                  <input type="text" maxLength={80} value={form.pic} onChange={set('pic')} placeholder="Person in charge" className={fieldCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>Detail</label>
                  <input type="text" value={form.detail} onChange={set('detail')} placeholder="e.g. Quarterly AC cleaning" className={fieldCls} />
                </div>
              </div>

              {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">{count} ticket(s){perAsset > 0 && <> · total <span className="font-semibold tabular-nums text-slate-600 dark:text-slate-300">{formatIDR(perAsset * count)}</span></>}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="submit" disabled={!canSubmit} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer">
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Layers className="h-3.5 w-3.5" />}Create {count || ''} Ticket{count === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
