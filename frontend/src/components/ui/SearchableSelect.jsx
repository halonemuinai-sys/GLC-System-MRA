'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Search, Check } from 'lucide-react';

// Dropdown pencarian generik untuk daftar { id, name, code? } — dipakai di berbagai
// halaman master data & filter (Company, Brand, LOB, dll) supaya tampilannya konsisten
// dan tidak bergantung pada <select> bawaan browser.
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- Pilih Opsi --',
  searchPlaceholder = 'Ketik untuk mencari...',
  emptyText = 'Tidak ditemukan data yang cocok',
  allOptionLabel = null,
  subtitleKey = null,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter options based on typed query
  const filteredOptions = options.filter((opt) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const matchName = opt.name?.toLowerCase().includes(q);
    const matchCode = opt.code?.toLowerCase().includes(q);
    const matchSub = subtitleKey && opt[subtitleKey]?.toLowerCase().includes(q);
    return Boolean(matchName || matchCode || matchSub);
  });

  const handleSelect = (id) => {
    onChange(id ? String(id) : '');
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setQuery('');
          }
        }}
        className={`w-full bg-neutral-50 dark:bg-neutral-900 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between transition-all select-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-800'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm cursor-pointer'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
          {selectedOption ? (
            <span className="font-semibold text-neutral-900 dark:text-white truncate">
              {selectedOption.name}
              {selectedOption.code ? ` (${selectedOption.code})` : ''}
            </span>
          ) : (
            <span className="text-neutral-400 dark:text-neutral-500 font-medium truncate">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Hapus pilihan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-blue-500' : ''
            }`}
          />
        </div>
      </div>

      {/* Popover Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden"
            style={{ maxHeight: '280px' }}
          >
            {/* Search Input Bar */}
            <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
                {query && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2.5 p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/40 p-1">
              {allOptionLabel && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    !value
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 font-medium'
                  }`}
                >
                  <span className="truncate">{allOptionLabel}</span>
                  {!value && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              )}

              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
                  <p className="font-semibold">{emptyText}</p>
                  {query && <p className="text-[10px] mt-0.5 text-neutral-400">"{query}"</p>}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.id) === String(value);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelect(opt.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                          : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 font-medium'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="block truncate">{opt.name}</span>
                        {opt.code && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono block">
                            Kode: {opt.code}
                          </span>
                        )}
                        {subtitleKey && opt[subtitleKey] && (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block truncate">
                            {opt[subtitleKey]}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
