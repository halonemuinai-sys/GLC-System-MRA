'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Plus,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  Loader2,
  X,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  User,
  Paperclip,
  Building,
  Briefcase,
  Layers,
  Info,
  Check,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import CampaignDateRangePicker from '@/components/ui/CampaignDateRangePicker';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
// Helper: Format to IDR Currency
const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

// Helper: Format angka jadi pemisah ribuan saat diketik (tampilan saja, value yang
// disimpan di state tetap angka polos tanpa titik)
const formatThousands = (value) => {
  if (value === undefined || value === null) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper: Get Month Name
const getMonthName = (monthNum) => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[monthNum - 1] || '';
};

// Rentang tahun anggaran yang bisa dipilih (tahun berjalan -1 s/d +2), supaya tidak
// hardcode 2 tahun saja dan tetap valid untuk auto-sync dari rentang tanggal campaign
const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i));

// Dropdown perusahaan yang bisa diketik untuk mencari (bukan select polos) — daftar PT
// di master GLC Apps bisa puluhan baris, jadi search-as-you-type lebih cepat dipakai.
// "Group" pada m_company_master sebenarnya cuma tag sektor (Retail/F&B/Media/General),
// bukan struktur holding berjenjang — ditampilkan sebagai badge warna, bukan nama
// "perusahaan induk", supaya tidak salah diartikan.
const SECTOR_COLORS = {
  GENERAL: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400',
  MEDIA: 'bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-400',
  FB: 'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400',
  RADIO: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  RETAIL: 'bg-pink-100 dark:bg-pink-500/15 text-pink-700 dark:text-pink-400'
};

function SectorTag({ sector }) {
  if (!sector) return null;
  const colorClass = SECTOR_COLORS[sector.toUpperCase()] || 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';
  return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${colorClass}`}>{sector}</span>;
}

function SearchableCompanySelect({ companies, value, onChange, placeholder = 'Pilih atau cari perusahaan...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedCompany = companies.find(c => String(c.id) === String(value));
  const filtered = companies.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="relative w-full">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus-within:border-indigo-500 flex items-center justify-between cursor-pointer min-h-[36px] select-none"
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
                  placeholder="Ketik untuk cari PT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-52 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-2.5 py-3 text-center text-xs text-neutral-400">Perusahaan tidak ditemukan</div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { onChange(c.id); setSearchQuery(''); setIsOpen(false); }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
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

export default function MarketingPlanPage() {
  // State for metadata & data
  const [metadata, setMetadata] = useState({ brands: [], lobs: [], branches: [], event_locations: [], coas: [], companies: [], vendors: [] });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filter States
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [companyId, setCompanyId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Active Tab — default ke 'plans' (daftar pengajuan & pipeline approval) supaya
  // begitu menu dibuka, yang terlihat adalah status request, bukan dashboard grafik
  const [activeTab, setActiveTab] = useState('plans'); // 'plans', 'analytics'

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [paymentRequestItem, setPaymentRequestItem] = useState(null); // Item to request payment for
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [revisingPlanId, setRevisingPlanId] = useState(null); // Track revision of rejected plan

  // Multi-step Wizard Form state
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardHeader, setWizardHeader] = useState({
    title: '',
    description: '',
    company_id: '',
    fiscal_year: String(new Date().getFullYear()),
    start_date: '',
    end_date: '',
    event_start_date: '',
    event_end_date: '',
    cta_start_date: '',
    cta_end_date: '',
    brand_id: '',
    lob_id: '',
    branch_id: '',
    event_location_id: '',
    doc_url: ''
  });
  const [wizardItems, setWizardItems] = useState([
    { coa_id: '', vendor_id: '', period_month: '1', qty: '1', unit_price: '', budget_amount: '', description: '' }
  ]);

  // Payment Request Form state
  const [paymentForm, setPaymentForm] = useState({
    title: '',
    amount: '',
    notes: '',
    doc_url: ''
  });
  const [paymentError, setPaymentError] = useState(null);
  const [paymentUploading, setPaymentUploading] = useState(false);
  const [paymentUploadError, setPaymentUploadError] = useState('');

  const handlePaymentFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setPaymentUploadError('Ukuran file maksimal 10MB.');
      return;
    }

    setPaymentUploading(true);
    setPaymentUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('glc_mra_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';
      const res = await fetch(`${apiBase}/api/marketing/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengunggah file.');
      }

      const data = await res.json();
      setPaymentForm(prev => ({ ...prev, doc_url: data.url }));
    } catch (err) {
      setPaymentUploadError(err.message || 'Gagal mengunggah file.');
    } finally {
      setPaymentUploading(false);
    }
  };

  const getDefaultCompanyId = useCallback((companiesList) => {
    if (!companiesList || companiesList.length === 0) return '';
    const mogems = companiesList.find(c => c.name.toLowerCase().includes('mogems'));
    return String(mogems ? mogems.id : companiesList[0].id);
  }, []);

  // Fetch Metadata & Plans on mount / filter change
  const loadMetadata = async () => {
    try {
      const res = await apiClient.get('/api/marketing/metadata');
      setMetadata(res);
      // Auto-set default company in wizard if available
      if (res.companies && res.companies.length > 0 && !wizardHeader.company_id) {
        setWizardHeader(prev => ({ ...prev, company_id: getDefaultCompanyId(res.companies) }));
      }
    } catch (err) {
      console.error('Failed to load marketing metadata:', err);
    }
  };

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        fiscal_year: fiscalYear || undefined,
        company_id: companyId || undefined,
        status: statusFilter || undefined
      };
      const res = await apiClient.get('/api/marketing/plans', { params });
      setPlans(res || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat rencana pemasaran.');
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, companyId, statusFilter]);

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Refetch wrapper
  const handleRefresh = () => {
    loadPlans();
  };

  // Calculations for KPI Cards
  const kpis = useMemo(() => {
    let totalBudget = 0;
    let totalActual = 0;
    let activeCampaigns = 0;

    plans.forEach(p => {
      totalBudget += Number(p.total_budget || 0);
      if (p.status === 'APPROVED') {
        activeCampaigns++;
      }
      // Calculate actual from items
      if (p.items) {
        p.items.forEach(item => {
          totalActual += Number(item.actual_amount || 0);
        });
      }
    });

    const variance = totalBudget - totalActual;
    const burnRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalActual,
      variance,
      burnRate,
      activeCampaigns
    };
  }, [plans]);

  // Chart Data: Monthly Budget vs Actual Trend
  const monthlyTrendData = useMemo(() => {
    const monthsData = Array.from({ length: 12 }, (_, i) => ({
      name: getMonthName(i + 1).substring(0, 3),
      Budget: 0,
      Realisasi: 0
    }));

    plans.forEach(p => {
      // We only map approved or pending plans to visualize budget
      if (p.items) {
        p.items.forEach(item => {
          const mIdx = Number(item.period_month) - 1;
          if (mIdx >= 0 && mIdx < 12) {
            monthsData[mIdx].Budget += Number(item.budget_amount || 0);
            monthsData[mIdx].Realisasi += Number(item.actual_amount || 0);
          }
        });
      }
    });

    return monthsData;
  }, [plans]);

  // Chart Data: Brand Budget Breakdown
  const brandBreakdownData = useMemo(() => {
    const brandMap = {};
    plans.forEach(p => {
      if (p.items) {
        p.items.forEach(item => {
          const brandName = item.m_brand?.name || 'Lain-lain';
          brandMap[brandName] = (brandMap[brandName] || 0) + Number(item.budget_amount || 0);
        });
      }
    });

    return Object.entries(brandMap)
      .map(([name, value]) => ({ name, Budget: value }))
      .sort((a, b) => b.Budget - a.Budget)
      .slice(0, 7); // Show top 7 brands
  }, [plans]);

  // Gantt Timeline Matrix Data
  const timelineCampaigns = useMemo(() => {
    return plans.map(p => {
      const startMonth = p.start_date ? new Date(p.start_date).getMonth() + 1 : 1;
      const endMonth = p.end_date ? new Date(p.end_date).getMonth() + 1 : 12;
      return {
        id: p.id,
        title: p.title,
        status: p.status,
        total_budget: Number(p.total_budget || 0),
        startMonth,
        endMonth
      };
    });
  }, [plans]);

  // Wizard Row Handlers
  const addWizardItem = () => {
    setWizardItems(prev => [
      ...prev,
      { coa_id: '', vendor_id: '', period_month: '1', qty: '1', unit_price: '', budget_amount: '', description: '' }
    ]);
  };

  const removeWizardItem = (idx) => {
    if (wizardItems.length === 1) return;
    setWizardItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx, field, val) => {
    setWizardItems(prev => {
      const next = [...prev];
      next[idx][field] = val;
      
      // Auto compute budget_amount if qty or unit_price changes
      if (field === 'qty' || field === 'unit_price') {
        const qtyVal = next[idx].qty ? next[idx].qty.replace(/\D/g, '') : '1';
        const unitVal = next[idx].unit_price ? next[idx].unit_price.replace(/\D/g, '') : '0';
        
        // Update cleaned values in state
        if (field === 'qty') next[idx].qty = qtyVal;
        if (field === 'unit_price') next[idx].unit_price = unitVal;
        
        const qty = parseInt(qtyVal || '0', 10);
        const unitPrice = parseFloat(unitVal || '0');
        next[idx].budget_amount = String(qty * unitPrice);
      }
      return next;
    });
  };

  // Submit Marketing Plan Wizard
  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validate inputs
    if (!wizardHeader.title || !wizardHeader.company_id || !wizardHeader.fiscal_year) {
      setError('Judul Kampanye, Perusahaan, dan Tahun Anggaran wajib diisi.');
      setSubmitting(false);
      return;
    }

    // Validate items
    const invalidItem = wizardItems.find(item => !item.coa_id || !item.budget_amount || Number(item.budget_amount) <= 0);
    if (invalidItem) {
      setError('Setiap item anggaran wajib memilih CoA dan memiliki nominal budget di atas Rp 0.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...wizardHeader,
        start_date: wizardHeader.event_start_date || null,
        end_date: wizardHeader.event_end_date || null,
        branch_id: wizardHeader.branch_id && wizardHeader.branch_id !== 'global' ? Number(wizardHeader.branch_id) : null,
        event_location_id: wizardHeader.event_location_id ? Number(wizardHeader.event_location_id) : null,
        items: wizardItems.map(item => ({
          ...item,
          coa_id: Number(item.coa_id),
          brand_id: wizardHeader.brand_id ? Number(wizardHeader.brand_id) : null,
          lob_id: wizardHeader.lob_id ? Number(wizardHeader.lob_id) : null,
          branch_id: wizardHeader.branch_id && wizardHeader.branch_id !== 'global' ? Number(wizardHeader.branch_id) : null,
          event_location_id: wizardHeader.event_location_id ? Number(wizardHeader.event_location_id) : null,
          vendor_id: item.vendor_id || null,
          period_month: Number(item.period_month),
          budget_amount: Number(item.budget_amount)
        }))
      };

      if (revisingPlanId) {
        await apiClient.put(`/api/marketing/plans/${revisingPlanId}/revise`, payload);
      } else {
        await apiClient.post('/api/marketing/plans', payload);
      }
      setSuccessMsg(revisingPlanId
        ? `Revisi Rencana Pemasaran (ID: ${revisingPlanId}) berhasil diajukan ulang.`
        : 'Rencana Pemasaran berhasil diajukan dan masuk rantai approval.'
      );
      setIsWizardOpen(false);
      // Reset Form
      setWizardHeader({
        title: '',
        description: '',
        company_id: getDefaultCompanyId(metadata.companies),
        fiscal_year: String(new Date().getFullYear()),
        start_date: '',
        end_date: '',
        event_start_date: '',
        event_end_date: '',
        cta_start_date: '',
        cta_end_date: '',
        brand_id: '',
        lob_id: '',
        branch_id: '',
        event_location_id: '',
        doc_url: ''
      });
      setWizardItems([{ coa_id: '', vendor_id: '', period_month: '1', qty: '1', unit_price: '', budget_amount: '', description: '' }]);
      setWizardStep(1);
      setRevisingPlanId(null);
      loadPlans();
      
      // Auto clear message
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setError(err.message || 'Gagal mengajukan Rencana Pemasaran.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Payment Request (Realisasi Biaya)
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setPaymentError(null);

    if (!paymentForm.title || !paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setPaymentError('Judul tagihan dan nominal pembayaran wajib diisi.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        marketing_plan_item_id: paymentRequestItem.id,
        title: paymentForm.title,
        amount: Number(paymentForm.amount),
        notes: paymentForm.notes,
        doc_url: paymentForm.doc_url
      };

      await apiClient.post('/api/marketing/payments', payload);
      setSuccessMsg('Payment Request berhasil diajukan!');
      setIsPaymentModalOpen(false);
      // Reset Form
      setPaymentForm({ title: '', amount: '', notes: '', doc_url: '' });
      loadPlans();
      
      // If detail modal is open, refresh detail
      if (isDetailOpen && selectedPlan) {
        const updatedPlan = await apiClient.get(`/api/marketing/plans/${selectedPlan.id}`);
        setSelectedPlan(updatedPlan);
      }

      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setPaymentError(err.message || 'Gagal mengajukan pembayaran.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Detail Modal
  const openDetail = async (planId) => {
    try {
      const planDetail = await apiClient.get(`/api/marketing/plans/${planId}`);
      setSelectedPlan(planDetail);
      setIsDetailOpen(true);
    } catch (err) {
      alert('Gagal mengambil rincian plan: ' + err.message);
    }
  };

  const handleRevisePlan = (plan) => {
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    };

    const firstItem = plan.items && plan.items[0] ? plan.items[0] : {};
    
    setWizardHeader({
      title: plan.title || '',
      description: plan.description || '',
      company_id: plan.company_id ? String(plan.company_id) : '',
      fiscal_year: plan.fiscal_year ? String(plan.fiscal_year) : '2026',
      start_date: formatDate(plan.start_date),
      end_date: formatDate(plan.end_date),
      event_start_date: formatDate(plan.event_start_date || plan.start_date),
      event_end_date: formatDate(plan.event_end_date || plan.end_date),
      cta_start_date: formatDate(plan.cta_start_date),
      cta_end_date: formatDate(plan.cta_end_date),
      brand_id: firstItem.brand_id ? String(firstItem.brand_id) : '',
      lob_id: firstItem.lob_id ? String(firstItem.lob_id) : '',
      branch_id: firstItem.branch_id ? String(firstItem.branch_id) : 'global',
      event_location_id: firstItem.event_location_id ? String(firstItem.event_location_id) : '',
      doc_url: plan.doc_url || ''
    });

    if (plan.items && plan.items.length > 0) {
      setWizardItems(plan.items.map(item => ({
        period_month: item.period_month || '',
        coa_id: item.coa_id ? String(item.coa_id) : '',
        vendor_id: item.vendor_id ? String(item.vendor_id) : '',
        budget_amount: String(item.budget_amount || '0'),
        description: item.description || '',
        qty: String(item.qty || '1'),
        unit_price: String(item.unit_price || item.budget_amount || '0'),
        event_location_id: item.event_location_id ? String(item.event_location_id) : '',
        branch_id: item.branch_id ? String(item.branch_id) : 'global'
      })));
    } else {
      setWizardItems([{ period_month: '', coa_id: '', vendor_id: '', qty: '1', unit_price: '', budget_amount: '0', description: '', event_location_id: '', branch_id: 'global' }]);
    }

    setRevisingPlanId(plan.id);
    setIsDetailOpen(false);
    setIsWizardOpen(true);
    setWizardStep(1);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    try {
      setSubmitting(true);
      await apiClient.delete(`/api/marketing/plans/${planToDelete.id}`);
      setSuccessMsg('Rencana Pemasaran berhasil dihapus.');
      setPlanToDelete(null);
      loadPlans();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      alert(err.message || 'Gagal menghapus Rencana Pemasaran.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter plans based on search queries
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        p.company?.name.toLowerCase().includes(q) ||
        p.creator?.name.toLowerCase().includes(q)
      );
    });
  }, [plans, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Marketing Plan & Budgeting
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-xs mt-0.5">
              Perencanaan promosi campaign, alokasi anggaran per segmentasi, dan workflow approval realisasi biaya.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-500 hover:text-indigo-500 shadow-sm transition-colors cursor-pointer"
            title="Muat Ulang Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Buat Marketing Plan
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" /> {error}
        </motion.div>
      )}

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-indigo-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-indigo-500/5 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <DollarSign className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Total Anggaran Rencana</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">{formatIDR(kpis.totalBudget)}</h3>
            </div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-emerald-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <TrendingUp className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Realisasi Terbayar</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">{formatIDR(kpis.totalActual)}</h3>
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-blue-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <TrendingDown className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Sisa Saldo Anggaran</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">{formatIDR(kpis.variance)}</h3>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="relative overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/60 p-4.5 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors duration-300" />
          <div className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-violet-500 transition-all duration-300 group-hover:top-[12%] group-hover:bottom-[12%]" />
          <div className="flex items-center gap-4.5 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/15 to-violet-500/5 border border-violet-500/20 flex items-center justify-center text-violet-500 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
              <Layers className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Burn Rate & Campaign Aktif</p>
              <h3 className="text-lg font-black text-neutral-850 dark:text-white mt-0.5 truncate">
                {kpis.burnRate.toFixed(1)}% <span className="text-xs font-normal text-neutral-400">({kpis.activeCampaigns} Approved)</span>
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-white'
              }`}
            >
              Pengajuan & Pipeline Approval ({plans.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-850 dark:hover:text-white'
              }`}
            >
              Timeline & Grafik Analisis
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="2026">Tahun Anggaran 2026</option>
              <option value="2027">Tahun Anggaran 2027</option>
            </select>

            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none max-w-[200px]"
            >
              <option value="">Semua Perusahaan</option>
              {metadata.companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-600 dark:text-neutral-400 focus:outline-none"
            >
              <option value="">Semua Status</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan judul campaign, deskripsi, PT, PIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 text-neutral-800 dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">Memuat data kampanye pemasaran...</span>
        </div>
      ) : activeTab === 'analytics' ? (
        <div className="space-y-6">
          {/* Timeline Grid (Gantt representation) */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold text-neutral-850 dark:text-white flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-indigo-500" />
                Campaign Timeline & Gantt Chart ({fiscalYear})
              </h2>
              <div className="flex gap-4 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" /> Approved</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30" /> Pending</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/30" /> Rejected</span>
              </div>
            </div>

            {timelineCampaigns.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-450 dark:text-neutral-500 font-medium">
                No campaign plans found for the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[850px] space-y-4">
                  {/* Grid Header Month Labels (Perfect alignment using 3-span / 9-span split) */}
                  <div className="grid grid-cols-12 text-center text-[10px] font-bold text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                    <div className="col-span-3 text-left pl-3 text-neutral-450 dark:text-neutral-500 uppercase tracking-wider">Campaign Name</div>
                    <div className="col-span-9 grid grid-cols-12 text-center">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                        <div key={m} className="uppercase tracking-wider font-extrabold">{m}</div>
                      ))}
                    </div>
                  </div>

                  {/* Campaign Rows */}
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-850">
                    {timelineCampaigns.map(camp => {
                      const colStart = camp.startMonth;
                      const colSpan = camp.endMonth - camp.startMonth + 1;
                      
                      let colorClass = 'bg-gradient-to-r from-amber-500/10 to-orange-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:border-amber-500/40 shadow-sm';
                      if (camp.status === 'APPROVED') {
                        colorClass = 'bg-gradient-to-r from-emerald-500/10 to-teal-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40 shadow-sm';
                      } else if (camp.status === 'REJECTED') {
                        colorClass = 'bg-gradient-to-r from-red-500/10 to-rose-500/15 text-red-700 dark:text-red-400 border-red-500/20 hover:border-red-500/40 shadow-sm';
                      }

                      return (
                        <div key={camp.id} className="grid grid-cols-12 py-3.5 items-center hover:bg-neutral-50/40 dark:hover:bg-neutral-850/20 transition-colors">
                          <button
                            onClick={() => openDetail(camp.id)}
                            className="col-span-3 pr-4 text-left text-xs font-bold text-neutral-800 dark:text-neutral-250 truncate hover:text-indigo-600 transition-colors pl-3"
                          >
                            {camp.title}
                          </button>
                          
                          <div className="col-span-9 grid grid-cols-12 h-8 relative w-full items-center">
                            {/* Horizontal grid lines */}
                            <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                              {Array.from({ length: 12 }, (_, i) => (
                                <div key={i} className="border-r border-neutral-100 dark:border-neutral-800/40 h-full last:border-r-0" />
                              ))}
                            </div>

                            {/* Gantt Bar representation */}
                            <div
                              style={{
                                gridColumnStart: colStart,
                                gridColumnEnd: colStart + colSpan
                              }}
                              className={`h-7 rounded-xl border flex items-center px-3 text-[10px] font-black truncate transition-all duration-300 hover:scale-[1.01] cursor-pointer ${colorClass}`}
                              onClick={() => openDetail(camp.id)}
                              title={`${camp.title} (${formatIDR(camp.total_budget)})`}
                            >
                              <span className="truncate">{formatIDR(camp.total_budget)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Graphics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly budget vs actual trend area chart */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm lg:col-span-2">
              <h2 className="text-sm font-bold text-neutral-850 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-indigo-500" />
                Tren Anggaran Bulanan vs Realisasi Terbayar
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                    <RechartsTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-3 rounded-xl shadow-xl text-[11px] font-medium space-y-1">
                              <p className="font-bold text-neutral-800 dark:text-white">{label}</p>
                              <p className="text-indigo-500">Anggaran: {formatIDR(payload[0].value)}</p>
                              <p className="text-emerald-500">Realisasi: {formatIDR(payload[1].value)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="Budget" name="Anggaran Rencana" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBudget)" />
                    <Area type="monotone" dataKey="Realisasi" name="Realisasi Terbayar" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Brand distribution breakdown */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-bold text-neutral-850 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-indigo-500" />
                Alokasi Budget Terbesar per Brand
              </h2>
              <div className="h-64">
                {brandBreakdownData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-neutral-400">Tidak ada data brand</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={brandBreakdownData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148,163,184,0.08)" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={80} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-2.5 rounded-lg shadow-xl text-[10px] font-bold">
                                <p className="text-neutral-800 dark:text-white">{label}</p>
                                <p className="text-indigo-500 mt-0.5">Budget: {formatIDR(payload[0].value)}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="Budget" name="Alokasi Anggaran" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Plans Table View */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-950/20 text-neutral-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-4">Nama Rencana (Campaign)</th>
                  <th className="px-5 py-4">Perusahaan</th>
                  <th className="px-5 py-4">Periode</th>
                  <th className="px-5 py-4 text-right">Total Anggaran</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4">Diajukan Oleh</th>
                  <th className="px-5 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-medium">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-5 py-16 text-center">
                      {plans.length === 0 ? (
                        <div className="flex flex-col items-center gap-3">
                          <FileSpreadsheet className="w-9 h-9 text-neutral-300 dark:text-neutral-700" />
                          <p className="text-xs text-neutral-450 font-medium">Belum ada pengajuan rencana pemasaran.</p>
                          <button
                            onClick={() => setIsWizardOpen(true)}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/10 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Ajukan Rencana Pertama Anda
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-450 font-normal">Tidak menemukan data Rencana Pemasaran yang cocok.</p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map(plan => {
                    let statusBadge = 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/5 dark:text-amber-450 border-amber-200/60 dark:border-amber-900/30';
                    let statusText = 'Pending Approval';
                    let StatusIcon = Clock;
                    let rowAccent = 'border-l-transparent hover:border-l-amber-400';
                    if (plan.status === 'APPROVED') {
                      statusBadge = 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-450 border-emerald-200/60 dark:border-emerald-900/30';
                      statusText = 'Approved';
                      StatusIcon = CheckCircle;
                      rowAccent = 'border-l-transparent hover:border-l-emerald-400';
                    } else if (plan.status === 'REJECTED') {
                      statusBadge = 'bg-red-500/10 text-red-600 dark:bg-red-500/5 dark:text-red-450 border-red-200/60 dark:border-red-900/30';
                      statusText = 'Rejected';
                      StatusIcon = AlertTriangle;
                      rowAccent = 'border-l-transparent hover:border-l-red-400';
                    } else if (plan.status === 'DRAFT') {
                      statusBadge = 'bg-neutral-500/10 text-neutral-600 dark:bg-neutral-500/5 dark:text-neutral-450 border-neutral-200/60 dark:border-neutral-700/40';
                      statusText = 'Draft';
                      StatusIcon = FileSpreadsheet;
                      rowAccent = 'border-l-transparent hover:border-l-neutral-400';
                    }

                    return (
                      <tr key={plan.id} className={`border-l-[3px] ${rowAccent} hover:bg-neutral-50/30 dark:hover:bg-neutral-800/5 text-neutral-700 dark:text-neutral-300 transition-colors`}>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => openDetail(plan.id)}
                            className="font-bold text-neutral-900 dark:text-white hover:text-indigo-500 transition-colors text-left"
                          >
                            {plan.title}
                          </button>
                          {plan.description && <p className="text-[10px] text-neutral-400 font-normal line-clamp-1 mt-0.5">{plan.description}</p>}
                        </td>
                        <td className="px-5 py-4 text-neutral-900 dark:text-neutral-200">
                          {plan.company?.name || 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-neutral-500">
                          <span className="font-bold text-neutral-800 dark:text-neutral-200 block">
                            {plan.event_start_date ? new Date(plan.event_start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : (plan.start_date ? new Date(plan.start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-')} - {plan.event_end_date ? new Date(plan.event_end_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : (plan.end_date ? new Date(plan.end_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-')}
                          </span>
                          {plan.cta_start_date && (
                            <span className="text-[9px] text-neutral-450 dark:text-neutral-500 block mt-0.5">
                              CTA: {new Date(plan.cta_start_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} - {new Date(plan.cta_end_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-neutral-850 dark:text-white">
                          {formatIDR(plan.total_budget)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide inline-flex items-center gap-1 border ${statusBadge}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusText}
                          </span>
                          {plan.pipeline && (
                            <p className="text-[9px] text-neutral-400 font-bold mt-1">
                              Step {plan.pipeline.currentStep}/{plan.pipeline.totalSteps || '?'}
                              {plan.pipeline.approverRole && <> · {plan.pipeline.approverRole.replace(/_/g, ' ')}</>}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{plan.creator?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openDetail(plan.id)}
                              className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 rounded-xl hover:text-indigo-500 hover:border-indigo-500 text-[11px] font-bold shadow-sm transition-all cursor-pointer"
                            >
                              Rincian
                            </button>
                            <motion.button
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setPlanToDelete(plan)}
                              className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200/40 flex items-center justify-center"
                              title="Hapus Plan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: MULTI-STEP CREATION WIZARD */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsWizardOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-7xl z-55 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Wizard Header */}
              <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
                <div>
                  <h3 className="text-md font-black text-neutral-850 dark:text-white">
                    {revisingPlanId ? `Revisi Rencana Anggaran (ID: ${revisingPlanId})` : 'Ajukan Rencana Anggaran Pemasaran'}
                  </h3>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {revisingPlanId ? 'Koreksi & ajukan ulang rencana yang ditolak — nomor referensi tetap sama' : 'Wizard Pengisian Rincian Anggaran Tahunan'}
                  </p>
                </div>
                <button
                  onClick={() => { setIsWizardOpen(false); setRevisingPlanId(null); }}
                  className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-450 hover:text-neutral-800 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Wizard Steps indicator */}
              <div className="px-8 py-6 bg-neutral-50/50 dark:bg-neutral-950/20 border-b border-neutral-100 dark:border-neutral-800 select-none">
                <div className="flex items-center justify-between max-w-2xl mx-auto relative px-4">
                  {/* Background track line */}
                  <div className="absolute left-6 right-6 top-4.5 h-0.5 bg-neutral-200 dark:bg-neutral-800 -z-10 rounded-full" />
                  
                  {/* Progress fill line */}
                  <motion.div 
                    className="absolute left-6 top-4.5 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 -z-10 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: wizardStep === 1 ? '0%' : wizardStep === 2 ? '50%' : '100%' }}
                    transition={{ type: 'spring', stiffness: 100, damping: 18 }}
                  />

                  {[
                    { num: 1, label: 'Informasi Umum' },
                    { num: 2, label: 'Rincian Anggaran Bulanan' },
                    { num: 3, label: 'Review & Submit' }
                  ].map((s) => (
                    <div key={s.num} className="flex flex-col items-center relative">
                      <motion.span 
                        layout
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 z-10 select-none bg-white dark:bg-neutral-900"
                        animate={{
                          scale: wizardStep === s.num ? 1.15 : 1.0,
                          backgroundColor: wizardStep > s.num ? 'rgb(37, 99, 235)' : wizardStep === s.num ? 'rgb(37, 99, 235)' : 'rgb(255, 255, 255)',
                          borderColor: wizardStep >= s.num ? 'rgb(37, 99, 235)' : 'rgb(229, 229, 229)',
                          color: wizardStep >= s.num ? 'rgb(255, 255, 255)' : 'rgb(163, 163, 163)',
                          boxShadow: wizardStep === s.num ? '0 10px 15px -3px rgba(37, 99, 235, 0.25)' : 'none'
                        }}
                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      >
                        {wizardStep > s.num ? (
                          <motion.span 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                          >
                            <Check className="w-4 h-4 font-black" />
                          </motion.span>
                        ) : s.num}
                      </motion.span>
                      <motion.span 
                        className="text-[10px] font-bold mt-2 whitespace-nowrap"
                        animate={{
                          color: wizardStep >= s.num ? 'rgb(37, 99, 235)' : 'rgb(163, 163, 163)',
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        {s.label}
                      </motion.span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Wizard Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {wizardStep === 1 && (
                  <WizardStep1GeneralInfo
                    wizardHeader={wizardHeader}
                    setWizardHeader={setWizardHeader}
                    metadata={metadata}
                    FISCAL_YEAR_OPTIONS={FISCAL_YEAR_OPTIONS}
                    SearchableCompanySelect={SearchableCompanySelect}
                    CampaignDateRangePicker={CampaignDateRangePicker}
                  />
                )}

                {wizardStep === 2 && (
                  <WizardStep2BudgetItems
                    wizardHeader={wizardHeader}
                    wizardItems={wizardItems}
                    addWizardItem={addWizardItem}
                    removeWizardItem={removeWizardItem}
                    handleItemChange={handleItemChange}
                    metadata={metadata}
                    getMonthName={getMonthName}
                    formatThousands={formatThousands}
                    Plus={Plus}
                    X={X}
                  />
                )}

                {wizardStep === 3 && (
                  <WizardStep3ReviewSubmit
                    wizardHeader={wizardHeader}
                    wizardItems={wizardItems}
                    metadata={metadata}
                    getMonthName={getMonthName}
                    formatIDR={formatIDR}
                  />
                )}
              </div>

              {/* Wizard Footer Controls */}
              <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-950/10">
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep === 1) { setIsWizardOpen(false); setRevisingPlanId(null); }
                    else setWizardStep(prev => prev - 1);
                  }}
                  className="px-4 py-2 border border-neutral-250 dark:border-neutral-750 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {wizardStep === 1 ? 'Batalkan' : 'Kembali'}
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={(e) => {
                    if (wizardStep < 3) setWizardStep(prev => prev + 1);
                    else handleWizardSubmit(e);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {wizardStep === 3 ? (revisingPlanId ? 'Ajukan Ulang (Revisi)' : 'Ajukan Plan') : 'Lanjut'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: PLAN DETAIL & INLINE PAYMENT REQUEST */}
      <AnimatePresence>
        {isDetailOpen && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsDetailOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-5xl z-55 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Detail Header */}
              <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-md font-black text-neutral-850 dark:text-white">{selectedPlan.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      selectedPlan.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' :
                      selectedPlan.status === 'REJECTED' ? 'bg-red-500/10 text-red-650' : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {selectedPlan.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">Diajukan oleh {selectedPlan.creator?.name || 'N/A'} • {selectedPlan.company?.name || ''}</p>
                </div>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-450 hover:text-neutral-850 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Detail Body (Scrollable) */}
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {/* Description & Period */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Penjelasan / Deskripsi Rencana</span>
                    <p className="text-xs text-neutral-750 dark:text-neutral-350">{selectedPlan.description || 'Tidak ada deskripsi.'}</p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Periode & Lampiran</span>
                    <div className="space-y-1.5 text-[11px] text-neutral-800 dark:text-white font-bold">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        <span className="truncate">
                          Event: {selectedPlan.event_start_date ? new Date(selectedPlan.event_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : (selectedPlan.start_date ? new Date(selectedPlan.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')} s/d {selectedPlan.event_end_date ? new Date(selectedPlan.event_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : (selectedPlan.end_date ? new Date(selectedPlan.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1.5 border-t border-neutral-200 dark:border-neutral-800">
                        <Calendar className="w-3.5 h-3.5 text-emerald-550 flex-shrink-0" />
                        <span className="truncate">
                          CTA: {selectedPlan.cta_start_date ? new Date(selectedPlan.cta_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'} s/d {selectedPlan.cta_end_date ? new Date(selectedPlan.cta_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                        </span>
                      </div>
                    </div>
                    {selectedPlan.doc_url && (
                      <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-800 mt-1.5">
                        <a
                          href={selectedPlan.doc_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-indigo-500 hover:text-indigo-650 hover:underline inline-flex items-center gap-1 font-bold"
                        >
                          <Paperclip className="w-3.5 h-3.5" /> Lihat Proposal Acuan
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Budget Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
                    Rincian Pos Anggaran & Realisasi
                  </h4>
                  
                  <div className="border border-neutral-250 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-250 dark:border-neutral-800 text-neutral-400 font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Bulan</th>
                          <th className="px-4 py-3">CoA Account</th>
                          <th className="px-4 py-3">Brand / LOB</th>
                          <th className="px-4 py-3">Branch</th>
                          <th className="px-4 py-3">Vendor</th>
                          <th className="px-4 py-3 text-right">Alokasi Budget</th>
                          <th className="px-4 py-3 text-right">Realisasi (Actual)</th>
                          <th className="px-4 py-3 text-right">Sisa Saldo</th>
                          {selectedPlan.status === 'APPROVED' && <th className="px-4 py-3 text-center">Tindakan</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-150 dark:divide-neutral-850 font-medium text-neutral-700 dark:text-neutral-300">
                        {selectedPlan.items?.map((item, idx) => {
                          const budget = Number(item.budget_amount || 0);
                          const actual = Number(item.actual_amount || 0);
                          const remaining = budget - actual;

                          return (
                            <React.Fragment key={item.id || idx}>
                              <tr className="hover:bg-neutral-50/30 dark:hover:bg-neutral-800/10">
                                <td className="px-4 py-3">{getMonthName(item.period_month)}</td>
                                <td className="px-4 py-3">
                                  <span className="font-mono text-neutral-800 dark:text-white font-bold">{item.m_coa?.code}</span>
                                  <p className="text-[10px] text-neutral-400 font-normal mt-0.5">{item.m_coa?.name}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-neutral-900 dark:text-neutral-200">{item.m_brand?.name || '-'}</span>
                                  {item.m_line_business && <p className="text-[10px] text-neutral-450 font-normal mt-0.5">{item.m_line_business?.name}</p>}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="font-semibold text-neutral-850 dark:text-neutral-200 block">
                                    {item.m_branch?.name ? `Cabang ${item.m_branch.name}` : 'Global Sales'}
                                  </span>
                                  {item.m_event_location?.name && (
                                    <span className="text-[9px] text-neutral-450 dark:text-neutral-500 block mt-0.5">
                                      Event: {item.m_event_location.name}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {item.vendors ? (
                                    <span className="inline-flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                                      <Building className="w-3 h-3 text-neutral-400" /> {item.vendors.vendor_name}
                                    </span>
                                  ) : (
                                    <span className="text-neutral-400">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="font-bold text-neutral-850 dark:text-white block">{formatIDR(budget)}</span>
                                  <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-normal block mt-0.5">
                                    {item.qty || 1} x {formatIDR(item.unit_price || budget)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-450 font-bold">{formatIDR(actual)}</td>
                                <td className={`px-4 py-3 text-right font-bold ${remaining <= 0 ? 'text-red-500' : 'text-neutral-850 dark:text-white'}`}>
                                  {formatIDR(remaining)}
                                </td>
                                {selectedPlan.status === 'APPROVED' && (
                                  <td className="px-4 py-3 text-center">
                                    <button
                                      onClick={() => {
                                        setPaymentRequestItem(item);
                                        setIsPaymentModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-[10px] font-black shadow-sm transition-colors cursor-pointer"
                                    >
                                      Realisasi Biaya
                                    </button>
                                  </td>
                                )}
                              </tr>
                              {item.payment_requests && item.payment_requests.length > 0 && (
                                <tr className="bg-neutral-50/20 dark:bg-neutral-955/10">
                                  <td colSpan={selectedPlan.status === 'APPROVED' ? 9 : 8} className="px-6 py-2.5">
                                    <div className="border-l-2 border-indigo-500 pl-4 py-1 space-y-2">
                                      <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">
                                        Riwayat Realisasi / Payment Request ({item.payment_requests.length})
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                        {item.payment_requests.map((pr) => (
                                          <div key={pr.id} className="bg-white dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-850 rounded-xl p-2.5 flex items-center justify-between text-[10px] shadow-sm">
                                            <div className="space-y-0.5">
                                              <p className="font-bold text-neutral-800 dark:text-white">{pr.title}</p>
                                              <p className="text-neutral-400 font-medium text-[9px]">Oleh: {pr.creator?.name || 'N/A'}</p>
                                            </div>
                                            <div className="flex items-center gap-3.5">
                                              <span className="font-extrabold text-neutral-900 dark:text-white">{formatIDR(pr.amount)}</span>
                                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                                                pr.status === 'APPROVED' || pr.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' :
                                                pr.status === 'REJECTED' ? 'bg-red-500/10 text-red-650' : 'bg-amber-500/10 text-amber-600'
                                              }`}>
                                                {pr.status}
                                              </span>
                                              {pr.doc_url && (
                                                <a
                                                  href={pr.doc_url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="p-1 text-indigo-500 hover:text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors flex items-center gap-1 font-bold"
                                                  title="Lihat Lampiran"
                                                >
                                                  <Paperclip className="w-3.5 h-3.5" />
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Approval Audit Trail */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-neutral-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4.5 h-4.5 text-indigo-500" />
                    Workflow Approval & Audit Trail
                  </h4>
                  
                  <div className="bg-neutral-50/50 dark:bg-neutral-950/20 border border-neutral-200 dark:border-neutral-800/80 p-4.5 rounded-2xl space-y-4">
                    {selectedPlan.approval_history && selectedPlan.approval_history.length === 0 ? (
                      <p className="text-xs text-neutral-400">Tidak ada riwayat approval pada dokumen ini.</p>
                    ) : (
                      <div className="relative pl-6 border-l border-neutral-200 dark:border-neutral-800 space-y-6">
                        {selectedPlan.approval_history?.map((history, hIdx) => {
                          let stepBadge = 'bg-amber-500/10 text-amber-600 border-amber-300';
                          if (history.status === 'APPROVED') {
                            stepBadge = 'bg-emerald-500/10 text-emerald-600 border-emerald-300';
                          } else if (history.status === 'REJECTED') {
                            stepBadge = 'bg-red-500/10 text-red-600 border-red-300';
                          }

                          return (
                            <div key={history.id} className="relative">
                              {/* Connector dot */}
                              <span className={`absolute -left-[30px] top-1.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center bg-white dark:bg-neutral-900 z-10 ${
                                history.status === 'APPROVED' ? 'border-emerald-500 text-emerald-500' :
                                history.status === 'REJECTED' ? 'border-red-500 text-red-500' : 'border-amber-500 text-amber-500'
                              }`}>
                                {history.status === 'APPROVED' ? <Check className="w-2.5 h-2.5" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                              </span>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-neutral-900 border border-neutral-200/85 dark:border-neutral-850 p-3.5 rounded-2xl shadow-sm">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-neutral-800 dark:text-white">Step {history.step_number} Approval</span>
                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${stepBadge}`}>
                                      {history.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-neutral-450 mt-1">
                                    Approver: <span className="font-bold text-neutral-700 dark:text-neutral-250">{history.approver?.name || 'N/A'}</span>
                                  </p>
                                  {history.comment && (
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-100 dark:border-neutral-850 mt-2 font-mono italic">
                                      &ldquo;{history.comment}&rdquo;
                                    </p>
                                  )}
                                </div>

                                <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                                  {history.action_at ? (
                                    <span className="text-[9px] text-neutral-405 font-mono">
                                      {new Date(history.action_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-neutral-400 font-mono flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-amber-500" /> Menunggu Tindakan
                                    </span>
                                  )}
                                  
                                  {/* Signature stamp representation */}
                                  {history.signature_url && (
                                    <div className="mt-1.5 border border-indigo-150 rounded-xl px-2 py-1 flex items-center gap-1.5 bg-indigo-50/40 dark:bg-indigo-500/5 text-[9px] font-bold text-indigo-500 tracking-wide select-none">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                      SIGNED DIGITAL
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail Footer */}
              <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end bg-neutral-50/30 dark:bg-neutral-950/10">
                {selectedPlan && selectedPlan.status === 'REJECTED' && (
                  <button
                    onClick={() => handleRevisePlan(selectedPlan)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold cursor-pointer shadow-lg shadow-blue-600/10 flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Revisi Pengajuan
                  </button>
                )}
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-250 dark:border-neutral-700/60 rounded-xl hover:text-neutral-850 dark:hover:text-white text-xs font-bold cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: PAYMENT REQUEST / REALISASI BIAYA FORM */}
      <AnimatePresence>
        {isPaymentModalOpen && paymentRequestItem && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsPaymentModalOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-lg z-65 overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/20">
                <div>
                  <h3 className="text-md font-black text-neutral-850 dark:text-white">Pengajuan Realisasi (Payment Request)</h3>
                  <p className="text-[10px] text-neutral-450 mt-0.5">Item: {paymentRequestItem.m_coa?.code} - {paymentRequestItem.m_coa?.name}</p>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-neutral-850 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                {paymentError && (
                  <div className="bg-red-500/10 border border-red-200 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> {paymentError}
                  </div>
                )}

                {/* Sisa Budget Info */}
                <div className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-250 dark:border-neutral-800/80 p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  <span>Sisa Saldo Tersedia:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    {formatIDR(Number(paymentRequestItem.budget_amount) - Number(paymentRequestItem.actual_amount))}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase">Deskripsi Pembayaran (Keterangan Tagihan)</label>
                  <input
                    type="text"
                    placeholder="contoh: Pembayaran Invoice Event Ramadhan Plaza Indonesia"
                    value={paymentForm.title}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase">Nominal Pengeluaran (IDR)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatThousands(paymentForm.amount)}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value.replace(/\D/g, '') }))}
                      className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-bold"
                      required
                    />
                  </div>
                               <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-450 uppercase">Dokumen Pendukung / Bukti Pembayaran</label>
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <input
                          type="text"
                          placeholder="http://link-file-invoice.pdf atau upload file di samping"
                          value={paymentForm.doc_url || ''}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, doc_url: e.target.value }))}
                          className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-850 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
                        />
                      </div>
                      <div className="relative shrink-0">
                        <input
                          type="file"
                          id="payment-doc-upload"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={handlePaymentFileChange}
                          disabled={paymentUploading}
                        />
                        <label
                          htmlFor="payment-doc-upload"
                          className={`px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 text-neutral-750 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-750 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 h-full ${paymentUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {paymentUploading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>Upload Bukti</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                    {paymentUploadError && (
                      <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {paymentUploadError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Overbudget warning alert */}
                {paymentForm.amount && Number(paymentForm.amount) > (Number(paymentRequestItem.budget_amount) - Number(paymentRequestItem.actual_amount)) && (
                  <div className="bg-amber-500/10 border border-amber-300 text-amber-700 dark:text-amber-400 text-[11px] font-bold p-3 rounded-2xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      WARNING: Nominal melebihi sisa anggaran! Pengajuan ini akan ditandai overbudget dan akan meningkatkan rantai approval secara otomatis ke level direksi tertinggi (+1 step approval CFO/CEO).
                    </span>
                  </div>
                )}

                {/* Legal PKS warning alert */}
                {paymentForm.amount && Number(paymentForm.amount) > 50000000 && (
                  <div className="bg-indigo-500/10 border border-indigo-250 text-indigo-700 dark:text-indigo-400 text-[11px] font-bold p-3 rounded-2xl flex items-start gap-2">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      VALIDASI LINTAS MODUL (LEGAL): Pengeluaran di atas Rp 50 Juta wajib melampirkan Perjanjian Kerja Sama (PKS) aktif di modul Legal. Sistem akan memverifikasi otomatis kontrak perusahaan Anda sebelum melanjutkan.
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-450 uppercase">Catatan Tambahan</label>
                  <textarea
                    rows="2"
                    placeholder="Catatan pengerjaan vendor, termin bayar, dsb..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 border border-neutral-250 dark:border-neutral-700/60 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Ajukan Realisasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {planToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPlanToDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-md p-6 z-55 overflow-hidden flex flex-col items-center text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-500 flex items-center justify-center animate-pulse">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-neutral-850 dark:text-white">Hapus Rencana Pemasaran?</h3>
                <p className="text-xs text-neutral-450 dark:text-neutral-500 px-2 leading-relaxed">
                  Apakah Anda yakin ingin menghapus rencana <strong>"{planToDelete.title}"</strong> beserta seluruh item anggaran di dalamnya? Tindakan ini permanen dan tidak dapat dibatalkan.
                </p>
              </div>
              <div className="flex items-center gap-2.5 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setPlanToDelete(null)}
                  className="flex-1 px-4 py-2.5 border border-neutral-250 dark:border-neutral-750 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// MODULAR WIZARD STEP SUBCOMPONENTS
// Label component with interactive tooltip
function FormLabel({ label, tooltip }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
        {label}
      </span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger type="button" className="text-neutral-450 hover:text-neutral-700 dark:text-neutral-450 dark:hover:text-neutral-200 transition-colors p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-help">
            <Info className="w-3 h-3" />
          </TooltipTrigger>
          <TooltipContent className="text-[11px] leading-relaxed max-w-[220px]" side="top" align="center">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// MODULAR WIZARD STEP SUBCOMPONENTS
function WizardStep1GeneralInfo({ wizardHeader, setWizardHeader, metadata, FISCAL_YEAR_OPTIONS, SearchableCompanySelect, CampaignDateRangePicker }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 10MB.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = Cookies.get('glc_mra_token');
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';
      const res = await fetch(`${apiBase}/api/marketing/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal mengunggah file.');
      }

      const data = await res.json();
      setWizardHeader(prev => ({ ...prev, doc_url: data.url }));
    } catch (err) {
      setUploadError(err.message || 'Gagal mengunggah file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TooltipProvider delay={100}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-2">
        {/* Title */}
        <div className="space-y-2">
          <FormLabel label="Campaign Title / Name *" tooltip="Nama atau judul kampanye pemasaran Anda." />
          <input
            type="text"
            placeholder="e.g. Ramadhan Promotion Campaign Bvlgari"
            value={wizardHeader.title}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, title: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            required
          />
        </div>

        {/* Company Selection */}
        <div className="space-y-2">
          <FormLabel label="Company (PT) *" tooltip="Badan hukum / PT Mogems yang menanggung anggaran kegiatan ini." />
          <SearchableCompanySelect
            companies={metadata.companies}
            value={wizardHeader.company_id}
            onChange={(id) => setWizardHeader(prev => ({ ...prev, company_id: String(id) }))}
          />
        </div>

        {/* Description */}
        <div className="space-y-2 md:col-span-2">
          <FormLabel label="Campaign Description / Scope" tooltip="Penjelasan rinci mengenai kampanye, kanal iklan, sasaran audiens, dan tujuan." />
          <textarea
            rows="3"
            placeholder="Provide details about the marketing campaign, channels, targeted audience, and goals..."
            value={wizardHeader.description}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none font-medium leading-relaxed"
          />
        </div>

        {/* Fiscal Year */}
        <div className="space-y-2">
          <FormLabel label="Fiscal Year *" tooltip="Tahun pembukuan keuangan untuk alokasi anggaran ini." />
          <select
            value={wizardHeader.fiscal_year}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, fiscal_year: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
          >
            {FISCAL_YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Event Period Dates */}
        <div className="space-y-2">
          <FormLabel label="Tanggal Event / Kegiatan *" tooltip="Periode fisik berlangsungnya acara atau kegiatan lapangan." />
          <CampaignDateRangePicker
            startValue={wizardHeader.event_start_date}
            endValue={wizardHeader.event_end_date}
            placeholder="Pilih rentang tanggal Event"
            onChange={({ start, end }) => setWizardHeader(prev => ({
              ...prev,
              event_start_date: start,
              event_end_date: end,
              fiscal_year: start ? String(new Date(start).getFullYear()) : prev.fiscal_year
            }))}
          />
        </div>

        {/* CTA / Promo Period Dates */}
        <div className="space-y-2">
          <FormLabel label="Tanggal Promo / CTA *" tooltip="CTA (Call to Action) / Periode Promosi: Durasi aktifnya iklan atau materi promosi dipublikasikan kepada konsumen." />
          <CampaignDateRangePicker
            startValue={wizardHeader.cta_start_date}
            endValue={wizardHeader.cta_end_date}
            placeholder="Pilih rentang tanggal Promo / CTA"
            onChange={({ start, end }) => setWizardHeader(prev => ({
              ...prev,
              cta_start_date: start,
              cta_end_date: end
            }))}
          />
        </div>

        {/* Brand Selection */}
        <div className="space-y-2">
          <FormLabel label="Brand *" tooltip="Merek produk yang diiklankan / dipromosikan." />
          <select
            value={wizardHeader.brand_id}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, brand_id: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            required
          >
            <option value="">Select Brand</option>
            {metadata.brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* LOB Selection */}
        <div className="space-y-2">
          <FormLabel label="Line of Business (LOB) *" tooltip="Sektor bisnis / kategori produk yang menaungi kampanye ini." />
          <select
            value={wizardHeader.lob_id}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, lob_id: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            required
          >
            <option value="">Select LOB</option>
            {metadata.lobs.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        {/* Event Location Selection */}
        <div className="space-y-2">
          <FormLabel label="Lokasi Kegiatan / Event *" tooltip="Lokasi fisik tempat acara pemasaran diselenggarakan." />
          <select
            value={wizardHeader.event_location_id || ''}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, event_location_id: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            required
          >
            <option value="">Pilih Lokasi Kegiatan / Event</option>
            {metadata.event_locations.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Target Impact Selection */}
        <div className="space-y-2">
          <FormLabel label="Cabang Sasaran / Terdampak *" tooltip="Cabang toko yang diharapkan menerima kenaikan penjualan atau kunjungan akibat aktivitas pemasaran ini." />
          <select
            value={wizardHeader.branch_id || 'global'}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, branch_id: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            required
          >
            <option value="global">Global Sales (Semua Toko)</option>
            {metadata.branches.map(b => (
              <option key={b.id} value={b.id}>
                Cabang {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Proposal Document Link */}
        <div className="space-y-2 md:col-span-2">
          <FormLabel label="Dokumen Proposal / Acuan (Opsional)" tooltip="Unggah dokumen proposal, konsep event, atau acuan persetujuan anggaran (opsional)." />
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="https://link-proposal-kampanye.pdf atau upload file di samping"
                value={wizardHeader.doc_url || ''}
                onChange={(e) => setWizardHeader(prev => ({ ...prev, doc_url: e.target.value }))}
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
            <div className="relative shrink-0">
              <input
                type="file"
                id="wizard-proposal-upload"
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <label
                htmlFor="wizard-proposal-upload"
                className={`px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 text-neutral-750 dark:text-neutral-300 rounded-xl hover:bg-neutral-200 dark:hover:bg-neutral-750 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 h-full ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                  </>
                )}
              </label>
            </div>
          </div>
          {uploadError && (
            <p className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {uploadError}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

function WizardStep2BudgetItems({ wizardHeader, wizardItems, addWizardItem, removeWizardItem, handleItemChange, metadata, getMonthName, formatThousands, Plus, X }) {
  const getAvailableMonths = () => {
    const start_date = wizardHeader.event_start_date || wizardHeader.cta_start_date || wizardHeader.start_date;
    const end_date = wizardHeader.event_end_date || wizardHeader.cta_end_date || wizardHeader.end_date;
    
    if (!start_date || !end_date) {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
    
    const dates = [];
    if (wizardHeader.event_start_date) dates.push(new Date(wizardHeader.event_start_date));
    if (wizardHeader.cta_start_date) dates.push(new Date(wizardHeader.cta_start_date));
    if (wizardHeader.start_date) dates.push(new Date(wizardHeader.start_date));
    
    const minStart = new Date(Math.min(...dates));
    
    const endDates = [];
    if (wizardHeader.event_end_date) endDates.push(new Date(wizardHeader.event_end_date));
    if (wizardHeader.cta_end_date) endDates.push(new Date(wizardHeader.cta_end_date));
    if (wizardHeader.end_date) endDates.push(new Date(wizardHeader.end_date));
    
    const maxEnd = new Date(Math.max(...endDates));

    const months = [];
    let current = new Date(minStart.getFullYear(), minStart.getMonth(), 1);
    const limit = new Date(maxEnd.getFullYear(), maxEnd.getMonth(), 1);
    
    let iterations = 0;
    while (current <= limit && iterations < 36) {
      iterations++;
      const m = current.getMonth() + 1;
      if (!months.includes(m)) {
        months.push(m);
      }
      current.setMonth(current.getMonth() + 1);
    }
    
    if (months.length === 0) {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
    return months.sort((a, b) => a - b);
  };

  const availableMonths = getAvailableMonths();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-neutral-800 dark:text-white">Monthly Allocation & Expense Accounts</h4>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">Assign costs to corresponding accounts and vendors.</p>
        </div>
        <button
          type="button"
          onClick={addWizardItem}
          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-[11px] font-extrabold border border-blue-500/20 px-3.5 py-2 rounded-xl hover:bg-blue-500/5 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Add Row
        </button>
      </div>

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-[10px] border-collapse table-fixed">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-955 border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 font-extrabold uppercase tracking-wider">
                <th className="px-1 py-2 text-center w-[4%]">No</th>
                <th className="px-1 py-2 w-[11%]">Month *</th>
                <th className="px-1 py-2 w-[22%]">CoA Account *</th>
                <th className="px-1 py-2 w-[16%]">Vendor Partner</th>
                <th className="px-1 py-2 w-[8%] text-center">Qty *</th>
                <th className="px-1 py-2 w-[13%] text-right pr-2">Harga Satuan *</th>
                <th className="px-1 py-2 w-[13%] text-right pr-2">Sub Total</th>
                <th className="px-1 py-2 w-[10%]">Cost Notes</th>
                <th className="px-1 py-2 text-center w-[3%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-855 text-neutral-700 dark:text-neutral-300">
              {wizardItems.map((item, idx) => {
                const subTotal = Number(item.qty || 1) * Number(item.unit_price || 0);
                return (
                  <tr key={idx} className="hover:bg-neutral-50/20 dark:hover:bg-neutral-955/10 transition-colors">
                    <td className="px-1 py-1.5 text-center text-neutral-400 font-bold">
                      {idx + 1}
                    </td>
                    
                    {/* Month */}
                    <td className="px-1 py-1.5">
                      <select
                        value={item.period_month}
                        onChange={(e) => handleItemChange(idx, 'period_month', e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-neutral-805 dark:text-white"
                      >
                        <option value="">Month</option>
                        {availableMonths.map((m) => (
                          <option key={m} value={m}>{getMonthName(m)}</option>
                        ))}
                      </select>
                    </td>

                    {/* CoA select */}
                    <td className="px-1 py-1.5">
                      <select
                        value={item.coa_id}
                        onChange={(e) => handleItemChange(idx, 'coa_id', e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-neutral-800 dark:text-white"
                        required
                      >
                        <option value="">Select Account</option>
                        {metadata.coas.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Vendor input with autocomplete datalist */}
                    <td className="px-1 py-1.5">
                      <input
                        type="text"
                        list={`vendors-datalist-${idx}`}
                        placeholder="Ketik nama vendor..."
                        value={(() => {
                          if (/^\d+$/.test(item.vendor_id)) {
                            const vObj = metadata.vendors.find(v => String(v.id) === String(item.vendor_id));
                            return vObj ? vObj.vendor_name : '';
                          }
                          return item.vendor_id || '';
                        })()}
                        onChange={(e) => {
                          const val = e.target.value;
                          const matched = metadata.vendors.find(v => v.vendor_name === val);
                          if (matched) {
                            handleItemChange(idx, 'vendor_id', String(matched.id));
                          } else {
                            handleItemChange(idx, 'vendor_id', val);
                          }
                        }}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-neutral-800 dark:text-white"
                      />
                      <datalist id={`vendors-datalist-${idx}`}>
                        {metadata.vendors.map(v => (
                          <option key={v.id} value={v.vendor_name} />
                        ))}
                      </datalist>
                    </td>

                    {/* Qty */}
                    <td className="px-1 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
                        value={item.qty || '1'}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-neutral-850 dark:text-white text-center"
                        required
                      />
                    </td>

                    {/* Harga Satuan */}
                    <td className="px-1 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={formatThousands(item.unit_price || '')}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-neutral-850 dark:text-white text-right pr-2"
                        required
                      />
                    </td>

                    {/* Sub Total */}
                    <td className="px-1 py-1.5 text-right font-bold text-neutral-800 dark:text-neutral-100 pr-2">
                      {formatThousands(subTotal)}
                    </td>

                    {/* Cost detail description */}
                    <td className="px-1 py-1.5">
                      <input
                        type="text"
                        placeholder="Activity notes..."
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-neutral-855 dark:text-white"
                      />
                    </td>

                    {/* Delete Button */}
                    <td className="px-1 py-1.5 text-center">
                      {wizardItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeWizardItem(idx)}
                          className="text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Remove Row"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {/* Total Row */}
              <tr className="bg-neutral-50/70 dark:bg-neutral-955/60 border-t border-neutral-200 dark:border-neutral-800 font-bold">
                <td colSpan="6" className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-450">
                  Total Anggaran Rencana:
                </td>
                <td className="px-1 py-2.5 text-right text-xs text-blue-600 dark:text-blue-400 pr-2 font-black">
                  {formatThousands(wizardItems.reduce((acc, curr) => acc + (Number(curr.qty || 1) * Number(curr.unit_price || 0)), 0))}
                </td>
                <td colSpan="2" className="px-1 py-2.5"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WizardStep3ReviewSubmit({ wizardHeader, wizardItems, metadata, getMonthName, formatIDR }) {
  const totalEstimation = wizardItems.reduce((acc, curr) => acc + Number(curr.budget_amount || 0), 0);
  const companyName = metadata.companies.find(c => String(c.id) === String(wizardHeader.company_id))?.name || '';
  
  return (
    <div className="space-y-6">
      {/* Header Summary Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-50 dark:bg-neutral-955 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-850/80 space-y-3">
          <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">General Information</h4>
          <div className="space-y-2 text-xs font-bold text-neutral-600 dark:text-neutral-450">
            <div>Campaign Title: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{wizardHeader.title}</span></div>
            <div>PT / Company: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{companyName}</span></div>
            <div>Brand: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{metadata.brands.find(b => String(b.id) === String(wizardHeader.brand_id))?.name || '-'}</span></div>
            <div>Line of Business: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{metadata.lobs.find(l => String(l.id) === String(wizardHeader.lob_id))?.name || '-'}</span></div>
            <div>Lokasi Kegiatan / Event: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{(() => { const br = metadata.event_locations.find(b => String(b.id) === String(wizardHeader.event_location_id)); return br ? br.name : '-'; })()}</span></div>
            <div>Cabang Sasaran / Impact: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{(() => { if (!wizardHeader.branch_id || wizardHeader.branch_id === 'global') return 'Global Sales (Semua Toko)'; const br = metadata.branches.find(b => String(b.id) === String(wizardHeader.branch_id)); return br ? `Cabang ${br.name}` : 'Global Sales'; })()}</span></div>
          </div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-955 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-850/80 space-y-3">
          <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Timeline & Scope</h4>
          <div className="space-y-2 text-xs font-bold text-neutral-600 dark:text-neutral-450">
            <div>Fiscal Year: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{wizardHeader.fiscal_year}</span></div>
            <div>Periode Event: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{wizardHeader.event_start_date || '-'} s/d {wizardHeader.event_end_date || '-'}</span></div>
            <div>Periode Promo / CTA: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{wizardHeader.cta_start_date || '-'} s/d {wizardHeader.cta_end_date || '-'}</span></div>
            {wizardHeader.doc_url && (
              <div>
                Proposal: 
                <span className="block mt-0.5">
                  <a href={wizardHeader.doc_url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-bold">
                    <Paperclip className="w-3.5 h-3.5" /> Lihat Proposal
                  </a>
                </span>
              </div>
            )}
          </div>
        </div>

        {wizardHeader.description && (
          <div className="bg-neutral-50 dark:bg-neutral-955 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-850/80 space-y-2 md:col-span-2">
            <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Description</h4>
            <p className="text-xs text-neutral-650 dark:text-neutral-350 leading-relaxed font-medium">{wizardHeader.description}</p>
          </div>
        )}
      </div>

      {/* Dynamic Total Budget Badge Card */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-5 rounded-2xl text-white shadow-xl shadow-blue-600/10 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-150">Estimated Total Budget</span>
          <p className="text-[10px] text-blue-200">Calculated sum of monthly expense breakdowns</p>
        </div>
        <span className="text-xl font-black tracking-wide">
          {formatIDR(totalEstimation)}
        </span>
      </div>

      {/* Review list Table */}
      <div className="border border-neutral-200 dark:border-neutral-855 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-955 border-b border-neutral-200 dark:border-neutral-855 text-neutral-450 dark:text-neutral-500 font-extrabold uppercase tracking-wider">
                <th className="px-4.5 py-3">Month</th>
                <th className="px-4.5 py-3">CoA Account</th>
                <th className="px-4.5 py-3">Vendor</th>
                <th className="px-4.5 py-3 text-center">Qty</th>
                <th className="px-4.5 py-3 text-right">Harga Satuan (IDR)</th>
                <th className="px-4.5 py-3 text-right">Sub Total (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850/80 font-medium text-neutral-700 dark:text-neutral-300">
              {wizardItems.map((item, idx) => {
                const subTotal = Number(item.qty || 1) * Number(item.unit_price || 0);
                return (
                  <tr key={idx} className="hover:bg-neutral-50/20 dark:hover:bg-neutral-955/10 transition-colors">
                    <td className="px-4.5 py-3 font-semibold text-neutral-900 dark:text-white">{getMonthName(Number(item.period_month))}</td>
                    <td className="px-4.5 py-3">{metadata.coas.find(c => String(c.id) === String(item.coa_id))?.name || 'N/A'}</td>
                    <td className="px-4.5 py-3">{metadata.vendors.find(v => String(v.id) === String(item.vendor_id))?.vendor_name || item.vendor_id || '-'}</td>
                    <td className="px-4.5 py-3 text-center">{item.qty || '1'}</td>
                    <td className="px-4.5 py-3 text-right">{formatIDR(item.unit_price || item.budget_amount)}</td>
                    <td className="px-4.5 py-3 text-right font-black text-neutral-855 dark:text-white">{formatIDR(subTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
