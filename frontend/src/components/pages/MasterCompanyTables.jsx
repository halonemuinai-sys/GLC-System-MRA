'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  FolderKanban,
  CheckCircle,
  XCircle,
  Edit3,
  ToggleRight,
  ToggleLeft,
  Trash2,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

function SectorBadge({ sector }) {
  if (!sector) return <span className="text-neutral-400 text-xs">—</span>;
  
  const sectorColors = {
    'GENERAL': 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'MEDIA': 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
    'FB': 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
    'RADIO': 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    'RETAIL': 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400',
  };

  const colorClass = sectorColors[sector.toUpperCase()] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';

  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${colorClass}`}>
      {sector}
    </span>
  );
}

export default function MasterCompanyTables({
  activeTab,
  data,
  meta,
  page,
  setPage,
  setSelectedCompany,
  openEditCompany,
  handleToggleActiveCompany,
  handleCompanyDelete,
  openEditMaster,
  handleMasterDelete,
  openEditBranch,
  handleToggleActiveBranch,
  handleBranchDelete
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm"
    >
      <div className="overflow-x-auto">
        {activeTab === 'companies' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 bg-neutral-50/20 dark:bg-neutral-950/20 text-[10px] font-bold uppercase tracking-wider">
                <th className="text-left px-5 py-3.5">Kode</th>
                <th className="text-left px-5 py-3.5">Nama Perusahaan</th>
                <th className="text-left px-5 py-3.5 hidden md:table-cell">NPWP</th>
                <th className="text-left px-5 py-3.5 hidden lg:table-cell">Alamat</th>
                <th className="text-center px-5 py-3.5">Status</th>
                <th className="text-center px-5 py-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada data perusahaan utama</p>
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
                      <span className="font-mono text-xs font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                        {company.code || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {company.name}
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
                          onClick={() => openEditCompany(company)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          type="button"
                          title={company.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          onClick={() => handleToggleActiveCompany(company)}
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
                          onClick={() => handleCompanyDelete(company)}
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
        ) : activeTab === 'masters' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 bg-neutral-50/20 dark:bg-neutral-950/20 text-[10px] font-bold uppercase tracking-wider">
                <th className="text-left px-5 py-3.5">Nama Entitas Induk</th>
                <th className="text-left px-5 py-3.5">Sektor/Grup MRA</th>
                <th className="text-center px-5 py-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                    <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada data grup entitas induk</p>
                  </td>
                </tr>
              ) : (
                data.map((master, idx) => (
                  <motion.tr
                    key={master.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.04] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                      {master.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <SectorBadge sector={master.sector} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <motion.button
                          type="button"
                          title="Edit"
                          onClick={() => openEditMaster(master)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          type="button"
                          title="Hapus"
                          onClick={() => handleMasterDelete(master)}
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
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 bg-neutral-50/20 dark:bg-neutral-950/20 text-[10px] font-bold uppercase tracking-wider">
                <th className="text-left px-5 py-3.5">Nama Perusahaan</th>
                <th className="text-left px-5 py-3.5">Lokasi / Cabang</th>
                <th className="text-left px-5 py-3.5">Sektor/Grup</th>
                <th className="text-left px-5 py-3.5 hidden lg:table-cell">Entitas Induk</th>
                <th className="text-center px-5 py-3.5">Status</th>
                <th className="text-center px-5 py-3.5">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Belum ada data cabang operasional</p>
                  </td>
                </tr>
              ) : (
                data.map((branch, idx) => (
                  <motion.tr
                    key={branch.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.04] transition-colors"
                  >
                    <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white">
                      {branch.name}
                    </td>
                    <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-350 text-xs font-semibold">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                        {branch.location}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <SectorBadge sector={branch.sector} />
                    </td>
                    <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 text-xs hidden lg:table-cell font-bold">
                      {branch.m_company_master?.name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {branch.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <motion.button
                          type="button"
                          title="Edit"
                          onClick={() => openEditBranch(branch)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          type="button"
                          title={branch.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          onClick={() => handleToggleActiveBranch(branch)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            branch.is_active !== false
                              ? 'text-emerald-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-500/10'
                              : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10'
                          }`}
                        >
                          {branch.is_active !== false ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        </motion.button>
                        <motion.button
                          type="button"
                          title="Hapus"
                          onClick={() => handleBranchDelete(branch)}
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
        )}
      </div>

      {/* Pagination for Tab 1 */}
      {activeTab === 'companies' && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800 select-none">
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
            <span className="text-xs font-bold text-neutral-600 dark:text-neutral-350 px-2">{meta.page}</span>
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
  );
}
