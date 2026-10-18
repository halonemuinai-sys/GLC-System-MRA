'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserCheck, UserMinus, Building2, Search, X, Plus, Edit3, KeyRound, Power, Loader2,
  ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, Check, Eye, EyeOff
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

import { ROLE_OPTIONS, ROLE_LABELS } from '@/lib/userRoles';
const ROLE_TONE = {
  admin: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  auditor: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  ga: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  marketing: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  marketing_manager: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
  finance: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
};
const SCOPE_BYPASS = ['admin', 'auditor'];
const STATUS_FILTERS = [['', 'All'], ['true', 'Active'], ['false', 'Inactive']];
const MIN_PASSWORD = 8;
const EMPTY_FORM = { full_name: '', email: '', phone: '', department: '', position: '', role: 'ga', extra_roles: [], password: '' };
const rolesOfUser = u => [u.role, ...(u.extra_roles || [])].filter(Boolean);
const bypassesScope = roles => roles.some(r => SCOPE_BYPASS.includes(r));

export default function AdminUsersPanel() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [companyIds, setCompanyIds] = useState([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [statusTarget, setStatusTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState(null);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers((await apiClient.get('/api/admin/users')) || []);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([apiClient.get('/api/master/companies/all').catch(() => []), apiClient.get('/api/master/companies/master').catch(() => [])])
      .then(([c, m]) => { setCompanies(c || []); setMasters(m || []); });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter(u =>
      (!roleFilter || rolesOfUser(u).includes(roleFilter)) &&
      (statusFilter === '' || String(u.is_active) === statusFilter) &&
      (!q || [u.full_name, u.email, u.department, u.position].some(v => String(v || '').toLowerCase().includes(q)))
    );
  }, [users, search, roleFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  const active = users.filter(u => u.is_active);
  const noScope = active.filter(u => !bypassesScope(rolesOfUser(u)) && !u.company_access_count);
  const stats = [
    { label: 'Active users', value: active.length, sub: `${users.length - active.length} inactive`, icon: UserCheck, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { label: 'Active admins', value: active.filter(u => u.role === 'admin').length, sub: 'At least 1 must stay active', icon: Users, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'No company access', value: noScope.length, sub: noScope.length ? 'Cannot see company-scoped data' : 'Everyone is assigned', icon: Building2, tone: noScope.length ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
  ];

  // Companies grouped by holding, including PTs without a holding.
  const companyGroups = useMemo(() => {
    const q = companyFilter.trim().toLowerCase();
    const visible = companies.filter(c => !q || c.name.toLowerCase().includes(q));
    const groups = masters.map(m => ({ key: m.id, name: m.name, items: visible.filter(c => c.company_master_id === m.id) }));
    groups.push({ key: 'none', name: 'No holding', items: visible.filter(c => !c.company_master_id || !masters.some(m => m.id === c.company_master_id)) });
    return groups.filter(g => g.items.length);
  }, [companies, masters, companyFilter]);

  const needsScope = !bypassesScope([form.role, ...form.extra_roles]);
  const emailTaken = useMemo(() => {
    const e = form.email.trim().toLowerCase();
    return e && users.some(u => u.email.toLowerCase() === e && u.id !== editing?.id);
  }, [form.email, users, editing]);
  const passwordInvalid = !editing && form.password.length < MIN_PASSWORD;
  const canSave = form.full_name.trim() && form.email.trim() && !emailTaken && !passwordInvalid && !saving;

  const openForm = async (user = null) => {
    setEditing(user);
    setForm(user ? { full_name: user.full_name || '', email: user.email || '', phone: user.phone || '', department: user.department || '', position: user.position || '', role: user.role || 'ga', extra_roles: user.extra_roles || [], password: '' } : EMPTY_FORM);
    setCompanyIds([]);
    setCompanyFilter('');
    setFormError(null);
    setShowPassword(false);
    setDrawerOpen(true);
    if (user && !bypassesScope(rolesOfUser(user))) {
      setLoadingAccess(true);
      try {
        setCompanyIds(((await apiClient.get(`/api/admin/users/${user.id}/company-access`)) || []).map(c => c.id));
      } catch {
        setCompanyIds([]);
      } finally {
        setLoadingAccess(false);
      }
    }
  };

  const submitForm = async (e) => {
    e?.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setFormError(null);
    try {
      let userId = editing?.id;
      if (editing) {
        const { password, ...payload } = form;
        if (payload.role === 'admin') payload.extra_roles = [];
        await apiClient.put(`/api/admin/users/${editing.id}`, payload);
      } else {
        userId = (await apiClient.post('/api/admin/users', { ...form, extra_roles: form.role === 'admin' ? [] : form.extra_roles })).id;
      }
      if (needsScope) await apiClient.put(`/api/admin/users/${userId}/company-access`, { company_ids: companyIds });
      setDrawerOpen(false);
      flash(editing ? 'User updated.' : 'User created.');
      load();
    } catch (err) {
      setFormError(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const submitStatus = async () => {
    setModalBusy(true);
    setModalError(null);
    try {
      await apiClient.put(`/api/admin/users/${statusTarget.id}`, { is_active: !statusTarget.is_active });
      flash(`${statusTarget.full_name} ${statusTarget.is_active ? 'deactivated — their active session ends immediately' : 'reactivated'}.`);
      setStatusTarget(null);
      load();
    } catch (err) {
      setModalError(err.message || 'Failed to change user status.');
    } finally {
      setModalBusy(false);
    }
  };

  const submitReset = async (e) => {
    e?.preventDefault();
    if (newPassword.length < MIN_PASSWORD) return;
    setModalBusy(true);
    setModalError(null);
    try {
      await apiClient.put(`/api/admin/users/${resetTarget.id}/reset-password`, { new_password: newPassword });
      flash(`Password for ${resetTarget.full_name} has been reset.`);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      setModalError(err.message || 'Failed to reset password.');
    } finally {
      setModalBusy(false);
    }
  };

  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
  const fieldClass = 'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';
  const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';
  const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(({ label: name, value, sub, icon: Icon, tone }, i) => (
          <motion.div key={name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{name}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</p><p className="truncate text-[10px] text-slate-400">{sub}</p></div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</motion.div>}
      </AnimatePresence>
      {error && <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={load} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="relative min-w-48 flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search users" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, department, position..." className={`${fieldClass} pl-9 pr-9`} />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <select aria-label="Filter by role" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className={`${fieldClass} w-auto bg-white dark:bg-slate-900`}>
            <option value="">All roles</option>
            {ROLE_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <div className="flex gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            {STATUS_FILTERS.map(([key, text]) => (
              <button key={key || 'all'} type="button" aria-pressed={statusFilter === key} onClick={() => { setStatusFilter(key); setPage(1); }} className={`relative rounded-md px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${statusFilter === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                {statusFilter === key && <motion.span layoutId="admin-user-status" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                <span className="relative">{text}</span>
              </button>
            ))}
          </div>
          <button type="button" aria-label="Reload" onClick={load} disabled={loading} className={`${actionClass} border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800`}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          <button type="button" onClick={() => openForm()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Plus className="h-3.5 w-3.5" />Add user</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
              <tr><th className="w-[30%] px-4 py-2.5 font-semibold">User</th><th className="w-[20%] px-3 py-2.5 font-semibold">Department / position</th><th className="w-[14%] px-3 py-2.5 font-semibold">Role</th><th className="w-[13%] px-3 py-2.5 font-semibold">Company access</th><th className="w-[10%] px-3 py-2.5 font-semibold">Status</th><th className="w-[13%] px-3 py-2.5 text-right font-semibold">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading && !users.length && <tr><td colSpan={6} className="py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-blue-500" /></td></tr>}
              {!loading && !rows.length && <tr><td colSpan={6} className="px-4 py-14 text-center text-slate-400"><Users className="mx-auto mb-2 h-8 w-8 opacity-30" />{users.length ? 'No users match the filters.' : 'No users yet.'}</td></tr>}
              <AnimatePresence initial={false}>
                {rows.map((u, i) => {
                  const bypass = bypassesScope(rolesOfUser(u));
                  return (
                    <motion.tr key={u.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }} className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${u.is_active ? '' : 'opacity-60'}`}>
                      <td className="px-4 py-2"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{initials(u.full_name)}</span><div className="min-w-0"><p title={u.full_name} className="truncate font-medium text-slate-800 dark:text-slate-200">{u.full_name}{u.is_self && <span className="ml-1.5 rounded bg-blue-50 px-1 py-0.5 text-[9px] font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">You</span>}</p><p title={u.email} className="truncate text-[10px] text-slate-400">{u.email}</p></div></div></td>
                      <td className="px-3 py-2"><p className="truncate text-slate-600 dark:text-slate-300">{u.department || '—'}</p><p className="truncate text-[10px] text-slate-400">{u.position || '—'}</p></td>
                      <td className="px-3 py-2"><span className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-medium ${ROLE_TONE[u.role] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{ROLE_LABELS[u.role] || u.role}</span>{(u.extra_roles || []).length > 0 && <p title={u.extra_roles.map(r => ROLE_LABELS[r] || r).join(', ')} className="mt-0.5 truncate text-[10px] text-slate-400">+ {u.extra_roles.map(r => ROLE_LABELS[r] || r).join(', ')}</p>}</td>
                      <td className="px-3 py-2 text-[11px]">{bypass ? <span className="text-slate-400">All companies</span> : u.company_access_count ? <span className="text-slate-600 dark:text-slate-300">{u.company_access_count} companies</span> : <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3 w-3" />Not assigned</span>}</td>
                      <td className="px-3 py-2">{u.is_active ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><span className="h-1 w-1 rounded-full bg-current" />Active</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><span className="h-1 w-1 rounded-full bg-current" />Inactive</span>}</td>
                      <td className="px-3 py-1.5"><div className="flex items-center justify-end gap-0.5">
                        <button type="button" title={`Edit ${u.full_name}`} onClick={() => openForm(u)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                        <button type="button" title={`Reset password for ${u.full_name}`} onClick={() => { setResetTarget(u); setNewPassword(''); setModalError(null); }} className={`${actionClass} hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10`}><KeyRound className="h-3.5 w-3.5" /></button>
                        <span title={u.is_self ? 'You cannot deactivate your own account' : u.is_active ? `Deactivate ${u.full_name}` : `Activate ${u.full_name}`}><button type="button" aria-label={u.is_active ? `Deactivate ${u.full_name}` : `Activate ${u.full_name}`} disabled={u.is_self} onClick={() => { setStatusTarget(u); setModalError(null); }} className={`${actionClass} ${u.is_active ? 'enabled:hover:bg-rose-50 enabled:hover:text-rose-600 dark:enabled:hover:bg-rose-500/10' : 'enabled:hover:bg-emerald-50 enabled:hover:text-emerald-600'}`}><Power className="h-3.5 w-3.5" /></button></span>
                      </div></td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
          <label className="flex items-center gap-2">Rows per page
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}</select>
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

      {/* User drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !saving && setDrawerOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{editing ? 'Edit user' : 'Add user'}</h3><p className="mt-0.5 text-[11px] text-slate-400">{editing ? 'Role and status changes apply to active sessions immediately.' : 'Email is stored in lowercase and used to sign in.'}</p></div>
                <button type="button" aria-label="Close" onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={submitForm} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div><label htmlFor="u-name" className={label}>Full name *</label><input id="u-name" autoFocus maxLength={150} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className={fieldClass} /></div>
                <div>
                  <label htmlFor="u-email" className={label}>Email *</label>
                  <input id="u-email" type="email" maxLength={150} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@mraretail.co.id" className={`${fieldClass} ${emailTaken ? 'border-amber-400' : ''}`} />
                  {emailTaken && <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">This email is already used by another user.</p>}
                </div>
                {!editing && (
                  <div>
                    <label htmlFor="u-pass" className={label}>Initial password *</label>
                    <div className="relative">
                      <input id="u-pass" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={`${fieldClass} pr-9`} />
                      <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer">{showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                    </div>
                    <p className={`mt-1 text-[10px] ${form.password && passwordInvalid ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>At least {MIN_PASSWORD} characters.</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><label htmlFor="u-role" className={label}>Role *</label><select id="u-role" value={form.role} disabled={editing?.is_self} onChange={e => setForm(f => ({ ...f, role: e.target.value, extra_roles: f.extra_roles.filter(r => r !== e.target.value) }))} className={`${fieldClass} disabled:opacity-60`}>{ROLE_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>{editing?.is_self && <p className="mt-1 text-[10px] text-slate-400">You cannot change your own role.</p>}</div>
                  <div><label htmlFor="u-phone" className={label}>Phone</label><input id="u-phone" maxLength={30} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={fieldClass} /></div>
                  <div><label htmlFor="u-dept" className={label}>Department</label><input id="u-dept" maxLength={100} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className={fieldClass} /></div>
                  <div><label htmlFor="u-pos" className={label}>Position</label><input id="u-pos" maxLength={100} value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className={fieldClass} /></div>
                </div>

                {form.role !== 'admin' && (
                  <fieldset disabled={editing?.is_self} className="disabled:opacity-60">
                    <legend className={label}>Additional roles</legend>
                    <p className="mb-2 text-[10px] text-slate-400">Extra menus on top of the main role, e.g. a Marketing user who also works in GA. Admin cannot be added here.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ROLE_OPTIONS.filter(([v]) => v !== 'admin' && v !== form.role).map(([v, t]) => {
                        const on = form.extra_roles.includes(v);
                        return <button key={v} type="button" aria-pressed={on} onClick={() => setForm(f => ({ ...f, extra_roles: on ? f.extra_roles.filter(r => r !== v) : [...f.extra_roles, v] }))} className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{t}</button>;
                      })}
                    </div>
                  </fieldset>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between"><span className={label}>Company access</span>{needsScope && <span className="text-[10px] text-slate-400">{companyIds.length} selected</span>}</div>
                  {!needsScope ? (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">Role {[form.role, ...form.extra_roles].filter(r => SCOPE_BYPASS.includes(r)).map(r => ROLE_LABELS[r] || r).join(" + ")} automatically sees every company.</p>
                  ) : loadingAccess ? (
                    <div className="flex items-center gap-2 py-4 text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />Loading company access...</div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 border-b border-slate-100 p-2 dark:border-slate-800">
                        <input aria-label="Search companies" value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} placeholder="Search companies..." className={`${fieldClass} h-8`} />
                        <button type="button" onClick={() => setCompanyIds(ids => [...new Set([...ids, ...companyGroups.flatMap(g => g.items.map(c => c.id))])])} className="shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 cursor-pointer">Select all</button>
                        <button type="button" onClick={() => setCompanyIds([])} className="shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 cursor-pointer">Clear</button>
                      </div>
                      <div className="max-h-64 space-y-3 overflow-y-auto p-3">
                        {companyGroups.map(g => {
                          const allOn = g.items.every(c => companyIds.includes(c.id));
                          return (
                            <div key={g.key}>
                              <button type="button" onClick={() => setCompanyIds(ids => allOn ? ids.filter(id => !g.items.some(c => c.id === id)) : [...new Set([...ids, ...g.items.map(c => c.id)])])} className="mb-1 flex w-full items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"><span>{g.name}</span><span className="normal-case tracking-normal">{allOn ? 'Unselect group' : 'Select group'}</span></button>
                              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                                {g.items.map(c => (
                                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                                    <input type="checkbox" checked={companyIds.includes(c.id)} onChange={() => setCompanyIds(ids => ids.includes(c.id) ? ids.filter(id => id !== c.id) : [...ids, c.id])} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" />
                                    <span className="truncate" title={c.name}>{c.name}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {!companyGroups.length && <p className="py-3 text-center text-[11px] text-slate-400">No companies found.</p>}
                      </div>
                    </div>
                  )}
                  {needsScope && !loadingAccess && !companyIds.length && <p className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3 w-3" />Without company access this user cannot see company-scoped data.</p>}
                </div>
                {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{formError}</div>}
              </form>
              <div className="flex gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                <button type="button" onClick={() => setDrawerOpen(false)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="button" onClick={submitForm} disabled={!canSave} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Save</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Activate / deactivate */}
      <AnimatePresence>
        {statusTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !modalBusy && setStatusTarget(null)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${statusTarget.is_active ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>{statusTarget.is_active ? <UserMinus className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}</span>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{statusTarget.is_active ? 'Deactivate user?' : 'Activate user?'}</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{statusTarget.is_active ? `${statusTarget.full_name} will no longer be able to sign in and any active session ends immediately.` : `${statusTarget.full_name} will be able to sign in again with their last password.`}</p>
              </div>
              {modalError && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{modalError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setStatusTarget(null)} disabled={modalBusy} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="button" onClick={submitStatus} disabled={modalBusy} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 cursor-pointer ${statusTarget.is_active ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{modalBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{statusTarget.is_active ? 'Deactivate' : 'Activate'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset password */}
      <AnimatePresence>
        {resetTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !modalBusy && setResetTarget(null)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.form onSubmit={submitReset} initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"><KeyRound className="h-5 w-5" /></span>
              <div><h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Reset password</h4><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{resetTarget.full_name} · {resetTarget.email}. Share the new password through a secure channel.</p></div>
              <div>
                <label htmlFor="reset-pass" className={label}>New password</label>
                <div className="relative">
                  <input id="reset-pass" autoFocus type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`${fieldClass} pr-9`} />
                  <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer">{showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                </div>
                <p className={`mt-1 text-[10px] ${newPassword && newPassword.length < MIN_PASSWORD ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>At least {MIN_PASSWORD} characters.</p>
              </div>
              {modalError && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{modalError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setResetTarget(null)} disabled={modalBusy} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
                <button type="submit" disabled={modalBusy || newPassword.length < MIN_PASSWORD} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-amber-500 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 cursor-pointer">{modalBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Reset</button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
