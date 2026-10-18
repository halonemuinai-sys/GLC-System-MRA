'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import {
  BadgeCheck, Loader2, AlertTriangle, CheckCircle2, XCircle, Paperclip, ShieldCheck,
  Clock, Link2Off, TimerOff, CalendarDays, Building2, UserRound, FileText, Wallet,
  CircleDot, Hourglass, Lock, ChevronDown, Receipt
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const formatIDR = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const formatDate = (value, withTime = false) => value
  ? new Date(value).toLocaleString('id-ID', withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  : '—';

const KIND = {
  PLAN: { label: 'Marketing Plan', tone: 'bg-blue-500/15 text-blue-200 ring-blue-400/30' },
  PAYMENT: { label: 'Payment Request', tone: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30' },
  CLAIM: { label: 'Reimbursement', tone: 'bg-amber-500/15 text-amber-200 ring-amber-400/30' },
};

function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, { duration: 0.9, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{formatIDR(Math.round(display))}</>;
}

function expiryText(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Kedaluwarsa';
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `Berlaku ${Math.max(1, hours)} jam lagi`;
  return `Berlaku ${Math.floor(hours / 24)} hari lagi`;
}

// Error copy per server message so the approver knows what happened and what to do.
function describeError(message = '') {
  const m = message.toLowerCase();
  if (m.includes('sudah pernah digunakan')) return { icon: Lock, title: 'Link sudah dipakai', body: 'Keputusan untuk pengajuan ini sudah tercatat melalui link ini. Tidak ada tindakan lain yang diperlukan.' };
  if (m.includes('kedaluwarsa')) return { icon: TimerOff, title: 'Link sudah kedaluwarsa', body: 'Masa berlaku link sudah habis. Minta pengaju atau tim Marketing mengirim ulang permintaan approval.' };
  if (m.includes('jalur lain')) return { icon: CheckCircle2, title: 'Sudah diproses', body: 'Tahap approval ini sudah diputuskan melalui aplikasi atau link lain.' };
  return { icon: Link2Off, title: 'Link tidak bisa dibuka', body: message || 'Link approval tidak valid. Pastikan Anda membuka link lengkap dari email.' };
}

const Field = ({ icon: Icon, label, children }) => (
  <div className="min-w-0">
    <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><Icon className="h-3 w-3" />{label}</p>
    <div className="mt-1 text-xs text-slate-800 dark:text-slate-200">{children || '—'}</div>
  </div>
);

export default function PublicApprovalPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(null); // 'APPROVE' | 'REJECT' awaiting confirmation
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [result, setResult] = useState(null);
  const [showItems, setShowItems] = useState(true);

  const loadTask = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await apiClient.get(`/api/marketing/magic/${token}`));
    } catch (err) {
      setLoadError(err.message || 'Link approval tidak valid.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadTask(); }, [loadTask]);

  const doc = data?.doc;
  const kind = KIND[doc?.kind] || KIND.PLAN;
  const isPlan = doc?.kind === 'PLAN';
  const chain = data?.chain || [];
  const itemsByMonth = useMemo(() => {
    const groups = new Map();
    for (const item of doc?.items || []) {
      if (!groups.has(item.month)) groups.set(item.month, []);
      groups.get(item.month).push(item);
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [doc]);

  const ask = (action) => {
    setActionError(null);
    if (action === 'REJECT' && !comment.trim()) {
      setActionError('Tulis alasan penolakan agar pengaju tahu apa yang perlu diperbaiki.');
      document.getElementById('approval-comment')?.focus();
      return;
    }
    setPending(action);
  };

  const submit = async () => {
    if (!pending || submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await apiClient.post(`/api/marketing/magic/${token}`, { action: pending, comment: comment.trim() || null });
      setResult({ action: pending, message: res.message, at: new Date() });
      setPending(null);
    } catch (err) {
      setActionError(err.message || 'Gagal memproses keputusan. Coba lagi.');
      setPending(null);
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = doc?.budget ? doc.budget.remaining : null;
  const afterApproval = remaining !== null ? remaining - (doc?.amount || 0) : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {/* Brand */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">MRA OpsSuite</p>
              <p className="text-[11px] text-slate-400">Persetujuan Marketing via email</p>
            </div>
          </div>
          {data?.expiresAt && !result && <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"><Clock className="h-3 w-3" />{expiryText(data.expiresAt)}</span>}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-24 dark:border-slate-800 dark:bg-slate-900">
            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
            <span className="text-xs text-slate-400">Memuat detail pengajuan...</span>
          </div>
        ) : loadError ? (
          (() => {
            const e = describeError(loadError);
            return (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><e.icon className="h-6 w-6" /></span>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{e.title}</h2>
                <p className="max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">{e.body}</p>
              </motion.div>
            );
          })()
        ) : result ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }} className={`flex h-14 w-14 items-center justify-center rounded-2xl ${result.action === 'REJECT' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
              {result.action === 'REJECT' ? <XCircle className="h-7 w-7" /> : <CheckCircle2 className="h-7 w-7" />}
            </motion.span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{result.action === 'REJECT' ? 'Pengajuan ditolak' : 'Persetujuan tercatat'}</h2>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">{result.message}</p>
            <div className="mt-2 w-full max-w-sm rounded-2xl border border-slate-200 p-4 text-left text-xs dark:border-slate-800">
              <p className="truncate font-medium text-slate-800 dark:text-slate-200">{doc.title}</p>
              <p className="mt-1 text-slate-400">{kind.label} · {formatIDR(doc.amount)}</p>
              <p className="mt-1 text-slate-400">Diputuskan {formatDate(result.at, true)} oleh {data.recipientEmail}</p>
            </div>
            <p className="text-[11px] text-slate-400">Halaman ini boleh ditutup.</p>
          </motion.div>
        ) : (
          <>
            {/* Hero */}
            <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
              <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-14 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
              <div className="relative space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${kind.tone}`}>{kind.label}</span>
                  <span className="text-[11px] text-slate-300">Tahap {data.step}{chain.length > 1 ? ` dari ${chain.length}` : ''} · No. {doc.id}</span>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">{doc.title}</h1>
                    <p className="mt-1 text-xs text-slate-300">{doc.company || '—'}{doc.fiscal_year ? ` · FY ${doc.fiscal_year}` : ''}</p>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">{isPlan ? 'Total anggaran' : 'Nominal'}</p>
                    <p className="text-2xl font-semibold tabular-nums tracking-tight"><CountUp value={doc.amount} /></p>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><BadgeCheck className="h-3.5 w-3.5 text-blue-300" />Dikirim untuk <span className="font-medium text-slate-200">{data.recipientEmail}</span></p>
              </div>
            </motion.section>

            {/* Warnings */}
            {doc.late_reason && (
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div><p className="font-semibold">Pengajuan terlambat (aturan H-3)</p><p className="mt-1 leading-relaxed">Plan diajukan kurang dari 3 bulan sebelum event. Alasan pengaju: <span className="font-medium">{doc.late_reason}</span></p></div>
              </div>
            )}
            {doc.overbudget && (
              <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div><p className="font-semibold">Melebihi sisa anggaran</p><p className="mt-1 leading-relaxed">Pengajuan ini melampaui sisa anggaran item, termasuk pengajuan lain yang masih berjalan. Setelah tier normal, diperlukan eskalasi ke CFO / CEO.</p></div>
              </div>
            )}

            {/* Details */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-xs font-semibold text-slate-800 dark:text-slate-100">Detail pengajuan</h2>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field icon={UserRound} label="Diajukan oleh">{doc.requester ? <>{doc.requester.name}{doc.requester.position && <span className="text-slate-400"> · {doc.requester.position}</span>}</> : null}</Field>
                <Field icon={CalendarDays} label="Tanggal pengajuan">{formatDate(doc.submitted_at, true)}</Field>
                <Field icon={Building2} label="Perusahaan">{doc.company}</Field>
                {isPlan ? (
                  <Field icon={CalendarDays} label="Tanggal event">{doc.event_start_date ? `${formatDate(doc.event_start_date)}${doc.event_end_date && doc.event_end_date !== doc.event_start_date ? ` – ${formatDate(doc.event_end_date)}` : ''}` : null}</Field>
                ) : (
                  <Field icon={FileText} label="Campaign induk">{doc.plan_title}</Field>
                )}
                {!isPlan && <Field icon={Receipt} label="CoA / bulan">{doc.coa ? `${doc.coa}${doc.month ? ` · ${MONTHS[doc.month - 1]}` : ''}` : null}</Field>}
                {!isPlan && <Field icon={Building2} label="Vendor">{doc.vendor}</Field>}
                {doc.kind === 'CLAIM' && <Field icon={UserRound} label="Penerima reimbursement">{doc.payee || doc.requester?.name}</Field>}
                {doc.kind === 'CLAIM' && <Field icon={CalendarDays} label="Tanggal transaksi">{formatDate(doc.expense_date)}</Field>}
                {(doc.description || doc.notes) && <div className="sm:col-span-2"><Field icon={FileText} label={isPlan ? 'Deskripsi' : 'Catatan'}><span className="whitespace-pre-wrap leading-relaxed">{doc.description || doc.notes}</span></Field></div>}
                {doc.doc_url && (
                  <div className="sm:col-span-2">
                    <a href={doc.doc_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-slate-700 dark:text-blue-400 dark:hover:bg-blue-500/10"><Paperclip className="h-3.5 w-3.5" />{isPlan ? 'Buka proposal' : 'Buka dokumen pendukung'}</a>
                  </div>
                )}
              </div>
            </section>

            {/* Budget impact (payment / claim) */}
            {doc.budget && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100"><Wallet className="h-3.5 w-3.5 text-blue-500" />Dampak ke anggaran item</h2>
                <p className="mb-4 text-[11px] text-slate-400">Realisasi dihitung dari pembayaran yang sudah tercatat dibayar.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[['Anggaran', doc.budget.budget, ''], ['Sudah terealisasi', doc.budget.realized, ''], ['Sisa saat ini', remaining, remaining < 0 ? 'text-rose-600 dark:text-rose-400' : ''], ['Sisa jika disetujui', afterApproval, afterApproval < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400']].map(([name, value, tone]) => (
                    <div key={name} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="text-[10px] text-slate-400">{name}</p><p className={`mt-0.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100 ${tone}`}>{formatIDR(value)}</p></div>
                  ))}
                </div>
                {doc.budget.budget > 0 && (
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="flex h-full">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (doc.budget.realized / doc.budget.budget) * 100)}%` }} transition={{ duration: 0.6 }} className="h-full bg-slate-400" />
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100 - (doc.budget.realized / doc.budget.budget) * 100, (doc.amount / doc.budget.budget) * 100))}%` }} transition={{ duration: 0.6, delay: 0.2 }} className={`h-full ${afterApproval < 0 ? 'bg-rose-500' : 'bg-blue-500'}`} />
                    </div>
                  </div>
                )}
                <div className="mt-2 flex gap-4 text-[10px] text-slate-400"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" />Terealisasi</span><span className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${afterApproval < 0 ? 'bg-rose-500' : 'bg-blue-500'}`} />Pengajuan ini</span></div>
              </section>
            )}

            {/* Plan items */}
            {isPlan && doc.items.length > 0 && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <button type="button" aria-expanded={showItems} onClick={() => setShowItems(v => !v)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
                  <span><span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">Rincian anggaran</span><span className="mt-0.5 block text-[11px] text-slate-400">{doc.items.length} item · {itemsByMonth.length} bulan</span></span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showItems ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {showItems && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      {/* Phone: stacked list so amounts stay visible */}
                      <div className="divide-y divide-slate-100 border-t border-slate-100 sm:hidden dark:divide-slate-800 dark:border-slate-800">
                        {itemsByMonth.map(([month, items]) => (
                          <div key={month}>
                            <div className="flex justify-between bg-slate-50/50 px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-950/20"><span>{MONTHS[month - 1]} {doc.fiscal_year}</span><span className="tabular-nums">{formatIDR(items.reduce((s, i) => s + i.budget, 0))}</span></div>
                            {items.map((item, i) => (
                              <div key={`${month}-m-${i}`} className="flex items-start justify-between gap-3 border-t border-slate-100 px-5 py-2.5 dark:border-slate-800">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{item.description || item.coa || '—'}</p>
                                  <p className="text-[10px] text-slate-400">{[item.description ? item.coa : null, [item.brand, item.lob].filter(Boolean).join(' / '), item.location || item.branch, item.vendor].filter(Boolean).join(' · ')}</p>
                                </div>
                                <p className="shrink-0 text-xs font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(item.budget)}</p>
                              </div>
                            ))}
                          </div>
                        ))}
                        <div className="flex justify-between px-5 py-3 text-xs font-semibold text-slate-900 dark:text-white"><span>Total</span><span className="tabular-nums">{formatIDR(doc.amount)}</span></div>
                      </div>
                      <div className="hidden overflow-x-auto border-t border-slate-100 sm:block dark:border-slate-800">
                        <table className="w-full min-w-[560px] text-left text-xs">
                          <thead className="bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:bg-slate-950/40">
                            <tr><th className="px-5 py-2.5 font-semibold">Item / CoA</th><th className="px-3 py-2.5 font-semibold">Brand / LOB</th><th className="px-3 py-2.5 font-semibold">Lokasi / vendor</th><th className="px-5 py-2.5 text-right font-semibold">Anggaran</th></tr>
                          </thead>
                          <tbody>
                            {itemsByMonth.map(([month, items]) => (
                              <React.Fragment key={month}>
                                <tr className="border-t border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20">
                                  <td colSpan={3} className="px-5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{MONTHS[month - 1]} {doc.fiscal_year}</td>
                                  <td className="px-5 py-1.5 text-right text-[10px] font-semibold tabular-nums text-slate-500">{formatIDR(items.reduce((s, i) => s + i.budget, 0))}</td>
                                </tr>
                                {items.map((item, i) => (
                                  <tr key={`${month}-${i}`} className="border-t border-slate-100 dark:border-slate-800">
                                    <td className="px-5 py-2.5"><p className="font-medium text-slate-800 dark:text-slate-200">{item.description || item.coa || '—'}</p>{item.description && <p className="text-[10px] text-slate-400">{item.coa}</p>}</td>
                                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{[item.brand, item.lob].filter(Boolean).join(' / ') || '—'}</td>
                                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{[item.location || item.branch, item.vendor].filter(Boolean).join(' · ') || '—'}</td>
                                    <td className="px-5 py-2.5 text-right font-medium tabular-nums text-slate-800 dark:text-slate-100">{formatIDR(item.budget)}</td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            ))}
                          </tbody>
                          <tfoot><tr className="border-t border-slate-200 dark:border-slate-700"><td colSpan={3} className="px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200">Total</td><td className="px-5 py-3 text-right text-xs font-semibold tabular-nums text-slate-900 dark:text-white">{formatIDR(doc.amount)}</td></tr></tfoot>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            )}

            {/* Approval chain */}
            {chain.length > 0 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-xs font-semibold text-slate-800 dark:text-slate-100">Alur persetujuan</h2>
                <ol className="space-y-0">
                  {chain.map((step, i) => {
                    const current = step.step === data.step && step.status === 'PENDING';
                    const done = step.status === 'APPROVED';
                    const rejected = step.status === 'REJECTED';
                    return (
                      <motion.li key={step.step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} className="relative flex gap-3 pb-4 last:pb-0">
                        {i < chain.length - 1 && <span aria-hidden="true" className={`absolute left-[13px] top-7 h-[calc(100%-20px)] w-px ${done ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                        <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${done ? 'bg-emerald-500 text-white' : rejected ? 'bg-rose-500 text-white' : current ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                          {current && <span className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />}
                          {done ? <CheckCircle2 className="h-4 w-4" /> : rejected ? <XCircle className="h-4 w-4" /> : step.step}
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="flex flex-wrap items-center gap-x-2 text-xs font-medium text-slate-800 dark:text-slate-200">{step.name || 'Approver'}{current && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">Giliran Anda</span>}</p>
                          <p className="text-[11px] text-slate-400">{[step.role, done ? `Disetujui ${formatDate(step.action_at, true)}` : rejected ? `Ditolak ${formatDate(step.action_at, true)}` : current ? 'Menunggu keputusan' : 'Menunggu tahap sebelumnya'].filter(Boolean).join(' · ')}</p>
                          {step.comment && <p className="mt-1 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">“{step.comment}”</p>}
                        </div>
                        {!done && !rejected && !current && <Hourglass className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-300" />}
                        {current && <CircleDot className="mt-1 h-3.5 w-3.5 shrink-0 text-blue-500" />}
                      </motion.li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* Decision */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Keputusan Anda</h2>
              <p className="mt-1 text-[11px] text-slate-400">Komentar opsional saat menyetujui, wajib saat menolak. Keputusan tidak bisa diubah setelah dikirim.</p>
              {actionError && <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4 shrink-0" />{actionError}</p>}
              <label htmlFor="approval-comment" className="sr-only">Komentar</label>
              <textarea id="approval-comment" rows={3} maxLength={1000} value={comment} onChange={e => setComment(e.target.value)} placeholder="Tulis catatan untuk pengaju..." className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />
              <div className="mt-1 text-right text-[10px] tabular-nums text-slate-400">{comment.length}/1000</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => ask('REJECT')} disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10 cursor-pointer"><XCircle className="h-4 w-4" />Tolak</button>
                <button type="button" onClick={() => ask('APPROVE')} disabled={submitting} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50 cursor-pointer"><CheckCircle2 className="h-4 w-4" />Setujui</button>
              </div>
            </section>

            <p className="flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-400"><Lock className="h-3 w-3" />Link ini rahasia dan hanya bisa dipakai sekali. Jangan diteruskan ke pihak lain.</p>
          </>
        )}
      </div>

      {/* Confirmation */}
      <AnimatePresence>
        {pending && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !submitting && setPending(null)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.div role="dialog" aria-modal="true" aria-labelledby="confirm-title" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.97 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${pending === 'REJECT' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>{pending === 'REJECT' ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span>
              <div>
                <h3 id="confirm-title" className="text-sm font-semibold text-slate-900 dark:text-white">{pending === 'REJECT' ? 'Tolak pengajuan ini?' : 'Setujui pengajuan ini?'}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{doc.title}</span> · {formatIDR(doc.amount)}.{' '}
                  {pending === 'REJECT' ? 'Pengajuan dikembalikan ke pengaju bersama alasan Anda.' : 'Pengajuan diteruskan ke tahap berikutnya, atau selesai bila ini tahap terakhir.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPending(null)} disabled={submitting} className="h-10 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Kembali</button>
                <button type="button" onClick={submit} disabled={submitting} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60 cursor-pointer ${pending === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{pending === 'REJECT' ? 'Ya, tolak' : 'Ya, setujui'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
