'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, AlertTriangle, Trash2, Send, Save, Info } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import SearchableSelect from '@/components/ui/SearchableSelect';
import CampaignDateRangePicker from '@/components/ui/CampaignDateRangePicker';
import InlineHelp from '@/components/ui/InlineHelp';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const today = () => new Date().toISOString().slice(0, 10);
const money = (v) => Math.round(Number(v || 0) * 100) / 100;

// Drawer to create or edit a draft PO. `seedItems` come from the queue (create);
// `po` is an existing draft (edit). `queue` provides remaining budgets for every item.
export default function GaMarketingPoForm({ seedItems = [], po = null, queue = [], vendors = [], onClose, onSaved }) {
  const queueMap = useMemo(() => new Map(queue.map(item => [item.id, item])), [queue]);
  const first = seedItems[0];
  const marketingVendor = seedItems.find(item => item.vendors)?.vendors || null;
  const [header, setHeader] = useState(() => po ? {
    vendor_id: String(po.vendor_id),
    order_date: po.order_date?.slice(0, 10) || today(),
    delivery_date: po.delivery_date?.slice(0, 10) || '',
    tax_rate: Number(po.tax_rate),
    payment_terms_days: po.payment_terms_days ?? '',
    notes: po.notes || ''
  } : {
    // Marketing knows the vendor: use it when registered (active) in the vendor master.
    vendor_id: marketingVendor?.active ? String(marketingVendor.id) : '',
    order_date: today(),
    // Earliest upcoming event date of the selected plans; past events leave it empty.
    delivery_date: seedItems.map(i => i.marketing_plan?.event_start_date?.slice(0, 10)).filter(d => d && d >= today()).sort()[0] || '',
    tax_rate: 11,
    payment_terms_days: '',
    notes: ''
  });
  const [lines, setLines] = useState(() => po
    ? po.lines.map(line => ({ item: line.marketing_plan_item, itemId: line.marketing_plan_item_id, description: line.description, qty: Number(line.qty), unit_price: Number(line.unit_price), ownAmount: Number(line.amount) }))
    : seedItems.map(item => {
      const qty = Number(item.qty) > 0 ? Number(item.qty) : 1;
      const unit = Number(item.unit_price) > 0 && money(qty * item.unit_price) <= item.remaining ? Number(item.unit_price) : money(item.remaining / qty);
      return { item, itemId: item.id, description: item.description || item.m_coa?.name || 'Marketing item', qty, unit_price: unit, ownAmount: 0 };
    }));
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  const companyName = po?.company?.name || first?.marketing_plan?.company?.name;
  const companyId = po?.company_id || first?.marketing_plan?.company?.id;
  const vendor = vendors.find(v => String(v.id) === String(header.vendor_id));

  // Remaining budget available to each line = queue remaining (other POs) + what this draft already holds.
  const rows = lines.map(line => {
    const queued = queueMap.get(line.itemId);
    const available = money((queued ? queued.remaining : 0) + line.ownAmount);
    const amount = money(Number(line.qty) * Number(line.unit_price));
    return { ...line, available, amount, over: amount > available + 0.001, invalid: !(Number(line.qty) > 0) || !(Number(line.unit_price) >= 0) || amount <= 0 || !line.description.trim() };
  });
  const subtotal = money(rows.reduce((s, r) => s + r.amount, 0));
  const tax = money(subtotal * Number(header.tax_rate) / 100);
  const dateProblem = header.delivery_date && header.delivery_date < header.order_date;
  const hasProblem = !header.vendor_id || !rows.length || rows.some(r => r.over || r.invalid) || dateProblem;

  const update = (idx, patch) => setLines(prev => prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  const save = async (issue) => {
    if (hasProblem || saving) return;
    setSaving(issue ? 'issue' : 'draft');
    setError(null);
    const body = {
      company_id: companyId,
      vendor_id: header.vendor_id,
      order_date: header.order_date,
      delivery_date: header.delivery_date || null,
      tax_rate: Number(header.tax_rate),
      payment_terms_days: header.payment_terms_days === '' ? null : header.payment_terms_days,
      notes: header.notes,
      lines: rows.map(r => ({ marketing_plan_item_id: r.itemId, description: r.description, qty: r.qty, unit_price: r.unit_price })),
      issue
    };
    try {
      const saved = po ? await apiClient.put(`/api/ga/marketing-po/${po.id}`, body) : await apiClient.post('/api/ga/marketing-po', body);
      if (po && issue) await apiClient.post(`/api/ga/marketing-po/${po.id}/issue`);
      onSaved(saved, issue ? `${saved.po_number} issued.` : `${saved.po_number} saved as draft.`);
    } catch (err) {
      setError(err.message || 'Failed to save the PO.');
    } finally {
      setSaving(null);
    }
  };

  const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';
  const field = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && onClose()} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{po ? `Edit ${po.po_number}` : 'New purchase order'}</h3>
            <p className="mt-0.5 text-[11px] text-slate-400">{companyName} · one vendor and one company per PO. Line amounts count against the item budget before tax.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} disabled={!!saving} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className={label}>Vendor *</span>
              <SearchableSelect value={header.vendor_id} onChange={id => { const v = vendors.find(x => String(x.id) === String(id)); setHeader(h => ({ ...h, vendor_id: id, payment_terms_days: h.payment_terms_days === '' && v?.top_days != null ? v.top_days : h.payment_terms_days })); }} options={vendors} placeholder="Select vendor" searchPlaceholder="Search vendor..." emptyText="No active vendor found" subtitleKey="vendor_code" />
              {marketingVendor && !marketingVendor.active && <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3 w-3" />Marketing chose “{marketingVendor.vendor_name}”, which is not registered yet. Register and activate it in Vendors, then reload.</p>}
              {marketingVendor?.active && vendor && String(vendor.id) !== String(marketingVendor.id) && <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"><Info className="h-3 w-3" />Differs from the vendor chosen by Marketing ({marketingVendor.vendor_name}).</p>}
                            {vendor && !vendor.vendor_code && <p className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3 w-3" />This vendor has no vendor code; add it in the vendor master before exporting to NetSuite.</p>}
            </div>
            <div>
              <span className={label}>Order date → delivery date</span>
              <CampaignDateRangePicker lang="en" placeholder="Order and delivery dates" startValue={header.order_date} endValue={header.delivery_date} onChange={({ start, end }) => setHeader(h => ({ ...h, order_date: start || today(), delivery_date: end || '' }))} />
              {dateProblem && <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">Delivery date cannot be before the order date.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="po-tax" className={label}>Tax (PPN)</label>
                <select id="po-tax" value={header.tax_rate} onChange={e => setHeader(h => ({ ...h, tax_rate: Number(e.target.value) }))} className={field}>
                  <option value={0}>No PPN</option><option value={11}>PPN 11%</option><option value={12}>PPN 12%</option>
                </select>
              </div>
              <div>
                <label htmlFor="po-terms" className={label}>Terms (days)</label>
                <input id="po-terms" type="number" min="0" max="365" value={header.payment_terms_days} onChange={e => setHeader(h => ({ ...h, payment_terms_days: e.target.value }))} placeholder="e.g. 30" className={field} />
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className={label}>Lines</span>
              <span className="text-[10px] text-slate-400"><InlineHelp summary="Amounts are checked against the item budget" label="Line budget rule">Each line takes one approved plan item. The amount (qty × unit price, before tax) cannot exceed the item budget minus what other POs already ordered. Cancelled POs release their budget.</InlineHelp></span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[640px] table-fixed text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-900">
                  <tr><th className="w-[38%] px-3 py-2 font-semibold">Description / plan item</th><th className="w-[12%] px-2 py-2 font-semibold">Qty</th><th className="w-[20%] px-2 py-2 font-semibold">Unit price</th><th className="w-[22%] px-2 py-2 text-right font-semibold">Amount</th><th className="w-[8%] px-2 py-2" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row, idx) => (
                    <tr key={row.itemId} className={row.over ? 'bg-rose-50/60 dark:bg-rose-500/5' : ''}>
                      <td className="px-3 py-2 align-top">
                        <input aria-label={`Description line ${idx + 1}`} value={row.description} maxLength={255} onChange={e => update(idx, { description: e.target.value })} className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
                        <p className="mt-1 truncate text-[10px] text-slate-400" title={row.item?.marketing_plan?.title}>{row.item?.marketing_plan?.title} · {row.item?.m_coa?.code} · {MONTHS[(row.item?.period_month || 1) - 1]}</p>
                        <p className={`text-[10px] ${row.over ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>Available {formatIDR(row.available)}</p>
                      </td>
                      <td className="px-2 py-2 align-top"><input aria-label={`Quantity line ${idx + 1}`} type="number" min="0.01" step="any" value={row.qty} onChange={e => update(idx, { qty: e.target.value })} className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs tabular-nums outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" /></td>
                      <td className="px-2 py-2 align-top"><input aria-label={`Unit price line ${idx + 1}`} type="number" min="0" step="any" value={row.unit_price} onChange={e => update(idx, { unit_price: e.target.value })} className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs tabular-nums outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" /></td>
                      <td className={`px-2 py-2 text-right align-top font-medium tabular-nums ${row.over ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}><span className="inline-block pt-2">{formatIDR(row.amount)}</span></td>
                      <td className="px-2 py-2 text-right align-top"><button type="button" aria-label={`Remove line ${idx + 1}`} disabled={rows.length === 1} onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))} className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.some(r => r.over) && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400"><AlertTriangle className="h-3.5 w-3.5" />Lower the amount on highlighted lines; they exceed the remaining item budget.</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="po-notes" className={label}>Notes / memo</label>
              <textarea id="po-notes" rows={4} maxLength={2000} value={header.notes} onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))} placeholder="Delivery instructions, scope or reference for the vendor" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-xs dark:border-slate-800">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span className="tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(subtotal)}</span></div>
              <div className="flex justify-between text-slate-500"><span>PPN {header.tax_rate}%</span><span className="tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(tax)}</span></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-semibold dark:border-slate-800"><span>Total</span><span className="tabular-nums text-slate-900 dark:text-white">{formatIDR(subtotal + tax)}</span></div>
              <p className="flex items-start gap-1.5 pt-1 text-[10px] text-slate-400"><Info className="mt-0.5 h-3 w-3 shrink-0" />Payment requests linked to this PO can use up to the line amount plus PPN.</p>
            </div>
          </div>
          {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <button type="button" onClick={onClose} disabled={!!saving} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
          <button type="button" onClick={() => save(false)} disabled={hasProblem || !!saving} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">{saving === 'draft' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save draft</button>
          <button type="button" onClick={() => save(true)} disabled={hasProblem || !!saving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{saving === 'issue' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Save & issue</button>
        </div>
      </motion.aside>
    </>
  );
}
