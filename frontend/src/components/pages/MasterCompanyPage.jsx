'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { Building2, Network, MapPin, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { getUserRoles, hasRole } from '@/lib/userRoles';
import InlineHelp from '@/components/ui/InlineHelp';
import CompanyEntitiesPanel from './CompanyEntitiesPanel';
import { CompanyHoldingsPanel, CompanyLocationsPanel } from './CompanyGroupsPanels';

const WRITE_ROLES = ['admin', 'ga', 'legal', 'compliance', 'marketing', 'marketing_manager'];

function CountUp({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value || 0, { duration: 0.8, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [value]);
  return <>{Math.round(display).toLocaleString('en-US')}</>;
}

// Company setup: legal entities (PT), holdings and physical locations.
export default function MasterCompanyPage() {
  const [activeTab, setActiveTab] = useState('companies');
  const [canWrite, setCanWrite] = useState(false);
  useEffect(() => { setCanWrite(hasRole(getUserRoles(), WRITE_ROLES)); }, []);

  // Process-first: nothing is fetched until the user clicks "Load data".
  const [processed, setProcessed] = useState(false);
  const [masters, setMasters] = useState([]);
  const [branches, setBranches] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadShared = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, b, c] = await Promise.all([
        apiClient.get('/api/master/companies/master'),
        apiClient.get('/api/master/companies/branch'),
        apiClient.get('/api/master/companies', { params: { limit: 1 } }),
      ]);
      setMasters(m || []);
      setBranches(b || []);
      setSummary(c?.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to load company setup.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProcess = () => {
    setProcessed(true);
    loadShared();
  };

  const emptyHoldings = masters.filter(m => m.can_delete).length;
  const activeLocations = branches.filter(b => b.is_active !== false).length;
  const cards = [
    { label: 'Active companies', value: summary?.active ?? 0, sub: `${(summary?.total ?? 0) - (summary?.active ?? 0)} inactive`, icon: Building2, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { label: 'Without holding', value: summary?.without_holding ?? 0, sub: 'Holding approval contacts do not apply', icon: AlertTriangle, tone: summary?.without_holding ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', help: 'Companies not linked to any holding. Approval recipients configured per holding will not reach them, and holding reports leave them out.' },
    { label: 'Holdings', value: masters.length, sub: emptyHoldings ? `${emptyHoldings} empty` : 'All in use', icon: Network, tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { label: 'Active locations', value: activeLocations, sub: `${branches.length - activeLocations} inactive`, icon: MapPin, tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  ];
  const tabs = [['companies', 'Companies', Building2, summary?.total], ['masters', 'Holdings', Network, masters.length], ['branches', 'Locations', MapPin, branches.length]];

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><Building2 className="h-4 w-4" />Master data</p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Company &amp; Entity Setup</h1>
            <p className="mt-1.5 max-w-xl text-xs text-slate-300">Legal entities (PT), the holdings that group them, and the physical locations used by assets and maintenance.</p>
          </div>
          {processed && (
            <button type="button" onClick={loadShared} disabled={loading} className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60 cursor-pointer">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Reload
            </button>
          )}
        </div>
      </motion.div>

      {processed && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, tone, help }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.3 }} whileHover={{ y: -2 }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
            <div className="min-w-0">
              <div className="-my-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{help ? <InlineHelp summary={label} label={`About ${label}`}><span className="normal-case tracking-normal">{help}</span></InlineHelp> : label}</div>
              <p className="mt-0.5 text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100"><CountUp value={value} /></p>
              <p className="truncate text-[10px] text-slate-400">{sub}</p>
            </div>
          </motion.div>
        ))}
      </div>}

      {processed && error &&<div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"><AlertTriangle className="h-4 w-4" />{error}</div>}

      <div role="tablist" className="flex w-fit flex-wrap gap-0.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        {tabs.map(([key, label, Icon, count]) => (
          <button key={key} type="button" role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${activeTab === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
            {activeTab === key && <motion.span layoutId="company-setup-tab" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-lg bg-slate-900 dark:bg-white" />}
            <span className="relative inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}{processed && count !== undefined && <span className={activeTab === key ? 'opacity-70' : 'text-slate-400'}>{count}</span>}</span>
          </button>
        ))}
      </div>

      {!processed ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <motion.span animate={{ y: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            {React.createElement(tabs.find(t => t[0] === activeTab)[2], { className: 'h-5 w-5' })}
          </motion.span>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Load {tabs.find(t => t[0] === activeTab)[1].toLowerCase()} data</h3>
          <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">Pick a tab above, then click Load data to fetch companies, holdings and locations with their usage.</p>
          <button type="button" onClick={handleProcess} className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"><Database className="h-3.5 w-3.5" />Load data</button>
        </motion.div>
      ) : (
      <AnimatePresence mode="wait">
        {activeTab === 'companies' && <CompanyEntitiesPanel key="companies" masters={masters} onChanged={loadShared} canWrite={canWrite} />}
        {activeTab === 'masters' && <CompanyHoldingsPanel key="masters" masters={masters} loading={loading} onChanged={loadShared} canWrite={canWrite} />}
        {activeTab === 'branches' && <CompanyLocationsPanel key="branches" branches={branches} masters={masters} loading={loading} error={error} onReload={loadShared} onChanged={loadShared} canWrite={canWrite} />}
      </AnimatePresence>
      )}
    </div>
  );
}
