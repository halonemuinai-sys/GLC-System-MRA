'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Plus, Loader2, X, Tag } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

export default function SearchableBrandSelect({
  brands = [],
  value,
  onChange,
  selectedCompanyId = null,
  onBrandCreated = null,
  placeholder = 'Select Brand / Principal',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
        setCreateError(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Find currently selected brand
  const selectedBrand = useMemo(() => {
    return brands.find((b) => String(b.id) === String(value));
  }, [brands, value]);

  // Filter and group brands
  const { matchingCompanyBrands, otherMasterBrands } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = brands.filter((b) => {
      if (!q) return true;
      const bName = String(b.name || '').toLowerCase();
      const compName = String(b.m_company?.name || '').toLowerCase();
      const compCode = String(b.m_company?.code || '').toLowerCase();
      return bName.includes(q) || compName.includes(q) || compCode.includes(q);
    });

    if (!selectedCompanyId) {
      return { matchingCompanyBrands: [], otherMasterBrands: filtered };
    }

    const companyStr = String(selectedCompanyId);
    const matching = filtered.filter((b) => String(b.company_id) === companyStr);
    const others = filtered.filter((b) => String(b.company_id) !== companyStr);

    return { matchingCompanyBrands: matching, otherMasterBrands: others };
  }, [brands, searchQuery, selectedCompanyId]);

  // Check if search query exactly matches an existing brand name
  const exactMatchExists = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return brands.some((b) => String(b.name || '').trim().toLowerCase() === q);
  }, [brands, searchQuery]);

  // Handle Quick Create Brand into Master Data
  const handleCreateBrand = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    try {
      setCreating(true);
      setCreateError(null);

      const payload = {
        name: trimmed,
        company_id: selectedCompanyId ? parseInt(selectedCompanyId, 10) : null
      };

      const res = await apiClient.post('/api/master/brands', payload);

      if (res && res.id) {
        if (onBrandCreated) {
          onBrandCreated(res);
        }
        onChange(String(res.id));
        setSearchQuery('');
        setIsOpen(false);
      }
    } catch (err) {
      setCreateError(err.message || 'Gagal menambahkan brand baru.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full bg-neutral-50 dark:bg-neutral-955 border rounded-xl px-3.5 py-2.5 text-xs flex items-center justify-between transition-all select-none min-h-[38px] ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-800'
            : isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm cursor-pointer'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 truncate min-w-0 pr-2">
          <Tag className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          {selectedBrand ? (
            <span className="font-semibold text-neutral-850 dark:text-white truncate">
              {selectedBrand.name}
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
                onChange('');
                setSearchQuery('');
              }}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Hapus pilihan brand"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className={`text-[9px] text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[320px]"
          >
            {/* Search Input Bar */}
            <div className="p-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/50 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="Ketik untuk mencari dari Master Brands..."
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition-all"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
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
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/40 p-1">
              {/* Option: Default Clear */}
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setSearchQuery('');
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                  !value
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 font-medium'
                }`}
              >
                <span className="truncate">-- {placeholder} --</span>
                {!value && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>

              {/* Group 1: Matching Company Brands (if company is selected) */}
              {matchingCompanyBrands.length > 0 && (
                <div className="pt-1.5 pb-1">
                  <div className="px-2.5 py-1 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Brand Terdaftar pada PT Ini ({matchingCompanyBrands.length})
                  </div>
                  {matchingCompanyBrands.map((b) => {
                    const isSelected = String(b.id) === String(value);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          onChange(String(b.id));
                          setSearchQuery('');
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 font-medium'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block truncate font-bold text-xs">{b.name}</span>
                          {b.m_company && (
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block truncate">
                              {b.m_company.name}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Group 2: Other Master Brands */}
              {otherMasterBrands.length > 0 && (
                <div className="pt-1.5 pb-1">
                  {matchingCompanyBrands.length > 0 && (
                    <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Semua Brand Master Lainnya ({otherMasterBrands.length})
                    </div>
                  )}
                  {otherMasterBrands.map((b) => {
                    const isSelected = String(b.id) === String(value);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          onChange(String(b.id));
                          setSearchQuery('');
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 font-medium'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block truncate font-semibold text-xs">{b.name}</span>
                          {b.m_company && (
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block truncate">
                              {b.m_company.name}
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Empty state when no brands matched */}
              {matchingCompanyBrands.length === 0 && otherMasterBrands.length === 0 && (
                <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
                  <p className="font-semibold">Tidak ditemukan brand yang cocok</p>
                  {searchQuery && (
                    <p className="text-[10px] mt-0.5 text-neutral-400">
                      "{searchQuery}" belum ada di Master Brands
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Quick Add Brand to Master Data */}
            {!exactMatchExists && searchQuery.trim() && (
              <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/60 shrink-0">
                {createError && (
                  <p className="text-[10px] text-red-500 font-bold mb-1.5 px-1 truncate">{createError}</p>
                )}
                <button
                  type="button"
                  onClick={handleCreateBrand}
                  disabled={creating}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {creating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Daftarkan & Sync "{searchQuery.trim()}" ke Master Brands</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
