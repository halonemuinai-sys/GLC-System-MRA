'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { SECTORS } from './MasterCompanyFilters';

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

export default function MasterCompanyFormDrawers({
  showCompanyForm,
  setShowCompanyForm,
  editingCompany,
  setEditingCompany,
  companyFormData,
  setCompanyFormData,
  handleCompanySubmit,

  showMasterForm,
  setShowMasterForm,
  editingMaster,
  setEditingMaster,
  masterFormData,
  setMasterFormData,
  handleMasterSubmit,

  showBranchForm,
  setShowBranchForm,
  editingBranch,
  setEditingBranch,
  branchFormData,
  setBranchFormData,
  handleBranchSubmit,
  branchFormError,

  companiesList,
  masters,
  submitting
}) {
  return (
    <>
      {/* ── Company Add/Edit Form Drawer (Tab 1) ── */}
      <AnimatePresence>
        {showCompanyForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => {
                setShowCompanyForm(false);
                setEditingCompany(null);
              }}
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
                <button 
                  onClick={() => {
                    setShowCompanyForm(false);
                    setEditingCompany(null);
                  }} 
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCompanySubmit} className="p-5 space-y-4">
                <FormField
                  label="Kode Perusahaan"
                  placeholder="MRA"
                  value={companyFormData.code}
                  onChange={v => setCompanyFormData(d => ({ ...d, code: v }))}
                />
                <FormField
                  label="Nama Perusahaan *"
                  placeholder="PT Mugi Rekso Abadi"
                  value={companyFormData.name}
                  onChange={v => setCompanyFormData(d => ({ ...d, name: v }))}
                  required
                />
                <FormField
                  label="NPWP"
                  placeholder="01.234.567.8-901.000"
                  value={companyFormData.npwp}
                  onChange={v => setCompanyFormData(d => ({ ...d, npwp: v }))}
                />
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Grup Entitas Induk (Master Company)
                  </label>
                  <select
                    value={companyFormData.company_master_id}
                    onChange={e => setCompanyFormData(d => ({ ...d, company_master_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    <option value="">-- Tanpa Relasi Induk --</option>
                    {masters.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.sector})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Alamat
                  </label>
                  <textarea
                    value={companyFormData.address}
                    onChange={e => setCompanyFormData(d => ({ ...d, address: e.target.value }))}
                    placeholder="Jl. Gatot Subroto Kav. 36-38, Jakarta Selatan"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none transition-all"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompanyForm(false);
                      setEditingCompany(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !companyFormData.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-755 transition-colors cursor-pointer"
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

      {/* ── Master Group Add/Edit Drawer (Tab 2) ── */}
      <AnimatePresence>
        {showMasterForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => {
                setShowMasterForm(false);
                setEditingMaster(null);
              }}
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
                  {editingMaster ? 'Edit Master Company' : 'Tambah Master Company'}
                </h2>
                <button 
                  onClick={() => {
                    setShowMasterForm(false);
                    setEditingMaster(null);
                  }} 
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleMasterSubmit} className="p-5 space-y-4">
                <FormField
                  label="Nama Master Company (Grup MRA) *"
                  placeholder="Contoh: PT Media Insani Abadi"
                  value={masterFormData.name}
                  onChange={v => setMasterFormData(d => ({ ...d, name: v }))}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Sektor / Grup Bisnis MRA *
                  </label>
                  <select
                    value={masterFormData.sector}
                    onChange={e => setMasterFormData(d => ({ ...d, sector: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    {SECTORS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMasterForm(false);
                      setEditingMaster(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !masterFormData.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-755 transition-colors cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {editingMaster ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Branch Add/Edit Drawer (Tab 3) ── */}
      <AnimatePresence>
        {showBranchForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => {
                setShowBranchForm(false);
                setEditingBranch(null);
              }}
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
                  {editingBranch ? 'Edit Cabang' : 'Tambah Cabang'}
                </h2>
                <button 
                  onClick={() => {
                    setShowBranchForm(false);
                    setEditingBranch(null);
                  }} 
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBranchSubmit} className="p-5 space-y-4">
                {branchFormError && (
                  <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {branchFormError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Nama Perusahaan *
                  </label>
                  <input
                    type="text"
                    list="company-names-list"
                    placeholder="Contoh: PT Hourlogy Indah Perkasa"
                    value={branchFormData.name}
                    onChange={e => setBranchFormData(d => ({ ...d, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                    required
                  />
                  <datalist id="company-names-list">
                    {companiesList.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <FormField
                  label="Lokasi / Cabang Fisik *"
                  placeholder="Contoh: Butik OMEGA Plaza Indonesia atau HQ"
                  value={branchFormData.location}
                  onChange={v => setBranchFormData(d => ({ ...d, location: v }))}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Sektor / Grup MRA *
                  </label>
                  <select
                    value={branchFormData.sector}
                    onChange={e => setBranchFormData(d => ({ ...d, sector: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    {SECTORS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Legalitas Induk (Master Company)
                  </label>
                  <select
                    value={branchFormData.company_master_id}
                    onChange={e => setBranchFormData(d => ({ ...d, company_master_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    <option value="">-- Tanpa Relasi Induk --</option>
                    {masters.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBranchForm(false);
                      setEditingBranch(null);
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !String(branchFormData.name || '').trim() || !String(branchFormData.location || '').trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-755 transition-colors cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {editingBranch ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
