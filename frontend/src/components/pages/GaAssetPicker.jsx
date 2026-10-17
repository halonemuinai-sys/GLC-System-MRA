'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Search, CheckSquare, Square } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

// Shared asset picker for Berita Acara (BAP / BAST): company-scoped asset table
// with search + category/status filters. `selected` is a Map of id -> asset.
export default function GaAssetPicker({ companyId, selected, onChange }) {
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiClient.get('/api/ga/assets-categories').then(setCategories).catch(() => setCategories([]));
    apiClient.get('/api/ga/assets-statuses').then(setStatuses).catch(() => setStatuses([]));
  }, []);

  useEffect(() => {
    if (!companyId) { setAssets([]); return; }
    setLoading(true);
    const handle = setTimeout(() => {
      apiClient
        .get('/api/ga/assets', {
          params: {
            companyId,
            search: search || undefined,
            categoryId: categoryId || undefined,
            statusId: statusId || undefined,
            page: 1,
            limit: 200
          }
        })
        .then(res => setAssets(res.data || []))
        .catch(() => setAssets([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [companyId, search, categoryId, statusId]);

  function toggle(asset) {
    const next = new Map(selected);
    if (next.has(asset.id)) next.delete(asset.id);
    else next.set(asset.id, asset);
    onChange(next);
  }

  const allVisibleSelected = assets.length > 0 && assets.every(a => selected.has(a.id));

  function toggleAll() {
    const next = new Map(selected);
    if (allVisibleSelected) assets.forEach(a => next.delete(a.id));
    else assets.forEach(a => next.set(a.id, a));
    onChange(next);
  }

  if (!companyId) {
    return (
      <div className="text-center py-8 text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl">
        Select a company first to load its assets.
      </div>
    );
  }

  const inputCls = 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg py-1.5 text-xs';

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-2.5 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search asset name or code..."
            className={`w-full pl-8 pr-3 ${inputCls}`}
          />
        </div>
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={`px-2 ${inputCls}`}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusId} onChange={e => setStatusId(e.target.value)} className={`px-2 ${inputCls}`}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-neutral-400" /></div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-400">No assets found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white dark:bg-neutral-900">
              <tr className="border-b border-neutral-100 dark:border-neutral-800">
                <th className="p-2.5 w-8">
                  <button type="button" onClick={toggleAll} className="flex items-center">
                    {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-neutral-400" />}
                  </button>
                </th>
                <th className="p-2.5 text-left font-bold text-neutral-500">Code</th>
                <th className="p-2.5 text-left font-bold text-neutral-500">Asset Name</th>
                <th className="p-2.5 text-left font-bold text-neutral-500">Category</th>
                <th className="p-2.5 text-left font-bold text-neutral-500">Condition</th>
                <th className="p-2.5 text-left font-bold text-neutral-500">PIC</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr
                  key={a.id}
                  onClick={() => toggle(a)}
                  className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer"
                >
                  <td className="p-2.5">
                    {selected.has(a.id) ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-neutral-300" />}
                  </td>
                  <td className="p-2.5 font-mono text-neutral-600 dark:text-neutral-400">{a.asset_code || '-'}</td>
                  <td className="p-2.5 font-medium text-neutral-800 dark:text-neutral-200">{a.asset_name}</td>
                  <td className="p-2.5 text-neutral-500">{a.m_asset_category?.name || '-'}</td>
                  <td className="p-2.5 text-neutral-500">{a.m_condition?.name || '-'}</td>
                  <td className="p-2.5 text-neutral-500">{a.m_user?.full_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
