'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitMerge, Plus, Trash2, Loader2, Send, Check, X, AlertTriangle, Flag } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { hasRole } from '@/lib/userRoles';
import InlineHelp from '@/components/ui/InlineHelp';

const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ACTIONS = { CHANGE_BUDGET: 'Change budget', CHANGE_VENDOR: 'Change vendor', ADD_ITEM: 'Add item', REMOVE_ITEM: 'Remove item' };
const STATUS = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  APPROVED: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  REJECTED: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
};
const base = 'h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900';
const field = `${base} w-full`;
const isActiveVendor = v => !v.status || ['active', 'aktif'].includes(String(v.status).toLowerCase());

// What is already used on an item: budget cannot go below this.
function itemFloor(item) {
  const ordered = (item.purchase_orders || []).reduce((s, po) => s + Number(po.line_amount || 0), 0);
  const used = (item.payment_requests || []).filter(pr => pr.status !== 'REJECTED').reduce((s, pr) => s + Number(pr.amount || 0), 0);
  return Math.max(ordered, used);
}
const emptyChange = (action = 'CHANGE_BUDGET', itemId = '') => ({ action, plan_item_id: itemId ? String(itemId) : '', new_budget: '', new_vendor_id: '', change_reason: '', new_item: { coa_id: '', period_month: '', brand_id: '', lob_id: '', vendor_id: '', description: '', budget_amount: '' } });

// Amendments of an approved plan, managed from the Budget Breakdown. `preset` opens the form
// with one change ready ({ action, itemId, nonce }).
export default function MarketingAmendmentPanel({ plan, metadata = {}, userRoles = [], preset, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [justification, setJustification] = useState('');
  const [changes, setChanges] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const formRef = useRef(null);

  const items = useMemo(() => plan?.items || [], [plan]);
  const vendors = (metadata.vendors || []).filter(isActiveVendor);
  const brands = (metadata.brands || []).filter(b => !b.company_id || b.company_id === plan?.company_id);
  const canPropose = plan?.status === 'APPROVED' && !['PENDING_APPROVAL', 'APPROVED'].includes(plan?.closing_status) && hasRole(userRoles, 'admin', 'marketing', 'marketing_manager');
  const canReview = hasRole(userRoles, 'admin', 'manager', 'marketing_manager', 'finance');

  useEffect(() => {
    if (!preset?.nonce || !canPropose) return;
    setShowForm(true);
    setError(null);
    setChanges(prev => [...prev, emptyChange(preset.action, preset.itemId)]);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset?.nonce]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 4000); };
  const update = (idx, patch) => setChanges(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const updateNew = (idx, patch) => setChanges(prev => prev.map((c, i) => (i === idx ? { ...c, new_item: { ...c.new_item, ...patch } } : c)));
  const reset = () => { setShowForm(false); setTitle(''); setJustification(''); setChanges([]); setError(null); };

  // Client-side check mirrors the server so problems show before saving.
  const problems = changes.map(c => {
    const item = items.find(i => String(i.id) === String(c.plan_item_id));
    if (c.action !== 'ADD_ITEM' && !item) return 'Select the item.';
    if (c.action === 'CHANGE_BUDGET') {
      const value = Number(c.new_budget);
      if (c.new_budget === '' || !Number.isFinite(value) || value < 0) return 'Enter the new budget.';
      if (value === Number(item.budget_amount)) return 'The new budget equals the current one.';
      if (value < itemFloor(item)) return `Cannot go below ${formatIDR(itemFloor(item))} (already ordered or requested).`;
    }
    if (c.action === 'CHANGE_VENDOR') {
      if (!c.new_vendor_id) return 'Select the new vendor.';
      if ((item.purchase_orders || []).length) return 'This item already has a GA PO; ask GA to cancel it first.';
    }
    if (c.action === 'REMOVE_ITEM' && ((item.purchase_orders || []).length || (item.payment_requests || []).length)) return 'Items with a PO or payment request cannot be removed; reduce the budget instead.';
    if (c.action === 'ADD_ITEM') {
      const n = c.new_item;
      if (!n.coa_id || !n.period_month || !(Number(n.budget_amount) > 0)) return 'A new item needs a cost account, month and budget.';
    }
    return null;
  });
  const duplicateItem = changes.some((c, i) => c.plan_item_id && changes.findIndex(x => x.plan_item_id === c.plan_item_id) !== i);
  const canSave = title.trim() && justification.trim() && changes.length > 0 && problems.every(p => !p) && !duplicateItem;

  const save = async () => {
    if (!canSave || busy) return;
    setBusy('save');
    setError(null);
    try {
      await apiClient.post(`/api/marketing/plans/${plan.id}/amendments`, {
        title: title.trim(),
        justification: justification.trim(),
        changes: changes.map(c => {
          const item = items.find(i => String(i.id) === String(c.plan_item_id));
          if (c.action === 'ADD_ITEM') return { action: 'ADD_ITEM', change_reason: c.change_reason, new_item: { ...c.new_item, budget_amount: Number(c.new_item.budget_amount), unit_price: Number(c.new_item.budget_amount), qty: 1 } };
          if (c.action === 'CHANGE_BUDGET') return { action: c.action, plan_item_id: Number(c.plan_item_id), budget_delta: Number(c.new_budget) - Number(item.budget_amount), change_reason: c.change_reason };
          return { action: c.action, plan_item_id: Number(c.plan_item_id), new_vendor_id: c.new_vendor_id ? Number(c.new_vendor_id) : null, change_reason: c.change_reason };
        }),
      });
      reset();
      flash('Amendment saved as draft. Submit it for review when ready.');
      onChanged();
    } catch (err) {
      setError(err.message || 'Failed to save the amendment.');
    } finally {
      setBusy(null);
    }
  };

  const act = async (key, fn, message) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      flash(message);
      onChanged();
    } catch (err) {
      if (err?.data?.code === 'OVERBUDGET' || /above Budget Control/.test(err.message || '')) {
        if (window.confirm(`${err.message}\n\nApprove anyway?`)) {
          try { await fn(true); flash(message); onChanged(); } catch (e2) { setError(e2.message || 'Action failed.'); }
        }
      } else {
        setError(err.message || 'Action failed.');
      }
    } finally {
      setBusy(null);
    }
  };

  const describe = (ci) => {
    const item = items.find(i => i.id === ci.plan_item_id);
    const label = item ? (item.description || item.m_coa?.name) : `item #${ci.plan_item_id}`;
    if (ci.action === 'CHANGE_BUDGET') return `${label}: ${Number(ci.budget_delta) > 0 ? '+' : ''}${formatIDR(ci.budget_delta)}`;
    if (ci.action === 'CHANGE_VENDOR') return `${label}: vendor → ${(metadata.vendors || []).find(v => v.id === ci.new_vendor_id)?.vendor_name || `#${ci.new_vendor_id}`}`;
    if (ci.action === 'REMOVE_ITEM') return `Remove ${label}`;
    try { const n = JSON.parse(ci.new_item_json || '{}'); return `Add ${n.description || (metadata.coas || []).find(c => String(c.id) === String(n.coa_id))?.name || 'item'} · ${MONTHS[(n.period_month || 1) - 1]} · ${formatIDR(n.budget_amount)}`; } catch { return 'Add item'; }
  };

  const amendments = plan?.amendments || [];

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Plan changes (amendments)</h4>
          <span className="text-[11px] text-slate-400"><InlineHelp label="What amendments are for">Change an approved plan without re-approving the whole campaign: change a budget or vendor, add or remove a cost line. A reviewer (Marketing Manager, Finance, manager or admin — not the requester) approves it, then the plan is updated. Budgets cannot go below what is already ordered on a GA PO or requested, and increases are checked against Budget Control.</InlineHelp></span>
        </div>
        {canPropose && !showForm && <button type="button" onClick={() => { setShowForm(true); setChanges([emptyChange()]); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10 cursor-pointer"><Plus className="h-3.5 w-3.5" />Propose change</button>}
      </div>

      <AnimatePresence>{notice && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</motion.p>}</AnimatePresence>
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}

      {amendments.length > 0 && (
        <ul className="space-y-2">
          {amendments.map(am => (
            <li key={am.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{am.title}</p>
                  <p className="text-[10px] text-slate-400">{am.creator?.name} · {new Date(am.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[am.status] || STATUS.DRAFT}`}>{am.status.replace('_', ' ')}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{am.justification}</p>
              <ul className="mt-1.5 space-y-0.5">{(am.change_items || []).map(ci => <li key={ci.id} className="text-[11px] text-slate-700 dark:text-slate-300">• <span className="font-medium">{ACTIONS[ci.action]}</span> — {describe(ci)}{ci.change_reason ? <span className="text-slate-400"> ({ci.change_reason})</span> : null}</li>)}</ul>
              {am.review_comment && <p className="mt-1 text-[11px] italic text-slate-500">“{am.review_comment}”</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {am.status === 'DRAFT' && canPropose && <>
                  <button type="button" disabled={!!busy} onClick={() => act(`s${am.id}`, () => apiClient.post(`/api/marketing/amendments/${am.id}/submit`), 'Amendment submitted for review.')} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{busy === `s${am.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}Submit for review</button>
                  <button type="button" disabled={!!busy} onClick={() => window.confirm('Delete this draft amendment?') && act(`d${am.id}`, () => apiClient.delete(`/api/marketing/amendments/${am.id}`), 'Draft amendment deleted.')} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 cursor-pointer"><Trash2 className="h-3 w-3" />Delete</button>
                </>}
                {am.status === 'PENDING_REVIEW' && canReview && <>
                  <button type="button" disabled={!!busy} onClick={() => act(`a${am.id}`, (ack) => apiClient.post(`/api/marketing/amendments/${am.id}/review`, { action: 'APPROVE', review_comment: null, acknowledge_overbudget: ack === true }), 'Amendment approved; the plan is updated.')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">{busy === `a${am.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Approve</button>
                  <button type="button" disabled={!!busy} onClick={() => { const reason = window.prompt('Reason for rejecting this amendment:'); if (reason && reason.trim()) act(`r${am.id}`, () => apiClient.post(`/api/marketing/amendments/${am.id}/review`, { action: 'REJECT', review_comment: reason.trim() }), 'Amendment rejected.'); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 cursor-pointer"><X className="h-3 w-3" />Reject</button>
                </>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {!amendments.length && !showForm && <p className="text-center text-[11px] text-slate-400">No changes proposed yet. Use “Change” on a cost line or “Propose change”.</p>}

      {showForm && (
        <div ref={formRef} className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/30 p-3 dark:border-amber-500/30 dark:bg-amber-500/5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Title *<input value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="e.g. Add digital ads, increase venue budget" className={`${field} mt-1 normal-case tracking-normal`} /></label>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Justification *<input value={justification} onChange={e => setJustification(e.target.value)} placeholder="Why the plan must change" className={`${field} mt-1 normal-case tracking-normal`} /></label>
          </div>
          {changes.map((c, idx) => {
            const item = items.find(i => String(i.id) === String(c.plan_item_id));
            return (
              <div key={idx} className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex gap-2">
                  <select aria-label={`Change ${idx + 1} type`} value={c.action} onChange={e => update(idx, { action: e.target.value })} className={`${base} w-40 shrink-0 font-semibold`}>{Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  {c.action !== 'ADD_ITEM' && (
                    <select aria-label={`Change ${idx + 1} item`} value={c.plan_item_id} onChange={e => update(idx, { plan_item_id: e.target.value })} className={`${base} min-w-0 flex-1`}>
                      <option value="">Select item</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.description || i.m_coa?.name} · {MONTHS[(i.period_month || 1) - 1].slice(0, 3)} · {formatIDR(i.budget_amount)}</option>)}
                    </select>
                  )}
                  <button type="button" aria-label={`Remove change ${idx + 1}`} onClick={() => setChanges(prev => prev.filter((_, i) => i !== idx))} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                {c.action === 'CHANGE_BUDGET' && item && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span>Current {formatIDR(item.budget_amount)} →</span>
                    <input aria-label="New budget" inputMode="numeric" value={c.new_budget ? Number(c.new_budget).toLocaleString('id-ID') : ''} onChange={e => update(idx, { new_budget: e.target.value.replace(/\D/g, '') })} placeholder="New budget" className={`${base} w-40 text-right`} />
                    {c.new_budget !== '' && <span className={Number(c.new_budget) > Number(item.budget_amount) ? 'text-amber-600' : 'text-emerald-600'}>{Number(c.new_budget) > Number(item.budget_amount) ? '+' : ''}{formatIDR(Number(c.new_budget) - Number(item.budget_amount))}</span>}
                    {itemFloor(item) > 0 && <span className="text-slate-400">min {formatIDR(itemFloor(item))}</span>}
                  </div>
                )}
                {c.action === 'CHANGE_VENDOR' && item && (
                  <select aria-label="New vendor" value={c.new_vendor_id} onChange={e => update(idx, { new_vendor_id: e.target.value })} className={field}>
                    <option value="">New vendor (current: {item.vendors?.vendor_name || 'none'})</option>
                    {vendors.filter(v => v.id !== item.vendor_id).map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
                  </select>
                )}
                {c.action === 'ADD_ITEM' && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <select aria-label="Cost account" value={c.new_item.coa_id} onChange={e => updateNew(idx, { coa_id: e.target.value })} className={field}><option value="">Cost account *</option>{(metadata.coas || []).map(co => <option key={co.id} value={co.id}>{co.code ? `${co.code} - ` : ''}{co.name}</option>)}</select>
                    <select aria-label="Month" value={c.new_item.period_month} onChange={e => updateNew(idx, { period_month: e.target.value })} className={field}><option value="">Month *</option>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
                    <input aria-label="Budget" inputMode="numeric" value={c.new_item.budget_amount ? Number(c.new_item.budget_amount).toLocaleString('id-ID') : ''} onChange={e => updateNew(idx, { budget_amount: e.target.value.replace(/\D/g, '') })} placeholder="Budget (Rp) *" className={`${field} text-right`} />
                    <select aria-label="Brand" value={c.new_item.brand_id} onChange={e => updateNew(idx, { brand_id: e.target.value })} className={field}><option value="">Brand</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                    <select aria-label="Line of business" value={c.new_item.lob_id} onChange={e => updateNew(idx, { lob_id: e.target.value })} className={field}><option value="">Line of business</option>{(metadata.lobs || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
                    <select aria-label="Vendor" value={c.new_item.vendor_id} onChange={e => updateNew(idx, { vendor_id: e.target.value })} className={field}><option value="">Vendor (optional)</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}</select>
                    <input aria-label="Description" value={c.new_item.description} maxLength={255} onChange={e => updateNew(idx, { description: e.target.value })} placeholder="Description" className={`${field} col-span-2 sm:col-span-3`} />
                  </div>
                )}
                <input aria-label="Reason for this change" value={c.change_reason} onChange={e => update(idx, { change_reason: e.target.value })} placeholder="Reason for this change (optional)" className={field} />
                {problems[idx] && <p className="text-[10px] text-rose-600 dark:text-rose-400">{problems[idx]}</p>}
              </div>
            );
          })}
          {duplicateItem && <p className="text-[11px] text-rose-600">The same item appears twice; combine the changes.</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" onClick={() => setChanges(prev => [...prev, emptyChange()])} className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-300 cursor-pointer"><Plus className="h-3 w-3" />Add another change</button>
            <div className="flex gap-2">
              <button type="button" onClick={reset} className="h-8 rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer">Cancel</button>
              <button type="button" disabled={!canSave || !!busy} onClick={save} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer">{busy === 'save' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Flag className="h-3 w-3" />}Save draft</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
