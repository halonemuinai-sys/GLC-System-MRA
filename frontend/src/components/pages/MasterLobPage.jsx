'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
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

export default function MasterLobPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [error, setError] = useState(null);

  // Filters and Searching
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Committed search
  const [page, setPage] = useState(1);

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

      const res = await apiClient.get('/api/master/lobs', {
        params: {
          page,
          limit: 10,
          search: searchQuery || undefined
        }
      });

      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 10, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch Line of Business.');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(search);
    setPage(1);
  };

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
        await apiClient.put(`/api/master/lobs/${editingItem.id}`, formData);
      } else {
        await apiClient.post('/api/master/lobs', formData);
      }

      setShowDrawer(false);
      fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save Line of Business.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      await apiClient.delete(`/api/master/lobs/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete Line of Business.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header dengan icon + judul + deskripsi */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-neutral-900 dark:text-white tracking-wide">Line of Business (LOB)</h1>
            <p className="text-xs text-neutral-455 dark:text-neutral-500 font-semibold mt-1">
              Kelola kategori Line of Business (LOB) / lini usaha untuk pemetaan detail transaksi budget program marketing.
            </p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition-all cursor-pointer shadow-lg shadow-blue-600/10"
        >
          <Plus className="w-4 h-4" /> Tambah LOB
        </button>
      </div>

      {/* 2. Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="bg-neutral-50 dark:bg-neutral-955 p-4.5 rounded-2xl border border-neutral-200/60 dark:border-neutral-850/80 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari LOB berdasarkan nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
          />
        </div>
        <button
          type="submit"
          className="w-full md:w-auto bg-neutral-900 dark:bg-white hover:bg-neutral-850 dark:hover:bg-neutral-100 text-white dark:text-neutral-955 text-xs font-extrabold px-6 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          Proses Data
        </button>
      </form>

      {/* 3. Summary Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard label="Total LOB Terdaftar" value={meta.total} icon={ClipboardList} color="blue" />
          <StatCard label="LOB Aktif" value={meta.total} icon={Sparkles} color="emerald" />
        </div>
      )}

      {/* 4. Data Content / Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs text-neutral-400 font-bold">Memuat daftar LOB...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20 p-5 rounded-2xl text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchData} className="mt-3 text-xs font-extrabold text-blue-600 flex items-center gap-1.5 mx-auto hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Ulangi Saja
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900/30 border border-neutral-200/60 dark:border-neutral-850/60 p-20 rounded-2xl text-center space-y-2">
          <ClipboardList className="w-10 h-10 text-neutral-350 dark:text-neutral-600 mx-auto" />
          <h4 className="text-sm font-black text-neutral-700 dark:text-neutral-300">Belum ada LOB terdaftar</h4>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto">Silakan tambahkan data master lini usaha baru untuk melengkapi kebutuhan budget pemasaran.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-850/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-955 border-b border-neutral-200 dark:border-neutral-850 text-neutral-450 dark:text-neutral-500 font-black uppercase tracking-wider">
                  <th className="px-6 py-3.5 w-16 text-center">ID</th>
                  <th className="px-6 py-3.5">Nama Line of Business (LOB)</th>
                  <th className="px-6 py-3.5 w-32 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-855 text-neutral-750 dark:text-neutral-300">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-955/25 transition-colors font-medium">
                    <td className="px-6 py-3.5 text-center text-neutral-400 font-bold">{item.id}</td>
                    <td className="px-6 py-3.5 font-bold text-neutral-800 dark:text-white">{item.name}</td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all cursor-pointer"
                          title="Ubah LOB"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                          title="Hapus LOB"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="px-6 py-4.5 bg-neutral-50 dark:bg-neutral-955/50 border-t border-neutral-100 dark:border-neutral-855 flex items-center justify-between">
              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-bold">
                Menampilkan Halaman {meta.page} dari {meta.totalPages} ({meta.total} LOB)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-white dark:hover:bg-neutral-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-white dark:hover:bg-neutral-900 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Slide-over Drawer for Add/Edit */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-neutral-900 z-50 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col"
            >
              <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                    {editingItem ? 'Edit LOB' : 'Tambah LOB Baru'}
                  </h3>
                  <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold mt-0.5">
                    {editingItem ? 'Perbarui data master lini bisnis' : 'Masukkan informasi lini bisnis baru'}
                  </p>
                </div>
                <button onClick={() => setShowDrawer(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-850 rounded-xl text-neutral-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="p-6 flex-1 space-y-4">
                  {formError && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-4 rounded-xl text-xs font-bold text-red-600 dark:text-red-400">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-555 uppercase tracking-wider block">
                      Nama Line of Business (LOB) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ name: e.target.value })}
                      placeholder="Masukkan nama LOB..."
                      className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-955/50 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDrawer(false)}
                    className="text-neutral-500 hover:text-neutral-755 dark:hover:text-white text-xs font-extrabold px-5 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-850 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-extrabold px-6 py-2.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-blue-600/10 flex items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Simpan LOB
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 6. Animated Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl text-center space-y-4"
              >
                <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">Konfirmasi Hapus</h4>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 font-semibold mt-1">
                    Apakah Anda yakin ingin menghapus LOB <span className="font-bold text-neutral-700 dark:text-neutral-200 font-bold">"{deleteTarget.name}"</span>? Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 text-neutral-500 hover:text-neutral-700 dark:hover:text-white text-xs font-extrabold py-3 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-850 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    disabled={submitting}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-extrabold py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/10 flex items-center justify-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Ya, Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
