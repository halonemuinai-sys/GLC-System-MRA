'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, AlertTriangle, Send, Edit3, Trash2, Ban, CheckCircle2, Link2, FileSpreadsheet, Building2, CalendarDays, Hash } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';
import { MONTHS, formatIDR } from './GaMarketingPoForm';

export const PO_STATUS = {
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  ISSUED: { label: 'Issued', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  CLOSED: { label: 'Closed', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
};
export const NS_STATUS = {
  NOT_SENT: { label: 'Not sent', cls: 'text-slate-400' },
  EXPORTED: { label: 'Exported', cls: 'text-amber-600 dark:text-amber-400' },
  SYNCED: { label: 'In NetSuite', cls: 'text-emerald-600 dark:text-emerald-400' },
};
export const formatDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');

const taxLabel = po => po.tax_type === 'PPH21_INDIVIDUAL' ? 'PPh 21 individual 2.5%' : po.tax_type === 'PPN_12' ? 'PPN 12%' : po.tax_type === 'PPN_11' ? 'PPN 11%' : Number(po.tax_rate) === 12 ? 'PPN 12%' : Number(po.tax_rate) === 11 ? 'PPN 11%' : Number(po.tax_rate) === 2.5 ? 'PPh 21 individual 2.5%' : 'No tax';
const isWithholdingTax = po => po.tax_type === 'PPH21_INDIVIDUAL' || (!po.tax_type && Number(po.tax_rate) === 2.5);

export function StatusPill({ status }) {
  const cfg = PO_STATUS[status] || PO_STATUS.DRAFT;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}><span className="h-1 w-1 rounded-full bg-current" />{cfg.label}</span>;
}

export default function GaMarketingPoDetail({ po, canWrite, onClose, onEdit, onChanged, onExport }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [showCloseReview, setShowCloseReview] = useState(false);
  const [showReopenReview, setShowReopenReview] = useState(false);
  const [closeAcknowledged, setCloseAcknowledged] = useState(false);
  const [nsRef, setNsRef] = useState(po.netsuite_ref || '');

  const run = async (key, fn, message) => {
    setBusy(key);
    setError(null);
    try {
      const updated = await fn();
      setShowCloseReview(false);
      setShowReopenReview(false);
      setCloseAcknowledged(false);
      onChanged(updated, message);
    } catch (err) {
      setError(err.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const activePayments = (po.payment_requests || []).filter(p => p.status !== 'REJECTED');
  const paidTotal = (po.payment_requests || []).filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0);
  const unresolvedPayments = (po.payment_requests || []).filter(p => !['PAID', 'REJECTED'].includes(p.status));
  const outstandingBalance = Math.max(0, Number(po.total || 0) - paidTotal);
  const closeReady = po.status === 'ISSUED' && unresolvedPayments.length === 0 && outstandingBalance <= 0.01;
  const closeBlocker = unresolvedPayments.length
    ? `${unresolvedPayments.length} payment request${unresolvedPayments.length === 1 ? '' : 's'} still need a final decision.`
    : outstandingBalance > 0.01
      ? `${formatIDR(outstandingBalance)} is still unpaid.`
      : '';
  const label = 'text-[10px] font-semibold uppercase tracking-wider text-slate-400';

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><StatusPill status={po.status} /><span className={`text-[10px] font-medium ${NS_STATUS[po.netsuite_status]?.cls}`}>NetSuite: {NS_STATUS[po.netsuite_status]?.label}{po.netsuite_ref ? ` · ${po.netsuite_ref}` : ''}</span></div>
            <h3 className="mt-1.5 font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">{po.po_number}</h3>
            <p className="truncate text-[11px] text-slate-400">{po.vendor?.vendor_name} · {po.company?.name}</p>
          </div>
          <div className="flex shrink-0 items-start gap-3">
            <div className="text-right"><p className={label}>Total</p><p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{formatIDR(po.total)}</p></div>
            <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
          {po.status === 'CANCELLED' && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">Cancelled {formatDate(po.cancelled_at)} by {po.cancelled_by || '—'}: {po.cancel_reason}</div>}

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900/40">
            {[
              [CalendarDays, 'Order date', formatDate(po.order_date)],
              [CalendarDays, 'Delivery date', formatDate(po.delivery_date)],
              [Hash, 'Terms', po.payment_terms_days != null ? `Net ${po.payment_terms_days}` : '—'],
              [Hash, 'Price entry', po.tax_inclusive ? `Includes ${taxLabel(po)}` : 'Excludes tax'],
              [Building2, 'Vendor code', po.vendor?.vendor_code || 'Missing'],
              [Building2, 'NPWP', po.vendor?.npwp || '—'],
              [CheckCircle2, 'Issued', po.issued_at ? `${formatDate(po.issued_at)} · ${po.issued_by || ''}` : '—'],
            ].map(([Icon, name, value]) => (
              <div key={name} className="min-w-0"><p className={`flex items-center gap-1 ${label}`}><Icon className="h-3 w-3" />{name}</p><p className={`mt-0.5 truncate text-xs ${value === 'Missing' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>{value}</p></div>
            ))}
            {po.notes && <div className="col-span-2 sm:col-span-3"><p className={label}>Notes</p><p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">{po.notes}</p></div>}
          </div>

          <div>
            <p className={`${label} mb-2`}>Lines</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-900"><tr><th className="px-3 py-2 font-semibold">Item</th><th className="px-3 py-2 text-right font-semibold">Qty</th><th className="px-3 py-2 text-right font-semibold">Unit price</th><th className="px-3 py-2 text-right font-semibold">Amount</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {po.lines.map(line => {
                    const item = line.marketing_plan_item;
                    return (
                      <tr key={line.id}>
                        <td className="px-3 py-2"><p className="font-medium text-slate-800 dark:text-slate-200">{line.description}</p><p className="text-[10px] text-slate-400">{item?.marketing_plan?.title} · {item?.m_coa?.code} {item?.m_coa?.name} · {MONTHS[(item?.period_month || 1) - 1]}{item?.m_brand ? ` · ${item.m_brand.name}` : ''}</p></td>
                        <td className="px-3 py-2 text-right tabular-nums">{Number(line.qty).toLocaleString('en-US')}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatIDR(line.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(line.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 text-xs dark:border-slate-700">
                  <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">Subtotal</td><td className="px-3 py-1.5 text-right tabular-nums">{formatIDR(po.subtotal)}</td></tr>
                  <tr><td colSpan={3} className="px-3 py-1.5 text-right text-slate-500">{taxLabel(po)}</td><td className="px-3 py-1.5 text-right tabular-nums">{isWithholdingTax(po) ? `− ${formatIDR(po.tax_amount)}` : formatIDR(po.tax_amount)}</td></tr>
                  <tr><td colSpan={3} className="px-3 py-2 text-right font-semibold">{isWithholdingTax(po) ? 'Vendor payable' : 'Vendor payable (incl. PPN)'}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{formatIDR(po.total)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between"><p className={label}>Payment requests</p><span className="text-[10px] text-slate-400">Paid {formatIDR(paidTotal)} of {formatIDR(po.total)}</span></div>
            {po.payment_requests?.length ? (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-xs dark:divide-slate-800 dark:border-slate-800">
                {po.payment_requests.map(p => <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2"><span className="min-w-0 truncate text-slate-700 dark:text-slate-300">#{p.id} · {p.title}</span><span className="shrink-0 tabular-nums text-slate-500">{formatIDR(p.amount)} · {p.status}</span></li>)}
              </ul>
            ) : <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-400 dark:border-slate-700">No payment request is linked yet. GA links them from Payment Requests → PO number.</p>}
          </div>

          {['ISSUED', 'CLOSED'].includes(po.status) && (
            <div className={`rounded-xl border p-3.5 ${po.status === 'CLOSED' || closeReady ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-amber-200 bg-amber-50/60 dark:border-amber-500/20 dark:bg-amber-500/10'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-xs font-semibold ${po.status === 'CLOSED' || closeReady ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>{po.status === 'CLOSED' ? 'PO closed' : closeReady ? 'Ready to close' : 'Closing check'}</p>
                  <p className={`mt-0.5 text-[11px] leading-relaxed ${po.status === 'CLOSED' || closeReady ? 'text-emerald-700/80 dark:text-emerald-300/80' : 'text-amber-700/80 dark:text-amber-300/80'}`}>
                    {po.status === 'CLOSED' ? 'This PO is settled and closed. Reopen it only to correct an early closure or to allow another payment request.' : closeReady ? 'All linked payment requests are settled and paid requests cover the full PO total.' : closeBlocker || 'A payment must be recorded before this PO can be closed.'}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold tabular-nums ${po.status === 'CLOSED' || closeReady ? 'bg-white/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-white/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'}`}>{formatIDR(Math.max(0, outstandingBalance))} left</span>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">NetSuite mapping</p>
              <InlineHelp summary="How this PO maps to NetSuite" label="NetSuite fields">Export issued POs as a file for the NetSuite PO import. Vendor uses the vendor code, Subsidiary uses the company, each line uses the CoA code as the expense account, brand as Department and LOB as Class. After the PO exists in NetSuite, record its number here.</InlineHelp>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
              {[['Vendor', po.vendor?.vendor_code || '—'], ['Subsidiary', po.company?.name || '—'], ['Account', [...new Set(po.lines.map(l => l.marketing_plan_item?.m_coa?.code).filter(Boolean))].join(', ') || '—'], ['Department', [...new Set(po.lines.map(l => l.marketing_plan_item?.m_brand?.name).filter(Boolean))].join(', ') || '—']].map(([k, v]) => (
                <div key={k} className="min-w-0 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-900"><p className="text-[10px] text-slate-400">{k}</p><p className="truncate font-medium text-slate-700 dark:text-slate-200" title={v}>{v}</p></div>
              ))}
            </div>
            {canWrite && ['ISSUED', 'CLOSED'].includes(po.status) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onExport([po.id])} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"><FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />Export for NetSuite</button>
                <input aria-label="NetSuite PO number" value={nsRef} onChange={e => setNsRef(e.target.value)} maxLength={60} placeholder="NetSuite PO number" className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
                <button type="button" disabled={!nsRef.trim() || nsRef.trim() === po.netsuite_ref || !!busy} onClick={() => run('ns', () => apiClient.put(`/api/ga/marketing-po/${po.id}/netsuite`, { netsuite_ref: nsRef }), 'NetSuite number saved.')} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900 cursor-pointer">{busy === 'ns' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}Save</button>
              </div>
            )}
          </div>

          {showCancel && (
            <div className="space-y-2 rounded-xl border border-rose-200 p-4 dark:border-rose-500/30">
              <label htmlFor="po-cancel-reason" className="text-xs font-semibold text-rose-700 dark:text-rose-300">Reason for cancelling</label>
              <textarea id="po-cancel-reason" rows={2} value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="e.g. vendor replaced, event postponed" className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-900" />
              <p className="text-[10px] text-slate-400">Cancelling releases the ordered amount back to the plan items.{po.netsuite_status !== 'NOT_SENT' ? ' This PO was already sent to NetSuite; cancel it there too.' : ''}</p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCancel(false)} className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300 cursor-pointer">Back</button>
                <button type="button" disabled={!cancelReason.trim() || !!busy} onClick={() => run('cancel', () => apiClient.post(`/api/ga/marketing-po/${po.id}/cancel`, { reason: cancelReason }), `${po.po_number} cancelled.`)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer">{busy === 'cancel' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Cancel PO</button>
              </div>
            </div>
          )}

          {showCloseReview && po.status === 'ISSUED' && (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div>
                <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">Confirm PO closure</p>
                <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80 dark:text-emerald-200/80">Closing locks this PO from new payment requests. The server checks the latest payment data again when you confirm.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-emerald-950/30"><p className="text-[10px] text-slate-400">PO total</p><p className="mt-0.5 font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(po.total)}</p></div>
                <div className="rounded-lg bg-white/80 px-3 py-2 dark:bg-emerald-950/30"><p className="text-[10px] text-slate-400">Paid</p><p className="mt-0.5 font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatIDR(paidTotal)}</p></div>
              </div>
              {!closeReady && <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300">Cannot close yet: {closeBlocker || 'payment settlement is incomplete.'}</p>}
              <label className="flex cursor-pointer items-start gap-2 text-[11px] text-slate-700 dark:text-slate-200"><input type="checkbox" checked={closeAcknowledged} onChange={event => setCloseAcknowledged(event.target.checked)} disabled={!closeReady} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 accent-emerald-600" /><span>I have reviewed the final payment status and confirm this vendor PO is settled.</span></label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowCloseReview(false); setCloseAcknowledged(false); }} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 cursor-pointer">Back</button>
                <button type="button" disabled={!closeReady || !closeAcknowledged || !!busy} onClick={() => run('close', () => apiClient.post(`/api/ga/marketing-po/${po.id}/close`), `${po.po_number} closed.`)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer">{busy === 'close' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Confirm close</button>
              </div>
            </div>
          )}

          {showReopenReview && po.status === 'CLOSED' && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
              <div><p className="text-xs font-semibold text-amber-900 dark:text-amber-100">Reopen for correction</p><p className="mt-1 text-[11px] leading-relaxed text-amber-800/80 dark:text-amber-200/80">Use this only if the PO was closed too early or another payment must be recorded. The PO returns to Issued, then must pass the closing check again.</p></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowReopenReview(false)} className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 cursor-pointer">Keep closed</button><button type="button" disabled={!!busy} onClick={() => run('reopen', () => apiClient.post(`/api/ga/marketing-po/${po.id}/reopen`), `${po.po_number} reopened for correction.`)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50 cursor-pointer">{busy === 'reopen' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Reopen PO</button></div>
            </div>
          )}
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
            <div className="flex gap-2">
              {po.status === 'DRAFT' && <button type="button" disabled={!!busy} onClick={() => { if (confirm(`Delete draft ${po.po_number}?`)) run('delete', async () => { await apiClient.delete(`/api/ga/marketing-po/${po.id}`); return null; }, `${po.po_number} deleted.`); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10 cursor-pointer"><Trash2 className="h-3.5 w-3.5" />Delete</button>}
              {['DRAFT', 'ISSUED'].includes(po.status) && !showCancel && <span title={activePayments.length ? 'Payment requests still use this PO' : ''}><button type="button" disabled={!!busy || activePayments.length > 0} onClick={() => setShowCancel(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"><Ban className="h-3.5 w-3.5" />Cancel PO</button></span>}
            </div>
            <div className="flex gap-2">
              {po.status === 'DRAFT' && <button type="button" disabled={!!busy} onClick={onEdit} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"><Edit3 className="h-3.5 w-3.5" />Edit</button>}
              {po.status === 'DRAFT' && <button type="button" disabled={!!busy} onClick={() => run('issue', () => apiClient.post(`/api/ga/marketing-po/${po.id}/issue`), `${po.po_number} issued.`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{busy === 'issue' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}Issue PO</button>}
              {po.status === 'CLOSED' && <button type="button" disabled={!!busy} onClick={() => setShowReopenReview(true)} title="Reopen a prematurely closed PO before recording another payment" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 px-4 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10 cursor-pointer"><Send className="h-3.5 w-3.5" />Reopen to correct</button>}
              {po.status === 'ISSUED' && <span title={closeReady ? 'Review the final settlement before closing.' : closeBlocker || 'A payment must be recorded before this PO can be closed.'}><button type="button" disabled={!!busy || !closeReady} onClick={() => { setShowCloseReview(true); setCloseAcknowledged(false); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"><CheckCircle2 className="h-3.5 w-3.5" />Close PO</button></span>}
            </div>
          </div>
        )}
      </motion.aside>
    </>
  );
}
