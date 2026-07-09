'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CheckCircle,
  XCircle,
  Edit3,
  Trash2,
  Hash,
  MapPin,
  FileText
} from 'lucide-react';

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

export default function MasterCompanyDetailDrawer({
  selectedCompany,
  setSelectedCompany,
  openEditCompany,
  handleCompanyDelete
}) {
  return (
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
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-650 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg">
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

              <div className="space-y-3">
                <DetailRow icon={Hash} label="NPWP" value={selectedCompany.npwp || '—'} />
                <DetailRow icon={MapPin} label="Alamat" value={selectedCompany.address || '—'} />
                <DetailRow icon={FileText} label="Terdaftar" value={
                  selectedCompany.created_at
                    ? new Date(selectedCompany.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'
                } />
              </div>

              <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => openEditCompany(selectedCompany)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-650 text-white font-semibold text-sm hover:bg-indigo-750 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => handleCompanyDelete(selectedCompany)}
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
  );
}
