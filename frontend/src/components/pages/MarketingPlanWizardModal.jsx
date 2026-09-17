'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Save, Loader2, AlertTriangle, Info, Plus, Users
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import { useLanguage } from '@/lib/LanguageContext';
import mpt from '@/lib/translations/marketingPlan';
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

export default function MarketingPlanWizardModal({
  isOpen,
  onClose,
  draftPlanId,
  revisingPlanId,
  metadata,
  onSuccess,
  onError
}) {
  const { lang } = useLanguage();
  const t = useCallback((key, ...args) => typeof mpt[lang][key] === 'function' ? mpt[lang][key](...args) : (mpt[lang][key] ?? key), [lang]);

  const prevIsOpenRef = useRef(false);
  const prevActivePlanIdRef = useRef(null);

  const [wizardStep, setWizardStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);

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
    target_notes: ''
  });

  const [wizardItems, setWizardItems] = useState([
    { period_month: '1', coa_id: '', vendor_id: '', qty: '1', unit_price: '', budget_amount: '0', description: '', event_location_id: '', branch_id: 'global' }
  ]);

  const [wizardApprovers, setWizardApprovers] = useState([]);

  const [budgetAvailability, setBudgetAvailability] = useState(null);
  const [checkingBudget, setCheckingBudget] = useState(false);

  // Helper to load default recommended approvers from metadata or fallback
  const getDefaultApproversForCompany = useCallback((companyId) => {
    const targetCid = companyId || wizardHeader.company_id;
    if (metadata.defaultApproverContacts && metadata.defaultApproverContacts.length > 0) {
      const selectedCompany = (metadata.companies || []).find(c => String(c.id) === String(targetCid));
      const masterId = selectedCompany?.m_company_master?.id || selectedCompany?.company_master_id;

      let contacts = metadata.defaultApproverContacts;
      if (masterId) {
        const matching = contacts.filter(c => c.company_master_id === masterId);
        if (matching.length > 0) contacts = matching;
        else contacts = contacts.filter(c => !c.company_master_id);
      } else {
        contacts = contacts.filter(c => !c.company_master_id);
      }

      if (contacts.length > 0) {
        return contacts.map((c, idx) => {
          const email = c.email || c.contact_email || '';
          const matchedUser = (metadata.users || []).find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
          return {
            step_number: idx + 1,
            approver_name: matchedUser ? matchedUser.full_name : (c.contact_name || c.label || ''),
            approver_email: email,
            approver_role: c.label || c.role?.replace(/_/g, ' ') || 'Approver'
          };
        });
      }
    }

    return [
      { step_number: 1, approver_name: '', approver_email: '', approver_role: 'Marketing Manager' },
      { step_number: 2, approver_name: '', approver_email: '', approver_role: 'General Manager' },
      { step_number: 3, approver_name: '', approver_email: '', approver_role: 'Finance Controller' }
    ];
  }, [metadata.defaultApproverContacts, metadata.companies, metadata.users]);

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
        target_notes: ''
      });
      setWizardItems([
        { period_month: '1', coa_id: '', vendor_id: '', qty: '1', unit_price: '', budget_amount: '0', description: '', event_location_id: '', branch_id: 'global' }
      ]);
      setWizardApprovers(getDefaultApproversForCompany(defaultCompId));
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
            const uniqueIds = [...new Set(plan.items.filter(it => it.branch_id).map(it => String(it.branch_id)))];
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
          target_notes: plan.target_notes || ''
        });

        setWizardItems(plan.items && plan.items.length > 0
          ? plan.items.map(it => ({
              period_month: it.period_month || '',
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
          setWizardApprovers(getDefaultApproversForCompany(plan.company_id));
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
      { period_month: '1', coa_id: '', vendor_id: '', qty: '1', unit_price: '', budget_amount: '0', description: '', event_location_id: '', branch_id: 'global' }
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
      branch_id: wizardHeader.branch_ids.length > 0 ? Number(wizardHeader.branch_ids[0]) : null,
      event_location_id: wizardHeader.event_location_id ? Number(wizardHeader.event_location_id) : null,
      vendor_id: item.vendor_id || null,
      period_month: Number(item.period_month),
      budget_amount: Number(item.budget_amount)
    }))
  });

  const handleSaveDraft = async () => {
    if (!wizardHeader.title || !wizardHeader.company_id || !wizardHeader.fiscal_year) {
      onError(t('errDraftRequired'));
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
      onError(err.message || t('errFailDraft'));
    } finally {
      setSubmittingDraft(false);
    }
  };

  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (!wizardHeader.title || !wizardHeader.company_id || !wizardHeader.fiscal_year) {
      onError(t('errRequired'));
      setSubmitting(false);
      return;
    }

    const invalidItem = wizardItems.find(item => !item.coa_id || !item.budget_amount || Number(item.budget_amount) <= 0);
    if (invalidItem) {
      onError(t('errItems'));
      setSubmitting(false);
      return;
    }

    if (overBudgetMonths.length > 0 && !wizardHeader.over_budget_reason?.trim()) {
      onError(t('errJustification'));
      setSubmitting(false);
      return;
    }

    // Validate DocHub-style signers
    const validApprovers = wizardApprovers.filter(a => a.approver_name?.trim() && a.approver_email?.trim());
    if (validApprovers.length === 0) {
      onError(lang === 'id' ? 'Minimal 1 penandatangan (approver) wajib ditentukan pada Step 3.' : 'Please define at least 1 signer in Step 3.');
      setSubmitting(false);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let i = 0; i < wizardApprovers.length; i++) {
      const app = wizardApprovers[i];
      if (!app.approver_name || !app.approver_name.trim()) {
        onError(lang === 'id' ? `Nama penandatangan pada Step ${i + 1} belum diisi.` : `Signer name at Step ${i + 1} is required.`);
        setSubmitting(false);
        return;
      }
      if (!app.approver_email || !emailRegex.test(app.approver_email.trim())) {
        onError(lang === 'id' ? `Format email penandatangan pada Step ${i + 1} ("${app.approver_name}") tidak valid.` : `Email format for signer at Step ${i + 1} is invalid.`);
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
      onError(err.message || t('errFailSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl relative w-full max-w-7xl z-55 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Wizard Header */}
            <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-955/20">
              <div>
                <h3 className="text-md font-black text-neutral-850 dark:text-white">
                  {revisingPlanId ? t('wizardTitleRevise', revisingPlanId) :
                   draftPlanId ? t('wizardTitleDraft', draftPlanId) :
                   t('wizardTitle')}
                </h3>
                <p className="text-[10px] text-neutral-450 mt-0.5">
                  {revisingPlanId ? t('wizardSubtitleRevise') :
                   draftPlanId ? t('wizardSubtitleDraft') :
                   t('wizardSubtitle')}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-805 rounded-full text-neutral-450 hover:text-neutral-800 dark:hover:text-white"
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
                {/* Wizard Steps indicator */}
                <div className="px-8 py-6 bg-neutral-50/50 dark:bg-neutral-955/20 border-b border-neutral-100 dark:border-neutral-800 select-none">
                  <div className="flex items-center justify-between max-w-2xl mx-auto relative px-4">
                    <div className="absolute left-6 right-6 top-4.5 h-0.5 bg-neutral-200 dark:bg-neutral-800 -z-10 rounded-full" />
                    
                    <motion.div 
                      className="absolute left-6 top-4.5 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 -z-10 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: wizardStep === 1 ? '0%' : wizardStep === 2 ? '50%' : '100%' }}
                      transition={{ type: 'spring', stiffness: 100, damping: 18 }}
                    />

                    {[
                      { num: 1, label: t('stepGeneralInfo') },
                      { num: 2, label: t('stepMonthlyBudget') },
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
                      setWizardApprovers={setWizardApprovers}
                      getDefaultApproversForCompany={getDefaultApproversForCompany}
                      isDraftOrRevise={Boolean(draftPlanId || revisingPlanId)}
                      metadata={metadata}
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
                <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/30 dark:bg-neutral-955/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (wizardStep === 1) onClose();
                      else setWizardStep(prev => prev - 1);
                    }}
                    className="px-4 py-2 border border-neutral-250 dark:border-neutral-750 text-neutral-650 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    {wizardStep === 1 ? t('btnCancel') : t('btnBack')}
                  </button>

                  <div className="flex items-center gap-2">
                    {!revisingPlanId && (
                      <button
                        type="button"
                        disabled={submittingDraft || submitting}
                        onClick={handleSaveDraft}
                        className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-350 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-450 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        {submittingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {draftPlanId ? t('btnUpdateDraft') : t('btnSaveDraft')}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={submitting || submittingDraft}
                      onClick={(e) => {
                        if (wizardStep < 3) setWizardStep(prev => prev + 1);
                        else handleWizardSubmit(e);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {wizardStep === 3
                        ? (revisingPlanId ? t('btnResubmit') : t('btnSubmitPlan'))
                        : t('btnNext')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
