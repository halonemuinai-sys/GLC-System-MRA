'use client';

import React from 'react';
import { Search } from 'lucide-react';

const SECTORS = [
  { value: 'GENERAL', label: 'GENERAL (Holding)' },
  { value: 'RETAIL', label: 'RETAIL' },
  { value: 'FB', label: 'FB (F&B)' },
  { value: 'MEDIA', label: 'MEDIA' },
  { value: 'RADIO', label: 'RADIO' }
];

export default function MasterCompanyFilters({
  activeTab,
  search,
  setSearch,
  filterActive,
  setFilterActive,
  filterSector,
  setFilterSector,
  t
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder={
            activeTab === 'companies' ? "Cari nama, kode, atau NPWP..." :
            activeTab === 'masters' ? "Cari nama legalitas..." : "Cari nama, cabang/lokasi, atau sektor..."
          }
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
        />
      </div>

      {activeTab === 'branches' && (
        <select
          value={filterSector}
          onChange={e => setFilterSector(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
        >
          <option value="ALL">Semua Sektor</option>
          {SECTORS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      )}

      {(activeTab === 'companies' || activeTab === 'branches') && (
        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
        >
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      )}
    </div>
  );
}
export { SECTORS };
