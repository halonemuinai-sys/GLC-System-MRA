'use client';

import React, { useMemo } from 'react';
import {
  Users,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Mail,
  AlertTriangle,
  Paperclip
} from 'lucide-react';

const formatIDR = (val) => {
  if (val === undefined || val === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val));
};

const getMonthName = (monthNum, lang = 'en') => {
  const months_en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const months_id = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const months = lang === 'id' ? months_id : months_en;
  return months[monthNum - 1] || '';
};

export function WizardApproversSection({ wizardApprovers, setWizardApprovers, users = [], onUseDefaults, lang }) {
  const addApprover = () => {
    setWizardApprovers(prev => [
      ...prev,
      {
        step_number: prev.length + 1,
        approver_name: '',
        approver_email: '',
        approver_role: ''
      }
    ]);
  };

  const removeApprover = (index) => {
    if (wizardApprovers.length <= 1) return;
    setWizardApprovers(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((item, i) => ({ ...item, step_number: i + 1 }));
    });
  };

  const updateApprover = (index, field, value) => {
    setWizardApprovers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const moveApprover = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= wizardApprovers.length) return;
    setWizardApprovers(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      return updated.map((item, i) => ({ ...item, step_number: i + 1 }));
    });
  };

  const handleUserSelect = (index, val) => {
    const matched = users.find(u => u.full_name === val);
    if (matched) {
      setWizardApprovers(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          approver_name: matched.full_name,
          approver_email: matched.email || updated[index].approver_email,
          approver_role: matched.position || matched.department || matched.role || updated[index].approver_role
        };
        return updated;
      });
    } else {
      updateApprover(index, 'approver_name', val);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Users className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-black text-neutral-850 dark:text-white uppercase tracking-wider">
              {lang === 'id' ? 'Alur Penandatangan Dokumen (DocHub Workflow)' : 'Document Signers & Approval Chain'}
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-500/10 text-blue-600 border border-blue-200/60 dark:border-blue-900/30">
              {lang === 'id' ? 'Berurutan' : 'Sequential'}
            </span>
          </div>
          <p className="text-[10px] text-neutral-450 dark:text-neutral-500 mt-1">
            {lang === 'id'
              ? 'Tentukan pihak yang menandatangani dokumen secara berurutan. Setiap penandatangan akan menerima notifikasi email beserta Magic Link persetujuan.'
              : 'Specify ordered signers. Each approver will receive an email notification with a digital approval Magic Link.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onUseDefaults && (
            <button
              type="button"
              onClick={onUseDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-250 dark:border-neutral-750 text-neutral-650 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white text-[11px] font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-all cursor-pointer shadow-sm"
              title={lang === 'id' ? 'Muat ulang approver rekomendasi dari sistem MRA' : 'Load default MRA recommended signers'}
            >
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{lang === 'id' ? 'Rekomendasi MRA' : 'Use Default Chain'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={addApprover}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm shadow-blue-500/15"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'id' ? 'Tambah Penandatangan' : 'Add Signer'}</span>
          </button>
        </div>
      </div>

      {/* Approver list */}
      <div className="space-y-3">
        {wizardApprovers.map((approver, idx) => (
          <div
            key={idx}
            className="group p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/30 hover:border-blue-500/40 transition-all flex flex-col md:flex-row md:items-center gap-3"
          >
            {/* Step badge & reorder controls */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center justify-center shadow-sm shadow-blue-500/20">
                {idx + 1}
              </div>
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveApprover(idx, -1)}
                  className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                  title="Move Up"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={idx === wizardApprovers.length - 1}
                  onClick={() => moveApprover(idx, 1)}
                  className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                  title="Move Down"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Fields grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Name with user datalist */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                  {lang === 'id' ? 'Nama Penandatangan *' : 'Signer Name *'}
                </label>
                <input
                  type="text"
                  list={`users-datalist-${idx}`}
                  value={approver.approver_name}
                  onChange={(e) => handleUserSelect(idx, e.target.value)}
                  placeholder="e.g. Budi Santoso"
                  required
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                />
                <datalist id={`users-datalist-${idx}`}>
                  {users.map(u => (
                    <option key={u.id} value={u.full_name}>
                      {u.position ? `${u.position} · ${u.email}` : u.email}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                  <input
                    type="email"
                    value={approver.approver_email}
                    onChange={(e) => updateApprover(idx, 'approver_email', e.target.value)}
                    placeholder="approver@mraretail.co.id"
                    required
                    className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              {/* Role / Jabatan */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                  {lang === 'id' ? 'Jabatan / Role' : 'Role / Position'}
                </label>
                <input
                  type="text"
                  value={approver.approver_role || ''}
                  onChange={(e) => updateApprover(idx, 'approver_role', e.target.value)}
                  placeholder="e.g. General Manager Retail"
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-800 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Remove button */}
            <div className="flex items-center justify-end">
              {wizardApprovers.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeApprover(idx)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  title={lang === 'id' ? 'Hapus Penandatangan' : 'Remove Signer'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="w-8 h-8" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MarketingPlanWizardStep3({
  wizardHeader,
  setWizardHeader,
  wizardItems,
  metadata,
  overBudgetMonths,
  budgetAvailability,
  wizardApprovers,
  setWizardApprovers,
  onUseDefaults,
  t,
  lang
}) {
  const totalEstimation = wizardItems.reduce((acc, curr) => acc + Number(curr.budget_amount || 0), 0);

  const thresholdAlert = useMemo(() => {
    if (!budgetAvailability?.monthly) return null;
    const totalProposed = wizardItems.reduce((s, it) => s + Number(it.qty || 1) * Number(it.unit_price || 0), 0);
    const totalLimit = budgetAvailability.monthly.reduce((s, m) => s + Number(m.limit || 0), 0);
    const totalCommitted = budgetAvailability.monthly.reduce((s, m) => s + Number(m.committed || 0), 0);
    if (totalLimit <= 0) return null;
    const usedAfter = totalCommitted + totalProposed;
    const pct = Math.round((usedAfter / totalLimit) * 100);
    if (pct >= 100) return { level: 'critical', pct };
    if (pct >= 80) return { level: 'warning', pct };
    return null;
  }, [budgetAvailability, wizardItems]);

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
            <div>{t('targetBranchReview')} <span className="font-semibold text-neutral-900 dark:text-white block mt-0.5">{(() => { if (wizardHeader.branch_ids.length === 0) return t('globalSales'); return wizardHeader.branch_ids.map(bid => { const br = (metadata.branches || []).find(b => String(b.id) === String(bid)); return br ? br.name : bid; }).join(', '); })()}</span></div>
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

      {thresholdAlert && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 ${thresholdAlert.level === 'critical' ? 'bg-red-500/10 border-red-500/25' : 'bg-amber-500/10 border-amber-500/25'}`}>
          <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${thresholdAlert.level === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
          <div className="space-y-1">
            <p className={`text-xs font-black ${thresholdAlert.level === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {thresholdAlert.level === 'critical' ? `Anggaran Melampaui 100% (${thresholdAlert.pct}%)` : `Peringatan: Anggaran Mendekati Batas (${thresholdAlert.pct}%)`}
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-450 leading-relaxed font-semibold">
              {thresholdAlert.level === 'critical'
                ? 'Total anggaran yang direncanakan melebihi plafon yang tersedia. Pengajuan tetap bisa dilanjutkan, namun memerlukan justifikasi dari approver.'
                : 'Total anggaran mendekati batas plafon. Pastikan anggaran ini telah disetujui sebelum melanjutkan pengajuan.'}
            </p>
          </div>
        </div>
      )}

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

      {/* DocHub-style Document Signers Section */}
      <WizardApproversSection
        wizardApprovers={wizardApprovers}
        setWizardApprovers={setWizardApprovers}
        users={metadata.users || []}
        onUseDefaults={onUseDefaults}
        lang={lang}
      />
    </div>
  );
}
