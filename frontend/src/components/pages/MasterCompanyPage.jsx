'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Hash,
  MapPin,
  FileText,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

// ─── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color = 'indigo', delay = 0 }) {
  const colors = {
    indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
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

// ─── Sector Badge ───────────────────────────────────────────────────────────────
function SectorBadge({ sector }) {
  if (!sector) return <span className="text-neutral-400 text-xs">—</span>;
  
  const sectorColors = {
    'General': 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'Media': 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
    'F&B': 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
    'Radio': 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    'Retail': 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400',
  };

  const colorClass = sectorColors[sector] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';

  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${colorClass}`}>
      {sector}
    </span>
  );
}

export default function MasterCompanyPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterActive, setFilterActive] = useState('');

  // Drawers
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    npwp: '',
    address: ''
  });

  // ── Fetch companies ──
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.get('/api/master/companies', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          is_active: filterActive || undefined
        }
      });

      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterActive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(t);
  }, [search]);

  // ── Stats ──
  const totalCompanies = meta.total || 0;
  const activeCompanies = data.filter(c => c.is_active).length;
  const inactiveCompanies = data.filter(c => !c.is_active).length;

  // ── Handlers ──
  const openAdd = () => {
    setEditingCompany(null);
    setFormData({ code: '', name: '', npwp: '', address: '' });
    setShowForm(true);
  };

  const openEdit = (company) => {
    setEditingCompany(company);
    setFormData({
      code: company.code || '',
      name: company.name || '',
      npwp: company.npwp || '',
      address: company.address || ''
    });
    setShowForm(true);
    setSelectedCompany(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);

      if (editingCompany) {
        await apiClient.put(`/api/master/companies/${editingCompany.id}`, formData);
      } else {
        await apiClient.post('/api/master/companies', formData);
      }

      setShowForm(false);
      setEditingCompany(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (company) => {
    try {
      await apiClient.put(`/api/master/companies/${company.id}`, {
        is_active: !company.is_active
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (company) => {
    if (!confirm(`Hapus perusahaan "${company.name}"?\n\nJika memiliki data relasi, perusahaan akan di-nonaktifkan saja.`)) return;

    try {
      await apiClient.delete(`/api/master/companies/${company.id}`);
      fetchData();
      setSelectedCompany(null);
    } catch (err) {
      alert(err.message || 'Failed to delete company');
    }
  };

  const handleSeedCompanies = async () => {
    if (!confirm('Seed data 20 perusahaan MRA Group dari Helpdesk?\n\nData yang sudah ada tidak akan di-duplikasi.')) return;

    try {
      setSeeding(true);
      const res = await apiClient.post('/api/master/companies/seed');
      alert(res.message || 'Seed completed.');
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to seed companies');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-500" />
            Master Perusahaan
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Kelola data entitas perusahaan MRA Group
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seed Button */}
          <motion.button
            type="button"
            onClick={handleSeedCompanies}
            disabled={seeding}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-sm border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {seeding ? 'Seeding...' : 'Seed Helpdesk'}
          </motion.button>

          {/* Add Button */}
          <motion.button
            type="button"
            onClick={openAdd}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Perusahaan
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Perusahaan" value={totalCompanies} icon={Building2} color="indigo" delay={0.05} />
        <StatCard label="Aktif" value={activeCompanies} icon={CheckCircle} color="emerald" delay={0.1} />
        <StatCard label="Nonaktif" value={inactiveCompanies} icon={XCircle} color="rose" delay={0.15} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari nama, kode, atau NPWP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
          />
        </div>

        <select
          value={filterActive}
          onChange={e => { setFilterActive(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
        >
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="ml-3 text-sm text-neutral-500">Memuat data...</span>
        </div>
      )}

      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
        >
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button onClick={fetchData} className="ml-auto text-sm font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer">
            <RefreshCw className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Table */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Kode</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Nama Perusahaan</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:table-cell">NPWP</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Alamat</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                      <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Belum ada data perusahaan</p>
                      <p className="text-xs mt-1">Klik "Seed Helpdesk" untuk mengisi data awal</p>
                    </td>
                  </tr>
                ) : (
                  data.map((company, idx) => (
                    <motion.tr
                      key={company.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => setSelectedCompany(company)}
                      className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                          {company.code || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {company.name}
                        </p>
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 hidden md:table-cell font-mono text-xs">
                        {company.npwp || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 text-xs hidden lg:table-cell max-w-[200px] truncate">
                        {company.address || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {company.is_active ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3 h-3" /> Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <motion.button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(company)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </motion.button>
                          <motion.button
                            type="button"
                            title={company.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            onClick={() => handleToggleActive(company)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              company.is_active
                                ? 'text-emerald-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-500/10'
                                : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10'
                            }`}
                          >
                            {company.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                          </motion.button>
                          <motion.button
                            type="button"
                            title="Hapus"
                            onClick={() => handleDelete(company)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Halaman {meta.page} dari {meta.totalPages} • {meta.total} perusahaan
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 px-2">{meta.page}</span>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Detail Drawer ── */}
      <AnimatePresence>
        {selectedCompany && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setSelectedCompany(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-950 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
                <h2 className="font-bold text-neutral-900 dark:text-white">Detail Perusahaan</h2>
                <button onClick={() => setSelectedCompany(null)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Company name header */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                      {selectedCompany.code || 'N/A'}
                    </span>
                    {selectedCompany.is_active ? (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Nonaktif
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">{selectedCompany.name}</h3>
                </div>

                {/* Detail fields */}
                <div className="space-y-3">
                  <DetailRow icon={Hash} label="NPWP" value={selectedCompany.npwp || '—'} />
                  <DetailRow icon={MapPin} label="Alamat" value={selectedCompany.address || '—'} />
                  <DetailRow icon={FileText} label="Terdaftar" value={
                    selectedCompany.created_at
                      ? new Date(selectedCompany.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'
                  } />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => openEdit(selectedCompany)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(selectedCompany)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Add/Edit Form Drawer ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-950 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
                <h2 className="font-bold text-neutral-900 dark:text-white">
                  {editingCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan'}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <FormField
                  label="Kode Perusahaan"
                  placeholder="MRA"
                  value={formData.code}
                  onChange={v => setFormData(d => ({ ...d, code: v }))}
                />
                <FormField
                  label="Nama Perusahaan *"
                  placeholder="PT Mugi Rekso Abadi"
                  value={formData.name}
                  onChange={v => setFormData(d => ({ ...d, name: v }))}
                  required
                />
                <FormField
                  label="NPWP"
                  placeholder="01.234.567.8-901.000"
                  value={formData.npwp}
                  onChange={v => setFormData(d => ({ ...d, npwp: v }))}
                />
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Alamat
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData(d => ({ ...d, address: e.target.value }))}
                    placeholder="Jl. Gatot Subroto Kav. 36-38, Jakarta Selatan"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none transition-all"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !formData.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {editingCompany ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
      <Icon className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-neutral-800 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, placeholder, value, onChange, required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
      />
    </div>
  );
}
