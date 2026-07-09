'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Loader2,
  Trash2
} from 'lucide-react';

export default function GaVehiclesDeleteModal({
  vehicleToDelete,
  setVehicleToDelete,
  confirmDeleteVehicle,
  submitting
}) {
  return (
    <AnimatePresence>
      {vehicleToDelete && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setVehicleToDelete(null)}
            className="fixed inset-0 bg-black/60 z-[999] backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl pointer-events-auto flex flex-col items-center text-center"
            >
              <div className="relative mb-4">
                <motion.div
                  className="absolute inset-0 rounded-full bg-red-500/10 dark:bg-red-500/20 blur-sm"
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <div className="relative w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-500 dark:text-red-400 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <h3 className="text-sm font-bold text-neutral-850 dark:text-neutral-100">Konfirmasi Hapus Kendaraan</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                Apakah Anda yakin ingin menghapus kendaraan <strong className="text-red-500 dark:text-red-400 font-bold">"{vehicleToDelete.plate_number}"</strong>? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>

              <div className="flex items-center gap-2.5 w-full mt-6">
                <button
                  type="button"
                  onClick={() => setVehicleToDelete(null)}
                  disabled={submitting}
                  className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-700 dark:text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteVehicle}
                  disabled={submitting}
                  className="flex-1 py-2 bg-red-650 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/25 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
