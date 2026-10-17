'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building, Building2, Tag, Globe, Search, Plus, X, Edit3, Trash2, Loader2,
  ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, LockKeyhole, Link2
} from 'lucide-react';
import Cookies from 'js-cookie';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';
import SearchableSelect from '@/components/ui/SearchableSelect';
import InlineHelp from '@/components/ui/InlineHelp';

const USAGE_FILTERS = [['all', 'Semua'], ['used', 'Dipakai plan'], ['unused', 'Belum dipakai']];

export default function MarketingBranchPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [canWrite, setCanWrite] = useState(false);
  useEffect(() => { setCanWrite(['admin', 'marketing'].includes((Cookies.get('glc_user_role') || '').toLowerCase())); }, []);

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [usageFilter, setUsageFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formData, setFormData] = useState({ name: '', company_id: '', brand_id: '' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [draftConfirm, setDraftConfirm] = useState(0);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(null), 3500); };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branches, meta] = await Promise.all([
        apiClient.get('/api/marketing/branches'),
        apiClient.get('/api/marketing/metadata').catch(() => null),
      ]);
      setData(branches || []);
      setCompanies(meta?.companies || []);
      setBrands((meta?.brands || []).map(b => ({ ...b, company_name: b.m_company?.name || '' })));
    } catch (err) {
      setError(err.message || 'Gagal memuat data cabang sasaran.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const brandsFor = (companyId) => brands.filter(b => !companyId || !b.company_id || String(b.company_id) === String(companyId));
  const isUsed = (item) => item.usage_locked + item.usage_draft > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter(item =>
      (!q || [item.name, item.m_company?.name, item.m_brand?.name].some(v => String(v || '').toLowerCase().includes(q))) &&
      (!filterCompany || String(item.company_id) === String(filterCompany)) &&
      (!filterBrand || String(item.brand_id) === String(filterBrand)) &&
      (usageFilter === 'all' || (usageFilter === 'used' ? isUsed(item) : !isUsed(item)))
    );
  }, [data, search, filterCompany, filterBrand, usageFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);
  const hasActiveFilters = Boolean(search || filterCompany || filterBrand || usageFilter !== 'all');

  const stats = [
    { label: 'Total cabang', value: data.length, icon: Building, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Terikat PT / brand', value: data.filter(d => d.company_id || d.brand_id).length, icon: Building2, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { label: 'Universal', value: data.filter(d => !d.company_id && !d.brand_id).length, icon: Globe, tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' },
    { label: 'Dipakai di plan', value: data.filter(isUsed).length, icon: Link2, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
  ];

  const openForm = (item = null) => {
    setEditingItem(item);
    setFormData(item ? { name: item.name, company_id: item.company_id ? String(item.company_id) : '', brand_id: item.brand_id ? String(item.brand_id) : '' } : { name: '', company_id: filterCompany || '', brand_id: filterBrand || '' });
    setFormError(null);
    setShowDrawer(true);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = { name: formData.name.trim(), company_id: formData.company_id ? parseInt(formData.company_id, 10) : null, brand_id: formData.brand_id ? parseInt(formData.brand_id, 10) : null };
      if (editingItem) await apiClient.put(`/api/marketing/branches/${editingItem.id}`, payload);
      else await apiClient.post('/api/marketing/branches', payload);
      setShowDrawer(false);
      flash(editingItem ? 'Cabang diperbarui.' : 'Cabang ditambahkan.');
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan data cabang.');
    } finally {
      setSubmitting(false);
    }
  };

  const openDelete = (item) => { setDeleteTarget(item); setDeleteError(null); setDraftConfirm(item.usage_draft || 0); };
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/api/marketing/branches/${deleteTarget.id}${draftConfirm ? '?confirm_draft=1' : ''}`);
      setDeleteTarget(null);
      flash('Cabang dihapus.');
      fetchData();
    } catch (err) {
      setDeleteError(err.message || 'Gagal menghapus cabang.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => { setSearch(''); setFilterCompany(''); setFilterBrand(''); setUsageFilter('all'); setPage(1); };
  const actionClass = 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35';
  const label = 'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><Building className="h-4 w-4" />Marketing master data</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Target Branches</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Cabang/toko sasaran kampanye. Cabang yang terikat PT atau brand hanya muncul di plan untuk PT/brand tersebut; cabang universal muncul di semua plan.</p>
          </div>
          {canWrite && (
            <button type="button" onClick={() => openForm()} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-blue-50 cursor-pointer"><Plus className="h-4 w-4" />Tambah cabang</button>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label: name, value, icon: Icon, tone }, i) => (
          <motion.div key={name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0"><p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">{name}</p><p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">{value}</p></div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {notice && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</motion.div>}
      </AnimatePresence>
      {error && <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{error}</span><button type="button" onClick={fetchData} className="inline-flex items-center gap-1 font-semibold hover:underline cursor-pointer"><RefreshCw className="h-3.5 w-3.5" />Coba lagi</button></div>}

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-3 border-b border-slate-100 p-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input aria-label="Cari cabang" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={t('marketing_branch_search')} className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-9 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
              {search && <button type="button" aria-label="Hapus pencarian" onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
            </div>
            <div className="w-full sm:w-56"><SearchableSelect value={filterCompany} onChange={val => { setFilterCompany(val); setFilterBrand(''); setPage(1); }} options={companies} placeholder="Semua PT" allOptionLabel="Semua PT" searchPlaceholder="Cari PT..." /></div>
            <div className="w-full sm:w-48"><SearchableSelect value={filterBrand} onChange={val => { setFilterBrand(val); setPage(1); }} options={brandsFor(filterCompany)} placeholder="Semua brand" allOptionLabel="Semua brand" searchPlaceholder="Cari brand..." subtitleKey="company_name" /></div>
            <button type="button" onClick={fetchData} disabled={loading} aria-label="Muat ulang" className={`${actionClass} border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800`}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-0.5 rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
              {USAGE_FILTERS.map(([key, text]) => (
                <button key={key} type="button" aria-pressed={usageFilter === key} onClick={() => { setUsageFilter(key); setPage(1); }} className={`relative rounded-md px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer ${usageFilter === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
                  {usageFilter === key && <motion.span layoutId="branch-usage-filter" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-md bg-slate-900 dark:bg-white" />}
                  <span className="relative">{text}</span>
                </button>
              ))}
            </div>
            {hasActiveFilters && <button type="button" onClick={resetFilters} className="text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer">Reset filter</button>}
            <span aria-live="polite" className="ml-auto text-[11px] text-slate-400">{filtered.length} cabang</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading && !data.length ? (
            <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-blue-500" />Memuat data cabang...</div>
          ) : (
            <table className="w-full min-w-[820px] table-fixed text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="w-[30%] px-4 py-2.5 font-semibold">{t('marketing_branch_colName')}</th>
                  <th className="w-[25%] px-3 py-2.5 font-semibold">{t('marketing_branch_colCompany')}</th>
                  <th className="w-[18%] px-3 py-2.5 font-semibold">{t('marketing_branch_colBrand')}</th>
                  <th className="w-[15%] px-3 py-2.5 font-semibold">Penggunaan</th>
                  <th className="w-[12%] px-3 py-2.5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {!rows.length && <tr><td colSpan={5} className="px-4 py-14 text-center text-slate-400"><Building className="mx-auto mb-2 h-8 w-8 opacity-30" />{data.length ? 'Tidak ada cabang yang sesuai filter.' : 'Belum ada cabang sasaran.'}{hasActiveFilters && <button type="button" onClick={resetFilters} className="mt-2 block w-full text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400 cursor-pointer">Reset filter</button>}</td></tr>}
                <AnimatePresence initial={false}>
                  {rows.map((item, i) => (
                    <motion.tr key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: Math.min(i, 12) * 0.02, duration: 0.2 }} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2"><p title={item.name} className="truncate font-medium text-slate-800 dark:text-slate-200">{item.name}</p><p className="text-[10px] text-slate-400">#{item.id}</p></td>
                      <td className="px-3 py-2">{item.m_company ? <span title={item.m_company.name} className="inline-flex max-w-full items-center gap-1.5 truncate text-slate-600 dark:text-slate-300"><Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{item.m_company.name}</span></span> : <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"><Globe className="h-3 w-3" />Semua PT</span>}</td>
                      <td className="px-3 py-2">{item.m_brand ? <span title={item.m_brand.name} className="inline-flex max-w-full items-center gap-1.5 truncate text-slate-600 dark:text-slate-300"><Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{item.m_brand.name}</span></span> : <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Globe className="h-3 w-3" />Semua brand</span>}</td>
                      <td className="px-3 py-2 text-[10px]">
                        {!isUsed(item) ? <span className="text-slate-400">Belum dipakai</span> : (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                            {!item.can_delete && <LockKeyhole className="h-3 w-3 shrink-0 text-slate-400" />}
                            <InlineHelp summary={`${item.usage_locked + item.usage_draft} item plan`} label={`Penggunaan ${item.name}`}>
                              {item.usage_locked > 0 ? `${item.usage_locked} item di plan yang sudah diajukan/disetujui/ditolak — cabang terkunci dari penghapusan untuk menjaga riwayat. Ubah namanya bila perlu.` : ''}
                              {item.usage_draft > 0 ? ` ${item.usage_draft} item di plan Draft — referensinya akan dilepas bila cabang dihapus.` : ''}
                            </InlineHelp>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {canWrite ? (
                          <div className="flex items-center justify-end gap-0.5">
                            <button type="button" title={`Ubah ${item.name}`} onClick={() => openForm(item)} className={`${actionClass} hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10`}><Edit3 className="h-3.5 w-3.5" /></button>
                            <span title={item.can_delete ? `Hapus ${item.name}` : 'Dipakai di plan non-draft — tidak bisa dihapus'}><button type="button" aria-label={`Hapus ${item.name}`} disabled={!item.can_delete} onClick={() => openDelete(item)} className={`${actionClass} enabled:hover:bg-rose-50 enabled:hover:text-rose-600 dark:enabled:hover:bg-rose-500/10`}><Trash2 className="h-3.5 w-3.5" /></button></span>
                          </div>
                        ) : <span className="block text-right text-[10px] text-slate-400">Lihat saja</span>}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800">
          <label className="flex items-center gap-2">Baris per halaman
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}</select>
          </label>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">{filtered.length ? `${start + 1}–${Math.min(start + pageSize, filtered.length)}` : '0'} dari {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Halaman sebelumnya" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-10 text-center tabular-nums">{currentPage} / {totalPages}</span>
              <button type="button" aria-label="Halaman berikutnya" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className={`${actionClass} hover:bg-slate-100 dark:hover:bg-slate-800`}><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Form drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDrawer(false)} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]" />
            <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 260 }} className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div><h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{editingItem ? 'Ubah cabang sasaran' : 'Tambah cabang sasaran'}</h3><p className="mt-0.5 text-[11px] text-slate-400">Kosongkan PT/brand bila cabang berlaku untuk semua plan.</p></div>
                <button type="button" aria-label="Tutup" onClick={() => setShowDrawer(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div>
                  <label htmlFor="branch-name" className={label}>Nama cabang / toko *</label>
                  <input id="branch-name" maxLength={100} autoFocus value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Contoh: Plaza Indonesia, Bali Boutique" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <span className={label}>PT</span>
                  <SearchableSelect value={formData.company_id} onChange={companyId => setFormData(prev => {
                    const brand = brands.find(b => String(b.id) === String(prev.brand_id));
                    const keepBrand = !companyId || !brand?.company_id || String(brand.company_id) === String(companyId);
                    return { ...prev, company_id: companyId, brand_id: keepBrand ? prev.brand_id : '' };
                  })} options={companies} placeholder="Semua PT (universal)" allOptionLabel="Semua PT (universal)" searchPlaceholder="Cari PT..." />
                </div>
                <div>
                  <span className={label}>Brand</span>
                  <SearchableSelect value={formData.brand_id} onChange={brandId => setFormData(prev => {
                    const brand = brands.find(b => String(b.id) === String(brandId));
                    return { ...prev, brand_id: brandId, company_id: brand?.company_id ? String(brand.company_id) : prev.company_id };
                  })} options={brandsFor(formData.company_id)} placeholder="Semua brand (universal)" allOptionLabel="Semua brand (universal)" searchPlaceholder="Cari brand..." subtitleKey="company_name" />
                  <p className="mt-1 text-[10px] text-slate-400">Memilih brand otomatis mengisi PT pemilik brand tersebut.</p>
                </div>
                {editingItem && isUsed(editingItem) && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">Cabang ini dipakai di {editingItem.usage_locked + editingItem.usage_draft} item plan. Perubahan nama akan terlihat di plan tersebut.</p>}
                {formError && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{formError}</div>}
              </form>
              <div className="flex gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                <button type="button" onClick={() => setShowDrawer(false)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Batal</button>
                <button type="button" onClick={handleSubmit} disabled={submitting || !formData.name.trim()} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer">{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Simpan</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} className="relative w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><Trash2 className="h-5 w-5" /></span>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hapus cabang?</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">“{deleteTarget.name}” akan dihapus permanen.{draftConfirm > 0 && ` Referensinya di ${draftConfirm} item plan Draft akan dikosongkan.`}</p>
              </div>
              {deleteError && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{deleteError}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setDeleteTarget(null)} className="h-9 flex-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">Batal</button>
                <button type="button" onClick={handleDeleteConfirm} disabled={submitting} className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer">{submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Hapus</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
