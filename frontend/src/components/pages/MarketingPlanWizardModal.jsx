'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Save, Loader2, AlertTriangle, Info, Target, Paperclip, Plus, Calendar
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import Cookies from 'js-cookie';
import CampaignDateRangePicker from '@/components/ui/CampaignDateRangePicker';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useLanguage } from '@/lib/LanguageContext';
import mpt from '@/lib/translations/marketingPlan';
import SearchableCompanySelect from './SearchableCompanySelect';

const CURRENT_YEAR = new Date().getFullYear();
const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i));

// Helper: Format to IDR Currency
const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

// Helper: Format number with thousands separator
const formatThousands = (value) => {
  if (value === undefined || value === null) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Helper: Get Month Name
const getMonthName = (monthNum, lang = 'en') => {
  const months_en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months_id = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const months = lang === 'id' ? months_id : months_en;
  return months[monthNum - 1] || '';
};

function FormLabel({ label, tooltip }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <span className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
        {label}
      </span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger type="button" className="text-neutral-455 hover:text-neutral-700 dark:text-neutral-450 dark:hover:text-neutral-200 transition-colors p-0.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-help">
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

function KpiTargetSection({ wizardHeader, setWizardHeader, t }) {
  const [open, setOpen] = useState(
    !!(wizardHeader.target_sales || wizardHeader.target_leads || wizardHeader.target_reach ||
       wizardHeader.target_impressions || wizardHeader.target_roi_pct || wizardHeader.target_notes)
  );

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-neutral-50 dark:bg-neutral-955/30 hover:bg-neutral-105 dark:hover:bg-neutral-800/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-extrabold text-neutral-700 dark:text-neutral-300">{t('kpiTargetsTitle')}</span>
          {(wizardHeader.target_sales || wizardHeader.target_leads || wizardHeader.target_reach ||
            wizardHeader.target_impressions || wizardHeader.target_roi_pct) && (
            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded-md">{t('hasTarget')}</span>
          )}
        </div>
        <span className="text-neutral-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-4 space-y-4 bg-white dark:bg-transparent">
          <p className="text-[10px] text-neutral-400 font-medium">{t('kpiDescription')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">{t('salesTargetIDR')}</label>
              <input
                type="text"
                placeholder="0"
                value={formatThousands(wizardHeader.target_sales)}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setWizardHeader(p => ({ ...p, target_sales: val }));
                }}
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">{t('leadsTarget')}</label>
              <input
                type="text"
                placeholder="0"
                value={formatThousands(wizardHeader.target_leads)}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setWizardHeader(p => ({ ...p, target_leads: val }));
                }}
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">{t('reachTarget')}</label>
              <input
                type="text"
                placeholder="0"
                value={formatThousands(wizardHeader.target_reach)}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setWizardHeader(p => ({ ...p, target_reach: val }));
                }}
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">{t('impressionsTargetLabel')}</label>
              <input
                type="text"
                placeholder="0"
                value={formatThousands(wizardHeader.target_impressions)}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setWizardHeader(p => ({ ...p, target_impressions: val }));
                }}
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">{t('roiTarget')}</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={wizardHeader.target_roi_pct || ''}
                onChange={(e) => setWizardHeader(p => ({ ...p, target_roi_pct: e.target.value }))}
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">{t('targetNotesLabel')}</label>
            <textarea
              rows={2}
              placeholder={t('targetNotesPlaceholder')}
              value={wizardHeader.target_notes || ''}
              onChange={(e) => setWizardHeader(p => ({ ...p, target_notes: e.target.value }))}
              className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function WizardStep1GeneralInfo({ wizardHeader, setWizardHeader, metadata, t }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size limit is 10MB.');
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
      const apiBase = process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:5005';
      const res = await fetch(`${apiBase}/api/marketing/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to upload file.');
      }

      const data = await res.json();
      setWizardHeader(prev => ({ ...prev, doc_url: data.url }));
    } catch (err) {
      setUploadError(err.message || 'Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TooltipProvider delay={100}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-2">
        {/* Title */}
        <div className="space-y-2">
          <FormLabel label="Campaign Title / Name *" tooltip="Name or title of your marketing campaign." />
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
          <FormLabel label="Company (PT) *" tooltip={t('companyTooltip')} />
          <SearchableCompanySelect
            companies={metadata.companies}
            value={wizardHeader.company_id}
            onChange={(id) => setWizardHeader(prev => ({ ...prev, company_id: String(id) }))}
          />
        </div>

        {/* Description */}
        <div className="space-y-2 md:col-span-2">
          <FormLabel label="Campaign Description / Scope" tooltip={t('descriptionTooltip')} />
          <textarea
            rows={2.5}
            placeholder={t('descriptionPlaceholder')}
            value={wizardHeader.description}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all leading-relaxed font-medium resize-none"
          />
        </div>

        {/* Fiscal Year & Brand */}
        <div className="space-y-2">
          <FormLabel label="Fiscal Year *" tooltip={t('fiscalYearTooltip')} />
          <select
            value={wizardHeader.fiscal_year}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, fiscal_year: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            required
          >
            {FISCAL_YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{t('fiscalYear')} {y}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <FormLabel label="Brand / Principal *" tooltip={t('brandTooltip')} />
          <select
            value={wizardHeader.brand_id}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, brand_id: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            required
          >
            <option value="">{t('selectBrand')}</option>
            {metadata.brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Line of Business & Event Location */}
        <div className="space-y-2">
          <FormLabel label="Line of Business *" tooltip={t('lobTooltip')} />
          <select
            value={wizardHeader.lob_id}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, lob_id: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
            required
          >
            <option value="">{t('selectLob')}</option>
            {metadata.lobs.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <FormLabel label={t('eventLocationLabel')} tooltip={t('eventLocationTooltip')} />
          <select
            value={wizardHeader.event_location_id}
            onChange={(e) => setWizardHeader(prev => ({ ...prev, event_location_id: e.target.value }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-medium"
          >
            <option value="">{t('selectLocationOption')}</option>
            {metadata.event_locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Event / Campaign Period Picker */}
        <div className="space-y-2">
          <FormLabel label={t('eventPeriodLabel')} tooltip={t('eventPeriodTooltip')} />
          <CampaignDateRangePicker
            startValue={wizardHeader.event_start_date}
            endValue={wizardHeader.event_end_date}
            onChange={({ start, end }) => setWizardHeader(prev => ({ ...prev, event_start_date: start, event_end_date: end }))}
          />
        </div>

        {/* Promotion Period Picker */}
        <div className="space-y-2">
          <FormLabel label={t('promotionPeriodLabel')} tooltip={t('promotionPeriodTooltip')} />
          <CampaignDateRangePicker
            startValue={wizardHeader.cta_start_date}
            endValue={wizardHeader.cta_end_date}
            onChange={({ start, end }) => setWizardHeader(prev => ({ ...prev, cta_start_date: start, cta_end_date: end }))}
          />
        </div>

        {/* Target Branch — Dropdown with Checklist */}
        <div className="space-y-2 relative">
          <FormLabel label={t('targetBranchLabel')} tooltip={t('targetBranchTooltip')} />
          {/* Dropdown Trigger */}
          <button
            type="button"
            onClick={() => setWizardHeader(prev => ({ ...prev, _branchDropdownOpen: !prev._branchDropdownOpen }))}
            className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-left font-medium flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <span className={wizardHeader.branch_ids.length === 0 ? 'text-neutral-850 dark:text-white' : 'text-blue-600 dark:text-blue-400'}>
              {wizardHeader.branch_ids.length === 0
                ? t('globalSales')
                : `${wizardHeader.branch_ids.length} branch selected`}
            </span>
            <svg className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${wizardHeader._branchDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* Dropdown Panel */}
          {wizardHeader._branchDropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setWizardHeader(prev => ({ ...prev, _branchDropdownOpen: false }))} />
              <div className="absolute z-40 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-2.5 space-y-1 max-h-52 overflow-y-auto">
                {/* Global / All Branches */}
                <label className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                  <input
                    type="checkbox"
                    checked={wizardHeader.branch_ids.length === 0}
                    onChange={() => setWizardHeader(prev => ({ ...prev, branch_ids: [] }))}
                    className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500/30 cursor-pointer accent-blue-600"
                  />
                  <span className={`text-xs font-semibold ${wizardHeader.branch_ids.length === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-500 dark:text-neutral-400'}`}>{t('globalSales')}</span>
                </label>
                <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
                {metadata.branches.map(b => (
                  <label key={b.id} className="flex items-center gap-2.5 cursor-pointer py-1.5 px-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                    <input
                      type="checkbox"
                      checked={wizardHeader.branch_ids.includes(String(b.id))}
                      onChange={(e) => {
                        setWizardHeader(prev => {
                          const ids = [...prev.branch_ids];
                          if (e.target.checked) {
                            ids.push(String(b.id));
                          } else {
                            const idx = ids.indexOf(String(b.id));
                            if (idx > -1) ids.splice(idx, 1);
                          }
                          return { ...prev, branch_ids: ids };
                        });
                      }}
                      className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-700 text-blue-600 focus:ring-blue-500/30 cursor-pointer accent-blue-600"
                    />
                    <span className={`text-xs font-medium ${wizardHeader.branch_ids.includes(String(b.id)) ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'}`}>{b.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Proposal Document Link */}
        <div className="space-y-2 md:col-span-2">
          <FormLabel label={t('proposalDocLabel')} tooltip={t('proposalDocTooltip')} />
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder={t('proposalLinkPlaceholder')}
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

      <KpiTargetSection wizardHeader={wizardHeader} setWizardHeader={setWizardHeader} t={t} />
    </TooltipProvider>
  );
}

function WizardStep2BudgetItems({ wizardHeader, wizardItems, addWizardItem, removeWizardItem, handleItemChange, metadata, overBudgetMonths, t, lang }) {
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
          <h4 className="text-xs font-bold text-neutral-800 dark:text-white">{t('monthlyAllocationTitle')}</h4>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{t('monthlyAllocationSub')}</p>
        </div>
        <button
          type="button"
          onClick={addWizardItem}
          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-[11px] font-extrabold border border-blue-500/20 px-3.5 py-2 rounded-xl hover:bg-blue-500/5 transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> {t('addRow')}
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
                <th className="px-1 py-2 w-[13%] text-right pr-2">{t('unitPriceStar')}</th>
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
                        <option value="">{t('monthWord')}</option>
                        {availableMonths.map((m) => (
                          <option key={m} value={m}>{getMonthName(m, lang)}</option>
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
                        placeholder={t('vendorNamePlaceholder')}
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
                  {t('totalPlannedBudgetRow')}
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

      {/* Over-budget warning banner */}
      {overBudgetMonths && overBudgetMonths.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('overBudgetTitle2')}</span>
          </div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-450 leading-relaxed font-semibold">
            {t('overBudgetDesc2')}
          </p>
          <div className="space-y-1">
            {overBudgetMonths.map(ob => (
              <div key={ob.month} className="text-[10px] text-neutral-655 dark:text-neutral-400 font-medium">
                • {t('monthWord')} <strong>{getMonthName(ob.month, lang)}</strong>: {t('ceilingWord')} Rp {ob.limit.toLocaleString('id-ID')}, {t('usedWord')} Rp {ob.committed.toLocaleString('id-ID')}, {t('newRequestWord')} Rp {ob.proposed.toLocaleString('id-ID')} ({t('overByWord')} Rp {ob.excess.toLocaleString('id-ID')})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WizardStep3ReviewSubmit({ wizardHeader, setWizardHeader, wizardItems, metadata, overBudgetMonths, t, lang }) {
  const totalEstimation = wizardItems.reduce((acc, curr) => acc + Number(curr.budget_amount || 0), 0);
  const companyName = metadata.companies.find(c => String(c.id) === String(wizardHeader.company_id))?.name || '';
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-50 dark:bg-neutral-955 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-850/80 space-y-3">
          <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">General Information</h4>
          <div className="space-y-2 text-xs font-bold text-neutral-600 dark:text-neutral-450">
            <div>Campaign Title: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{wizardHeader.title}</span></div>
            <div>PT / Company: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{companyName}</span></div>
            <div>Brand: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{metadata.brands.find(b => String(b.id) === String(wizardHeader.brand_id))?.name || '-'}</span></div>
            <div>Line of Business: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{metadata.lobs.find(l => String(l.id) === String(wizardHeader.lob_id))?.name || '-'}</span></div>
            <div>{t('eventLocationReview')} <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{(() => { const br = metadata.event_locations.find(b => String(b.id) === String(wizardHeader.event_location_id)); return br ? br.name : '-'; })()}</span></div>
            <div>{t('targetBranchReview')} <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{(() => { if (wizardHeader.branch_ids.length === 0) return t('globalSales'); return wizardHeader.branch_ids.map(bid => { const br = metadata.branches.find(b => String(b.id) === bid); return br ? br.name : bid; }).join(', '); })()}</span></div>
          </div>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-955 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-850/80 space-y-3">
          <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Timeline & Scope</h4>
          <div className="space-y-2 text-xs font-bold text-neutral-600 dark:text-neutral-450">
            <div>Fiscal Year: <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{wizardHeader.fiscal_year}</span></div>
            <div>{t('eventPeriod')} <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{wizardHeader.event_start_date || '-'} {t('dateSeparator')} {wizardHeader.event_end_date || '-'}</span></div>
            <div>{t('promotionPeriodReview')} <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{wizardHeader.cta_start_date || '-'} {t('dateSeparator')} {wizardHeader.cta_end_date || '-'}</span></div>
            {wizardHeader.doc_url && (
              <div>
                Proposal: 
                <span className="block mt-0.5">
                  <a href={wizardHeader.doc_url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 font-bold">
                    <Paperclip className="w-3.5 h-3.5" /> {t('viewProposal')}
                  </a>
                </span>
              </div>
            )}
          </div>
        </div>

        {wizardHeader.description && (
          <div className="bg-neutral-50 dark:bg-neutral-955 p-5 rounded-2xl border border-neutral-200/60 dark:border-neutral-850/80 space-y-2 md:col-span-2">
            <h4 className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Description</h4>
            <p className="text-xs text-neutral-655 dark:text-neutral-355 leading-relaxed font-medium">{wizardHeader.description}</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-5 rounded-2xl text-white shadow-xl shadow-blue-600/10 flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-150">Estimated Total Budget</span>
          <p className="text-[10px] text-blue-200">Calculated sum of monthly expense breakdowns</p>
        </div>
        <span className="text-xl font-black tracking-wide">
          {formatIDR(totalEstimation)}
        </span>
      </div>

      {overBudgetMonths && overBudgetMonths.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-black">
            <AlertTriangle className="w-4 h-4" />
            <span>{t('overBudgetTitle3')}</span>
          </div>
          <p className="text-[10px] text-neutral-550 dark:text-neutral-450 leading-relaxed font-semibold">
            {t('overBudgetDesc3')}
          </p>
          <div className="space-y-1.5 border-t border-amber-500/10 pt-3">
            {overBudgetMonths.map(ob => (
              <div key={ob.month} className="text-[10px] text-neutral-650 dark:text-neutral-400">
                • {t('monthWord')} <strong>{getMonthName(ob.month, lang)}</strong>: Rp {ob.limit.toLocaleString('id-ID')}, {t('usedWord')} Rp {ob.committed.toLocaleString('id-ID')}, {t('newRequestWord')} Rp {ob.proposed.toLocaleString('id-ID')} ({t('overByWord')} Rp {ob.excess.toLocaleString('id-ID')})
              </div>
            ))}
          </div>
          <div className="space-y-2 pt-2 border-t border-amber-500/10">
            <label className="text-[10px] font-extrabold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
              {t('overBudgetJustificationLabel')}
            </label>
            <textarea
              rows="3"
              required
              placeholder={t('overBudgetJustificationPlaceholder')}
              value={wizardHeader.over_budget_reason || ''}
              onChange={(e) => setWizardHeader(prev => ({ ...prev, over_budget_reason: e.target.value }))}
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-250 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium leading-relaxed resize-none"
            />
          </div>
        </div>
      )}

      <div className="border border-neutral-200 dark:border-neutral-855 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-955 border-b border-neutral-200 dark:border-neutral-855 text-neutral-455 dark:text-neutral-500 font-extrabold uppercase tracking-wider">
                <th className="px-4.5 py-3">Month</th>
                <th className="px-4.5 py-3">CoA Account</th>
                <th className="px-4.5 py-3">Vendor</th>
                <th className="px-4.5 py-3 text-center">Qty</th>
                <th className="px-4.5 py-3 text-right">{t('unitPriceIDR')}</th>
                <th className="px-4.5 py-3 text-right">Sub Total (IDR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850/80 font-medium text-neutral-700 dark:text-neutral-300">
              {wizardItems.map((item, idx) => {
                const subTotal = Number(item.qty || 1) * Number(item.unit_price || 0);
                return (
                  <tr key={idx} className="hover:bg-neutral-50/20 dark:hover:bg-neutral-955/10 transition-colors">
                    <td className="px-4.5 py-3 font-semibold text-neutral-900 dark:text-white">{getMonthName(Number(item.period_month), lang)}</td>
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

  const [budgetAvailability, setBudgetAvailability] = useState(null);
  const [checkingBudget, setCheckingBudget] = useState(false);

  // Initialize company ID once metadata is ready
  useEffect(() => {
    if (metadata.companies && metadata.companies.length > 0 && !wizardHeader.company_id) {
      setWizardHeader(prev => ({ ...prev, company_id: getDefaultCompanyId(metadata.companies) }));
    }
  }, [metadata.companies, wizardHeader.company_id, getDefaultCompanyId]);

  // Load plan to edit or revise
  useEffect(() => {
    const activePlanId = draftPlanId || revisingPlanId;
    if (!activePlanId || !isOpen) {
      // If we are opening a fresh modal, reset state
      if (isOpen) {
        setWizardStep(1);
        setWizardHeader({
          title: '',
          description: '',
          company_id: metadata.companies && metadata.companies.length > 0 ? getDefaultCompanyId(metadata.companies) : '',
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
        setBudgetAvailability(null);
      }
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
        setWizardStep(1);
      } catch (err) {
        onError('Failed to load plan details: ' + err.message);
      } finally {
        setLoadingPlan(false);
      }
    };

    loadPlanDetails();
  }, [draftPlanId, revisingPlanId, isOpen, metadata.companies, getDefaultCompanyId, onError]);

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

    try {
      const payload = buildWizardPayload();
      if (revisingPlanId) {
        await apiClient.post(`/api/marketing/plans/${revisingPlanId}/revise`, payload);
        onSuccess(t('successRevised'));
      } else if (draftPlanId) {
        await apiClient.post(`/api/marketing/plans/${draftPlanId}/submit-draft`, payload);
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
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
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
                      metadata={metadata}
                      t={t}
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
                      overBudgetMonths={overBudgetMonths}
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
