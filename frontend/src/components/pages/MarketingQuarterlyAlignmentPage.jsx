'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarRange, Activity, Loader2, AlertTriangle, Clock, Lock } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const formatIDR = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(val || 0));
const compactIDR = (val) => {
  const n = Number(val || 0);
  if (Math.abs(n) >= 1e9) return `Rp ${(n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })}B`;
  if (Math.abs(n) >= 1e6) return `Rp ${(n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  return formatIDR(n);
};
const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

function utilTone(p) {
  if (p === null) return { bar: 'bg-neutral-300', text: 'text-neutral-400' };
  if (p > 100) return { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' };
  if (p >= 80) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const fieldCls = 'bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-indigo-500';

// Quarterly Plan Alignment: cap budget per kuartal vs plan (approved + pending) per Brand/LOB,
// plus deadline pengajuan kuartal (aturan COO) dan jumlah plan late submission (H-3).
export default function MarketingQuarterlyAlignmentPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [fiscalYear, setFiscalYear] = useState(String(CURRENT_YEAR));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/api/marketing/metadata')
      .then(m => {
        setCompanies(m.companies || []);
        if (m.companies?.length) setCompanyId(String(m.companies[0].id));
      })
      .catch(() => setCompanies([]));
  }, []);

  async function handleProcess(e) {
    e.preventDefault();
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      setData(await apiClient.get('/api/marketing/reports/quarterly-alignment', { params: { company_id: companyId, fiscal_year: fiscalYear } }));
    } catch (err) {
      setError(err.message || 'Failed to load data.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const companyName = companies.find(c => String(c.id) === String(data?.company_id))?.name;

  return (
    <div className="space-y-6 relative pb-10">
      {/* Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#13223a] to-[#1e293b] rounded-3xl px-6 py-7 sm:px-8 sm:py-8">
        <CalendarRange className="absolute -right-6 -top-6 w-48 h-48 text-white/[0.04] pointer-events-none" strokeWidth={1} />
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
            <CalendarRange className="w-3.5 h-3.5" />
            Marketing Budget / Quarterly Alignment
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">Quarterly Plan Alignment</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-2xl">
            Compare each quarter's budget cap with submitted and approved plans per brand / LOB, including the quarter's submission deadline and how many plans were late (H-3).
          </p>
        </div>
      </div>

      {/* Filter */}
      <form onSubmit={handleProcess} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Company</label>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={`w-full ${fieldCls}`}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="sm:w-40">
          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Fiscal year</label>
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className={`w-full ${fieldCls}`}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="submit" disabled={!companyId || loading} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          Process Data
        </button>
      </form>

      {error && (
        <div className="py-10 text-center text-red-500 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <AlertTriangle className="w-7 h-7 mx-auto mb-2" />{error}
        </div>
      )}

      {!data && !error ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[300px]"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
            <CalendarRange className="w-7 h-7 text-emerald-500" />
          </div>
          <h3 className="text-lg font-black text-neutral-800 dark:text-white">Select a company & fiscal year</h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed">
            Then click <strong className="text-indigo-500">Process Data</strong> to see plan alignment per quarter.
          </p>
        </motion.div>
      ) : data && (
        <>
          {/* Quarter cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {data.quarters.map(q => {
              const tone = utilTone(q.utilization_pct);
              return (
                <div key={q.quarter} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-neutral-800 dark:text-white">{q.name}</p>
                      <p className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${q.is_deadline_passed ? 'text-neutral-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        <Clock className="w-3 h-3" />
                        Submission deadline {new Date(q.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{q.is_deadline_passed ? ' (passed)' : ''}
                      </p>
                    </div>
                    {q.late_plans > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {q.late_plans} late
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                      <span>Used by plans</span>
                      <span className={`font-bold ${tone.text}`}>{q.utilization_pct === null ? 'Cap not set' : `${q.utilization_pct}%`}</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                      <div className={`h-full ${tone.bar}`} style={{ width: `${Math.min(q.utilization_pct ?? 0, 100)}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <span className="text-neutral-400">Cap</span><span className="text-right font-bold text-neutral-700 dark:text-neutral-200">{compactIDR(q.cap)}</span>
                    <span className="text-neutral-400">Approved</span><span className="text-right font-bold text-emerald-600 dark:text-emerald-400">{compactIDR(q.approved)}</span>
                    <span className="text-neutral-400">Pending</span><span className="text-right font-bold text-amber-600 dark:text-amber-400">{compactIDR(q.pending)}</span>
                    <span className="text-neutral-400">Remaining</span><span className={`text-right font-bold ${q.remaining < 0 ? 'text-rose-600' : 'text-neutral-700 dark:text-neutral-200'}`}>{compactIDR(q.remaining)}</span>
                    <span className="text-neutral-400">Actuals</span><span className="text-right font-medium text-neutral-500">{compactIDR(q.realized)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lines table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
              <p className="text-xs font-black text-neutral-800 dark:text-white">{companyName} · FY {data.fiscal_year}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Each cell: plans (approved + pending) / quarter cap. Colors: green &lt; 80%, amber 80–100%, red over the cap.</p>
            </div>
            {data.lines.length === 0 ? (
              <div className="py-14 text-center text-xs text-neutral-400">No budget or plans for this company and year yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider border-b border-neutral-100 dark:border-neutral-800">
                      <th className="p-4 text-left">Brand · LOB</th>
                      {data.quarters.map(q => <th key={q.quarter} className="p-4 text-right">Q{q.quarter}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {data.lines.map(line => (
                      <tr key={line.key} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                        <td className="p-4">
                          <p className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                            {line.brand} · {line.lob}
                            {line.is_locked && <span title="Budget locked"><Lock className="w-3 h-3 text-neutral-400" /></span>}
                          </p>
                          {!line.has_budget && <p className="text-[10px] text-rose-500 mt-0.5">No budget for this combination</p>}
                        </td>
                        {line.quarters.map(q => {
                          const planned = q.approved + q.pending;
                          const p = pct(planned, q.cap);
                          const tone = utilTone(q.cap > 0 ? p : planned > 0 ? 101 : null);
                          return (
                            <td key={q.quarter} className="p-4 text-right whitespace-nowrap">
                              <p className={`font-bold ${planned > 0 || q.cap > 0 ? tone.text : 'text-neutral-300'}`}>{compactIDR(planned)}</p>
                              <p className="text-[10px] text-neutral-400">/ {compactIDR(q.cap)}{p !== null ? ` · ${p}%` : ''}</p>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-neutral-50/70 dark:bg-neutral-950/30 font-bold">
                      <td className="p-4 text-neutral-800 dark:text-white">Total</td>
                      {data.quarters.map(q => (
                        <td key={q.quarter} className="p-4 text-right whitespace-nowrap">
                          <p className={utilTone(q.utilization_pct).text}>{compactIDR(q.planned)}</p>
                          <p className="text-[10px] text-neutral-400 font-medium">/ {compactIDR(q.cap)}</p>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
