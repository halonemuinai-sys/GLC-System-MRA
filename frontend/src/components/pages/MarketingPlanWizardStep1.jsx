'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Info,
  Target,
  Paperclip,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import Cookies from 'js-cookie';
import CampaignDateRangePicker from '@/components/ui/CampaignDateRangePicker';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import SearchableCompanySelect from './SearchableCompanySelect';
import SearchableBrandSelect from './SearchableBrandSelect';

export const CURRENT_YEAR = new Date().getFullYear();
export const FISCAL_YEAR_OPTIONS = Array.from({ length: 4 }, (_, i) => String(CURRENT_YEAR - 1 + i));

export const formatThousands = (value) => {
  if (value === undefined || value === null) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export function FormLabel({ label, tooltip }) {
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

export function KpiTargetSection({ wizardHeader, setWizardHeader, t }) {
  const [open, setOpen] = useState(
    !!(wizardHeader.target_sales || wizardHeader.target_leads || wizardHeader.target_reach ||
       wizardHeader.target_impressions || wizardHeader.target_roi_pct || wizardHeader.target_notes)
  );

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden mt-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-neutral-50 dark:bg-neutral-955/30 hover:bg-neutral-105 dark:hover:bg-neutral-800/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-extrabold text-neutral-700 dark:text-neutral-300">{t('kpiTargetsTitle')}</span>
          {(wizardHeader.target_sales || wizardHeader.target_leads || wizardHeader.target_reach ||
            wizardHeader.target_impressions || wizardHeader.target_roi_pct) && (
            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded-md">{t('hasTarget')}</span>
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
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
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
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500"
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
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500"
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
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500"
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
                className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500"
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
              className="w-full bg-neutral-50 dark:bg-neutral-955 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketingPlanWizardStep1({
  wizardHeader,
  setWizardHeader,
  setWizardApprovers,
  getDefaultApproversForCompany,
  isDraftOrRevise,
  metadata,
  t
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [branchSearch, setBranchSearch] = useState('');

  const filteredBranches = useMemo(() => {
    const allBranches = metadata.branches || [];
    let list = allBranches.filter((b) => {
      if (wizardHeader.company_id && b.company_id) {
        if (String(b.company_id) !== String(wizardHeader.company_id)) return false;
      }
      if (wizardHeader.brand_id && b.brand_id) {
        if (String(b.brand_id) !== String(wizardHeader.brand_id)) return false;
      }
      return true;
    });

    if (list.length === 0 && allBranches.length > 0) {
      list = allBranches;
    }

    if (branchSearch.trim()) {
      const q = branchSearch.trim().toLowerCase();
      list = list.filter((b) => String(b.name || '').toLowerCase().includes(q));
    }

    return list;
  }, [metadata.branches, wizardHeader.company_id, wizardHeader.brand_id, branchSearch]);

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
            onChange={(id) => {
              const strId = String(id);
              setWizardHeader(prev => {
                let newBrandId = prev.brand_id;
                if (strId && prev.brand_id) {
                  const b = (metadata.brands || []).find(item => String(item.id) === String(prev.brand_id));
                  if (b && b.company_id && String(b.company_id) !== strId) {
                    newBrandId = '';
                  }
                }
                return { ...prev, company_id: strId, brand_id: newBrandId };
              });
              if (!isDraftOrRevise && setWizardApprovers && getDefaultApproversForCompany) {
                setWizardApprovers(getDefaultApproversForCompany(strId));
              }
            }}
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
          <SearchableBrandSelect
            brands={metadata.brands || []}
            value={wizardHeader.brand_id}
            onChange={(val) => setWizardHeader(prev => ({ ...prev, brand_id: val }))}
            selectedCompanyId={wizardHeader.company_id}
            onBrandCreated={(newBrand) => {
              if (metadata.brands && !metadata.brands.some(b => b.id === newBrand.id)) {
                metadata.brands.push(newBrand);
              }
            }}
            placeholder={t('selectBrand') || 'Select Brand / Principal'}
          />
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
            <span className={wizardHeader.branch_ids.length === 0 ? 'text-neutral-850 dark:text-white font-medium' : 'text-blue-600 dark:text-blue-400 font-semibold'}>
              {(() => {
                if (wizardHeader.branch_ids.length === 0) return t('globalSales');
                if (wizardHeader.branch_ids.length === 1) {
                  const b = (metadata.branches || []).find(item => String(item.id) === String(wizardHeader.branch_ids[0]));
                  return b ? b.name : '1 branch selected';
                }
                return `${wizardHeader.branch_ids.length} branches selected`;
              })()}
            </span>
            <svg className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${wizardHeader._branchDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {/* Dropdown Panel */}
          {wizardHeader._branchDropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setWizardHeader(prev => ({ ...prev, _branchDropdownOpen: false }))} />
              <div className="absolute z-40 w-full mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-2.5 space-y-2 max-h-64 flex flex-col">
                {/* Search branch */}
                <div className="relative shrink-0">
                  <input
                    type="text"
                    placeholder="Cari Branch / Store Name..."
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg pl-3 pr-7 py-1.5 text-xs text-neutral-800 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 font-medium"
                  />
                  {branchSearch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBranchSearch('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto space-y-0.5 pr-0.5 max-h-48">
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

                  {filteredBranches.length === 0 ? (
                    <div className="py-4 text-center text-xs text-neutral-400">
                      Tidak ada cabang ditemukan
                    </div>
                  ) : (
                    filteredBranches.map(b => (
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
                        <span className={`text-xs font-medium ${wizardHeader.branch_ids.includes(String(b.id)) ? 'text-neutral-900 dark:text-white font-semibold' : 'text-neutral-600 dark:text-neutral-400'}`}>{b.name}</span>
                      </label>
                    ))
                  )}
                </div>
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
