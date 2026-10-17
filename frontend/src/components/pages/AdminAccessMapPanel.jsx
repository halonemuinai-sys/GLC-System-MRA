'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, RefreshCw, X, Search, ShieldCheck, Globe, Lock } from 'lucide-react';
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
    if (!read && !write) return 'bg-slate-50 text-slate-300 dark:bg-slate-900 dark:text-slate-600';
    if (write && write === totalWrite) return 'bg-blue-600 text-white';
    if (write) return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
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

  if (loading && !data) return <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Reading access rules from the server...</div>;
  if (error) return <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>;

  const roleLabel = (key) => data.roles.find(r => r.key === key)?.label || key;
  const moduleOf = (key) => data.modules.find(m => m.key === key);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs font-medium text-slate-700 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-slate-200">
        <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <InlineHelp summary="Access map read live from the server rules" label="How to read the access map">
          Each cell counts the endpoints that role can call (read = GET, write = POST/PUT/DELETE). Access is changed in code; this page stores no separate settings. Some controllers add their own checks (e.g. company scope, document owner only), so write counts are an upper bound.
        </InlineHelp>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-600" />Read + all writes</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-blue-100 dark:bg-blue-500/20" />Read + some writes</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-100 dark:bg-slate-800" />Read only</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900" />No access</span>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Reload</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] table-fixed text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
              <tr>
                <th className="w-44 px-4 py-2.5 font-semibold">Role</th>
                {data.modules.map(m => (
                  <th key={m.key} className="px-2 py-2.5 text-center font-semibold">
                    <InlineHelp summary={m.label} label={`Module ${m.label}`}><span className="normal-case tracking-normal">{`${m.prefix}/*`} — {m.total.read} read endpoints, {m.total.write} write endpoints{m.public_count ? `, ${m.public_count} public (magic link)` : ''}.</span></InlineHelp>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {data.roles.map((role, ri) => (
                <motion.tr key={role.key} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ri * 0.03 }}>
                  <td className="px-4 py-2"><p className="font-medium text-slate-800 dark:text-slate-200">{role.label}</p><p className="text-[10px] text-slate-400">{role.active_users} active users</p></td>
                  {data.modules.map(m => {
                    const v = m.byRole[role.key];
                    return (
                      <td key={m.key} className="p-1">
                        <button type="button" onClick={() => { setCell({ module: m.key, role: role.key }); setEpSearch(''); }} title={`${role.label} · ${m.label}: ${v.read} read, ${v.write} write`} className={`flex h-11 w-full flex-col items-center justify-center rounded-lg transition-transform hover:scale-[1.03] cursor-pointer ${cellTone(v.read, v.write, m.total.write)}`}>
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
        <p className="border-t border-slate-100 px-4 py-2.5 text-[10px] text-slate-400 dark:border-slate-800">Read {new Date(data.generated_at).toLocaleString('en-GB')} · click a cell to list its endpoints. Sidebar menus follow separate display rules; BI API keys are managed in the API Keys tab.</p>
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
