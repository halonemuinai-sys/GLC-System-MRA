'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Hourglass, Copy, Check, CircleDollarSign, Receipt, ClipboardCheck, Banknote } from 'lucide-react';

const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const fmt = (v) => (v ? new Date(v).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');

const TONE = {
  APPROVED: 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
  PAID: 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
  PENDING: 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10',
  REJECTED: 'border-rose-500 bg-rose-50 text-rose-600 dark:bg-rose-500/10',
  WAITING: 'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-900',
};
const STATUS_PILL = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  OVERBUDGET_WARN: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
  APPROVED: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
  PAID: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  REJECTED: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  DRAFT: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
};

function CopyLink({ path }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const url = `${window.location.origin}${path}`;
    try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this approval link:', url); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={copy} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold cursor-pointer ${copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copied ? 'Copied' : 'Copy approval link'}
    </button>
  );
}

// One vertical step list: each step = who, role, status, when, comment, and a link while pending.
function Steps({ steps }) {
  return (
    <ol className="relative ml-3 space-y-3 border-l-2 border-slate-200 pl-5 dark:border-slate-700">
      {steps.map((st, i) => {
        const Icon = ['APPROVED', 'PAID'].includes(st.status) ? CheckCircle2 : st.status === 'REJECTED' ? XCircle : st.status === 'PENDING' ? Clock : Hourglass;
        return (
          <li key={st.key || i} className="relative">
            <span className={`absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${TONE[st.status] || TONE.WAITING}`}><Icon className="h-3 w-3" /></span>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-100">{st.title}{st.role && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-500 dark:bg-slate-800 dark:text-slate-400">{st.role}</span>}</p>
                <p className="text-[10px] text-slate-400">{st.subtitle}</p>
                {st.comment && <p className="mt-1 text-[11px] italic text-slate-600 dark:text-slate-300">“{st.comment}”</p>}
              </div>
              {st.link && <CopyLink path={st.link} />}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function paymentSteps(pr) {
  const isClaim = pr.request_type === 'CLAIM';
  const history = pr.approval_history || [];
  const steps = history.map(h => ({
    key: h.id,
    status: h.status,
    title: h.status === 'PENDING' ? `Step ${h.step_number} · waiting for ${isClaim ? 'Finance' : 'approver'}` : `Step ${h.step_number} · ${h.status === 'APPROVED' ? 'approved' : 'rejected'} by ${h.approver?.name || '—'}`,
    role: h.approver?.position || (isClaim ? 'Finance' : null),
    subtitle: h.status === 'PENDING' ? [h.magic_links?.[0]?.recipient_email && `Sent to ${h.magic_links[0].recipient_email}`, `since ${fmt(h.created_at)}`].filter(Boolean).join(' · ') : fmt(h.action_at),
    comment: h.comment,
    link: h.status === 'PENDING' && h.magic_links?.[0]?.token ? `/approve/${h.magic_links[0].token}` : null,
  }));
  // Last step: Finance confirms the transfer. GA is responsible for the PO only.
  if (pr.status !== 'REJECTED') {
    const payer = 'Finance';
    steps.push({
      key: 'paid',
      status: pr.status === 'PAID' ? 'PAID' : pr.status === 'APPROVED' ? 'PENDING' : 'WAITING',
      title: pr.status === 'PAID' ? `Paid — confirmed by ${payer}` : `Payment by ${payer}`,
      subtitle: pr.status === 'PAID' ? fmt(pr.paid_at) : pr.status === 'APPROVED' ? `Approved; waiting for ${payer} to confirm the transfer in Payment Requests` : 'After all approvals',
    });
  }
  return steps;
}

// "All approvals" ledger for a plan: payment requests, reimbursements and the closing.
export default function MarketingPlanApprovalLedger({ plan }) {
  const payments = (plan?.items || []).flatMap(item => (item.payment_requests || []).map(pr => ({ ...pr, itemLabel: item.description?.replace(/^Reimbursement: /, '') || item.m_coa?.name })))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const closing = plan?.closing_approval;
  const waiting = payments.filter(pr => ['PENDING', 'OVERBUDGET_WARN'].includes(pr.status)).length + (closing?.status === 'PENDING_APPROVAL' ? 1 : 0);
  const toPay = payments.filter(pr => pr.status === 'APPROVED').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Payments, reimbursements & closing</h4>
          <p className="text-[11px] text-slate-400">Every approval after the campaign was approved, newest first.</p>
        </div>
        <div className="flex gap-1.5 text-[10px] font-medium">
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{waiting} waiting for approval</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">{toPay} approved, not paid</span>
        </div>
      </div>

      {!payments.length && !closing && <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-700">No payment request, reimbursement or closing yet.</p>}

      {payments.map((pr, i) => {
        const isClaim = pr.request_type === 'CLAIM';
        return (
          <motion.div key={pr.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isClaim ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10'}`}>{isClaim ? <Receipt className="h-4 w-4" /> : <CircleDollarSign className="h-4 w-4" />}</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{pr.title}</p>
                  <p className="text-[10px] text-slate-400">{isClaim ? 'Reimbursement' : 'Payment request'} #{pr.id} · {pr.itemLabel}{pr.po_number ? ` · ${pr.po_number}` : ''} · by {pr.creator?.name || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(pr.amount)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[pr.status] || STATUS_PILL.DRAFT}`}>{pr.status === 'OVERBUDGET_WARN' ? 'OVERBUDGET' : pr.status}</span>
              </div>
            </div>
            <Steps steps={paymentSteps(pr)} />
          </motion.div>
        );
      })}

      {closing && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><ClipboardCheck className="h-4 w-4" /></span>
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Campaign closing</p>
                <p className="text-[10px] text-slate-400">{closing.status === 'DRAFT' || !closing.submitted_at ? 'Draft, not submitted yet' : `Submitted ${fmt(closing.submitted_at)}${closing.submitted_by ? ` by ${closing.submitted_by}` : ''}`}</p>
              </div>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[closing.status] || STATUS_PILL.DRAFT}`}>{closing.status.replace('_', ' ')}</span>
          </div>
          {closing.approvers?.length ? (
            <Steps steps={closing.approvers.map(a => ({
              key: a.step_number,
              status: a.status,
              title: `${a.role_label}: ${a.signer?.name || '—'}`,
              role: a.signer?.position,
              subtitle: a.status === 'PENDING' ? `Waiting · ${a.signer?.email || ''}` : a.status === 'WAITING' ? 'Waiting for the previous step' : fmt(a.action_at),
              comment: a.comment,
              link: a.status === 'PENDING' && closing.magic_link_token ? `/approve-closing/${closing.magic_link_token}` : null,
            }))} />
          ) : <p className="text-[11px] text-slate-400">Approvers are chosen when the closing is submitted.</p>}
          {closing.rejection_reason && closing.status === 'REJECTED' && <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-400">Rejected: {closing.rejection_reason}</p>}
        </div>
      )}

      <p className="flex items-start gap-1.5 text-[10px] text-slate-400"><Banknote className="mt-0.5 h-3 w-3 shrink-0" />GA issues the PO. Finance confirms the transfer; only then is a vendor payment or reimbursement counted as realized.</p>
    </div>
  );
}
