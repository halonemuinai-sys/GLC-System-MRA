'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Clock, ShoppingCart, CircleDollarSign, ExternalLink, Hourglass, CloudUpload, Info } from 'lucide-react';
import InlineHelp from '@/components/ui/InlineHelp';

const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Items created by a reimbursement claim are paid by Finance without a PO.
export const isReimbursementItem = item => String(item?.description || '').startsWith('Reimbursement: ');

// Where an item stands between "plan approved" and "paid".
export function poSummary(item) {
  const pos = item?.purchase_orders || [];
  const issued = pos.filter(po => po.status === 'ISSUED');
  const vendorPayments = (item?.payment_requests || []).filter(pr => pr.request_type !== 'CLAIM' && pr.status !== 'REJECTED');
  return {
    pos,
    issued,
    drafts: pos.filter(po => po.status === 'DRAFT'),
    available: issued.reduce((sum, po) => sum + Number(po.available || 0), 0),
    requested: vendorPayments.length > 0,
    approved: vendorPayments.some(pr => ['APPROVED', 'PAID'].includes(pr.status)),
    paid: vendorPayments.some(pr => pr.status === 'PAID'),
    fullyPaid: vendorPayments.length > 0 && vendorPayments.every(pr => pr.status === 'PAID'),
    inNetsuite: pos.some(po => ['EXPORTED', 'SYNCED'].includes(po.netsuite_status)),
  };
}

// Action cell of the cost table: payment can only be requested against an issued GA PO.
export function PoActionCell({ item, planStatus, canRequest, onRequest }) {
  if (planStatus === 'COMPLETED') return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><Check className="h-3 w-3" />Done</span>;
  if (planStatus !== 'APPROVED') return <span className="text-xs text-slate-400">—</span>;
  if (isReimbursementItem(item)) return <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">Reimbursement · no PO</span>;
  const s = poSummary(item);
  if (s.issued.length && s.available > 0) {
    return (
      <div className="flex flex-col items-end gap-1">
        {canRequest && <button type="button" onClick={() => onRequest(item)} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 cursor-pointer whitespace-nowrap"><CircleDollarSign className="h-3.5 w-3.5" />Request payment</button>}
        <span className="text-[10px] text-slate-400 whitespace-nowrap" title={s.issued.map(po => po.po_number).join(', ')}>{s.issued[0].po_number}{s.issued.length > 1 ? ` +${s.issued.length - 1}` : ''} · {formatIDR(s.available)} left</span>
      </div>
    );
  }
  const closed = s.pos.filter(po => po.status === 'CLOSED');
  if (!s.issued.length && closed.length) return <span title={`${closed.map(po => po.po_number).join(', ')} is closed. Ask GA to reopen it to request payment.`} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 whitespace-nowrap"><Hourglass className="h-3 w-3" />{s.fullyPaid ? 'PO paid & closed' : 'PO closed by GA'}</span>;
  if (s.issued.length) return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 whitespace-nowrap">{s.fullyPaid ? 'PO paid' : 'PO fully requested'}</span>;
  if (s.drafts.length) return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 whitespace-nowrap"><Hourglass className="h-3 w-3" />PO draft at GA</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400 whitespace-nowrap"><Clock className="h-3 w-3" />Waiting for GA PO</span>;
}

const STAGES = [
  { key: 'po', label: 'GA PO issued', icon: ShoppingCart },
  { key: 'netsuite', label: 'In NetSuite', icon: CloudUpload },
  { key: 'requested', label: 'Payment requested', icon: CircleDollarSign },
  { key: 'approved', label: 'Payment approved', icon: Check },
  { key: 'paid', label: 'Paid', icon: Check },
];

function stageState(item) {
  const s = poSummary(item);
  return {
    po: s.issued.length || s.pos.some(po => po.status === 'CLOSED') ? 'done' : s.drafts.length ? 'partial' : 'todo',
    netsuite: s.inNetsuite ? 'done' : 'todo',
    requested: s.requested ? 'done' : 'todo',
    approved: s.approved ? 'done' : 'todo',
    paid: s.fullyPaid ? 'done' : s.paid ? 'partial' : 'todo',
  };
}

// "Purchase Orders" tab of the plan detail: how far each item is from PO to payment.
export default function PlanPoTracker({ plan }) {
  const items = (plan?.items || []).filter(item => !isReimbursementItem(item));
  const claims = (plan?.items || []).filter(isReimbursementItem);
  const allPos = [...new Map(items.flatMap(item => (item.purchase_orders || []).map(po => [po.id, po]))).values()];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white"><ShoppingCart className="h-4 w-4 text-blue-600" />GA purchase orders</h4>
          <p className="mt-0.5 text-[11px] text-slate-400">GA issues the PO, Marketing requests payment against it, then Finance confirms the transfer.</p>
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400"><InlineHelp summary="When is an item “Paid”?" label="Payment flow">
          1) GA creates and issues a PO for the item (Keuangan GA → Marketing POs). 2) Marketing requests payment against that PO. 3) The approvers approve the request. 4) Finance verifies the transfer and clicks Confirm payment in Payment Requests — only then it is PAID and counted as realized spend. Reimbursements skip the PO and are also paid by Finance.
        </InlineHelp></span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-950/40">
              <tr><th className="px-4 py-2.5 font-semibold">Item</th><th className="px-3 py-2.5 font-semibold">PO</th><th className="px-3 py-2.5 font-semibold">Progress</th><th className="px-3 py-2.5 text-right font-semibold">Requested / paid</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {!items.length && <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">No vendor items in this plan.</td></tr>}
              {items.map((item, i) => {
                const st = stageState(item);
                const s = poSummary(item);
                const requested = (item.payment_requests || []).filter(pr => pr.request_type !== 'CLAIM' && pr.status !== 'REJECTED').reduce((sum, pr) => sum + Number(pr.amount), 0);
                const paid = (item.payment_requests || []).filter(pr => pr.request_type !== 'CLAIM' && pr.status === 'PAID').reduce((sum, pr) => sum + Number(pr.amount), 0);
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{item.description || item.m_coa?.name}</p>
                      <p className="text-[10px] text-slate-400">{item.m_coa?.code} · {MONTHS[(item.period_month || 1) - 1]} · {formatIDR(item.budget_amount)}{item.vendors ? ` · ${item.vendors.vendor_name}` : ''}</p>
                    </td>
                    <td className="px-3 py-3">
                      {s.pos.length ? s.pos.map(po => (
                        <p key={po.id} className="whitespace-nowrap text-[11px]"><span className="font-mono font-medium text-slate-700 dark:text-slate-200">{po.po_number}</span> <span className={`ml-1 rounded px-1.5 py-0.5 text-[9px] font-semibold ${po.status === 'ISSUED' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' : po.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>{po.status}</span><span className="block text-[10px] text-slate-400">{po.vendor?.vendor_name} · {formatIDR(po.line_total)}{po.netsuite_ref ? ` · NS ${po.netsuite_ref}` : ''}</span></p>
                      )) : <span className="text-[11px] text-slate-400">Not ordered yet</span>}
                    </td>
                    <td className="px-3 py-3">
                      <ol className="flex flex-wrap items-center gap-1">
                        {STAGES.map(({ key, label, icon: Icon }, idx) => (
                          <li key={key} className="flex items-center gap-1">
                            {idx > 0 && <span aria-hidden="true" className={`h-px w-3 ${st[key] === 'done' ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                            <span title={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st[key] === 'done' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : st[key] === 'partial' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}><Icon className="h-3 w-3" />{label}</span>
                          </li>
                        ))}
                      </ol>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums"><p className="text-slate-700 dark:text-slate-200">{formatIDR(requested)}</p><p className="text-[10px] text-emerald-600 dark:text-emerald-400">{formatIDR(paid)} paid</p></td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {allPos.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allPos.map(po => (
            <Link key={po.id} href={`/dashboard/ga/marketing-po?po=${po.id}`} className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900">
              <span className="min-w-0"><span className="block font-mono font-semibold text-slate-800 dark:text-slate-100">{po.po_number}</span><span className="block truncate text-[10px] text-slate-400">{po.vendor?.vendor_name} · {po.status} · NetSuite {po.netsuite_status === 'SYNCED' ? po.netsuite_ref : po.netsuite_status.replace('_', ' ').toLowerCase()}</span></span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-blue-600" />
            </Link>
          ))}
        </div>
      )}

      {claims.length > 0 && <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-[11px] text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{claims.length} reimbursement item{claims.length === 1 ? '' : 's'} on this plan {claims.length === 1 ? 'does' : 'do'} not need a PO; Finance pays them directly.</p>}
    </div>
  );
}
