'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Save, Loader2, AlertTriangle, Info, Plus, Users, FileText, Wallet, ClipboardCheck, ArrowLeft, ArrowRight, Send, Megaphone
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import { useLanguage } from '@/lib/LanguageContext';
import mpt from '@/lib/translations/marketingPlan';
import { isLateSubmission } from '@/lib/marketingGovernance';
import ActionFailureModal from '@/components/ui/ActionFailureModal';
import WizardStep1GeneralInfo, { CURRENT_YEAR, FISCAL_YEAR_OPTIONS, formatThousands } from './MarketingPlanWizardStep1';
import WizardStep2BudgetItems from './MarketingPlanWizardStep2';
import WizardStep3ReviewSubmit from './MarketingPlanWizardStep3';

// Helper: Format to IDR Currency
const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

// Helper: Get Month Name
const getMonthName = (monthNum, lang = 'en') => {
  const months_en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months_id = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const months = lang === 'id' ? months_id : months_en;
  return months[monthNum - 1] || '';
};

// Budget Control follows the month in which the event starts. The promotion period
// measures campaign effectiveness only, so it never changes the budget month.
const getEventBudgetMonth = (eventStartDate) => {
  if (!eventStartDate) return null;
  const date = new Date(eventStartDate);
  return Number.isNaN(date.getTime()) ? null : date.getUTCMonth() + 1;
};

export default function MarketingPlanWizardModal({
  isOpen,
  onClose,
  draftPlanId,
  revisingPlanId,
  metadata,
  onMetadataChanged,
  onSuccess,
  onError
}) {
  const lang = 'en'; // Marketing Plan UI is English-only
  const t = useCallback((key, ...args) => typeof mpt.en[key] === 'function' ? mpt.en[key](...args) : (mpt.en[key] ?? key), [lang]);

  const prevIsOpenRef = useRef(false);
  const prevActivePlanIdRef = useRef(null);

  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [failureModal, setFailureModal] = useState({
    isOpen: false,
    title: '',
    error: null,
    actionContext: ''
  });

  const getDefaultCompanyId = useCallback((companiesList) => {
    if (!companiesList || companiesList.length === 0) return '';
    const mogems = companiesList.find(c => c.name.toLowerCase().includes('mogems'));
    return String(mogems ? mogems.id : companiesList[0].id);
  }, []);

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
    branch_ids: [],
    event_location_id: '',
    doc_url: '',
    over_budget_reason: '',
    target_sales: '',
    target_leads: '',
    target_reach: '',
    target_impressions: '',
    target_roi_pct: '',
    target_notes: '',
    late_submission_reason: ''
  });

  const [wizardItems, setWizardItems] = useState([
    { period_month: '1', coa_id: '', vendor_id: '', qty: '1', unit_price: '', budget_amount: '0', description: '', event_location_id: '', branch_id: 'global' }
  ]);

  const [wizardApprovers, setWizardApprovers] = useState([]);

  const [budgetAvailability, setBudgetAvailability] = useState(null);
  const [checkingBudget, setCheckingBudget] = useState(false);
  const eventBudgetMonth = getEventBudgetMonth(wizardHeader.event_start_date);

  // Helper to load default recommended approvers from metadata or fallback.
  // Resolusi tingkat kontak sama seperti backend: PT spesifik > Holding Group > Global.
  const getDefaultApproversForCompany = useCallback((companyId) => {
    const targetCid = companyId || wizardHeader.company_id;
    if (metadata.defaultApproverContacts && metadata.defaultApproverContacts.length > 0) {
      const selectedCompany = (metadata.companies || []).find(c => String(c.id) === String(targetCid));
      const masterId = selectedCompany?.m_company_master?.id || selectedCompany?.company_master_id;
      const allContacts = metadata.defaultApproverContacts;

      // Kumpulkan role unik, lalu resolve masing-masing lewat tingkatan PT > Holding > Global
      const roles = [...new Set(allContacts.map(c => c.role))];
      const contacts = roles.map(role => {
        const ptMatch = allContacts.find(c => c.role === role && c.company_id && String(c.company_id) === String(targetCid));
        if (ptMatch) return ptMatch;
        const holdingMatch = allContacts.find(c => c.role === role && !c.company_id && masterId && c.company_master_id === masterId);
        if (holdingMatch) return holdingMatch;
        return allContacts.find(c => c.role === role && !c.company_id && !c.company_master_id) || null;
      }).filter(Boolean);

      if (contacts.length > 0) {
        return contacts.map((c, idx) => ({
          step_number: idx + 1,
          approver_name: c.signer?.name || c.label || '',
          approver_email: c.signer?.email || c.email || '',
          approver_role: c.label || c.role?.replace(/_/g, ' ') || 'Approver'
        }));
      }
    }

    return [
      { step_number: 1, approver_name: '', approver_email: '', approver_role: 'Marketing Manager' },
      { step_number: 2, approver_name: '', approver_email: '', approver_role: 'General Manager' },
      { step_number: 3, approver_name: '', approver_email: '', approver_role: 'Finance Controller' }
    ];
  }, [metadata.defaultApproverContacts, metadata.companies]);

  const getDefaultApprovers = useCallback((companyId) => {
    return getDefaultApproversForCompany(companyId);
  }, [getDefaultApproversForCompany]);

  // Initialize company ID once metadata is ready
  useEffect(() => {
    if (isOpen && metadata.companies && metadata.companies.length > 0 && !wizardHeader.company_id) {
      setWizardHeader(prev => {
        if (prev.company_id) return prev;
        return { ...prev, company_id: getDefaultCompanyId(metadata.companies) };
      });
    }
  }, [isOpen, metadata.companies, wizardHeader.company_id, getDefaultCompanyId]);

  // Load plan to edit or revise
  useEffect(() => {
    const activePlanId = draftPlanId || revisingPlanId;
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isPlanChanged = isOpen && activePlanId !== prevActivePlanIdRef.current;

    prevIsOpenRef.current = isOpen;
    prevActivePlanIdRef.current = activePlanId;

    if (!isOpen) return;

    // Only run when modal first opens or when activePlanId switches
    if (!isOpening && !isPlanChanged) return;

    if (!activePlanId) {
      // If we are opening a fresh modal, reset state
      const defaultCompId = metadata.companies && metadata.companies.length > 0 ? getDefaultCompanyId(metadata.companies) : '';
      setWizardStep(1);
      setWizardHeader({
        title: '',
        description: '',
        company_id: defaultCompId,
        fiscal_year: String(new Date().getFullYear()),
        start_date: '',
        end_date: '',
        event_start_date: '',
        event_end_date: '',
        cta_start_date: '',
        cta_end_date: '',
        brand_id: '',
        lob_id: '',
        branch_ids: [],
        event_location_id: '',
        doc_url: '',
        over_budget_reason: '',
        target_sales: '',
        target_leads: '',
        target_reach: '',
        target_impressions: '',
        target_roi_pct: '',
        target_notes: '',
        late_submission_reason: ''
      });
      setWizardItems([
        { period_month: '1', coa_id: '', vendor_id: '', qty: '1', unit_price: '', budget_amount: '0', description: '', event_location_id: '', branch_id: 'global' }
      ]);
      setWizardApprovers([]);
      setBudgetAvailability(null);
      return;
    }

    const loadPlanDetails = async () => {
      try {
        setLoadingPlan(true);
        const plan = await apiClient.get(`/api/marketing/plans/${activePlanId}`);
        const formatDate = (d) => {
          if (!d) return '';
          const dt = new Date(d);
          return isNaN(dt) ? '' : dt.toISOString().split('T')[0];
        };
        const firstItem = plan.items && plan.items[0] ? plan.items[0] : {};
        
        setWizardHeader({
          title: plan.title || '',
          description: plan.description || '',
          company_id: plan.company_id ? String(plan.company_id) : '',
          fiscal_year: plan.fiscal_year ? String(plan.fiscal_year) : String(CURRENT_YEAR),
          start_date: formatDate(plan.start_date),
          end_date: formatDate(plan.end_date),
          event_start_date: formatDate(plan.event_start_date || plan.start_date),
          event_end_date: formatDate(plan.event_end_date || plan.end_date),
          cta_start_date: formatDate(plan.cta_start_date),
          cta_end_date: formatDate(plan.cta_end_date),
          brand_id: firstItem.brand_id ? String(firstItem.brand_id) : '',
          lob_id: firstItem.lob_id ? String(firstItem.lob_id) : '',
          branch_ids: (() => {
            const items = plan.items || [];
            const uniqueIds = [...new Set(items.filter(it => it && it.branch_id).map(it => String(it.branch_id)))];
            return uniqueIds;
          })(),
          event_location_id: firstItem.event_location_id ? String(firstItem.event_location_id) : '',
          doc_url: plan.doc_url || '',
          over_budget_reason: plan.over_budget_reason || '',
          target_sales: plan.target_sales ? String(plan.target_sales) : '',
          target_leads: plan.target_leads ? String(plan.target_leads) : '',
          target_reach: plan.target_reach ? String(plan.target_reach) : '',
          target_impressions: plan.target_impressions ? String(plan.target_impressions) : '',
          target_roi_pct: plan.target_roi_pct ? String(plan.target_roi_pct) : '',
          target_notes: plan.target_notes || '',
          late_submission_reason: plan.late_submission_reason || ''
        });

        setWizardItems(plan.items && plan.items.length > 0
          ? plan.items.map(it => ({
              period_month: String(it.period_month || '1'),
              coa_id: it.coa_id ? String(it.coa_id) : '',
              vendor_id: it.vendor_id ? String(it.vendor_id) : '',
              budget_amount: String(it.budget_amount || '0'),
              description: it.description || '',
              qty: String(it.qty || '1'),
              unit_price: String(it.unit_price || it.budget_amount || '0'),
              event_location_id: it.event_location_id ? String(it.event_location_id) : '',
              branch_id: it.branch_id ? String(it.branch_id) : 'global'
            }))
          : [{ period_month: '1', coa_id: '', vendor_id: '', qty: '1', unit_price: '', budget_amount: '0', description: '', event_location_id: '', branch_id: 'global' }]
        );

        if (plan.approvers && plan.approvers.length > 0) {
          setWizardApprovers(plan.approvers.map((a, i) => ({
            step_number: a.step_number || (i + 1),
            approver_name: a.approver_name || '',
            approver_email: a.approver_email || '',
            approver_role: a.approver_role || ''
          })));
        } else {
          const defaults = getDefaultApproversForCompany(plan.company_id);
          setWizardApprovers(defaults || []);
        }

        setWizardStep(1);
      } catch (err) {
        onError('Failed to load plan details: ' + err.message);
      } finally {
        setLoadingPlan(false);
      }
    };

    loadPlanDetails();
  }, [draftPlanId, revisingPlanId, isOpen, metadata.companies, getDefaultCompanyId, getDefaultApproversForCompany, onError]);

  // Check budget availability
  const checkBudgetAvailability = useCallback(async () => {
    const { company_id, brand_id, lob_id, fiscal_year } = wizardHeader;
    if (!company_id || !brand_id || !lob_id || !fiscal_year) {
      setBudgetAvailability(null);
      return;
    }

    try {
      setCheckingBudget(true);
      const res = await apiClient.get('/api/marketing/budgets/check', {
        params: { company_id, brand_id, lob_id, fiscal_year }
      });
      setBudgetAvailability(res || null);
    } catch (err) {
      console.error('Failed to check budget availability:', err);
    } finally {
      setCheckingBudget(false);
    }
  }, [wizardHeader.company_id, wizardHeader.brand_id, wizardHeader.lob_id, wizardHeader.fiscal_year]);

  useEffect(() => {
    checkBudgetAvailability();
  }, [checkBudgetAvailability]);

  // The event start date is the sole source for budget allocation month. This also
  // normalizes imported and previously saved draft lines when the event is changed.
  useEffect(() => {
    if (!eventBudgetMonth) return;
    const periodMonth = String(eventBudgetMonth);
    setWizardItems(prev => prev.map(item => item.period_month === periodMonth ? item : { ...item, period_month: periodMonth }));
  }, [eventBudgetMonth]);

  // Calculate over-budget months
  const overBudgetMonths = useMemo(() => {
    if (!budgetAvailability || !budgetAvailability.is_locked) return [];

    const monthlyProposed = Array.from({ length: 12 }, () => 0);
    wizardItems.forEach(item => {
      const m = parseInt(item.period_month, 10) || 1;
      monthlyProposed[m - 1] += parseFloat(item.budget_amount || 0);
    });

    const over = [];
    budgetAvailability.monthly.forEach(mObj => {
      const mIdx = mObj.month - 1;
      const proposed = monthlyProposed[mIdx];
      if (proposed + mObj.committed > mObj.limit) {
        over.push({
          month: mObj.month,
          limit: mObj.limit,
          committed: mObj.committed,
          proposed,
          excess: (proposed + mObj.committed) - mObj.limit
        });
      }
    });

    return over;
  }, [budgetAvailability, wizardItems]);

  const addWizardItem = () => {
    setWizardItems(prev => [
      ...prev,
      { period_month: String(eventBudgetMonth || 1), coa_id: '', vendor_id: '', qty: '1', unit_price: '', budget_amount: '0', description: '', event_location_id: '', branch_id: 'global' }
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
      
      if (field === 'qty' || field === 'unit_price') {
        const qtyVal = next[idx].qty ? next[idx].qty.replace(/\D/g, '') : '1';
        const unitVal = next[idx].unit_price ? next[idx].unit_price.replace(/\D/g, '') : '0';
        
        if (field === 'qty') next[idx].qty = qtyVal;
        if (field === 'unit_price') next[idx].unit_price = unitVal;
        
        const qty = parseInt(qtyVal || '0', 10);
        const unitPrice = parseFloat(unitVal || '0');
        next[idx].budget_amount = String(qty * unitPrice);
      }
      return next;
    });
  };

  const buildWizardPayload = () => ({
    ...wizardHeader,
    start_date: wizardHeader.event_start_date || null,
    end_date: wizardHeader.event_end_date || null,
    branch_ids: wizardHeader.branch_ids || [],
    event_location_id: wizardHeader.event_location_id ? Number(wizardHeader.event_location_id) : null,
    target_sales: wizardHeader.target_sales ? Number(String(wizardHeader.target_sales).replace(/\D/g, '')) : null,
    target_leads: wizardHeader.target_leads ? parseInt(wizardHeader.target_leads, 10) : null,
    target_reach: wizardHeader.target_reach ? parseInt(wizardHeader.target_reach, 10) : null,
    target_impressions: wizardHeader.target_impressions ? parseInt(wizardHeader.target_impressions, 10) : null,
    target_roi_pct: wizardHeader.target_roi_pct ? parseFloat(wizardHeader.target_roi_pct) : null,
    target_notes: wizardHeader.target_notes || null,
    approvers: wizardApprovers.map((a, i) => ({
      step_number: i + 1,
      approver_name: a.approver_name ? a.approver_name.trim() : '',
      approver_email: a.approver_email ? a.approver_email.trim() : '',
      approver_role: a.approver_role ? a.approver_role.trim() : ''
    })),
    items: wizardItems.map(item => ({
      ...item,
      coa_id: Number(item.coa_id),
      brand_id: wizardHeader.brand_id ? Number(wizardHeader.brand_id) : null,
      lob_id: wizardHeader.lob_id ? Number(wizardHeader.lob_id) : null,
      branch_id: wizardHeader.branch_ids.length > 0 && !isNaN(Number(wizardHeader.branch_ids[0])) ? Number(wizardHeader.branch_ids[0]) : null,
      event_location_id: wizardHeader.event_location_id ? Number(wizardHeader.event_location_id) : null,
      vendor_id: item.vendor_id || null,
      period_month: eventBudgetMonth || 1,
      budget_amount: Number(item.budget_amount) || 0
    }))
  });

  const handleSaveDraft = async () => {
    if (!wizardHeader.title || !wizardHeader.company_id || !wizardHeader.fiscal_year) {
      const msg = t('errDraftRequired');
      setFailureModal({
        isOpen: true,
        title: 'Formulir Belum Lengkap',
        error: { message: msg, status: 400 },
        actionContext: 'Penyimpanan Draft Plan (Langkah 1)'
      });
      onError?.(msg);
      return;
    }
    setSubmittingDraft(true);
    try {
      const payload = buildWizardPayload();
      if (draftPlanId) {
        await apiClient.put(`/api/marketing/plans/${draftPlanId}`, payload);
        onSuccess(t('successDraftUpdated'));
      } else {
        const result = await apiClient.post('/api/marketing/plans', { ...payload, save_as_draft: true });
        onSuccess(t('successDraftSaved', result.id));
      }
    } catch (err) {
      setFailureModal({
        isOpen: true,
        title: 'Gagal Menyimpan Draft Plan',
        error: err,
        actionContext: 'Penyimpanan Draft Marketing Plan'
      });
      onError?.(err.message || t('errFailDraft'));
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!wizardHeader.title || !wizardHeader.company_id || !wizardHeader.fiscal_year) {
      const msg = t('errRequired');
      setFailureModal({
        isOpen: true,
        title: 'Informasi Umum Belum Lengkap',
        error: { message: msg, status: 400 },
        actionContext: 'Validasi Langkah 1 (Informasi Umum)'
      });
      onError?.(msg);
      setSubmitting(false);
      return;
    }

    const invalidItem = wizardItems.find(item => !item.coa_id || !item.budget_amount || Number(item.budget_amount) <= 0);
    if (invalidItem) {
      const msg = t('errItems');
      setFailureModal({
        isOpen: true,
        title: 'Rincian Budget Belum Valid',
        error: { message: msg, status: 400 },
        actionContext: 'Validasi Langkah 2 (Rincian Anggaran)'
      });
      onError?.(msg);
      setSubmitting(false);
      return;
    }

    if (overBudgetMonths.length > 0 && !wizardHeader.over_budget_reason?.trim()) {
      const msg = t('errJustification');
      setFailureModal({
        isOpen: true,
        title: 'Alasan Over-Budget Wajib Diisi',
        error: { message: msg, status: 400 },
        actionContext: 'Pemeriksaan Batas Anggaran (Over-Budget)'
      });
      onError?.(msg);
      setSubmitting(false);
      return;
    }

    if (isLateSubmission(wizardHeader.event_start_date) && !wizardHeader.late_submission_reason?.trim()) {
      const msg = lang === 'id'
        ? 'Event berjarak kurang dari 3 bulan (aturan H-3). Wajib mengisi alasan keterlambatan pengajuan di langkah 3.'
        : 'The event is less than 3 months away (H-3 rule). Fill in the late submission reason in Step 3.';
      setFailureModal({
        isOpen: true,
        title: 'Alasan Keterlambatan Wajib Diisi (H-3)',
        error: { message: msg, status: 400 },
        actionContext: 'Validasi Waktu Event (Aturan H-3)'
      });
      onError?.(msg);
      setSubmitting(false);
      return;
    }

    if (!wizardHeader.target_notes?.trim()) {
      const msg = lang === 'id'
        ? 'Catatan target / indikator lainnya wajib diisi pada bagian Target KPI.'
        : 'Target Notes / Other Indicators is required in the KPI Targets section.';
      setFailureModal({
        isOpen: true,
        title: 'Target KPI Belum Lengkap',
        error: { message: msg, status: 400 },
        actionContext: 'Validasi Target KPI (Langkah 3)'
      });
      onError?.(msg);
      setSubmitting(false);
      return;
    }

    // Every submitted plan must carry a complete, explicit document approval chain.
    if (!wizardApprovers.length) {
      const msg = lang === 'id' ? 'Alur penandatangan dan persetujuan wajib diisi di langkah 3.' : 'Document Signers & Approval Chain is required in Step 3.';
      setFailureModal({
        isOpen: true,
        title: 'Approval Chain Wajib Diisi',
        error: { message: msg, status: 400 },
        actionContext: 'Validasi Alur Approval (Langkah 3)'
      });
      onError?.(msg);
      setSubmitting(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let i = 0; i < wizardApprovers.length; i++) {
      const app = wizardApprovers[i];
      if (!app.approver_name || !app.approver_name.trim()) {
        const msg = lang === 'id' ? `Nama penandatangan pada langkah ${i + 1} masih kosong.` : `Signer name at Step ${i + 1} is required.`;
        setFailureModal({
          isOpen: true,
          title: 'Nama Signer Belum Diisi',
          error: { message: msg, status: 400 },
          actionContext: `Validasi Penandatangan #${i + 1}`
        });
        onError?.(msg);
        setSubmitting(false);
        return;
      }
      if (!app.approver_email || !emailRegex.test(app.approver_email.trim())) {
        const msg = lang === 'id' ? `Format email penandatangan #${i + 1} ("${app.approver_name}") tidak valid.` : `Email format for signer at Step ${i + 1} is invalid.`;
        setFailureModal({
          isOpen: true,
          title: 'Format Email Signer Tidak Valid',
          error: { message: msg, status: 400 },
          actionContext: `Validasi Email Penandatangan #${i + 1}`
        });
        onError?.(msg);
        setSubmitting(false);
        return;
      }
      if (!app.approver_role || !app.approver_role.trim()) {
        const msg = lang === 'id' ? `Role atau jabatan penandatangan pada langkah ${i + 1} masih kosong.` : `Signer role or position at Step ${i + 1} is required.`;
        setFailureModal({
          isOpen: true,
          title: 'Role Signer Belum Diisi',
          error: { message: msg, status: 400 },
          actionContext: `Validasi Penandatangan #${i + 1}`
        });
        onError?.(msg);
        setSubmitting(false);
        return;
      }
    }

    try {
      const payload = buildWizardPayload();
      if (revisingPlanId) {
        await apiClient.post(`/api/marketing/plans/${revisingPlanId}/revise`, payload);
        onSuccess(t('successRevised'));
      } else if (draftPlanId) {
        await apiClient.put(`/api/marketing/plans/${draftPlanId}`, payload);
        await apiClient.post(`/api/marketing/plans/${draftPlanId}/submit`);
        onSuccess(t('successSubmitted'));
      } else {
        await apiClient.post('/api/marketing/plans', payload);
        onSuccess(t('successSubmitted'));
      }
    } catch (err) {
      setFailureModal({
        isOpen: true,
        title: 'Pengajuan Plan Gagal',
        error: err,
        actionContext: revisingPlanId
          ? 'Revisi & Pengajuan Ulang Plan'
          : (draftPlanId ? 'Pengajuan Draft Plan' : 'Pengajuan Plan Baru (Submit)'),
      });
      onError?.(err.message || t('errFailSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div key="wizard" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-7xl z-55 overflow-hidden flex flex-col max-h-[94dvh]"
          >
            {/* Wizard Header */}
            <div className="shrink-0 px-5 sm:px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4 justify-between bg-white dark:bg-slate-900">
              <div className="flex min-w-0 items-center gap-3">
                <span className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><Megaphone className="h-5 w-5" /></span>
                <div>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                  {revisingPlanId ? t('wizardTitleRevise', revisingPlanId) :
                   draftPlanId ? t('wizardTitleDraft', draftPlanId) :
                   t('wizardTitle')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {revisingPlanId ? t('wizardSubtitleRevise') :
                   draftPlanId ? t('wizardSubtitleDraft') :
                   t('wizardSubtitle')}
                </p>
              </div>
              </div>
              <button
                aria-label={lang === 'id' ? 'Close wizard' : 'Close wizard'}
                onClick={onClose}
                className="p-2.5 border border-slate-200 dark:border-slate-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingPlan ? (
              <div className="flex-1 py-32 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-xs text-neutral-400 font-medium">Loading plan details...</span>
              </div>
            ) : (
              <>
                <nav aria-label={lang === 'id' ? 'Submission steps' : 'Submission steps'} className="shrink-0 border-b border-slate-200/70 bg-white px-3 py-3 sm:px-7 dark:border-slate-800 dark:bg-slate-900">
                  <ol className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { num: 1, label: t('stepGeneralInfo'), icon: FileText, hint: lang === 'id' ? 'Campaign, jadwal & target' : 'Campaign, schedule & targets' },
                      { num: 2, label: t('stepMonthlyBudget'), icon: Wallet, hint: lang === 'id' ? 'Monthly cost allocation' : 'Monthly expense allocation' },
                      { num: 3, label: 'Review & Submit', icon: ClipboardCheck, hint: lang === 'id' ? 'Ringkasan & persetujuan' : 'Summary & approvals' }
                    ].map(({ num, label, icon: Icon, hint }) => (
                      <li key={num} aria-current={wizardStep === num ? 'step' : undefined}
                        className={`flex items-center gap-3 rounded-xl border px-2 py-3 sm:px-4 transition-colors ${wizardStep === num ? 'border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10' : 'border-transparent bg-slate-50 dark:bg-slate-800/40'}`}>
                        <span className={`hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${wizardStep > num ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' : wizardStep === num ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'}`}>
                          {wizardStep > num ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className={`text-[11px] sm:text-xs font-semibold ${wizardStep === num ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}><span className="mr-1.5 opacity-50">0{num}</span>{label}</p>
                          <p className="hidden lg:block mt-1 text-[11px] text-slate-400">{hint}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </nav>

                {/* Wizard Body (Scrollable) */}
                <div key={wizardStep} className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 dark:bg-slate-950/50 p-4 sm:p-6 space-y-5">
                  {wizardStep === 1 && (
                    <WizardStep1GeneralInfo
                      wizardHeader={wizardHeader}
                      setWizardHeader={setWizardHeader}
                      setWizardApprovers={setWizardApprovers}
                      getDefaultApproversForCompany={getDefaultApproversForCompany}
                      isDraftOrRevise={Boolean(draftPlanId || revisingPlanId)}
                      lang={lang}
                      metadata={metadata}
                      onMetadataChanged={onMetadataChanged}
                      t={t}
                    />
                  )}

                  {wizardStep === 2 && (
                    <WizardStep2BudgetItems
                      wizardHeader={wizardHeader}
                      wizardItems={wizardItems}
                      setWizardItems={setWizardItems}
                      addWizardItem={addWizardItem}
                      removeWizardItem={removeWizardItem}
                      handleItemChange={handleItemChange}
                      metadata={metadata}
                      overBudgetMonths={overBudgetMonths}
                      budgetAvailability={budgetAvailability}
                      t={t}
                      lang={lang}
                    />
                  )}

                  {wizardStep === 3 && (
                    <WizardStep3ReviewSubmit
                      wizardHeader={wizardHeader}
                      setWizardHeader={setWizardHeader}
                      wizardItems={wizardItems}
                      metadata={metadata}
                      overBudgetMonths={overBudgetMonths}
                      budgetAvailability={budgetAvailability}
                      wizardApprovers={wizardApprovers}
                      setWizardApprovers={setWizardApprovers}
                      onUseDefaults={() => setWizardApprovers(getDefaultApprovers())}
                      t={t}
                      lang={lang}
                    />
                  )}
                </div>

                {/* Wizard Footer Controls */}
                <div className="shrink-0 px-4 sm:px-7 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between bg-white dark:bg-slate-900 shadow-[0_-4px_20px_-12px_rgba(15,23,42,0.15)]">
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1) onClose();
                      else setWizardStep(prev => prev - 1);
                    }}
                    className="flex items-center gap-2 px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {wizardStep > 1 && <ArrowLeft className="h-3.5 w-3.5" />}
                    {wizardStep === 1 ? t('btnCancel') : t('btnBack')}
                  </button>

                  <div className="flex items-center gap-2">
                    {!revisingPlanId && (
                      <button
                        type="button"
                        disabled={submittingDraft || submitting}
                        onClick={handleSaveDraft}
                        className="px-3 sm:px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {submittingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {draftPlanId ? t('btnUpdateDraft') : t('btnSaveDraft')}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={submitting || submittingDraft}
                      onClick={(e) => {
                        if (wizardStep < 3) {
                          if (wizardStep === 1 && !eventBudgetMonth) {
                            setFailureModal({
                              isOpen: true,
                              title: 'Event Date Required',
                              error: { message: 'Set the Event Date first. It determines the month used for budget allocation.', status: 400 },
                              actionContext: 'Budget Month Allocation'
                            });
                            return;
                          }
                          setWizardStep(prev => prev + 1);
                        } else handleWizardSubmit(e);
                      }}
                      className="px-4 sm:px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {wizardStep === 3
                        ? (revisingPlanId ? t('btnResubmit') : t('btnSubmitPlan'))
                        : t('btnNext')}
                      {!submitting && (wizardStep === 3 ? <Send className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />)}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Pop-up feedback saat terjadi kegagalan (403/401/400/500) */}
    <ActionFailureModal
      isOpen={failureModal.isOpen}
      onClose={() => setFailureModal(prev => ({ ...prev, isOpen: false }))}
      title={failureModal.title}
      error={failureModal.error}
      actionContext={failureModal.actionContext}
    />
    </>
  );
}
