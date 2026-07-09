'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';

const SECTOR_COLORS = {
  GENERAL: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  MEDIA: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  FB: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
  RADIO: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  RETAIL: 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400'
};

export function SectorTag({ sector }) {
  if (!sector) return null;
  const colorClass = SECTOR_COLORS[sector.toUpperCase()] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';
  return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${colorClass}`}>{sector}</span>;
}

export default function SearchableCompanySelect({ companies, value, onChange, placeholder = 'Search or select company...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCompany = companies.find(c => String(c.id) === String(value));
  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[36px] select-none"
      >
        <span className="flex items-center gap-2 truncate">
          <span className={selectedCompany ? 'text-neutral-850 dark:text-neutral-200 font-medium truncate' : 'text-neutral-400 truncate'}>
            {selectedCompany ? selectedCompany.name : placeholder}
          </span>
          {selectedCompany && <SectorTag sector={selectedCompany.m_company_master?.sector} />}
        </span>
        <span className="text-[9px] text-neutral-400 flex-shrink-0">▼</span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 w-full mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-2 space-y-1"
            >
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Type to search company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-52 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-3 text-center text-xs text-neutral-400">No companies found</div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { onChange(c.id); setSearchQuery(''); setIsOpen(false); }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-955/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                        String(c.id) === String(value) ? 'bg-indigo-500/10' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${String(c.id) === String(value) ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                          {c.name}
                        </span>
                        <SectorTag sector={c.m_company_master?.sector} />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
