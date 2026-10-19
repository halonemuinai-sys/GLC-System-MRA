'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  CreditCard, Search, RefreshCw, Loader2, AlertTriangle,
  CheckCircle, Clock, XCircle, Banknote, Eye, Trash2, X,
  FileSpreadsheet, AlertCircle, Check, ChevronLeft, ChevronRight,
  Paperclip, ShieldCheck, Hash, Hourglass
} from 'lucide-react';
import { eventNumber } from '@/lib/eventNumber';
import { apiClient } from '@/lib/apiClient';
import { getUserRoles, hasRole } from '@/lib/userRoles';

const THIS_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2].map(String);

const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const formatDate = (value, withTime = false) => value
  ? new Date(value).toLocaleString('en-GB', withTime ? { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';

const poTaxDetails = (purchaseOrder) => {
  const rate = Math.max(0, Number(purchaseOrder?.tax_rate || 0));
  const type = String(purchaseOrder?.tax_type || '').toUpperCase();
  const isPph21 = type === 'PPH21_INDIVIDUAL' || (!type && rate === 2.5);
  return {
    rate,
    isPph21,
    label: isPph21 ? `PPh 21 ${rate}%` : rate > 0 ? `PPN ${rate}%` : 'No tax',
    payableForBase: (base) => Number(base || 0) * (isPph21 ? 1 - rate / 100 : 1 + rate / 100),
  };
};

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', icon: Clock },
  OVERBUDGET_WARN: { label: 'Overbudget', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', icon: AlertCircle },
  APPROVED: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', icon: CheckCircle },
  PAID: { label: 'Paid', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400', icon: Banknote },
  REJECTED: { label: 'Rejected', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', icon: XCircle },
};
const STATUS_TABS = [['', 'All'], ['PENDING', 'Pending'], ['OVERBUDGET_WARN', 'Overbudget'], ['APPROVED', 'Ready to pay'], ['PAID', 'Paid'], ['REJECTED', 'Rejected']];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}><span className="h-1 w-1 rounded-full bg-current" />{cfg.label}</span>;
}

function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-US') }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.8, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{format(display)}</>;
}

const approvalProgress = (p) => {
  const steps = p.approval_history || [];
  const pending = steps.find(h => h.status === 'PENDING');
  return { done: steps.filter(h => h.status === 'APPROVED').length, pending };
};

function PaymentDetailModal({ payment, onClose, onChanged, userRoles }) {
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [paidNotes, setPaidNotes] = useState('');
  const [confirmPayment, setConfirmPayment] = useState(false);
  const [poNumber, setPoNumber] = useState(payment.po_number || '');
  const [poOptions, setPoOptions] = useState(null);
  const [poChoice, setPoChoice] = useState(payment.purchase_order_id ? String(payment.purchase_order_id) : '');

  const plan = payment.marketing_plan_item?.marketing_plan;
  const item = payment.marketing_plan_item;
  const isClaim = payment.request_type === 'CLAIM';
  const history = payment.approval_history || [];
  const pendingTask = history.find(h => h.status === 'PENDING');
  const partiallyApproved = history.some(h => h.status === 'APPROVED');
  const isOpen = ['PENDING', 'OVERBUDGET_WARN'].includes(payment.status);
  const canReview = isClaim && payment.status === 'PENDING' && hasRole(userRoles, 'finance') && pendingTask;
  // Reimbursements may also be deleted after Finance rejected them (their extra Others line goes too).
  const canDelete = (isOpen || (isClaim && payment.status === 'REJECTED')) && !partiallyApproved && hasRole(userRoles, 'admin', 'marketing', 'marketing_manager');
  const canMarkPaid = payment.status === 'APPROVED' && hasRole(userRoles, 'finance', 'admin');
  const canSetPo = ['APPROVED', 'PAID'].includes(payment.status) && hasRole(userRoles, 'admin', 'ga') && !isClaim;

  // Issued GA purchase orders that contain this payment's plan item.
  useEffect(() => {
    if (!canSetPo) return;
    let alive = true;
    apiClient.get(`/api/ga/marketing-po/for-item/${payment.marketing_plan_item_id}`)
      .then(list => { if (alive) setPoOptions(list || []); })
      .catch(() => { if (alive) setPoOptions([]); });
    return () => { alive = false; };
  }, [canSetPo, payment.marketing_plan_item_id]);
  const budget = Number(item?.budget_amount || 0);
  const realized = Number(item?.actual_amount || 0);
  const { rate: taxRate, isPph21, label: taxLabel } = poTaxDetails(payment.purchase_order);
  const hasPoTax = !isClaim && Boolean(payment.purchase_order_id) && taxRate > 0;
  const budgetImpact = hasPoTax
    ? Number(payment.amount || 0) / (isPph21 ? 1 - taxRate / 100 : 1 + taxRate / 100)
    : Number(payment.amount || 0);
  const taxAmount = Math.abs(Number(payment.amount || 0) - budgetImpact);
  const budgetAvailable = budget - realized;
  const canRecheckTax = isOpen && !isClaim && Boolean(payment.purchase_order_id) && taxRate > 0;
  const recipientFor = (historyItem) => historyItem.pending_recipient?.email
    || (historyItem.magic_links || []).find(link => !link.used_at)?.recipient_email
    || historyItem.magic_links?.[0]?.recipient_email
    || null;
  const recipientLabel = (historyItem) => {
    const email = recipientFor(historyItem);
    return email ? (historyItem.pending_recipient?.name ? `${historyItem.pending_recipient.name} (${email})` : email) : null;
  };

  const run = async (key, fn, message) => {
    setBusy(key);
    setActionError('');
    try {
      await fn();
      onChanged(message);
      onClose();
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const label = 'text-[10px] font-semibold uppercase tracking-wider text-slate-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }} className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${isClaim ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>{isClaim ? 'Reimbursement' : 'Payment Request'}</span>
              <StatusBadge status={payment.status} />
              {payment.finance_verified_at && <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><ShieldCheck className="h-3 w-3" />Finance verified</span>}
            </div>
            <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{payment.title}</h3>
            <p className="text-[11px] text-slate-400">#{payment.id} · {plan?.company?.name || '—'}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className={label}>Amount</p>
            <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{formatIDR(payment.amount)}</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {actionError && <p role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{actionError}</p>}

          <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950/40">
            {[
              ['Marketing Plan', plan?.title],
              ['CoA / Month', item?.m_coa ? `${item.m_coa.code} - ${item.m_coa.name} · ${new Date(2000, (item.period_month || 1) - 1, 1).toLocaleDateString('en-GB', { month: 'short' })}` : null],
              ['Requested by', payment.creator?.name],
              ['Request date', formatDate(payment.created_at)],
              ...(payment.po_number ? [['PO number', `${payment.po_number} · ${formatDate(payment.po_issued_at)}`]] : []),
              ...(payment.paid_at ? [['Paid', formatDate(payment.paid_at)]] : []),
              ...(isClaim ? [['Reimbursement payee', payment.reimbursement_payee], ['Transaction date', payment.expense_date ? new Date(payment.expense_date).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : null], ['Vendor / place', payment.expense_vendor]] : []),
            ].map(([name, value]) => (
              <div key={name}><p className={label}>{name}</p><p className="mt-0.5 text-xs text-slate-800 dark:text-slate-200">{value || '—'}</p></div>
            ))}
            {payment.notes && <div className="sm:col-span-2"><p className={label}>Notes</p><p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-300">{payment.notes}</p></div>}
            {payment.doc_url && <div className="sm:col-span-2"><a href={payment.doc_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"><Paperclip className="h-3.5 w-3.5" />View supporting document</a></div>}
          </div>

          {item && (
            <div>
              <p className={`${label} mb-2`}>Item budget</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[[hasPoTax ? 'Plan budget (net)' : 'Plan budget', budget, ''], [hasPoTax ? 'Realized (net)' : 'Realized (paid)', realized, ''], [hasPoTax ? 'Available (net)' : 'Remaining', budgetAvailable, budgetAvailable < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'], [hasPoTax ? 'This request (net)' : 'This request', budgetImpact, 'text-blue-600 dark:text-blue-400']].map(([name, value, tone]) => (
                  <div key={name} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-[10px] text-slate-400">{name}</p><p className={`mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100 ${tone}`}>{formatIDR(value)}</p></div>
                ))}
              </div>
              {hasPoTax && <div className="mt-2 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-300" /><span><strong>PO payment composition.</strong> {isPph21 ? <>Campaign cost {formatIDR(budgetImpact)} − {taxLabel} withholding {formatIDR(taxAmount)} = vendor transfer {formatIDR(payment.amount)}. The withholding reduces the vendor transfer; campaign actuals remain at the pre-tax cost.</> : <>Net {formatIDR(budgetImpact)} + {taxLabel} {formatIDR(taxAmount)} = cash payment {formatIDR(payment.amount)}. PPN is retained on the PO and does not consume the campaign plan budget.</>}</span></div>}
              {payment.status === 'OVERBUDGET_WARN' && <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /><div className="min-w-0 flex-1"><p>This request exceeds the available net budget after other open requests. It requires CFO/CEO escalation after the normal approval tier.</p>{hasPoTax && <p className="mt-1 text-rose-600/85 dark:text-rose-300/85">If this warning is caused by the tax component, recheck it using the PO tax treatment.</p>}</div>{canRecheckTax && <button type="button" disabled={!!busy} onClick={() => run('recheck-tax', () => apiClient.post(`/api/marketing/payments/${payment.id}/recheck-budget`), 'Budget rechecked using the PO tax treatment.')} className="shrink-0 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-400/30 dark:bg-slate-900 dark:text-rose-200 cursor-pointer">{busy === 'recheck-tax' ? 'Checking...' : 'Recheck tax'}</button>}</div>}
            </div>
          )}

          {history.length > 0 && (
            <div>
              <p className={`${label} mb-2`}>Approval flow</p>
              <ol className="space-y-2">
                {history.map((h, idx) => (
                  <motion.li key={h.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * idx }} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${h.status === 'APPROVED' ? 'bg-emerald-500 text-white' : h.status === 'REJECTED' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>{h.step_number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                        {h.status === 'PENDING' ? (recipientFor(h) ? `Awaiting ${isClaim ? 'Finance' : `step ${h.step_number} approval`} — ${recipientLabel(h)}` : (isClaim ? 'Awaiting Finance assignment' : `Awaiting step ${h.step_number} assignment`)) : `${h.status === 'APPROVED' ? 'Approved' : 'Rejected'} by ${h.approver?.name || '—'}`}
                      </p>
                      {h.status === 'PENDING' ? <p className="truncate text-[10px] text-slate-400">Recipient is set by Approval Settings{recipientFor(h) ? ' and has received the approval link.' : '.'}</p> : (h.comment || h.action_at) && <p className="truncate text-[10px] text-slate-400">{[h.action_at && formatDate(h.action_at, true), h.comment].filter(Boolean).join(' · ')}</p>}
                    </div>
                    {h.status === 'PENDING' ? <Hourglass className="h-3.5 w-3.5 shrink-0 animate-pulse text-amber-500" /> : h.status === 'APPROVED' ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />}
                  </motion.li>
                ))}
              </ol>
            </div>
          )}

          {canReview && (
            <div className="space-y-2 rounded-xl border border-blue-200 p-4 dark:border-blue-500/30">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Finance decision on this reimbursement</p>
              <textarea aria-label="Finance decision note" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Note (required when rejecting)" rows={2} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950" />
              <div className="flex gap-2">
                <button type="button" disabled={!!busy} onClick={() => { if (!reviewNote.trim()) { setActionError('Enter a reason for rejecting.'); return; } run('reject', () => apiClient.post(`/api/marketing/approvals/${pendingTask.id}`, { action: 'REJECT', comment: reviewNote }), 'Reimbursement rejected.'); }} className="h-9 flex-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10 cursor-pointer">Reject</button>
                <button type="button" disabled={!!busy} onClick={() => run('approve', () => apiClient.post(`/api/marketing/approvals/${pendingTask.id}`, { action: 'APPROVE', comment: reviewNote }), 'Reimbursement approved. Awaiting payment.')} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{busy === 'approve' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Approve</button>
              </div>
            </div>
          )}

          {canSetPo && (
            <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200"><Hash className="h-3.5 w-3.5" />PO number</p>
              {poOptions === null ? <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><Loader2 className="h-3 w-3 animate-spin" />Looking for purchase orders...</p> : poOptions.length > 0 && (
                <div className="flex gap-2">
                  <select aria-label="Purchase order" value={poChoice} onChange={e => setPoChoice(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950">
                    <option value="">Select an issued PO for this item</option>
                    {poOptions.map(po => <option key={po.id} value={po.id}>{po.po_number} · {po.vendor?.vendor_name} · {formatIDR(poTaxDetails(po).payableForBase(po.lines.reduce((sum, l) => sum + Number(l.amount), 0)))}</option>)}
                  </select>
                  <button type="button" disabled={!!busy || !poChoice || poChoice === String(payment.purchase_order_id || '')} onClick={() => run('po-link', () => apiClient.post(`/api/marketing/payments/${payment.id}/set-po`, { purchase_order_id: Number(poChoice) }), 'Payment linked to the purchase order.')} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 cursor-pointer">{busy === 'po-link' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Link</button>
                </div>
              )}
              {poOptions?.length === 0 && <p className="text-[11px] text-slate-400">No issued GA purchase order contains this item yet. Create one in GA → Marketing POs, or enter an existing PO number below.</p>}
              <div className="flex gap-2">
                <input value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="e.g. PO/MKT/2026/0012" className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-950" />
                <button type="button" disabled={!!busy || !poNumber.trim() || poNumber.trim() === payment.po_number} onClick={() => run('po', () => apiClient.post(`/api/marketing/payments/${payment.id}/set-po`, { po_number: poNumber }), 'PO number saved.')} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900 cursor-pointer">{busy === 'po' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save</button>
              </div>
            </div>
          )}

          {canMarkPaid && (
            <div className="space-y-2 rounded-xl border border-emerald-200 p-4 dark:border-emerald-500/30">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><Banknote className="h-3.5 w-3.5" />Record payment</p>
              <textarea value={paidNotes} onChange={e => setPaidNotes(e.target.value)} placeholder="Payment note (optional), e.g. transfer reference" rows={2} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-700 dark:bg-slate-950" />
              <button type="button" disabled={!!busy} onClick={() => setConfirmPayment(true)} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"><Check className="h-3.5 w-3.5" />Confirm payment</button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          {canDelete ? (
            <button type="button" disabled={!!busy} onClick={() => { if (confirm('Delete this request? This cannot be undone.')) run('delete', () => apiClient.delete(`/api/marketing/payments/${payment.id}`), 'Request deleted.'); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10 cursor-pointer">
              {busy === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}Delete
            </button>
          ) : <span className="text-[10px] text-slate-400">{isOpen && partiallyApproved ? 'Partially approved — it can no longer be deleted.' : ''}</span>}
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Close</button>
        </div>

        <AnimatePresence>
          {confirmPayment && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ type: 'spring', stiffness: 360, damping: 28 }} role="dialog" aria-modal="true" aria-labelledby="confirm-payment-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle className="h-5 w-5" /></span>
                    <div><p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">Finance confirmation</p><h4 id="confirm-payment-title" className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">Confirm vendor payment?</h4></div>
                  </div>
                  <button type="button" onClick={() => setConfirmPayment(false)} disabled={busy === 'paid'} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer" aria-label="Close confirmation"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4 px-5 py-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/40"><p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{payment.title}</p><p className="mt-1 text-[10px] text-slate-400">{payment.po_number || 'No PO'} · {plan?.company?.name || '—'}</p></div>
                  <div className={`grid gap-2 ${hasPoTax ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-[10px] text-slate-400">Cash transfer</p><p className="mt-1 text-xs font-semibold tabular-nums text-slate-900 dark:text-white">{formatIDR(payment.amount)}</p></div>
                    {hasPoTax && <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10"><p className="text-[10px] text-amber-700 dark:text-amber-300">{taxLabel}{isPph21 ? ' withheld' : ''}</p><p className="mt-1 text-xs font-semibold tabular-nums text-amber-800 dark:text-amber-200">{formatIDR(taxAmount)}</p></div>}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10"><p className="text-[10px] text-emerald-700 dark:text-emerald-300">Campaign actuals</p><p className="mt-1 text-xs font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">{formatIDR(budgetImpact)}</p></div>
                  </div>
                  <p className="flex items-start gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-[11px] leading-relaxed text-blue-800 dark:bg-blue-500/10 dark:text-blue-200"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />You are recording the transfer as Finance. This marks the request as paid and updates campaign actuals {hasPoTax ? (isPph21 ? 'at the pre-withholding campaign cost.' : 'using its net amount before PPN.') : '.'}</p>
                </div>
                <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/30">
                  <button type="button" onClick={() => setConfirmPayment(false)} disabled={busy === 'paid'} className="h-9 flex-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 cursor-pointer">Review again</button>
                  <button type="button" disabled={busy === 'paid'} onClick={() => { setConfirmPayment(false); run('paid', () => apiClient.post(`/api/marketing/payments/${payment.id}/mark-paid`, { paid_notes: paidNotes }), 'Payment recorded as PAID.'); }} className="inline-flex h-9 flex-[1.35] items-center justify-center gap-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">{busy === 'paid' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Confirm as paid</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default function MarketingPaymentsPage() {
  const userRoles = useMemo(() => getUserRoles(), []);

  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  // Process-first: nothing is fetched until Load data; later filter changes reload automatically.
  const [processed, setProcessed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [status, setStatus] = useState('');
  const [requestType, setRequestType] = useState('');
  const [fiscalYear, setFiscalYear] = useState(String(THIS_YEAR));
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Debounced server-side search.
  useEffect(() => {
    const handle = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const baseParams = useMemo(() => ({ request_type: requestType || undefined, fiscal_year: fiscalYear || undefined, search: search || undefined }), [requestType, fiscalYear, search]);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/api/marketing/payments', { params: { ...baseParams, status: status || undefined, page, limit: pageSize } });
      setPayments(res?.data || []);
      setMeta({ total: res?.total || 0, totalPages: res?.totalPages || 1 });
      setSummary(res?.summary || {});
    } catch (err) {
      setError(err.message || 'Failed to load payment requests.');
    } finally {
      setLoading(false);
    }
  }, [baseParams, status, page, pageSize]);

  useEffect(() => {
    if (!processed) return;
    loadPayments();
  }, [processed, loadPayments]);

  const onChanged = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
    loadPayments();
  };

  const sum = (keys, field) => keys.reduce((s, k) => s + (summary[k]?.[field] || 0), 0);
  const allKeys = Object.keys(STATUS_CONFIG);
  const kpis = [
    { label: 'Total requests', value: sum(allKeys, 'count'), sub: formatIDR(sum(allKeys, 'amount')), icon: CreditCard, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Awaiting approval', value: sum(['PENDING', 'OVERBUDGET_WARN'], 'count'), sub: `${formatIDR(sum(['PENDING', 'OVERBUDGET_WARN'], 'amount'))} · ${summary.OVERBUDGET_WARN?.count || 0} overbudget`, icon: Clock, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Ready to pay', value: summary.APPROVED?.count || 0, sub: formatIDR(summary.APPROVED?.amount || 0), icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { label: 'Paid', value: summary.PAID?.count || 0, sub: formatIDR(summary.PAID?.amount || 0), icon: Banknote, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  ];

  // Export every matching row, not only the current page.
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const all = [];
      for (let p = 1; p <= 50; p += 1) {
        const res = await apiClient.get('/api/marketing/payments', { params: { ...baseParams, status: status || undefined, page: p, limit: 200 } });
        all.push(...(res?.data || []));
        if (p >= (res?.totalPages || 1)) break;
      }
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Payment Requests');
      ws.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'ID', key: 'id', width: 7 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Title', key: 'title', width: 32 },
        { header: 'Company', key: 'company', width: 26 },
        { header: 'Marketing Plan', key: 'plan', width: 30 },
        { header: 'CoA', key: 'coa', width: 26 },
        { header: 'Amount (Rp)', key: 'amount', width: 16 },
        { header: 'Status', key: 'status', width: 13 },
        { header: 'PO number', key: 'po', width: 18 },
        { header: 'Finance verified', key: 'verified', width: 18 },
        { header: 'Created by', key: 'creator', width: 20 },
        { header: 'Date', key: 'date', width: 13 },
        { header: 'Paid', key: 'paid', width: 13 },
      ];
      ws.getRow(1).eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; });
      all.forEach((p, i) => ws.addRow({
        no: i + 1,
        id: p.id,
        type: p.request_type === 'CLAIM' ? 'Reimbursement' : 'Payment',
        title: p.title,
        company: p.marketing_plan_item?.marketing_plan?.company?.name || '-',
        plan: p.marketing_plan_item?.marketing_plan?.title || '-',
        coa: p.marketing_plan_item?.m_coa ? `${p.marketing_plan_item.m_coa.code} - ${p.marketing_plan_item.m_coa.name}` : '-',
        amount: Number(p.amount),
        status: STATUS_CONFIG[p.status]?.label || p.status,
        po: p.po_number || '-',
        verified: p.finance_verified_at ? new Date(p.finance_verified_at).toLocaleDateString('en-GB') : '-',
        creator: p.creator?.name || '-',
        date: new Date(p.created_at).toLocaleDateString('en-GB'),
        paid: p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-GB') : '-',
      }));
      ws.getColumn('amount').numFmt = '#,##0';
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const buf = await wb.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-requests-${fiscalYear}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
  const rangeStart = meta.total ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, meta.total);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><CreditCard className="h-4 w-4" />Marketing finance</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Payment Requests</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Campaign payment and reimbursement requests: from approval and PO number to recorded payment.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={handleExportExcel} disabled={exporting || !processed || !meta.total} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50 cursor-pointer">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}Export Excel
            </button>
            <button type="button" aria-label={processed ? 'Reload' : 'Load data'} title={processed ? 'Reload' : 'Load data'} onClick={() => (processed ? loadPayments() : setProcessed(true))} disabled={loading} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-white transition-colors hover:bg-white/10 disabled:opacity-60 cursor-pointer">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI */}
      {processed && (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, sub, icon: Icon, tone }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100"><CountUp value={value} /></p>
              <p className="truncate text-[10px] text-slate-400">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>
      )}

      <AnimatePresence>
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle className="h-4 w-4" />{successMsg}
          </motion.div>
        )}
      </AnimatePresence>
      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{error}</div>}

      {/* List */}
      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><CreditCard className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load payment requests</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Pick the request type and fiscal year, then click Load data. Search and status filters apply instantly afterwards.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <select aria-label="Request type" value={requestType} onChange={e => setRequestType(e.target.value)} className={fieldClass}>
              <option value="">All types</option>
              <option value="PAYMENT">Payment Request</option>
              <option value="CLAIM">Reimbursement</option>
            </select>
            <select aria-label="Fiscal year" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className={fieldClass}>
              {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}
            </select>
            <button type="button" onClick={() => setProcessed(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Load data</button>
          </div>
        </motion.div>
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search requests" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search title, event no. (EVT-…), plan, company, creator or PO..." className={`${fieldClass} w-full bg-slate-50 pl-9 pr-9 dark:bg-slate-950`} />
              {searchInput && <button type="button" aria-label="Clear search" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <select aria-label="Request type" value={requestType} onChange={e => { setRequestType(e.target.value); setPage(1); }} className={fieldClass}>
              <option value="">All types</option>
              <option value="PAYMENT">Payment Request</option>
              <option value="CLAIM">Reimbursement</option>
            </select>
            <select aria-label="Fiscal year" value={fiscalYear} onChange={e => { setFiscalYear(e.target.value); setPage(1); }} className={fieldClass}>
              {FISCAL_YEAR_OPTIONS.map(y => <option key={y} value={y}>FY {y}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map(([key, text]) => {
              const count = key ? summary[key]?.count || 0 : sum(allKeys, 'count');
              const active = status === key;
              return (
                <button key={key || 'all'} type="button" aria-pressed={active} onClick={() => { setStatus(key); setPage(1); }} className={`relative rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${active ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                  {active && <motion.span layoutId="payment-status-tab" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                  <span className="relative">{text} <span className={active ? 'opacity-70' : 'text-slate-400'}>{count}</span></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading && !payments.length ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Loading requests...</div>
          ) : (
            <table className={`w-full min-w-[980px] table-fixed text-left text-xs transition-opacity ${loading ? 'opacity-60' : ''}`}>
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="w-[28%] px-4 py-2.5 font-semibold">Request</th>
                  <th className="w-[16%] px-3 py-2.5 font-semibold">Company</th>
                  <th className="w-[13%] px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="w-[13%] px-3 py-2.5 font-semibold">Status</th>
                  <th className="w-[13%] px-3 py-2.5 font-semibold">Approval</th>
                  <th className="w-[11%] px-3 py-2.5 font-semibold">Requested</th>
                  <th className="w-[6%] px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {!payments.length && <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400"><CreditCard className="mx-auto mb-2 h-8 w-8 opacity-30" />{search || status || requestType ? 'No requests match the filters.' : `No payment requests in FY ${fiscalYear} yet.`}</td></tr>}
                <AnimatePresence initial={false}>
                  {payments.map((p, i) => {
                    const plan = p.marketing_plan_item?.marketing_plan;
                    const { done, pending } = approvalProgress(p);
                    const totalSteps = (p.approval_history || []).length;
                    return (
                      <motion.tr key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.025, duration: 0.2 }} onClick={() => setSelectedPayment(p)} className="cursor-pointer transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {p.request_type === 'CLAIM' && <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Reimburse</span>}
                            <p title={p.title} className="truncate font-medium text-slate-800 dark:text-slate-200">{p.title}</p>
                          </div>
                          <p title={plan?.title || ''} className="truncate text-[10px] text-slate-400"><span className="font-mono">{eventNumber(plan)}</span> · {plan?.title || '—'}</p>
                        </td>
                        <td title={plan?.company?.name || ''} className="truncate px-3 py-2.5 text-slate-500 dark:text-slate-400">{plan?.company?.name || '—'}</td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(p.amount)}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={p.status} />
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.po_number && <span title={`PO ${p.po_number}`} className="truncate rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">PO</span>}
                            {p.finance_verified_at && <span title="Finance verified" className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">Verified</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {totalSteps ? (
                            <>
                              <div className="flex items-center gap-0.5">
                                {(p.approval_history || []).map(h => <span key={h.id} className={`h-1.5 w-4 rounded-full ${h.status === 'APPROVED' ? 'bg-emerald-500' : h.status === 'REJECTED' ? 'bg-rose-500' : 'animate-pulse bg-amber-400'}`} />)}
                              </div>
                              <p className="mt-1 text-[10px] text-slate-400">{pending ? `Step ${pending.step_number} in progress` : `${done}/${totalSteps} approved`}</p>
                            </>
                          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <p className="truncate text-slate-600 dark:text-slate-300">{p.creator?.name || '—'}</p>
                          <p className="text-[10px] tabular-nums text-slate-400">{formatDate(p.created_at)}</p>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button type="button" title="View details" onClick={e => { e.stopPropagation(); setSelectedPayment(p); }} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Eye className="h-4 w-4" /></button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
          <label className="flex items-center gap-2">Rows per page
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">{meta.total ? `${rangeStart}–${rangeEnd}` : '0'} of {meta.total}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-10 text-center tabular-nums">{page} / {meta.totalPages}</span>
              <button type="button" aria-label="Next page" disabled={page >= meta.totalPages} onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
      )}

      <AnimatePresence>
        {selectedPayment && <PaymentDetailModal key={selectedPayment.id} payment={selectedPayment} onClose={() => setSelectedPayment(null)} onChanged={onChanged} userRoles={userRoles} />}
      </AnimatePresence>
    </div>
  );
}
