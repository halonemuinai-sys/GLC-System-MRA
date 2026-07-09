'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  ExternalLink,
  User
} from 'lucide-react';

export default function GaVehiclesDetailDrawer({
  selectedVehicle,
  setSelectedVehicle,
  handleOpenEdit,
  handleDeleteVehicle,
  isTaxNearExpiration,
  formatIDR
}) {
  return (
    <AnimatePresence>
      {selectedVehicle && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedVehicle(null)}
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
                <h3 className="font-bold text-neutral-800 dark:text-white text-sm">Vehicle Fleet Detail</h3>
                <button 
                  onClick={() => setSelectedVehicle(null)}
                  className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Plate Number</span>
                  <h2 className="text-xl font-black text-neutral-800 dark:text-white tracking-wide uppercase font-mono">{selectedVehicle.plate_number}</h2>
                  <span className="text-xs text-indigo-500 font-semibold block mt-1">{selectedVehicle.brand_model || 'Unknown model'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Vehicle Type</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium capitalize">{selectedVehicle.vehicle_type || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Manufacturing Year</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedVehicle.year || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Chassis Number</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium font-mono">{selectedVehicle.chassis_number || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Color</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium capitalize">{selectedVehicle.color || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Status</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedVehicle.status || 'Aktif'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Department</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedVehicle.department || '-'}</span>
                  </div>
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                {/* Operation Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Tax Payment Date</span>
                    <span className={`text-xs font-bold ${isTaxNearExpiration(selectedVehicle.tax_date) ? 'text-red-500' : 'text-neutral-800 dark:text-slate-200'}`}>
                      {selectedVehicle.tax_date ? new Date(selectedVehicle.tax_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Last Service Date</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">
                      {selectedVehicle.last_service_date ? new Date(selectedVehicle.last_service_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Biaya Pajak (PKB)</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-bold font-mono">
                      {formatIDR(selectedVehicle.last_km)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Holding Company</span>
                    <span className="text-xs text-neutral-800 dark:text-slate-200 font-medium">{selectedVehicle.m_company?.name || '-'}</span>
                  </div>
                </div>

                <div className="h-px bg-neutral-100 dark:bg-neutral-800" />

                {/* Description & Info */}
                <div>
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">Additional Info</span>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">{selectedVehicle.information || 'No info provided.'}</p>
                </div>

                {selectedVehicle.doc_url && (
                  <div className="bg-blue-50/50 dark:bg-blue-950/10 p-3 rounded-xl border border-blue-100/30 dark:border-blue-900/20 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block leading-none">Document Reference</span>
                        <span className="text-xs text-neutral-800 dark:text-slate-200 font-semibold truncate block mt-0.5">Vehicle Document</span>
                      </div>
                    </div>
                    <a
                      href={selectedVehicle.doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl text-[10px] transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-blue-500/20 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Link
                    </a>
                  </div>
                )}

                {/* Driver Info */}
                <div className="bg-neutral-50 dark:bg-neutral-950 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block mb-2">Assigned Driver</span>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-slate-200">{selectedVehicle.driver_name || 'No Dedicated Driver'}</h4>
                      <span className="text-[10px] text-neutral-400">{selectedVehicle.department || 'GA Department'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  handleOpenEdit(selectedVehicle);
                  setSelectedVehicle(null);
                }}
                className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-650 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-indigo-200/50 dark:border-indigo-900/30"
              >
                Edit Vehicle
              </button>
              <button
                type="button"
                onClick={() => handleDeleteVehicle(selectedVehicle)}
                className="flex-1 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center border border-red-200/50 dark:border-red-900/30"
              >
                Hapus Kendaraan
              </button>
              <button
                onClick={() => setSelectedVehicle(null)}
                className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 dark:bg-neutral-850 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
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
