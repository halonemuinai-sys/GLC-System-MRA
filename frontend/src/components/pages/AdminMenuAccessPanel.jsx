'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Building2, ChevronRight, LayoutPanelTop, Loader2, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import InlineHelp from '@/components/ui/InlineHelp';

const ROLE_TONE = {
  admin: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
  ga: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
  legal: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
  compliance: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-300',
  legal_compliance: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-300',
  marketing: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  marketing_manager: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-200',
  finance: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
  manager: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  auditor: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300',
};

export default function AdminMenuAccessPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiClient.get('/api/admin/menu-access-map'));
    } catch (err) {
      setError(err.message || 'Failed to load the menu access map.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleByKey = useMemo(() => Object.fromEntries((data?.roles || []).map(role => [role.key, role])), [data]);
  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.groups || []).map(group => ({
      ...group,
      menus: group.menus.filter(menu =>
        (!roleFilter || menu.roles.includes(roleFilter)) &&
        (!q || [menu.label, menu.path, menu.api_module, group.label, group.department].some(value => String(value || '').toLowerCase().includes(q)))
      )
    })).filter(group => group.menus.length);
  }, [data, query, roleFilter]);

  const totalActiveUsers = useMemo(() => Object.values(data?.active_users_by_department || {}).reduce((total, count) => total + Number(count || 0), 0), [data]);
  const departments = Object.keys(data?.active_users_by_department || {});
  const selectedRoles = selected?.roles.map(key => roleByKey[key]).filter(Boolean) || [];

  if (loading && !data) return <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Reading menu rules from the server...</div>;
  if (error) return <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>;

  const stats = [
    { label: 'Menu rules', value: data.total_menus, detail: `${data.groups.length} menu groups`, icon: LayoutPanelTop, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300' },
    { label: 'Active users', value: totalActiveUsers, detail: `${data.roles.filter(role => role.active_users).length} roles in use`, icon: Users, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' },
    { label: 'Profile departments', value: departments.length, detail: 'Organisation labels only', icon: Building2, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, detail, icon: Icon, tone }) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</p><p className="text-[10px] text-slate-400">{detail}</p></div></div>)}
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-xs leading-relaxed text-slate-700 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-slate-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <InlineHelp summary="How sign-in and menu access work" label="Login and access logic">
          Users sign in with email and password. The primary role plus any additional roles decides which dashboard menus appear and which protected APIs can be called. Department is an organisation label for reporting; it does not grant access. Company access is a separate data scope. Use this tab to choose the right role, then assign it in the Users tab.
        </InlineHelp>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a menu, route, department, or API module..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-8 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setRoleFilter('')} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium cursor-pointer ${!roleFilter ? 'border-slate-800 bg-slate-800 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-300'}`}>All roles</button>
            {data.roles.map(role => <button key={role.key} type="button" onClick={() => setRoleFilter(current => current === role.key ? '' : role.key)} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium cursor-pointer ${roleFilter === role.key ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{role.label}</button>)}
            <button type="button" onClick={load} disabled={loading} className="ml-1 inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"><RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />Reload</button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {visibleGroups.map(group => (
            <section key={group.key}>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 px-4 py-2.5 dark:bg-slate-950/30"><div><h3 className="text-xs font-semibold text-slate-800 dark:text-slate-100">{group.label}</h3><p className="mt-0.5 text-[10px] text-slate-400">Department: {group.department}</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700">{group.menus.length} menus</span></div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.menus.map(menu => <button key={menu.path} type="button" onClick={() => setSelected({ ...menu, group })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer"><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-slate-700 dark:text-slate-200">{menu.label}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">{menu.path}</span></span><span className="hidden shrink-0 text-[10px] text-slate-400 sm:block">{menu.api_module} API</span><span className="hidden max-w-[46%] flex-wrap justify-end gap-1 md:flex">{menu.roles.map(role => <span key={role} className={`rounded-md border px-1.5 py-0.5 text-[9px] font-medium ${ROLE_TONE[role] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{roleByKey[role]?.label || role}</span>)}</span><ChevronRight className="h-4 w-4 shrink-0 text-slate-300" /></button>)}
              </div>
            </section>
          ))}
          {!visibleGroups.length && <div className="px-4 py-14 text-center text-xs text-slate-400">No menu rules match the current search and role filter.</div>}
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-[10px] text-slate-400 dark:border-slate-800">Menu visibility is role-based. The Access Map tab remains the source for endpoint-level permissions and controller checks.</p>
      </div>

      <AnimatePresence>
        {selected && <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" /><motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">{selected.group.label}</p><h3 className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{selected.label}</h3></div><button type="button" aria-label="Close" onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button></div><div className="space-y-5 overflow-y-auto p-5"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dashboard route</p><p className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-200">{selected.path}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Roles that see this menu</p><div className="mt-2 flex flex-wrap gap-1.5">{selectedRoles.map(role => <span key={role.key} className={`rounded-md border px-2 py-1 text-[10px] font-medium ${ROLE_TONE[role.key] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{role.label} <span className="opacity-70">· {role.active_users} active</span></span>)}</div></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"><p><strong>API module:</strong> {selected.api_module}</p><p className="mt-1.5">The API still validates the role on the server. Hiding a menu is not used as a security control.</p></div>{selected.note && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">{selected.note}</div>}</div></motion.aside></>}
      </AnimatePresence>
    </motion.div>
  );
}
