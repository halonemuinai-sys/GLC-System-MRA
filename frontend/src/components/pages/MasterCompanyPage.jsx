'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Plus,
  X,
  Edit3,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Hash,
  MapPin,
  FileText,
  AlertTriangle,
  RefreshCw,
  FolderKanban,
  Briefcase
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

// ─── Constants ──────────────────────────────────────────────────────────────────
const SECTORS = [
  { value: 'GENERAL', label: 'GENERAL (Holding)' },
  { value: 'RETAIL', label: 'RETAIL' },
  { value: 'FB', label: 'FB (F&B)' },
  { value: 'MEDIA', label: 'MEDIA' },
  { value: 'RADIO', label: 'RADIO' }
];

// ─── Stat Card ──────────────────────────────────────────────────────────────────
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

// ─── Sector Badge ───────────────────────────────────────────────────────────────
function SectorBadge({ sector }) {
  if (!sector) return <span className="text-neutral-400 text-xs">—</span>;
  
  const sectorColors = {
    'GENERAL': 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
    'MEDIA': 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
    'FB': 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
    'RADIO': 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    'RETAIL': 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400',
  };

  const colorClass = sectorColors[sector.toUpperCase()] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';

  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${colorClass}`}>
      {sector}
    </span>
  );
}

export default function MasterCompanyPage() {
  const [activeTab, setActiveTab] = useState('companies'); // 'companies' | 'masters' | 'branches'
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [error, setError] = useState(null);

  // Group Dropdown values
  const [masters, setMasters] = useState([]);
  const [companiesList, setCompaniesList] = useState([]); // original companies for selection
  const [branchesCount, setBranchesCount] = useState(0);
  const [mastersLoading, setMastersLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterActive, setFilterActive] = useState('');
  const [filterSector, setFilterSector] = useState('ALL');

  // Drawers and Modal states
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);

  const [showMasterForm, setShowMasterForm] = useState(false);
  const [editingMaster, setEditingMaster] = useState(null);

  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Form States
  const [companyFormData, setCompanyFormData] = useState({
    code: '',
    name: '',
    npwp: '',
    address: ''
  });

  const [masterFormData, setMasterFormData] = useState({
    name: '',
    sector: 'GENERAL'
  });

  const [branchFormData, setBranchFormData] = useState({
    name: '',
    location: '',
    sector: 'GENERAL',
    company_master_id: ''
  });

  // ── Fetch Dropdowns ──
  const fetchDropdowns = useCallback(async () => {
    try {
      setMastersLoading(true);
      const [resMasters, resCompanies, resBranches] = await Promise.all([
        apiClient.get('/api/master/companies/master'),
        apiClient.get('/api/master/companies/all'),
        apiClient.get('/api/master/companies/branch')
      ]);
      setMasters(resMasters || []);
      setCompaniesList(resCompanies || []);
      setBranchesCount(resBranches ? resBranches.length : 0);
    } catch (err) {
      console.error('Failed to fetch master company groups:', err);
    } finally {
      setMastersLoading(false);
    }
  }, []);

  // ── Fetch companies (Tab 1) ──
  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.get('/api/master/companies', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          is_active: filterActive || undefined
        }
      });

      setData(res.data || []);
      setMeta(res.meta || { total: 0, page: 1, limit: 20, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch companies');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterActive]);

  // ── Fetch company masters (Tab 2) ──
  const fetchMastersList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/master/companies/master');
      const filtered = res.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
      setData(filtered || []);
      setMeta({ total: filtered.length, page: 1, limit: 100, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to fetch parent groups');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // ── Fetch branches (Tab 3) ──
  const fetchBranchesList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.get('/api/master/companies/branch', {
        params: {
          search: search || undefined,
          is_active: filterActive || undefined,
          sector: filterSector !== 'ALL' ? filterSector : undefined
        }
      });

      setData(res || []);
      setMeta({ total: res.length, page: 1, limit: 100, totalPages: 1 });
      setBranchesCount(res ? res.length : 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  }, [search, filterActive, filterSector]);

  useEffect(() => {
    fetchDropdowns();
  }, [fetchDropdowns]);

  useEffect(() => {
    if (activeTab === 'companies') {
      fetchCompanies();
    } else if (activeTab === 'masters') {
      fetchMastersList();
    } else {
      fetchBranchesList();
    }
  }, [activeTab, fetchCompanies, fetchMastersList, fetchBranchesList]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === 'companies') setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search, activeTab]);

  // Reset filters on tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearch('');
    setFilterActive('');
    setFilterSector('ALL');
    setPage(1);
  };

  // ── Stats calculation ──
  const totalCount = meta.total || 0;
  const activeCount = data.filter(item => item.is_active !== false).length;
  const inactiveCount = data.filter(item => item.is_active === false).length;

  // ── Tab 1: Company Handlers ──
  const openAddCompany = () => {
    setEditingCompany(null);
    setCompanyFormData({
      code: '',
      name: '',
      npwp: '',
      address: ''
    });
    setShowCompanyForm(true);
  };

  const openEditCompany = (company) => {
    setEditingCompany(company);
    setCompanyFormData({
      code: company.code || '',
      name: company.name || '',
      npwp: company.npwp || '',
      address: company.address || ''
    });
    setShowCompanyForm(true);
    setSelectedCompany(null);
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    if (!companyFormData.name.trim()) return;

    try {
      setSubmitting(true);
      if (editingCompany) {
        await apiClient.put(`/api/master/companies/${editingCompany.id}`, companyFormData);
      } else {
        await apiClient.post('/api/master/companies', companyFormData);
      }
      setShowCompanyForm(false);
      setEditingCompany(null);
      fetchCompanies();
      fetchDropdowns();
    } catch (err) {
      alert(err.message || 'Failed to save company master');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActiveCompany = async (company) => {
    try {
      await apiClient.put(`/api/master/companies/${company.id}`, {
        is_active: !company.is_active
      });
      fetchCompanies();
    } catch (err) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleCompanyDelete = async (company) => {
    if (!confirm(`Hapus perusahaan "${company.name}"?\n\nJika memiliki data relasi, perusahaan akan di-nonaktifkan saja.`)) return;

    try {
      await apiClient.delete(`/api/master/companies/${company.id}`);
      fetchCompanies();
      setSelectedCompany(null);
    } catch (err) {
      alert(err.message || 'Failed to delete company');
    }
  };

  // ── Tab 2: Master Company Group Handlers ──
  const openAddMaster = () => {
    setEditingMaster(null);
    setMasterFormData({
      name: '',
      sector: 'GENERAL'
    });
    setShowMasterForm(true);
  };

  const openEditMaster = (master) => {
    setEditingMaster(master);
    setMasterFormData({
      name: master.name,
      sector: master.sector || 'GENERAL'
    });
    setShowMasterForm(true);
  };

  const handleMasterSubmit = async (e) => {
    e.preventDefault();
    if (!masterFormData.name.trim()) return;

    try {
      setSubmitting(true);
      if (editingMaster) {
        await apiClient.put(`/api/master/companies/master/${editingMaster.id}`, masterFormData);
      } else {
        await apiClient.post('/api/master/companies/master', masterFormData);
      }
      setShowMasterForm(false);
      setEditingMaster(null);
      fetchMastersList();
      fetchDropdowns();
    } catch (err) {
      alert(err.message || 'Failed to save master company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMasterDelete = async (master) => {
    if (!confirm(`Hapus Grup Entitas Induk "${master.name}"?`)) return;

    try {
      await apiClient.delete(`/api/master/companies/master/${master.id}`);
      fetchMastersList();
      fetchDropdowns();
    } catch (err) {
      alert(err.error || err.message || 'Failed to delete parent group. Make sure it is not linked to any companies.');
    }
  };

  // ── Tab 3: Branch Handlers ──
  const openAddBranch = () => {
    setEditingBranch(null);
    setBranchFormData({
      name: '',
      location: '',
      sector: 'GENERAL',
      company_master_id: ''
    });
    setShowBranchForm(true);
  };

  const openEditBranch = (branch) => {
    setEditingBranch(branch);
    setBranchFormData({
      name: branch.name,
      location: branch.location || '',
      sector: branch.sector || 'GENERAL',
      company_master_id: branch.company_master_id || ''
    });
    setShowBranchForm(true);
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    if (!branchFormData.name.trim() || !branchFormData.location.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        ...branchFormData,
        company_master_id: branchFormData.company_master_id ? parseInt(branchFormData.company_master_id) : null
      };

      if (editingBranch) {
        await apiClient.put(`/api/master/companies/branch/${editingBranch.id}`, payload);
      } else {
        await apiClient.post('/api/master/companies/branch', payload);
      }
      setShowBranchForm(false);
      setEditingBranch(null);
      fetchBranchesList();
    } catch (err) {
      alert(err.message || 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActiveBranch = async (branch) => {
    try {
      await apiClient.put(`/api/master/companies/branch/${branch.id}`, {
        is_active: !branch.is_active
      });
      fetchBranchesList();
    } catch (err) {
      alert(err.message || 'Failed to toggle branch status');
    }
  };

  const handleBranchDelete = async (branch) => {
    if (!confirm(`Hapus cabang "${branch.name} (${branch.location})"?`)) return;

    try {
      await apiClient.delete(`/api/master/companies/branch/${branch.id}`);
      fetchBranchesList();
    } catch (err) {
      alert(err.message || 'Failed to delete branch');
    }
  };

  // ── Seed Handler ──
  const handleSeedCompanies = async () => {
    if (!confirm('Seed data 20 perusahaan MRA Group dari Helpdesk?\n\nData yang sudah ada tidak akan di-duplikasi, cabang baru akan disesuaikan.')) return;

    try {
      setSeeding(true);
      const res = await apiClient.post('/api/master/companies/seed');
      alert(res.message || 'Seed completed.');
      if (activeTab === 'companies') fetchCompanies();
      else if (activeTab === 'masters') fetchMastersList();
      else fetchBranchesList();
      fetchDropdowns();
    } catch (err) {
      alert(err.message || 'Failed to seed companies');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-500" />
            Setup Company & Entitas
          </h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
            Manajemen legalitas perusahaan induk, pengelompokan grup usaha, dan pemetaan lokasi cabang fisik.
          </p>
        </div>

        <div className="flex items-center gap-2">

          {/* Add Button */}
          <motion.button
            type="button"
            onClick={
              activeTab === 'companies' ? openAddCompany :
              activeTab === 'masters' ? openAddMaster : openAddBranch
            }
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {
              activeTab === 'companies' ? 'Tambah Perusahaan' :
              activeTab === 'masters' ? 'Tambah Master Company' : 'Tambah Cabang Baru'
            }
          </motion.button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Navigation Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-850 gap-6">
        <button
          onClick={() => handleTabChange('companies')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition relative ${
            activeTab === 'companies'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
          }`}
        >
          Data Master Perusahaan ({companiesList.length || totalCount})
          {activeTab === 'companies' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('masters')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition relative ${
            activeTab === 'masters'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
          }`}
        >
          Grup Entitas Induk ({masters.length})
          {activeTab === 'masters' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('branches')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition relative ${
            activeTab === 'branches'
              ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
              : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300'
          }`}
        >
          Cabang & Lokasi Fisik ({branchesCount})
          {activeTab === 'branches' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Filters */}
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

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          <span className="ml-3 text-sm text-neutral-500">Memuat data...</span>
        </div>
      )}

      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
        >
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button 
            onClick={() => {
              if (activeTab === 'companies') fetchCompanies();
              else if (activeTab === 'masters') fetchMastersList();
              else fetchBranchesList();
            }} 
            className="ml-auto text-sm font-semibold text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Tables */}
      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-neutral-900/40 border border-neutral-200/70 dark:border-white/[0.06] rounded-2xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            {activeTab === 'companies' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Kode</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Nama Perusahaan</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden md:table-cell">NPWP</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Alamat</th>
                    <th className="text-center px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada data perusahaan utama</p>
                      </td>
                    </tr>
                  ) : (
                    data.map((company, idx) => (
                      <motion.tr
                        key={company.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setSelectedCompany(company)}
                        className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.04] transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md">
                            {company.code || '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {company.name}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 hidden md:table-cell font-mono text-xs">
                          {company.npwp || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 text-xs hidden lg:table-cell max-w-[200px] truncate">
                          {company.address || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {company.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full">
                              <XCircle className="w-3 h-3" /> Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <motion.button
                              type="button"
                              title="Edit"
                              onClick={() => openEditCompany(company)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              type="button"
                              title={company.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              onClick={() => handleToggleActiveCompany(company)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                company.is_active
                                  ? 'text-emerald-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-500/10'
                                  : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10'
                              }`}
                            >
                              {company.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            </motion.button>
                            <motion.button
                              type="button"
                              title="Hapus"
                              onClick={() => handleCompanyDelete(company)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : activeTab === 'masters' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Nama Entitas Induk</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Sektor/Grup MRA</th>
                    <th className="text-center px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                        <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada data grup entitas induk</p>
                      </td>
                    </tr>
                  ) : (
                    data.map((master, idx) => (
                      <motion.tr
                        key={master.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.04] transition-colors"
                      >
                        <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                          {master.name}
                        </td>
                        <td className="px-5 py-3.5">
                          <SectorBadge sector={master.sector} />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <motion.button
                              type="button"
                              title="Edit"
                              onClick={() => openEditMaster(master)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              type="button"
                              title="Hapus"
                              onClick={() => handleMasterDelete(master)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Nama Perusahaan</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Lokasi / Cabang</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Sektor/Grup</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider hidden lg:table-cell">Entitas Induk</th>
                    <th className="text-center px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3.5 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-16 text-neutral-400 dark:text-neutral-500">
                        <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Belum ada data cabang operasional</p>
                      </td>
                    </tr>
                  ) : (
                    data.map((branch, idx) => (
                      <motion.tr
                        key={branch.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-neutral-50 dark:border-neutral-800/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/[0.04] transition-colors"
                      >
                        <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white">
                          {branch.name}
                        </td>
                        <td className="px-5 py-3.5 text-neutral-600 dark:text-neutral-350 text-xs font-semibold">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                            {branch.location}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <SectorBadge sector={branch.sector} />
                        </td>
                        <td className="px-5 py-3.5 text-neutral-500 dark:text-neutral-400 text-xs hidden lg:table-cell font-bold">
                          {branch.m_company_master?.name || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {branch.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                              <CheckCircle className="w-3 h-3" /> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2.5 py-1 rounded-full">
                              <XCircle className="w-3 h-3" /> Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <motion.button
                              type="button"
                              title="Edit"
                              onClick={() => openEditBranch(branch)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </motion.button>
                            <motion.button
                              type="button"
                              title={branch.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                              onClick={() => handleToggleActiveBranch(branch)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                branch.is_active !== false
                                  ? 'text-emerald-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-500/10'
                                  : 'text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:text-emerald-400 dark:hover:bg-emerald-500/10'
                              }`}
                            >
                              {branch.is_active !== false ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            </motion.button>
                            <motion.button
                              type="button"
                              title="Hapus"
                              onClick={() => handleBranchDelete(branch)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination for Tab 1 */}
          {activeTab === 'companies' && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-100 dark:border-neutral-800">
              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                Halaman {meta.page} dari {meta.totalPages} • {meta.total} perusahaan
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 px-2">{meta.page}</span>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Detail Drawer ── */}
      <AnimatePresence>
        {selectedCompany && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setSelectedCompany(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-950 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
                <h2 className="font-bold text-neutral-900 dark:text-white">Detail Perusahaan</h2>
                <button onClick={() => setSelectedCompany(null)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                      {selectedCompany.code || 'N/A'}
                    </span>
                    {selectedCompany.is_active ? (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Aktif
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Nonaktif
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white">{selectedCompany.name}</h3>
                </div>

                <div className="space-y-3">
                  <DetailRow icon={Hash} label="NPWP" value={selectedCompany.npwp || '—'} />
                  <DetailRow icon={MapPin} label="Alamat" value={selectedCompany.address || '—'} />
                  <DetailRow icon={FileText} label="Terdaftar" value={
                    selectedCompany.created_at
                      ? new Date(selectedCompany.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                      : '—'
                  } />
                </div>

                <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => openEditCompany(selectedCompany)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleCompanyDelete(selectedCompany)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Company Add/Edit Form Drawer (Tab 1) ── */}
      <AnimatePresence>
        {showCompanyForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowCompanyForm(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-950 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
                <h2 className="font-bold text-neutral-900 dark:text-white">
                  {editingCompany ? 'Edit Perusahaan' : 'Tambah Perusahaan'}
                </h2>
                <button onClick={() => setShowCompanyForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCompanySubmit} className="p-5 space-y-4">
                <FormField
                  label="Kode Perusahaan"
                  placeholder="MRA"
                  value={companyFormData.code}
                  onChange={v => setCompanyFormData(d => ({ ...d, code: v }))}
                />
                <FormField
                  label="Nama Perusahaan *"
                  placeholder="PT Mugi Rekso Abadi"
                  value={companyFormData.name}
                  onChange={v => setCompanyFormData(d => ({ ...d, name: v }))}
                  required
                />
                <FormField
                  label="NPWP"
                  placeholder="01.234.567.8-901.000"
                  value={companyFormData.npwp}
                  onChange={v => setCompanyFormData(d => ({ ...d, npwp: v }))}
                />
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Grup Entitas Induk (Master Company)
                  </label>
                  <select
                    value={companyFormData.company_master_id}
                    onChange={e => setCompanyFormData(d => ({ ...d, company_master_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    <option value="">-- Tanpa Relasi Induk --</option>
                    {masters.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.sector})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Alamat
                  </label>
                  <textarea
                    value={companyFormData.address}
                    onChange={e => setCompanyFormData(d => ({ ...d, address: e.target.value }))}
                    placeholder="Jl. Gatot Subroto Kav. 36-38, Jakarta Selatan"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none transition-all"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowCompanyForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !companyFormData.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {editingCompany ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Master Group Add/Edit Drawer (Tab 2) ── */}
      <AnimatePresence>
        {showMasterForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowMasterForm(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-950 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
                <h2 className="font-bold text-neutral-900 dark:text-white">
                  {editingMaster ? 'Edit Master Company' : 'Tambah Master Company'}
                </h2>
                <button onClick={() => setShowMasterForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleMasterSubmit} className="p-5 space-y-4">
                <FormField
                  label="Nama Master Company (Grup MRA) *"
                  placeholder="Contoh: PT Media Insani Abadi"
                  value={masterFormData.name}
                  onChange={v => setMasterFormData(d => ({ ...d, name: v }))}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Sektor / Grup Bisnis MRA *
                  </label>
                  <select
                    value={masterFormData.sector}
                    onChange={e => setMasterFormData(d => ({ ...d, sector: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    {SECTORS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowMasterForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !masterFormData.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {editingMaster ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Branch Add/Edit Drawer (Tab 3) ── */}
      <AnimatePresence>
        {showBranchForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setShowBranchForm(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-neutral-950 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
                <h2 className="font-bold text-neutral-900 dark:text-white">
                  {editingBranch ? 'Edit Cabang' : 'Tambah Cabang'}
                </h2>
                <button onClick={() => setShowBranchForm(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBranchSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Nama Perusahaan *
                  </label>
                  <input
                    type="text"
                    list="company-names-list"
                    placeholder="Contoh: PT Hourlogy Indah Perkasa"
                    value={branchFormData.name}
                    onChange={e => setBranchFormData(d => ({ ...d, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
                    required
                  />
                  <datalist id="company-names-list">
                    {companiesList.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>

                <FormField
                  label="Lokasi / Cabang Fisik *"
                  placeholder="Contoh: Butik OMEGA Plaza Indonesia atau HQ"
                  value={branchFormData.location}
                  onChange={v => setBranchFormData(d => ({ ...d, location: v }))}
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Sektor / Grup MRA *
                  </label>
                  <select
                    value={branchFormData.sector}
                    onChange={e => setBranchFormData(d => ({ ...d, sector: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    {SECTORS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
                    Legalitas Induk (Master Company)
                  </label>
                  <select
                    value={branchFormData.company_master_id}
                    onChange={e => setBranchFormData(d => ({ ...d, company_master_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer"
                  >
                    <option value="">-- Tanpa Relasi Induk --</option>
                    {masters.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setShowBranchForm(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !branchFormData.name.trim() || !branchFormData.location.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    {editingBranch ? 'Simpan' : 'Tambah'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helper Components ──────────────────────────────────────────────────────────
function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/50">
      <Icon className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-neutral-800 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, placeholder, value, onChange, required = false }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all"
      />
    </div>
  );
}
