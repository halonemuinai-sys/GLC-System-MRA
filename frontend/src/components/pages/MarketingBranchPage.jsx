'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  Building2,
  Tag,
  Globe,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

// ─── Stat Card Component ────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = 'blue', delay = 0 }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    neutral: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl p-4.5 hover:shadow-lg hover:shadow-neutral-200/40 dark:hover:shadow-neutral-950/30 transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function MarketingBranchPage() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState(null);

  // Filters and Searching
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // UI state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    company_id: '',
    brand_id: ''
  });

  // ── Fetch Data & Metadata ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [resBranches, resMeta] = await Promise.all([
        apiClient.get('/api/marketing/branches'),
        apiClient.get('/api/marketing/metadata')
      ]);
      setData(resBranches || []);
      if (resMeta) {
        setCompanies(resMeta.companies || []);
        setBrands(resMeta.brands || []);
      }
    } catch (err) {
      setError(err.message || 'Gagal memuat data cabang sasaran.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered and paginated data
  const filteredData = data.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCompany = !filterCompany || String(item.company_id) === String(filterCompany);
    const matchBrand = !filterBrand || String(item.brand_id) === String(filterBrand);
    return matchSearch && matchCompany && matchBrand;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const boundCount = data.filter((d) => d.company_id || d.brand_id).length;
  const universalCount = data.filter((d) => !d.company_id && !d.brand_id).length;
  const hasActiveFilters = Boolean(search || filterCompany || filterBrand);

  // Open Drawer for Add
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', company_id: '', brand_id: '' });
    setFormError(null);
    setShowDrawer(true);
  };

  // Open Drawer for Edit
  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      company_id: item.company_id ? String(item.company_id) : '',
      brand_id: item.brand_id ? String(item.brand_id) : ''
    });
    setFormError(null);
    setShowDrawer(true);
  };

  // Handle Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      setFormError(null);

      const payload = {
        name: formData.name.trim(),
        company_id: formData.company_id ? parseInt(formData.company_id, 10) : null,
        brand_id: formData.brand_id ? parseInt(formData.brand_id, 10) : null
      };

      if (editingItem) {
        await apiClient.put(`/api/marketing/branches/${editingItem.id}`, payload);
      } else {
        await apiClient.post('/api/marketing/branches', payload);
      }

      setShowDrawer(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan data cabang.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      setDeleteError(null);
      await apiClient.delete(`/api/marketing/branches/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      setDeleteError(err.message || 'Gagal menghapus cabang.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setFilterCompany('');
    setFilterBrand('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ── Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
              {t('marketing_branch_title')}
            </h1>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Konfigurasi daftar cabang / toko fisik sasaran berdasarkan Entitas PT dan Brand ritel terkait.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/15 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Cabang
        </motion.button>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Cabang Toko"
          value={data.length}
          icon={Building}
          color="blue"
          delay={0.02}
        />
        <StatCard
          label="Terikat PT / Brand"
          value={boundCount}
          icon={Building2}
          color="indigo"
          delay={0.05}
        />
        <StatCard
          label="Toko Universal"
          value={universalCount}
          icon={Globe}
          color="neutral"
          delay={0.08}
        />
        <StatCard
          label="Hasil Filter"
          value={filteredData.length}
          icon={Sparkles}
          color="emerald"
          delay={0.11}
        />
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 items-stretch sm:items-center">
          {/* Search by name */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder={t('marketing_branch_search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Filter by Company */}
          <div className="w-full sm:w-48">
            <select
              value={filterCompany}
              onChange={(e) => {
                setFilterCompany(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            >
              <option value="">Semua Perusahaan (PT)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Brand */}
          <div className="w-full sm:w-44">
            <select
              value={filterBrand}
              onChange={(e) => {
                setFilterBrand(e.target.value);
                setPage(1);
              }}
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            >
              <option value="">Semua Brand</option>
              {brands
                .filter((b) => {
                  if (!filterCompany) return true;
                  return !b.company_id || String(b.company_id) === String(filterCompany);
                })
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <button
          onClick={fetchData}
          className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-750 dark:text-neutral-450 dark:hover:text-white border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-all cursor-pointer self-stretch sm:self-auto shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('marketing_branch_refresh')}
        </button>
      </div>

      {/* ── Data Table Section ── */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Memuat data cabang...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Building className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
            <p className="text-xs text-neutral-450 font-bold">Tidak ada cabang ditemukan.</p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Reset semua filter pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-955 border-b border-neutral-200/60 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider">
                  <th className="px-6 py-3.5 w-[10%]">ID</th>
                  <th className="px-6 py-3.5 w-[32%]">{t('marketing_branch_colName')}</th>
                  <th className="px-6 py-3.5 w-[26%]">{t('marketing_branch_colCompany')}</th>
                  <th className="px-6 py-3.5 w-[20%]">{t('marketing_branch_colBrand')}</th>
                  <th className="px-6 py-3.5 w-[12%] text-center">{t('marketing_branch_colAction')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 font-medium text-neutral-700 dark:text-neutral-300">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-500/5 dark:hover:bg-neutral-950/20 transition-colors">
                    <td className="px-6 py-3.5 text-neutral-400 font-mono font-bold">#{item.id}</td>
                    <td className="px-6 py-3.5 font-bold text-neutral-850 dark:text-white">
                      <span>{item.name}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      {item.m_company ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{item.m_company.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/60">
                          <Globe className="w-3 h-3 text-neutral-400 shrink-0" />
                          Semua PT (Universal)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {item.m_brand ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                          <Tag className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{item.m_brand.name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/60">
                          <Globe className="w-3 h-3 text-neutral-400 shrink-0" />
                          Semua Brand (Universal)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Edit Cabang & Setup"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(item);
                            setDeleteError(null);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Cabang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ── */}
        {!loading && filteredData.length > 0 && (
          <div className="bg-neutral-50 dark:bg-neutral-950/40 border-t border-neutral-200/60 dark:border-neutral-800 px-6 py-3.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-450 dark:text-neutral-500">
              Menampilkan {Math.min(filteredData.length, (page - 1) * itemsPerPage + 1)} - {Math.min(filteredData.length, page * itemsPerPage)} dari {filteredData.length} Cabang
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-350 px-2">
                Halaman {page} dari {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Slide-over Drawer (Add/Edit Form) ── */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-black z-45"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-neutral-950 border-l border-neutral-200 dark:border-neutral-850 z-50 shadow-2xl p-6 flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-850 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-neutral-850 dark:text-white">
                      {editingItem ? 'Edit Cabang Sasaran' : 'Tambah Cabang Sasaran Baru'}
                    </h3>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {editingItem
                        ? 'Konfigurasi nama cabang serta tautan entitas PT & Brand.'
                        : 'Daftarkan nama cabang baru dan tautkan ke PT atau Brand jika spesifik.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDrawer(false)}
                    className="p-1.5 text-neutral-450 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nama Cabang */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-wider block">
                      Nama Cabang / Toko Fisik *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Plaza Indonesia, Bali Boutique, Senayan City"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      required
                      autoFocus
                    />
                  </div>

                  {/* Entitas PT / Perusahaan */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-wider block">
                      Entitas Perusahaan (PT)
                    </label>
                    <select
                      value={formData.company_id}
                      onChange={(e) => {
                        const newCompanyId = e.target.value;
                        setFormData((prev) => {
                          let newBrandId = prev.brand_id;
                          if (newCompanyId && prev.brand_id) {
                            const currentBrand = brands.find((b) => String(b.id) === String(prev.brand_id));
                            if (currentBrand && currentBrand.company_id && String(currentBrand.company_id) !== String(newCompanyId)) {
                              newBrandId = '';
                            }
                          }
                          return { ...prev, company_id: newCompanyId, brand_id: newBrandId };
                        });
                      }}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                    >
                      <option value="">-- Universal / Berlaku untuk Semua PT --</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.code ? `(${c.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand Ritel */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 tracking-wider block">
                        Brand / Principal
                      </label>
                      {formData.company_id && (
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold">
                          ✓ Tersinkronisasi dengan PT
                        </span>
                      )}
                    </div>
                    <select
                      value={formData.brand_id}
                      onChange={(e) => {
                        const newBrandId = e.target.value;
                        setFormData((prev) => {
                          let newCompanyId = prev.company_id;
                          if (newBrandId) {
                            const selectedBrand = brands.find((b) => String(b.id) === String(newBrandId));
                            if (selectedBrand && selectedBrand.company_id) {
                              newCompanyId = String(selectedBrand.company_id);
                            }
                          }
                          return { ...prev, brand_id: newBrandId, company_id: newCompanyId };
                        });
                      }}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium cursor-pointer"
                    >
                      <option value="">-- Universal / Berlaku untuk Semua Brand --</option>
                      {brands
                        .filter((b) => {
                          if (!formData.company_id) return true;
                          return !b.company_id || String(b.company_id) === String(formData.company_id);
                        })
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Petunjuk Setup Card */}
                  <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl text-blue-700 dark:text-blue-300 text-[11px] leading-relaxed flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                    <div>
                      <span className="font-bold block">Smart Filtering Setup:</span>
                      Jika PT dan/atau Brand dipilih, cabang toko ini akan otomatis difilter dan muncul saat user membuat rencana anggaran marketing untuk entitas/brand tersebut. Jika dibiarkan Universal, toko akan selalu muncul sebagai opsi di seluruh kampanye.
                    </div>
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl text-[10px] font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{formError}</span>
                    </div>
                  )}
                </form>
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-850 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-350 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !formData.name.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-sm w-full relative z-10 shadow-2xl space-y-4"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-800 dark:text-white">Konfirmasi Hapus Cabang</h4>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
                  Apakah Anda yakin ingin menghapus cabang sasaran <span className="font-bold text-neutral-700 dark:text-white">"{deleteTarget.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{deleteError}</span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-350 rounded-xl hover:bg-neutral-250 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
