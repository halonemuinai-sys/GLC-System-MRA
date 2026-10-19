'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, RefreshCw, X, Search, ShieldCheck, Globe, Lock, LayoutPanelTop, Users, Activity } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';

// Read-only access map built by the backend from the guards on every live route.
export default function AdminAccessMapPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cell, setCell] = useState(null); // { module, role }
  const [epSearch, setEpSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiClient.get('/api/admin/access-map'));
    } catch (err) {
      setError(err.message || 'Failed to load the access map.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cellTone = (read, write, totalWrite) => {
    if (!read && !write) return 'border border-slate-100 bg-slate-50/80 text-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-600';
    if (write && write === totalWrite) return 'border border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/20';
    if (write) return 'border border-blue-100 bg-blue-50 text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-200';
    return 'border border-slate-200 bg-slate-100/80 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  };

  const detailEndpoints = useMemo(() => {
    if (!cell || !data) return [];
    const mod = data.modules.find(m => m.key === cell.module);
    const q = epSearch.trim().toLowerCase();
    return (mod?.endpoints || [])
      .filter(e => e.roles.includes(cell.role))
      .filter(e => !q || e.path.toLowerCase().includes(q) || e.method.toLowerCase().includes(q))
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));
  }, [cell, data, epSearch]);

  const overview = useMemo(() => {
    const roles = data?.roles || [];
    const modules = data?.modules || [];
    return {
      activeUsers: roles.reduce((total, role) => total + Number(role.active_users || 0), 0),
      fullControl: modules.reduce((total, module) => total + roles.filter(role => module.byRole[role.key].write === module.total.write && module.total.write > 0).length, 0),
    };
  }, [data]);

  if (loading && !data) return <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Reading access rules from the server...</div>;
  if (error) return <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>;

  const roleLabel = (key) => data.roles.find(r => r.key === key)?.label || key;
  const moduleOf = (key) => data.modules.find(m => m.key === key);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div aria-hidden="true" className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-blue-500/[0.07] blur-3xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"><ShieldCheck className="h-4.5 w-4.5" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-300">Access governance</p>
              <h2 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-white">Live API permission map</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">Endpoint access is read directly from the active server guards and role policies.</p>
            </div>
          </div>
          <InlineHelp summary={<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live rules</span>} label="How to read the access map">
            Each cell counts the endpoints that role can call: read is GET, while write is POST, PUT, PATCH, or DELETE. Some controllers add data-scope checks such as company assignment or document ownership, so this map shows the maximum API access for each role.
          </InlineHelp>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"><LayoutPanelTop className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Protected modules</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">{data.modules.length}</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"><Users className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active role assignments</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">{overview.activeUsers}</p></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Activity className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Full-control grants</p><p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">{overview.fullControl}</p></div></div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_28px_-22px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">Role &amp; module matrix</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />Full control</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/15" />Limited write</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />View only</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />No access</span>
            </div>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh rules</button>
        </div>
        <div className="overflow-x-auto p-2.5">
          <table className="w-full min-w-[980px] table-fixed border-separate border-spacing-1 text-left text-xs">
            <thead className="text-[10px] uppercase tracking-[0.1em] text-slate-400">
              <tr>
                <th className="w-48 px-3 py-2.5 font-semibold">Role</th>
                {data.modules.map(m => (
                  <th key={m.key} className="px-1 py-2.5 text-center font-semibold">
                    <InlineHelp summary={m.label} label={`Module ${m.label}`}><span className="normal-case tracking-normal">{`${m.prefix}/*`} — {m.total.read} read endpoints, {m.total.write} write endpoints{m.public_count ? `, ${m.public_count} public (magic link)` : ''}.</span></InlineHelp>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.roles.map((role, ri) => (
                <motion.tr key={role.key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ri * 0.03 }}>
                  <td className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/30"><p className="font-semibold text-slate-800 dark:text-slate-200">{role.label}</p><p className="mt-0.5 text-[10px] text-slate-400">{role.active_users} active users</p></td>
                  {data.modules.map(m => {
                    const v = m.byRole[role.key];
                    return (
                      <td key={m.key} className="p-0">
                        <button type="button" onClick={() => { setCell({ module: m.key, role: role.key }); setEpSearch(''); }} title={`${role.label} · ${m.label}: ${v.read} read, ${v.write} write`} className={`flex h-12 w-full flex-col items-center justify-center rounded-xl transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-sm cursor-pointer ${cellTone(v.read, v.write, m.total.write)}`}>
                          {v.read || v.write ? <>
                            <span className="text-[11px] font-semibold tabular-nums leading-none">{v.write ? `Write ${v.write}` : 'Read'}</span>
                            <span className="mt-1 text-[9px] tabular-nums opacity-80">{v.read}/{m.total.read} read</span>
                          </> : <span className="text-[11px]">—</span>}
                        </button>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-3 text-[10px] leading-relaxed text-slate-400 dark:border-slate-800">Updated {new Date(data.generated_at).toLocaleString('en-GB')} | Select a cell to inspect its endpoint policy. Menu visibility is documented separately in Menu Access; BI API scopes are managed in API Keys.</p>
      </div>

      <AnimatePresence>
        {cell && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCell(null)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">{moduleOf(cell.module)?.label}</p><h3 className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{roleLabel(cell.role)} access</h3></div>
                <button type="button" aria-label="Close" onClick={() => setCell(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <div className="border-b border-slate-100 p-3 dark:border-slate-800">
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input aria-label="Search endpoints" value={epSearch} onChange={e => setEpSearch(e.target.value)} placeholder="Search path or method..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {!detailEndpoints.length && <p className="py-10 text-center text-xs text-slate-400">This role has no access to endpoints in this module.</p>}
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {detailEndpoints.map(e => (
                    <li key={`${e.method} ${e.path}`} className="flex items-center gap-2 py-1.5">
                      <span className={`w-14 shrink-0 rounded px-1.5 py-0.5 text-center font-mono text-[9px] font-semibold ${e.kind === 'read' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'}`}>{e.method}</span>
                      <span title={e.path} className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-700 dark:text-slate-300">{e.path}</span>
                      {e.access === 'public' && <span title="No sign-in — used by magic links" className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><Globe className="h-2.5 w-2.5" />Public</span>}
                      {e.access === 'authenticated' && <span title="Any signed-in user; extra checks in the controller" className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">Any signed-in</span>}
                      {e.access === 'roles' && <span title={`Role: ${e.roles.join(', ')}`} className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400"><Lock className="h-2.5 w-2.5" />{e.roles.length} roles</span>}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
