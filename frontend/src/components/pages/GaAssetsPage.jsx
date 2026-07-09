'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Box, 
  Search, 
  Plus, 
  X, 
  Calendar, 
  AlertTriangle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  MapPin, 
  Eye,
  EyeOff,
  Download,
  Upload,
  Activity,
  Edit3,
  Trash2,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

// Import sub-components
import GaAssetsSummaryDashboard from './GaAssetsSummaryDashboard';
import GaAssetsDetailDrawer from './GaAssetsDetailDrawer';
import GaAssetsFormDrawer from './GaAssetsFormDrawer';
import GaAssetsDeleteModal from './GaAssetsDeleteModal';
import GaAssetsImportModal from './GaAssetsImportModal';
import { handleExportPDF, handleExportExcel } from './GaAssetsExports';

// Searchable Dropdown for Companies (PT)
function SearchableCompanySelect({ companies, value, onChange, placeholder = 'Select Company (Type to search...)' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const selectedCompany = companies.find(c => String(c.id) === String(value));
  const filtered = companies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[38px] select-none"
      >
        <span className={selectedCompany ? 'text-neutral-850 dark:text-neutral-200 font-medium truncate' : 'text-neutral-400 truncate'}>
          {selectedCompany ? selectedCompany.name : placeholder}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchQuery('');
              }}
              className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[9px] text-neutral-400">▼</span>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-2 space-y-1">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-44 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setSearchQuery('');
                  setIsOpen(false);
                }}
                className="w-full text-left px-2.5 py-2 text-[11px] hover:bg-neutral-50 dark:hover:bg-neutral-800/45 text-neutral-400 transition-colors"
              >
                All Companies (PT)
              </button>
              {filtered.length === 0 ? (
                <div className="px-2.5 py-3 text-center text-xs text-neutral-400">
                  No companies found
                </div>
              ) : (
                filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setSearchQuery('');
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors font-medium ${
                      String(c.id) === String(value) ? 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400' : 'text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {c.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// SearchingRadarAnimation
function SearchingRadarAnimation() {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center select-none pointer-events-none mb-3">
      <div className="absolute w-36 h-36 rounded-full border border-indigo-500/20 dark:border-indigo-400/10 bg-indigo-500/5 dark:bg-indigo-400/5" />
      <div className="absolute w-44 h-44 rounded-full border border-violet-500/15 dark:border-violet-400/5" />
      <div className="absolute w-40 h-40 rounded-full border border-dashed border-indigo-500/30 dark:border-indigo-400/20" />
      <div className="absolute w-16 h-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-2xl flex items-center justify-center shadow-lg">
        <Box className="w-8 h-8 text-indigo-500" />
      </div>
    </div>
  );
}

export default function GaAssetsPage() {
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 15, totalPages: 1 });
  const [summary, setSummary] = useState({ totalAcquisitionCost: 0, goodConditionCount: 0, needRepairCount: 0, uniqueCompaniesCount: 0, categoryBreakdown: [] });
  const [showDashboard, setShowDashboard] = useState(true);
  const [assetToDelete, setAssetToDelete] = useState(null);
  const [globalHidePrices, setGlobalHidePrices] = useState(false);
  const [error, setError] = useState(null);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Excel Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [importErrors, setImportErrors] = useState([]);
  const [importPreview, setImportPreview] = useState([]);

  // Active filters (passed to the API)
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [statusId, setStatusId] = useState('');
  const [companyId, setCompanyId] = useState('');

  // Temporary filters (bound to UI controls)
  const [tempSearch, setTempSearch] = useState('');
  const [tempCategoryId, setTempCategoryId] = useState('');
  const [tempLocationId, setTempLocationId] = useState('');
  const [tempStatusId, setTempStatusId] = useState('');
  const [tempCompanyId, setTempCompanyId] = useState('');

  // Process control
  const [hasProcessed, setHasProcessed] = useState(false);

  // Dropdown options
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [companies, setCompanies] = useState([]);

  // Detail drawer & Add modal
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [editingAsset, setEditingAsset] = useState(null);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Asset Form State
  const [formData, setFormData] = useState({
    company_id: '',
    asset_name: '',
    asset_code: '',
    asset_category_id: '',
    asset_type_id: '',
    location_id: '',
    room: '',
    acquisition_date: '',
    acquisition_cost: '',
    useful_life_months: '',
    condition_id: 1, // Default Good
    status_id: 1, // Default Active
    details: '',
    information: '',
    reference_link: ''
  });

  // Fetch functions
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await apiClient.get('/api/ga/assets', {
        params: {
          page,
          limit: 15,
          search,
          categoryId: categoryId || undefined,
          locationId: locationId || undefined,
          statusId: statusId || undefined,
          companyId: companyId || undefined
        }
      });
      
      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 15, totalPages: 1 });
      const rawSummary = res.summary || { totalAcquisitionCost: 0, goodConditionCount: 0, needRepairCount: 0, uniqueCompaniesCount: 0 };
      if (rawSummary.categoryBreakdown) {
        rawSummary.categoryBreakdown = rawSummary.categoryBreakdown.map(item => ({
          ...item,
          count: Number(item.count || 0),
          value: Number(item.value || 0)
        }));
      }
      setSummary(rawSummary);
    } catch (err) {
      setError(err.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [cats, locs, stats, comps, conds] = await Promise.all([
        apiClient.get('/api/ga/assets-categories').catch(() => []),
        apiClient.get('/api/ga/assets-locations').catch(() => []),
        apiClient.get('/api/ga/assets-statuses').catch(() => []),
        apiClient.get('/api/master/companies/all').catch(() => []),
        apiClient.get('/api/ga/assets-conditions').catch(() => [])
      ]);
      setCategories(cats);
      setLocations(locs);
      setStatuses(stats);
      setCompanies(comps);
      setConditions(conds);
    } catch (err) {
      console.error('Failed to load filter options', err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    setLoading(false);

    const syncHidePrices = () => {
      setGlobalHidePrices(localStorage.getItem('hide-prices') === 'true');
    };
    syncHidePrices();
    window.addEventListener('hide-prices-changed', syncHidePrices);
    return () => window.removeEventListener('hide-prices-changed', syncHidePrices);
  }, []);

  useEffect(() => {
    if (hasProcessed) {
      fetchData();
    }
  }, [page, search, categoryId, locationId, statusId, companyId, hasProcessed]);

  const handleProcessFilter = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    setSearch(tempSearch);
    setCategoryId(tempCategoryId);
    setLocationId(tempLocationId);
    setStatusId(tempStatusId);
    setCompanyId(tempCompanyId);
    setHasProcessed(true);
  };

  const handleUploadImport = async () => {
    if (importPreview.length === 0) return;
    if (importErrors.length > 0) {
      alert('Silakan perbaiki error sebelum mengimpor.');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/api/ga/assets/bulk-import', {
        assets: importPreview
      });
      alert(`Berhasil mengimpor ${importPreview.length} aset.`);
      setShowImportModal(false);
      setImportPreview([]);
      setImportErrors([]);
      setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Gagal mengimpor data.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    if (!formData.company_id) {
      alert('Company is required.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        company_id: Number(formData.company_id),
        asset_category_id: formData.asset_category_id ? Number(formData.asset_category_id) : null,
        asset_type_id: formData.asset_type_id ? Number(formData.asset_type_id) : null,
        location_id: formData.location_id ? Number(formData.location_id) : null,
        condition_id: Number(formData.condition_id),
        status_id: Number(formData.status_id),
        acquisition_cost: formData.acquisition_cost ? Number(formData.acquisition_cost) : 0,
        useful_life_months: formData.useful_life_months ? Number(formData.useful_life_months) : null,
        acquisition_date: formData.acquisition_date ? new Date(formData.acquisition_date).toISOString() : null,
        reference_link: formData.reference_link || null
      };

      if (editingAsset) {
        await apiClient.put(`/api/ga/assets/${editingAsset.id}`, payload);
      } else {
        await apiClient.post('/api/ga/assets', payload);
      }
      
      handleCloseAddDrawer();
      if (!editingAsset) setPage(1);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditAsset = (asset) => {
    setEditingAsset(asset);
    setFormData({
      company_id: String(asset.company_id),
      asset_name: asset.asset_name || '',
      asset_code: asset.asset_code || '',
      asset_category_id: asset.asset_category_id ? String(asset.asset_category_id) : '',
      asset_type_id: asset.asset_type_id ? String(asset.asset_type_id) : '',
      location_id: asset.location_id ? String(asset.location_id) : '',
      room: asset.room || '',
      acquisition_date: asset.acquisition_date ? asset.acquisition_date.split('T')[0] : '',
      acquisition_cost: asset.acquisition_cost ? String(asset.acquisition_cost) : '',
      useful_life_months: asset.useful_life_months ? String(asset.useful_life_months) : '',
      condition_id: asset.condition_id || 1,
      status_id: asset.status_id || 1,
      details: asset.details || '',
      information: asset.information || '',
      reference_link: asset.reference_link || ''
    });
    setShowAddDrawer(true);
  };

  const handleCloseAddDrawer = () => {
    setShowAddDrawer(false);
    setEditingAsset(null);
    setFormData({
      company_id: '',
      asset_name: '',
      asset_code: '',
      asset_category_id: '',
      asset_type_id: '',
      location_id: '',
      room: '',
      acquisition_date: '',
      acquisition_cost: '',
      useful_life_months: '',
      condition_id: 1,
      status_id: 1,
      details: '',
      information: '',
      reference_link: ''
    });
  };

  const handleDeleteAsset = (asset) => {
    setAssetToDelete(asset);
  };

  const confirmDeleteAsset = async () => {
    if (!assetToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/ga/assets/${assetToDelete.id}`);
      fetchData();
      if (selectedAsset && selectedAsset.id === assetToDelete.id) {
        setSelectedAsset(null);
      }
      setAssetToDelete(null);
    } catch (err) {
      alert(err.message || 'Failed to delete asset');
    } finally {
      setSubmitting(false);
    }
  };

  const formatIDR = (val) => {
    if (globalHidePrices) return 'Rp \u2022\u2022\u2022\u2022\u2022\u2022';
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  const maskNum = (val) => {
    if (globalHidePrices) return '\u2022\u2022\u2022\u2022';
    return val;
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Box className="w-6 h-6 text-indigo-500" />
            {t('gaAssets_title')}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">Pengelolaan aset dan inventaris kantor di GLC MRA.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {hasProcessed && (
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-neutral-200 dark:border-neutral-800 shadow-sm w-fit"
            >
              {showDashboard ? (
                <>
                  <EyeOff className="w-4 h-4 text-neutral-500" />
                  Sembunyikan Grafik
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-neutral-500" />
                  Tampilkan Grafik
                </>
              )}
            </button>
          )}
          {hasProcessed && (
            <button
              onClick={() => handleExportExcel({ search, categoryId, locationId, statusId, companyId, companies, formatIDR, maskNum, setExportingExcel })}
              disabled={exportingExcel}
              className="flex items-center gap-2 px-4 py-2 bg-teal-650 hover:bg-teal-700 active:bg-teal-800 disabled:bg-teal-750 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-teal-600/20 w-fit"
            >
              {exportingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Excel...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4" />
                  {t('exportExcel')}
                </>
              )}
            </button>
          )}
          {hasProcessed && (
            <button
              onClick={() => handleExportPDF({ search, categoryId, locationId, statusId, companyId, companies, categories, locations, statuses, formatIDR, maskNum, setExportingPDF })}
              disabled={exportingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-750 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 w-fit"
            >
              {exportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export PDF
                </>
              )}
            </button>
          )}
          <button
            onClick={() => {
              setEditingAsset(null);
              setFormData({
                company_id: '',
                asset_name: '',
                asset_code: '',
                asset_category_id: '',
                asset_type_id: '',
                location_id: '',
                room: '',
                acquisition_date: '',
                acquisition_cost: '',
                useful_life_months: '',
                condition_id: 1,
                status_id: 1,
                details: '',
                information: ''
              });
              setShowAddDrawer(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 w-fit"
          >
            <Plus className="w-4 h-4" />
            {t('ga_addAsset')}
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20 w-fit"
          >
            <Upload className="w-4 h-4" />
            {t('importExcel')}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 rounded-2xl shadow-sm">
        <form onSubmit={handleProcessFilter} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder={t('ga_searchAssets')}
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
              />
            </div>
            
            <SearchableCompanySelect
              companies={companies}
              value={tempCompanyId}
              onChange={(val) => setTempCompanyId(val)}
              placeholder={t('allCompanies')}
            />

            <select
              value={tempCategoryId}
              onChange={(e) => setTempCategoryId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">{t('allCategories')}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={tempLocationId}
              onChange={(e) => setTempLocationId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">All Locations</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.full_name || l.building}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <div className="w-full sm:w-60">
              <select
                value={tempStatusId}
                onChange={(e) => setTempStatusId(e.target.value)}
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
              >
                <option value="">{t('allStatuses')}</option>
                {statuses.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {hasProcessed && (
                <button
                  type="button"
                  onClick={() => {
                    setTempSearch('');
                    setTempCategoryId('');
                    setTempLocationId('');
                    setTempStatusId('');
                    setTempCompanyId('');
                    setSearch('');
                    setCategoryId('');
                    setLocationId('');
                    setStatusId('');
                    setCompanyId('');
                    setHasProcessed(false);
                    setData([]);
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                >
                  {t('resetFilter')}
                </button>
              )}
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
              >
                <Activity className="w-4 h-4" />
                {t('processData')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {!hasProcessed ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[380px] overflow-hidden"
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
            <div className="absolute w-32 h-32 rounded-full bg-indigo-500/5 -top-10 -left-10 blur-2xl" />
            <div className="absolute w-44 h-44 rounded-full bg-violet-500/5 -bottom-16 -right-16 blur-2xl" />
          </div>

          <SearchingRadarAnimation />

          <h3 className="text-lg font-black text-neutral-800 dark:text-white relative z-10">
            Filter & Proses Data Aset
          </h3>
          
          <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-sm mt-3 leading-relaxed relative z-10">
            Pilih kriteria pencarian dan filter di atas, lalu klik tombol <strong className="text-indigo-500 font-bold">"Proses Data"</strong> untuk memuat data aset dan statistik ringkas.
          </p>
        </motion.div>
      ) : (
        <>
          <GaAssetsSummaryDashboard
            showDashboard={showDashboard}
            summary={summary}
            meta={meta}
            formatIDR={formatIDR}
            maskNum={maskNum}
            globalHidePrices={globalHidePrices}
            t={t}
          />

          {/* Main Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="text-xs text-neutral-400">{t('loading')}</span>
              </div>
            ) : error ? (
              <div className="py-20 text-center text-red-500 text-xs">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                {error}
              </div>
            ) : data.length === 0 ? (
              <div className="py-20 text-center text-neutral-400 text-xs">
                <Box className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                No assets found matching the criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-950/20 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-4">Code</th>
                      <th className="p-4">Asset Name</th>
                      <th className="p-4">Company</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Condition</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {data.map((asset, idx) => (
                      <tr 
                        key={asset.id} 
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
                      >
                        <td className="p-4 font-mono font-bold text-neutral-600 dark:text-neutral-400">{asset.asset_code || '-'}</td>
                        <td className="p-4 font-semibold text-neutral-800 dark:text-slate-200">{asset.asset_name}</td>
                        <td className="p-4 text-neutral-600 dark:text-neutral-400 font-medium">{asset.m_company?.name || '-'}</td>
                        <td className="p-4 text-neutral-500">{asset.m_asset_category?.name || '-'}</td>
                        <td className="p-4 text-neutral-500">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{asset.m_location ? `${asset.m_location.name} - ${asset.m_location.location}` : '-'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            asset.m_condition?.name?.toLowerCase().includes('bagus') 
                              ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400' 
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {asset.m_condition?.name || 'Bagus'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1.5 text-neutral-605 dark:text-slate-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            {asset.m_status?.name || 'Aktif'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {asset.reference_link && (
                              <a 
                                href={asset.reference_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                                title="Open Reference Document"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                            <button 
                              onClick={() => setSelectedAsset(asset)}
                              className="p-1 text-neutral-400 hover:text-indigo-550 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openEditAsset(asset)}
                              className="p-1 text-neutral-400 hover:text-indigo-550 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Edit Aset"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(asset)}
                              className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Aset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {meta.totalPages > 1 && (
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400 select-none">
                <span>Showing Page {meta.page} of {meta.totalPages} ({meta.total} items)</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page === meta.totalPages}
                    onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Details Slide-Over Drawer */}
      <GaAssetsDetailDrawer
        selectedAsset={selectedAsset}
        setSelectedAsset={setSelectedAsset}
        openEditAsset={openEditAsset}
        handleDeleteAsset={handleDeleteAsset}
        formatIDR={formatIDR}
      />

      {/* Add/Edit Asset Drawer */}
      <GaAssetsFormDrawer
        showAddDrawer={showAddDrawer}
        editingAsset={editingAsset}
        formData={formData}
        setFormData={setFormData}
        categories={categories}
        locations={locations}
        conditions={conditions}
        statuses={statuses}
        companies={companies}
        submitting={submitting}
        handleAddAsset={handleAddAsset}
        handleCloseAddDrawer={handleCloseAddDrawer}
      />

      {/* Custom Animated Delete Confirmation Modal */}
      <GaAssetsDeleteModal
        assetToDelete={assetToDelete}
        setAssetToDelete={setAssetToDelete}
        confirmDeleteAsset={confirmDeleteAsset}
        submitting={submitting}
      />

      {/* Excel Import Modal */}
      <GaAssetsImportModal
        showImportModal={showImportModal}
        setShowImportModal={setShowImportModal}
        categories={categories}
        locations={locations}
        conditions={conditions}
        statuses={statuses}
        companies={companies}
        submitting={submitting}
        handleUploadImport={handleUploadImport}
        importPreview={importPreview}
        setImportPreview={setImportPreview}
        importErrors={importErrors}
        setImportErrors={setImportErrors}
        importingFile={importingFile}
        setImportingFile={setImportingFile}
      />
    </div>
  );
}
