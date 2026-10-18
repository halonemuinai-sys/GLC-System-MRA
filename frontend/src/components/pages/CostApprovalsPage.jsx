'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Loader2,
  Paperclip,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Search,
  CircleDot,
  UserCheck
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val));
};
const formatDate = (value, withTime = false) => value
  ? new Date(value).toLocaleDateString('en-GB', withTime ? { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
  : '—';
const ROLE_LABELS = { MARKETING_MANAGER: 'Marketing Manager', FINANCE_CONTROLLER: 'Finance Controller', VP_DIRECTOR: 'VP Director', BU_DIRECTOR: 'BU Director', CFO_CEO: 'CFO / CEO', FINANCE: 'Finance' };

// Normalize a pending task into one flat row for filtering and display.
function toRow(task) {
  const isPlan = !!task.marketing_plan_id;
  const pr = task.payment_request;
  const plan = isPlan ? task.marketing_plan : pr?.marketing_plan_item?.marketing_plan;
  const type = isPlan ? 'Marketing Plan' : pr?.request_type === 'CLAIM' ? 'Claim' : 'Payment Request';
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(task.created_at).getTime()) / 86400000));
  return {
    task,
    id: task.id,
    isPlan,
    type,
    title: isPlan ? task.marketing_plan?.title : pr?.title,
    creator: isPlan ? task.marketing_plan?.creator?.name : pr?.creator?.name,
    company: plan?.company?.name || '—',
    amount: Number(isPlan ? task.marketing_plan?.total_budget : pr?.amount) || 0,
    overbudget: !isPlan && pr?.status === 'OVERBUDGET_WARN',
    late: isPlan && !!task.marketing_plan?.is_late_submission,
    step: task.step_number,
    createdAt: task.created_at,
    ageDays,
  };
}

const TYPE_BADGE = {
  'Marketing Plan': 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  'Payment Request': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  Claim: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
};
const ageTone = (days) => days > 7 ? 'text-rose-600 dark:text-rose-400' : days > 3 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400';

export default function CostApprovalsPage() {
  const [tasks, setTasks] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(false);
  // Process-first: the queue is fetched only after Load data.
  const [processed, setProcessed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [activeTask, setActiveTask] = useState(null);
  const [comment, setComment] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskRes, historyRes] = await Promise.all([
        apiClient.get('/api/marketing/tasks'),
        apiClient.get('/api/marketing/history').catch(() => []),
      ]);
      setTasks(taskRes || []);
      setHistoryList(historyRes || []);
    } catch (err) {
      setError(err.message || 'Failed to load approval tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (processed) loadAll(); }, [processed, loadAll]);

  const pendingRows = useMemo(() => tasks.map(toRow), [tasks]);
  const historyRows = useMemo(() => historyList.map(h => ({ ...h, company: h.companyName || '—', creator: h.creatorName })), [historyList]);
  const showApprover = historyRows.some(h => !h.mine);

  const kpis = useMemo(() => ({
    pendingCount: pendingRows.length,
    totalPendingValue: pendingRows.reduce((sum, r) => sum + r.amount, 0),
    overbudgetCount: pendingRows.filter(r => r.overbudget).length,
    staleCount: pendingRows.filter(r => r.ageDays > 3).length,
    approvedCount: historyRows.filter(h => h.action === 'APPROVED').length,
    rejectedCount: historyRows.filter(h => h.action === 'REJECTED').length,
  }), [pendingRows, historyRows]);

  const sourceRows = activeTab === 'pending' ? pendingRows : historyRows;
  const companies = useMemo(() => [...new Set(sourceRows.map(r => r.company).filter(c => c && c !== '—'))].sort(), [sourceRows]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sourceRows.filter(r =>
      (!typeFilter || r.type === typeFilter) &&
      (!companyFilter || r.company === companyFilter) &&
      (!q || [r.title, r.creator, r.company, r.comment].some(v => String(v || '').toLowerCase().includes(q)))
    );
  }, [sourceRows, search, typeFilter, companyFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  const switchTab = (tab) => { setActiveTab(tab); setPage(1); setCompanyFilter(''); };
  const openTask = (task) => { setActiveTask(task); setComment(''); setModalError(null); };
  const closeTask = () => { if (!submitting) setActiveTask(null); };

  const handleDecision = async (action) => {
    if (submitting || !activeTask) return;
    if (action === 'REJECT' && !comment.trim()) {
      setModalError('A reason is required to reject.');
      return;
    }
    if (action === 'APPROVE' && !confirm('Approve this request?')) return;
    setSubmitting(true);
    setModalError(null);
    try {
      const res = await apiClient.post(`/api/marketing/approvals/${activeTask.id}`, { action, comment: comment.trim() || null });
      setSuccessMsg(res.message || (action === 'APPROVE' ? 'Request approved.' : 'Request rejected.'));
      setActiveTask(null);
      setComment('');
      loadAll();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setModalError(err.message || 'Failed to process the decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = 'h-9 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
  const summaryCards = [
    { label: 'Pending tasks', value: kpis.pendingCount, hint: kpis.staleCount ? `${kpis.staleCount} waiting > 3 days` : 'All recent', icon: Clock, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Pending value', value: formatIDR(kpis.totalPendingValue), hint: 'Total value awaiting a decision', icon: DollarSign, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { label: 'Overbudget', value: kpis.overbudgetCount, hint: 'Exceeds the remaining CoA budget', icon: TrendingDown, tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' },
    { label: 'Approved (history)', value: kpis.approvedCount, hint: `${kpis.rejectedCount} rejected`, icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <div aria-hidden="true" className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-white/[0.03]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><BadgeCheck className="h-4 w-4" />Approval management</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Cost & Budget Approvals</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Authorize marketing plans, payment requests and claims assigned to you in the approval chain.</p>
          </div>
          <button type="button" onClick={() => (processed ? loadAll() : setProcessed(true))} disabled={loading} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60 cursor-pointer">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />{processed ? 'Reload' : 'Load data'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {processed && (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map(({ label, value, hint, icon: Icon, tone }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
              <p className="truncate text-[10px] text-slate-400">{hint}</p>
            </div>
          </div>
        ))}
      </div>
      )}

      {successMsg && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4" />{successMsg}
        </motion.div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4" />{error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 text-xs w-fit dark:border-slate-700 dark:bg-slate-900">
        {[['pending', processed ? `Awaiting decision (${pendingRows.length})` : 'Awaiting decision', Clock], ['history', processed ? `History (${historyRows.length})` : 'History', Check]].map(([key, label, Icon]) => (
          <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => switchTab(key)} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer ${activeTab === key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}><Icon className="h-3.5 w-3.5" />{label}</button>
        ))}
      </div>

      {/* List */}
      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><BadgeCheck className="h-5 w-5" /></motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load your approval queue</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Click Load data to fetch the plans, payment requests and claims waiting for your decision, plus your decision history.</p>
          <button type="button" onClick={() => setProcessed(true)} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Load data</button>
        </motion.div>
      ) : (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="relative min-w-48 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search requests" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search title, requester, company or comment..." className={`${fieldClass} w-full pl-9 pr-9`} />
            {search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select aria-label="Document type" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={`${fieldClass} bg-white px-3 dark:bg-slate-900`}>
            <option value="">All documents</option>
            <option value="Marketing Plan">Marketing Plan</option>
            <option value="Payment Request">Payment Request</option>
            <option value="Claim">Claim</option>
          </select>
          <select aria-label="Company" value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setPage(1); }} className={`${fieldClass} max-w-56 bg-white px-3 dark:bg-slate-900`}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <span aria-live="polite" className="text-[11px] text-slate-400">{filtered.length} {filtered.length === 1 ? 'document' : 'documents'}</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Loading approval queue...</div>
          ) : activeTab === 'pending' ? (
            <table className="w-full min-w-[900px] table-fixed text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="w-[15%] px-4 py-2.5 font-semibold">Document</th>
                  <th className="w-[26%] px-3 py-2.5 font-semibold">Request</th>
                  <th className="w-[17%] px-3 py-2.5 font-semibold">Company</th>
                  <th className="w-[14%] px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="w-[11%] px-3 py-2.5 font-semibold">Status</th>
                  <th className="w-[9%] px-3 py-2.5 font-semibold">Waiting</th>
                  <th className="w-[8%] px-3 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {!rows.length && (
                  <tr><td colSpan={7} className="px-4 py-14 text-center text-slate-400">
                    {pendingRows.length ? 'No requests match the filters.' : <span className="inline-flex flex-col items-center gap-2"><CheckCircle className="h-8 w-8 text-emerald-500/80" />Nothing is waiting for your decision.</span>}
                  </td></tr>
                )}
                {rows.map(row => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[row.type]}`}>{row.type}</span>
                      <p className="mt-1 text-[10px] text-slate-400">Step {row.step}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p title={row.title} className="truncate font-medium text-slate-800 dark:text-slate-200">{row.title || '—'}</p>
                      <p className="truncate text-[10px] text-slate-400">By {row.creator || 'N/A'} · {formatDate(row.createdAt)}</p>
                    </td>
                    <td title={row.company} className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{row.company}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(row.amount)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {row.overbudget ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><span className="h-1 w-1 rounded-full bg-current" />Overbudget</span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><span className="h-1 w-1 rounded-full bg-current" />Normal</span>}
                        {row.late && <span title="Submitted less than 3 days before the month (H-3)" className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">Late</span>}
                      </div>
                    </td>
                    <td className={`px-3 py-2 font-medium tabular-nums ${ageTone(row.ageDays)}`}>{row.ageDays === 0 ? 'Today' : `${row.ageDays} ${row.ageDays === 1 ? 'day' : 'days'}`}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button type="button" onClick={() => openTask(row.task)} className="inline-flex h-8 items-center rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white transition-colors hover:bg-blue-700 cursor-pointer">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[960px] table-fixed text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="w-[14%] px-4 py-2.5 font-semibold">Document</th>
                  <th className="w-[24%] px-3 py-2.5 font-semibold">Request</th>
                  <th className="w-[15%] px-3 py-2.5 font-semibold">Company</th>
                  <th className="w-[13%] px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="w-[10%] px-3 py-2.5 font-semibold">Decision</th>
                  <th className={`${showApprover ? 'w-[12%]' : 'w-[0%] hidden'} px-3 py-2.5 font-semibold`}>Approver</th>
                  <th className="px-3 py-2.5 font-semibold">Comment</th>
                  <th className="w-[11%] px-3 py-2.5 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {!rows.length && <tr><td colSpan={8} className="px-4 py-14 text-center text-slate-400">{historyRows.length ? 'No history matches the filters.' : 'No approval decisions yet.'}</td></tr>}
                {rows.map(hist => (
                  <tr key={hist.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[hist.type] || TYPE_BADGE['Payment Request']}`}>{hist.type}</span>
                      {hist.step && <p className="mt-1 text-[10px] text-slate-400">Step {hist.step}</p>}
                    </td>
                    <td className="px-3 py-2">
                      <p title={hist.title} className="truncate font-medium text-slate-800 dark:text-slate-200">{hist.title || '—'}</p>
                      <p className="truncate text-[10px] text-slate-400">By {hist.creator || 'N/A'}</p>
                    </td>
                    <td title={hist.company} className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{hist.company}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(hist.amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${hist.action === 'REJECTED' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}><span className="h-1 w-1 rounded-full bg-current" />{hist.action === 'REJECTED' ? 'Rejected' : 'Approved'}</span>
                    </td>
                    <td title={hist.approverName || ''} className={`${showApprover ? '' : 'hidden'} truncate px-3 py-2 text-slate-500 dark:text-slate-400`}>{hist.mine ? 'You' : hist.approverName || '—'}</td>
                    <td title={hist.comment || ''} className="truncate px-3 py-2 text-slate-500 dark:text-slate-400">{hist.comment || '—'}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-400">{formatDate(hist.date, true)}</td>
                  </tr>
                ))}
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
            <span className="tabular-nums">{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)}` : '0'} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-10 text-center tabular-nums">{currentPage} / {totalPages}</span>
              <button type="button" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Decision modal */}
      <AnimatePresence>
        {activeTask && <DecisionModal task={activeTask} comment={comment} setComment={setComment} error={modalError} submitting={submitting} onClose={closeTask} onDecision={handleDecision} />}
      </AnimatePresence>
    </div>
  );
}

const LABEL_CLASS = 'text-[10px] font-semibold uppercase tracking-wider text-slate-400';
function Field({ name, children, wide }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className={LABEL_CLASS}>{name}</p>
      <div className="mt-0.5 text-xs text-slate-800 dark:text-slate-200">{children || '—'}</div>
    </div>
  );
}

function DecisionModal({ task, comment, setComment, error, submitting, onClose, onDecision }) {
  const row = toRow(task);
  const plan = task.marketing_plan;
  const pr = task.payment_request;
  const item = pr?.marketing_plan_item;
  const budget = Number(item?.budget_amount || 0);
  const realized = Number(item?.actual_amount || 0);
  const remaining = budget - realized;
  const afterApproval = remaining - row.amount;
  const chain = plan?.approvers || [];
  const waiting = task.waiting_for;
  const label = LABEL_CLASS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }} className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[row.type]}`}>{row.type}</span>
              <span className="text-[10px] text-slate-400">Step {row.step}{waiting?.role ? ` · ${ROLE_LABELS[waiting.role] || waiting.role}` : ''}</span>
            </div>
            <h3 className="mt-1.5 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{row.title}</h3>
          </div>
          <div className="shrink-0 text-right">
            <p className={label}>{row.isPlan ? 'Total budget' : 'Amount'}</p>
            <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{formatIDR(row.amount)}</p>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{error}</div>}

          <div className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950/40">
            <Field name="Company">{row.company}</Field>
            <Field name="Requested by">{row.creator}</Field>
            {row.isPlan ? <>
              <Field name="Fiscal year">{plan?.fiscal_year}</Field>
              <Field name="Request date">{formatDate(task.created_at)}</Field>
              <Field name="Description" wide>{plan?.description}</Field>
              {plan?.is_late_submission && <Field name="Late submission reason (H-3)" wide><span className="text-amber-700 dark:text-amber-300">{plan.late_submission_reason || '—'}</span></Field>}
            </> : <>
              <Field name="Parent campaign">{item?.marketing_plan?.title}</Field>
              <Field name="CoA">{item?.m_coa ? `${item.m_coa.code} - ${item.m_coa.name}` : null}</Field>
              {pr?.request_type === 'CLAIM' && <>
                <Field name="Reimbursement payee">{pr.reimbursement_payee}</Field>
                <Field name="Transaction date">{pr.expense_date ? new Date(pr.expense_date).toLocaleDateString('en-GB', { timeZone: 'UTC' }) : null}</Field>
                <Field name="Vendor">{pr.expense_vendor}</Field>
              </>}
              {pr?.notes && <Field name="Notes" wide>{pr.notes}</Field>}
            </>}
            {(plan?.doc_url || pr?.doc_url) && (
              <Field name={row.isPlan ? 'Proposal' : 'Attachment'} wide>
                <a href={plan?.doc_url || pr?.doc_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:underline dark:text-blue-400"><Paperclip className="h-3.5 w-3.5" />View document</a>
              </Field>
            )}
          </div>

          {/* Budget impact for payment / claim */}
          {!row.isPlan && item && (
            <div>
              <p className={`${label} mb-2`}>Impact on the item budget</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Budget', budget, ''],
                  ['Realized', realized, ''],
                  ['Remaining now', remaining, remaining < 0 ? 'text-rose-600 dark:text-rose-400' : ''],
                  ['Remaining after approval', afterApproval, afterApproval < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'],
                ].map(([name, value, tone]) => (
                  <div key={name} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-[10px] text-slate-400">{name}</p>
                    <p className={`mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100 ${tone}`}>{formatIDR(value)}</p>
                  </div>
                ))}
              </div>
              {row.overbudget && (
                <div className="mt-2 flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] leading-relaxed text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>This request exceeds the remaining budget by <strong>{formatIDR(Math.abs(afterApproval))}</strong>. Approving it goes over the allocation and requires CFO/CEO escalation.</span>
                </div>
              )}
            </div>
          )}

          {/* Approver chain for plans */}
          {row.isPlan && chain.length > 0 && (
            <div>
              <p className={`${label} mb-2`}>Approval flow</p>
              <ol className="flex flex-wrap gap-2">
                {chain.map(step => {
                  const current = step.step_number === task.step_number;
                  const done = step.status === 'APPROVED';
                  return (
                    <li key={step.id} className={`flex min-w-40 flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${current ? 'border-blue-300 bg-blue-50/60 dark:border-blue-500/40 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
                      {done ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" /> : current ? <CircleDot className="h-4 w-4 shrink-0 text-blue-500" /> : <UserCheck className="h-4 w-4 shrink-0 text-slate-300" />}
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">{step.step_number}. {step.approver_name}</p>
                        <p className="truncate text-[10px] text-slate-400">{step.approver_role || step.approver_email}{done && step.action_at ? ` · ${formatDate(step.action_at)}` : ''}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Plan items */}
          {row.isPlan && (
            <div>
              <p className={`${label} mb-2`}>Budget breakdown ({plan?.items?.length || 0} {plan?.items?.length === 1 ? 'item' : 'items'})</p>
              <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-950">
                    <tr><th className="px-3 py-2 font-semibold">Month</th><th className="px-3 py-2 font-semibold">CoA</th><th className="px-3 py-2 font-semibold">Brand / LOB</th><th className="px-3 py-2 text-right font-semibold">Budget</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {!plan?.items?.length && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">No items.</td></tr>}
                    {plan?.items?.map(it => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 text-slate-500">{new Date(2000, it.period_month - 1, 1).toLocaleDateString('en-GB', { month: 'short' })}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{it.m_coa ? `${it.m_coa.code} - ${it.m_coa.name}` : '—'}</td>
                        <td className="px-3 py-2 text-slate-500">{it.m_brand?.name || '—'} / {it.m_line_business?.name || '—'}</td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(it.budget_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="approval-comment" className={label}>Comment</label>
            <textarea id="approval-comment" rows={3} value={comment} onChange={e => setComment(e.target.value)} placeholder="Required when rejecting. Optional when approving." className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <button type="button" onClick={onClose} disabled={submitting} className="h-9 rounded-lg border border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onDecision('REJECT')} disabled={submitting} title={comment.trim() ? 'Reject request' : 'Add a comment to reject'} className="h-9 rounded-lg border border-rose-200 px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10 cursor-pointer">Reject</button>
            <button type="button" onClick={() => onDecision('APPROVE')} disabled={submitting} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Approve
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
