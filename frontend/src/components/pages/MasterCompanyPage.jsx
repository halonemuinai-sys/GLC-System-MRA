'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useLanguage } from '@/lib/LanguageContext';

// Import subcomponents
import MasterCompanyStats from './MasterCompanyStats';
import MasterCompanyFilters from './MasterCompanyFilters';
import MasterCompanyTables from './MasterCompanyTables';
import MasterCompanyDetailDrawer from './MasterCompanyDetailDrawer';
import MasterCompanyFormDrawers from './MasterCompanyFormDrawers';

export default function MasterCompanyPage() {
  const { t } = useLanguage();
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
  const [branchFormError, setBranchFormError] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [companyFormData, setCompanyFormData] = useState({
    code: '',
    name: '',
    npwp: '',
    address: '',
    company_master_id: ''
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
      address: '',
      company_master_id: ''
    });
    setShowCompanyForm(true);
  };

  const openEditCompany = (company) => {
    setEditingCompany(company);
    setCompanyFormData({
      code: company.code || '',
      name: company.name || '',
      npwp: company.npwp || '',
      address: company.address || '',
      company_master_id: company.company_master_id || ''
    });
    setShowCompanyForm(true);
    setSelectedCompany(null);
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    if (!companyFormData.name.trim()) return;

    try {
      setSubmitting(true);
      const payload = {
        ...companyFormData,
        company_master_id: companyFormData.company_master_id ? parseInt(companyFormData.company_master_id) : null
      };

      if (editingCompany) {
        await apiClient.put(`/api/master/companies/${editingCompany.id}`, payload);
      } else {
        await apiClient.post('/api/master/companies', payload);
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
    setBranchFormError(null);
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
    setBranchFormError(null);
    setBranchFormData({
      name: branch.name || '',
      location: branch.location || '',
      sector: branch.sector || 'GENERAL',
      company_master_id: branch.company_master_id || ''
    });
    setShowBranchForm(true);
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    setBranchFormError(null);

    if (!String(branchFormData.name || '').trim() || !String(branchFormData.location || '').trim()) {
      setBranchFormError('Nama Perusahaan dan Lokasi / Cabang Fisik wajib diisi.');
      return;
    }

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
      console.error('Branch save failed:', err);
      setBranchFormError(err.message || 'Gagal menyimpan data cabang.');
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

  return (
    <div className="space-y-6 relative pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-indigo-500" />
            {t('masterCompany_title')}
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/25 hover:bg-indigo-755 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {
              activeTab === 'companies' ? t('masterCompany_addCompany') :
              activeTab === 'masters' ? t('masterCompany_addMaster') : t('masterCompany_addBranch')
            }
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <MasterCompanyStats
        activeTab={activeTab}
        totalCount={totalCount}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
      />

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
      <MasterCompanyFilters
        activeTab={activeTab}
        search={search}
        setSearch={setSearch}
        filterActive={filterActive}
        setFilterActive={setFilterActive}
        filterSector={filterSector}
        setFilterSector={setFilterSector}
        t={t}
      />

      {/* Dynamic Data Tables */}
      <MasterCompanyTables
        activeTab={activeTab}
        data={data}
        meta={meta}
        page={page}
        setPage={setPage}
        setSelectedCompany={setSelectedCompany}
        openEditCompany={openEditCompany}
        handleToggleActiveCompany={handleToggleActiveCompany}
        handleCompanyDelete={handleCompanyDelete}
        openEditMaster={openEditMaster}
        handleMasterDelete={handleMasterDelete}
        openEditBranch={openEditBranch}
        handleToggleActiveBranch={handleToggleActiveBranch}
        handleBranchDelete={handleBranchDelete}
      />

      {/* Company Profile Detail Drawer */}
      <MasterCompanyDetailDrawer
        selectedCompany={selectedCompany}
        setSelectedCompany={setSelectedCompany}
        openEditCompany={openEditCompany}
        handleCompanyDelete={handleCompanyDelete}
      />

      {/* Add / Edit Form Drawers */}
      <MasterCompanyFormDrawers
        showCompanyForm={showCompanyForm}
        setShowCompanyForm={setShowCompanyForm}
        editingCompany={editingCompany}
        setEditingCompany={setEditingCompany}
        companyFormData={companyFormData}
        setCompanyFormData={setCompanyFormData}
        handleCompanySubmit={handleCompanySubmit}

        showMasterForm={showMasterForm}
        setShowMasterForm={setShowMasterForm}
        editingMaster={editingMaster}
        setEditingMaster={setEditingMaster}
        masterFormData={masterFormData}
        setMasterFormData={setMasterFormData}
        handleMasterSubmit={handleMasterSubmit}

        showBranchForm={showBranchForm}
        setShowBranchForm={setShowBranchForm}
        editingBranch={editingBranch}
        setEditingBranch={setEditingBranch}
        branchFormData={branchFormData}
        setBranchFormData={setBranchFormData}
        handleBranchSubmit={handleBranchSubmit}
        branchFormError={branchFormError}

        companiesList={companiesList}
        masters={masters}
        submitting={submitting}
      />
    </div>
  );
}
