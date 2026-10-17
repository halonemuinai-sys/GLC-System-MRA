'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Receipt, Ban, ExternalLink, Target } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('id-ID') : '-');
const fmtKpi = (row, v) => (v === null || v === undefined ? '-' : row.currency ? formatIDR(v) : Number(v).toLocaleString('id-ID'));

function VarianceCell({ value }) {
  if (value > 0) return <span className="font-bold text-amber-700">+{formatIDR(value)}</span>;
  if (value < 0) return <span className="font-bold text-emerald-700">{formatIDR(value)}</span>;
  return <span className="text-neutral-400">-</span>;
}

// Approval closing Marketing Plan via magic link email (publik, tanpa login).
// Tahap 1 = Marketing Head (evaluasi KPI), tahap 2 = Kadiv.
export default function PublicPlanClosingApprovalPage({ token }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [data, setData] = useState(null);
  const [mode, setMode] = useState(null); // null | 'approve' | 'reject'
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { action, final, message }
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await apiClient.get(`/api/marketing/closing/magic/${token}`));
    } catch (err) {
      setLoadError(err.message || 'Link approval tidak valid.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function submitAction(action) {
    if (action === 'REJECT' && !text.trim()) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await apiClient.post(`/api/marketing/closing/magic/${token}`, {
        action,
        comment: action === 'APPROVE' ? text.trim() : undefined,
        rejection_reason: action === 'REJECT' ? text.trim() : undefined
      });
      setResult({ action, final: res.final, message: res.message });
    } catch (err) {
      setActionError(err.message || 'Gagal memproses approval.');
    } finally {
      setSubmitting(false);
    }
  }

  const variance = data?.summary?.variance || 0;
  const steps = data?.closing?.approvers || [];
  const current = steps.find(s => s.step_number === data?.closing?.current_step);
  const previous = steps.filter(s => s.step_number < (data?.closing?.current_step || 0) && s.status === 'APPROVED');
  const isLastStep = current && current.step_number === steps.length;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-6 py-5 text-white">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-indigo-300" />
            <h1 className="font-bold text-sm">MRA Hub — Persetujuan Closing Marketing Plan</h1>
          </div>
          {current && (
            <p className="text-[11px] text-slate-300 mt-1.5">
              Tahap {current.step_number}/{steps.length} · <strong className="text-white">{current.role_label}</strong>
              {current.step_number === 1 ? ' — evaluasi KPI & pertanggungjawaban biaya' : ' — persetujuan akhir'}
            </p>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
              <p className="text-xs text-neutral-400">Memuat detail closing...</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm font-bold text-neutral-700">{loadError}</p>
            </div>
          ) : result ? (
            <div className="flex flex-col items-center py-12 gap-3 text-center">
              {result.action === 'APPROVE' ? <CheckCircle className="w-10 h-10 text-emerald-500" /> : <XCircle className="w-10 h-10 text-rose-500" />}
              <p className="text-sm font-bold text-neutral-800">
                {result.action === 'REJECT'
                  ? 'Closing ditolak dan dikembalikan ke pengaju.'
                  : result.final
                    ? 'Closing disetujui. Plan resmi ditutup (COMPLETED).'
                    : 'Disetujui. Closing diteruskan ke approver berikutnya (Kadiv).'}
              </p>
              <p className="text-xs text-neutral-400">Anda bisa menutup halaman ini.</p>
            </div>
          ) : (
            <>
              {data.plan.is_late_submission && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-700">
                  <strong>Late Submission (H-3):</strong> plan diajukan kurang dari 3 bulan sebelum event. Alasan: {data.plan.late_submission_reason || '-'}
                </div>
              )}
              {previous.length > 0 && (
                <div className="mb-4 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 space-y-0.5">
                  {previous.map(p => (
                    <p key={p.id}>✓ Disetujui {p.role_label} ({p.signer?.name}) {fmtDate(p.action_at)}{p.comment ? ` — "${p.comment}"` : ''}</p>
                  ))}
                </div>
              )}

              <table className="w-full text-xs mb-5">
                <tbody>
                  {[
                    ['Plan', data.plan.title],
                    ['Entitas (PT)', data.plan.company],
                    ['Periode Event', `${fmtDate(data.plan.event_start_date)} - ${fmtDate(data.plan.event_end_date)}`],
                    ['Total Budget', formatIDR(data.plan.total_budget)],
                    ['Diajukan oleh', data.closing?.submitted_by?.name]
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="py-1 pr-3 text-neutral-500 w-36 align-top">{label}</td>
                      <td className="py-1 font-bold text-neutral-800">{value || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* KPI */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden mb-4">
                <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 border-b border-neutral-100">
                  <span className="text-[10px] font-black text-neutral-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-indigo-500" /> Evaluasi KPI
                  </span>
                  <span className="text-[11px] font-extrabold text-neutral-700">{data.kpi.score !== null ? `Skor ${data.kpi.score}%` : 'Target belum diisi'}</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-neutral-400 text-[10px] font-bold uppercase">
                      <th className="px-3 py-1.5 text-left">Indikator</th>
                      <th className="px-3 py-1.5 text-right">Target</th>
                      <th className="px-3 py-1.5 text-right">Aktual</th>
                      <th className="px-3 py-1.5 text-right">Capaian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.kpi.rows.map(k => (
                      <tr key={k.key} className="border-t border-neutral-100">
                        <td className="px-3 py-1.5 font-medium text-neutral-700">{k.label}</td>
                        <td className="px-3 py-1.5 text-right text-neutral-500">{fmtKpi(k, k.target)}</td>
                        <td className="px-3 py-1.5 text-right text-neutral-700">{fmtKpi(k, k.actual)}</td>
                        <td className={`px-3 py-1.5 text-right font-bold ${k.achievement === null ? 'text-neutral-300' : k.achievement >= 100 ? 'text-emerald-600' : k.achievement >= 80 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {k.achievement === null ? '-' : `${k.achievement}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.plan.actual_notes && <p className="text-[11px] text-neutral-500 mb-4">Catatan hasil event: {data.plan.actual_notes}</p>}

              {/* Biaya */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden mb-4 max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[#0f172a] text-white">
                    <tr>
                      <th className="p-2 text-left font-bold">Item</th>
                      <th className="p-2 text-right font-bold">Dibayar</th>
                      <th className="p-2 text-right font-bold">Final</th>
                      <th className="p-2 text-right font-bold">Selisih</th>
                      <th className="p-2 text-left font-bold">Bukti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map(r => (
                      <tr key={r.plan_item_id} className="border-b border-neutral-100 last:border-0 align-top">
                        <td className="p-2">
                          <p className="font-medium text-neutral-800">{r.label}</p>
                          {r.note && <p className="text-[10px] text-neutral-400">{r.note}</p>}
                        </td>
                        <td className="p-2 text-right text-neutral-600 whitespace-nowrap">{formatIDR(r.paid)}</td>
                        <td className="p-2 text-right text-neutral-800 whitespace-nowrap">{formatIDR(r.final_amount)}</td>
                        <td className="p-2 text-right whitespace-nowrap"><VarianceCell value={r.variance} /></td>
                        <td className="p-2">
                          {r.proof_url ? (
                            <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Lihat
                            </a>
                          ) : <span className="text-neutral-300">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`p-3 rounded-xl mb-4 ${variance > 0 ? 'bg-amber-50 border border-amber-200' : variance < 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-neutral-50 border border-neutral-200'}`}>
                <div className="flex justify-between text-xs text-neutral-600"><span>Total dibayar</span><span className="font-bold">{formatIDR(data.summary.total_paid)}</span></div>
                <div className="flex justify-between text-xs text-neutral-600 mt-1"><span>Total biaya final</span><span className="font-bold">{formatIDR(data.summary.total_final)}</span></div>
                <div className={`flex justify-between text-sm font-extrabold mt-2 pt-2 border-t ${variance > 0 ? 'text-amber-700 border-amber-200' : variance < 0 ? 'text-emerald-700 border-emerald-200' : 'text-neutral-700 border-neutral-200'}`}>
                  <span>{variance > 0 ? 'CLAIM (perlu diganti)' : variance < 0 ? 'KELEBIHAN DANA (dikembalikan)' : 'Pas / tidak ada selisih'}</span>
                  <span>{variance === 0 ? '-' : formatIDR(Math.abs(variance))}</span>
                </div>
              </div>
              {data.closing?.notes && <p className="text-[11px] text-neutral-500 mb-5">Catatan closing: {data.closing.notes}</p>}

              {actionError && <div className="mb-4 px-3 py-2 bg-rose-50 text-rose-600 text-xs rounded-lg">{actionError}</div>}

              {mode ? (
                <div className="space-y-2.5">
                  <textarea
                    autoFocus
                    rows={3}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={mode === 'reject' ? 'Alasan penolakan (wajib diisi)...' : current?.step_number === 1 ? 'Catatan evaluasi KPI (opsional)...' : 'Catatan persetujuan (opsional)...'}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setMode(null); setText(''); }} className="flex-1 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-700">Batal</button>
                    <button
                      onClick={() => submitAction(mode === 'reject' ? 'REJECT' : 'APPROVE')}
                      disabled={submitting || (mode === 'reject' && !text.trim())}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 text-white text-xs font-bold rounded-xl ${mode === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#0f172a] hover:bg-[#1e293b]'}`}
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {mode === 'reject' ? 'Kirim Penolakan' : isLastStep ? 'Konfirmasi Persetujuan Akhir' : 'Setujui & Teruskan ke Kadiv'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setMode('reject')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl"
                  >
                    <Ban className="w-4 h-4" /> Tolak
                  </button>
                  <button
                    onClick={() => setMode('approve')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold rounded-xl"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {isLastStep ? 'Setujui Closing' : 'Setujui (Tahap 1)'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
