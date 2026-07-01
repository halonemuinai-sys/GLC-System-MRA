'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
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
  RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

// ─── Stat Card Component ────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = 'blue', delay = 0 }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl p-5 hover:shadow-lg hover:shadow-neutral-200/40 dark:hover:shadow-neutral-950/30 transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function MarketingBranchPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  // Filters and Searching
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // UI state
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ name: '' });

  // ── Fetch Data ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/marketing/branches');
      setData(res || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data lokasi/cabang.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered and paginated data
  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Open Drawer for Add
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ name: '' });
    setFormError(null);
    setShowDrawer(true);
  };

  // Open Drawer for Edit
  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ name: item.name });
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

      if (editingItem) {
        await apiClient.put(`/api/marketing/branches/${editingItem.id}`, formData);
      } else {
        await apiClient.post('/api/marketing/branches', formData);
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
      await apiClient.delete(`/api/marketing/branches/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Gagal menghapus cabang.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-black text-neutral-900 dark:text-white tracking-tight">
              Manajemen Lokasi / Cabang
            </h1>
          </div>
          <p className="text-xs text-neutral-450 dark:text-neutral-500 mt-1">
            Konfigurasi daftar lokasi / cabang pemasaran untuk alokasi anggaran anggaran.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/15 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tambah Lokasi
        </motion.button>
      </div>

      {/* ── Summary Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Total Lokasi / Cabang"
          value={data.length}
          icon={MapPin}
          color="blue"
          delay={0.05}
        />
        <StatCard
          label="Hasil Pencarian"
          value={filteredData.length}
          icon={Sparkles}
          color="emerald"
          delay={0.1}
        />
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-450" />
          <input
            type="text"
            placeholder="Cari lokasi / cabang..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          />
        </div>

        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-neutral-500 hover:text-neutral-750 dark:text-neutral-450 dark:hover:text-white border border-neutral-200 dark:border-neutral-850 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Segarkan Data
        </button>
      </div>

      {/* ── Data Table Section ── */}
      <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">Memuat data lokasi...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
            <AlertTriangle className="w-8 h-8" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <MapPin className="w-8 h-8 text-neutral-300 dark:text-neutral-700" />
            <p className="text-xs text-neutral-450 font-bold">Tidak ada lokasi ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200/60 dark:border-neutral-800 text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider">
                  <th className="px-6 py-3.5 w-[15%]">ID</th>
                  <th className="px-6 py-3.5 w-[65%]">Nama Lokasi / Cabang</th>
                  <th className="px-6 py-3.5 w-[20%] text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 font-medium text-neutral-700 dark:text-neutral-300">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-550/5 dark:hover:bg-neutral-950/10 transition-colors">
                    <td className="px-6 py-3.5 text-neutral-400 font-mono font-bold">#{item.id}</td>
                    <td className="px-6 py-3.5 font-bold text-neutral-850 dark:text-white">{item.name}</td>
                    <td className="px-6 py-3.5 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Edit Lokasi"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Lokasi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
              Menampilkan {Math.min(filteredData.length, (page - 1) * itemsPerPage + 1)} - {Math.min(filteredData.length, page * itemsPerPage)} dari {filteredData.length} Lokasi
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-neutral-700 dark:text-neutral-350 px-2">
                Halaman {page} dari {totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
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
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-850 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-neutral-850 dark:text-white">
                      {editingItem ? 'Edit Lokasi / Cabang' : 'Tambah Lokasi / Cabang Baru'}
                    </h3>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                      {editingItem ? 'Ubah data nama cabang saat ini.' : 'Daftarkan data nama lokasi / cabang baru.'}
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                      Nama Lokasi / Cabang *
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Jakarta Timur, Bali Seminyak"
                      value={formData.name}
                      onChange={(e) => setFormData({ name: e.target.value })}
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                      required
                      autoFocus
                    />
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
                  Apakah Anda yakin ingin menghapus lokasi/cabang <span className="font-bold text-neutral-700 dark:text-white">"{deleteTarget.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
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
