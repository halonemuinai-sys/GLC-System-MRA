'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  FolderKanban,
  CheckCircle,
  XCircle
} from 'lucide-react';

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

export default function MasterCompanyStats({ activeTab, totalCount, activeCount, inactiveCount }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard 
        label={
          activeTab === 'companies' ? "Total Perusahaan Utama" :
          activeTab === 'masters' ? "Total Master Company" : "Total Cabang & Lokasi"
        } 
        value={totalCount} 
        icon={activeTab === 'masters' ? FolderKanban : Building2} 
        color="indigo" 
        delay={0.05} 
      />
      <StatCard label="Aktif" value={activeCount} icon={CheckCircle} color="emerald" delay={0.1} />
      <StatCard label="Nonaktif" value={inactiveCount} icon={XCircle} color="rose" delay={0.15} />
    </div>
  );
}
