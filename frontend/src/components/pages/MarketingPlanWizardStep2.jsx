'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Download,
  Upload,
  AlertTriangle
} from 'lucide-react';
import MarketingBudgetBulkUploadModal, { downloadMarketingBudgetTemplate } from './MarketingBudgetBulkUploadModal';

const formatThousands = (value) => {
  if (value === undefined || value === null) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const getMonthName = (monthNum, lang = 'en') => {
  const months_en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months_id = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const months = lang === 'id' ? months_id : months_en;
  return months[monthNum - 1] || '';
};

export default function MarketingPlanWizardStep2({
  wizardHeader,
  wizardItems,
  setWizardItems,
  addWizardItem,
  removeWizardItem,
  handleItemChange,
  metadata,
  overBudgetMonths,
  budgetAvailability,
  t,
  lang
}) {
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const handleApplyBulkUpload = (importedItems, mode) => {
    if (mode === 'replace') {
      setWizardItems(importedItems);
    } else {
      // mode === 'append': replace initial single blank row if it exists
      const isSingleBlank = wizardItems.length === 1 && !wizardItems[0].coa_id && (!wizardItems[0].unit_price || wizardItems[0].unit_price === '0');
      if (isSingleBlank) {
        setWizardItems(importedItems);
      } else {
        setWizardItems(prev => [...prev, ...importedItems]);
      }
    }
  };

  const budgetMonthlyMap = useMemo(() => {
    if (!budgetAvailability?.monthly) return {};
    return budgetAvailability.monthly.reduce((acc, m) => { acc[m.month] = m; return acc; }, {});
  }, [budgetAvailability]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-neutral-800 dark:text-white">{t('monthlyAllocationTitle')}</h4>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">{t('monthlyAllocationSub')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={() => downloadMarketingBudgetTemplate({
              metadata,
              currentItems: wizardItems,
              campaignTitle: wizardHeader.title,
              fiscalYear: wizardHeader.fiscal_year,
              includeCurrentData: wizardItems.some(it => it.coa_id || (it.unit_price && it.unit_price !== '0'))
            })}
            className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-[11px] font-bold border border-neutral-200 dark:border-neutral-750 px-3 py-1.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer shadow-sm"
            title="Download Excel Template"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t('downloadTemplateBtn') || 'Download Template'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('bulkUploadBtn') || 'Bulk Upload'}</span>
          </button>
          <button
            type="button"
            onClick={addWizardItem}
            className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-[11px] font-extrabold border border-blue-500/20 px-3.5 py-1.5 rounded-xl hover:bg-blue-500/5 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> {t('addRow')}
          </button>
        </div>
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
                      {(() => {
                        const m = parseInt(item.period_month, 10);
                        if (!m || !budgetMonthlyMap[m]) return null;
                        const mb = budgetMonthlyMap[m];
                        if (!mb.limit) return null;
                        const pct = mb.available / mb.limit;
                        const color = pct > 0.3 ? 'text-green-600 dark:text-green-400' : pct > 0.1 ? 'text-amber-500 dark:text-amber-400' : 'text-red-500 dark:text-red-400';
                        const label = mb.available <= 0 ? 'Habis' : `Sisa ${(mb.available / 1000000).toFixed(1)}jt`;
                        return <div className={`text-[9px] font-bold mt-0.5 truncate ${color}`}>{label}</div>;
                      })()}
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
                            {c.code ? `[${c.code}] ${c.name}` : c.name}
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
                <td colSpan="6" className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-455">
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

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <MarketingBudgetBulkUploadModal
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          metadata={metadata}
          onApply={handleApplyBulkUpload}
          currentItems={wizardItems}
          campaignTitle={wizardHeader.title}
          fiscalYear={wizardHeader.fiscal_year}
          t={t}
          lang={lang}
        />
      )}
    </div>
  );
}
