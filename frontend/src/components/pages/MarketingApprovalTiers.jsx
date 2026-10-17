import { useMemo } from 'react';
import { ArrowRight, ListFilter } from 'lucide-react';

const formatAmount = value => `Rp ${Number(value).toLocaleString('id-ID')}`;

export default function MarketingApprovalTiers({ rules, companies, moduleLabels, roleLabels }) {
  const sections = useMemo(() => {
    const modules = new Map();
    for (const rule of rules) {
      if (!modules.has(rule.module)) modules.set(rule.module, new Map());
      const groups = modules.get(rule.module);
      const min = Number(rule.min_amount ?? 0);
      const max = rule.max_amount == null || rule.max_amount === '' ? null : Number(rule.max_amount);
      const key = JSON.stringify([rule.company_id ?? null, min, max]);
      if (!groups.has(key)) groups.set(key, { key, min, max, companyId: rule.company_id, steps: [] });
      groups.get(key).steps.push(rule);
    }
    return [...modules].map(([module, groups]) => ({
      module,
      tiers: [...groups.values()]
        .sort((a, b) => Number(a.companyId ?? 0) - Number(b.companyId ?? 0) || a.min - b.min || (a.max ?? Infinity) - (b.max ?? Infinity))
        .map(tier => ({ ...tier, steps: tier.steps.sort((a, b) => a.step_number - b.step_number) })),
    }));
  }, [rules]);

  if (!rules.length) return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <ListFilter className="mx-auto mb-3 h-6 w-6 text-blue-500" />
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Mulai dari tier pertama</h3>
      <p className="mt-2 text-xs text-slate-500">Tambahkan tahap, lalu tentukan rentang anggaran dan role pemberi persetujuan.</p>
    </div>
  );

  return <div className="space-y-5">
    {sections.map(({ module, tiers }) => <section key={module} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{moduleLabels[module] || module}</h3>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{tiers.length} tier</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {tiers.map((tier, index) => <div key={tier.key} className="grid gap-4 p-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">Tier {index + 1}</p>
            <p className="mt-1.5 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatAmount(tier.min)} {tier.max === null ? 'ke atas' : `– ${formatAmount(tier.max)}`}</p>
            {tier.companyId && <p className="mt-1 text-[10px] text-slate-400">{companies.find(company => String(company.id) === String(tier.companyId))?.name || `PT #${tier.companyId}`}</p>}
          </div>
          <ol className="flex flex-wrap items-center gap-2" aria-label={`Urutan role untuk tier ${index + 1}`}>
            {tier.steps.map((step, stepIndex) => <li key={step.id} className="flex items-center gap-2">
              {stepIndex > 0 && <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />}
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-2 pr-3 dark:border-slate-700 dark:bg-slate-800/60">
                <span aria-label={`Tahap ${step.step_number}`} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-semibold text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">{step.step_number}</span>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-200">{roleLabels[step.approver_role] || step.approver_role.replace(/_/g, ' ')}</span>
              </div>
            </li>)}
          </ol>
        </div>)}
      </div>
    </section>)}
  </div>;
}
