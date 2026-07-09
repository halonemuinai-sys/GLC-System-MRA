'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, User } from 'lucide-react';

export default function GaAssetsDetailDrawer({ selectedAsset, setSelectedAsset, openEditAsset, handleDeleteAsset, formatIDR }) {
  return (
    <AnimatePresence>
      {selectedAsset && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAsset(null)}
            className="fixed inset-0 bg-black z-40"
          />
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 p-6 overflow-y-auto flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Asset Detail</h3>
                <button 
                  onClick={() => setSelectedAsset(null)}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Asset Name</span>
                  <h2 className="text-lg font-black text-neutral-800 dark:text-white">{selectedAsset.asset_name}</h2>
                  <span className="font-mono text-xs text-indigo-500 font-semibold block mt-1">{selectedAsset.asset_code || 'No Code'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Category</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_asset_category?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Asset Type</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_asset_type?.name || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Location</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                      {selectedAsset.m_location ? `${selectedAsset.m_location.name} - ${selectedAsset.m_location.location}` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Room</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.room || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Condition</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_condition?.name || 'Bagus'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_status?.name || 'Aktif'}</span>
                  </div>
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                {/* Financials / Useful life */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Acquisition Cost</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatIDR(selectedAsset.acquisition_cost)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Acquisition Date</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                      {selectedAsset.acquisition_date ? new Date(selectedAsset.acquisition_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Useful Life</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                      {selectedAsset.useful_life_months ? `${selectedAsset.useful_life_months} Months` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Company</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedAsset.m_company?.name || '-'}</span>
                  </div>
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                {/* Description & Info */}
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Details</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedAsset.details || 'No details provided.'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Additional Info</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedAsset.information || '-'}</p>
                </div>

                {selectedAsset.reference_link && (
                  <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block leading-none">Document Reference</span>
                        <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold truncate block mt-0.5">Google Drive Document</span>
                      </div>
                    </div>
                    <a
                      href={selectedAsset.reference_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/20 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Link
                    </a>
                  </div>
                )}

                {/* PIC Info */}
                <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">Person In Charge (PIC)</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedAsset.m_user?.full_name || 'GA Department'}</h4>
                      <span className="text-[10px] text-neutral-400">{selectedAsset.m_user?.email || 'ga@mraretail.co.id'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedAsset(null);
                  openEditAsset(selectedAsset);
                }}
                className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-indigo-200/50 dark:border-indigo-900/30"
              >
                Edit Aset
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAsset(selectedAsset)}
                className="flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-red-200/50 dark:border-red-900/30"
              >
                Hapus Aset
              </button>
              <button
                onClick={() => setSelectedAsset(null)}
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-350 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Close Detail
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
