'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Users, Key, Database, Globe, LayoutPanelTop } from 'lucide-react';
import AdminUsersPanel from './AdminUsersPanel';
import AdminAccessMapPanel from './AdminAccessMapPanel';
import AdminMenuAccessPanel from './AdminMenuAccessPanel';
import AdminAuditLogPanel from './AdminAuditLogPanel';
import AdminApiKeysPanel from './AdminApiKeysPanel';

// Admin shell: hero + tabs. Each tab is its own panel component that loads its own data.
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    ['users', 'Users', Users],
    ['menus', 'Menu Access', LayoutPanelTop],
    ['permissions', 'Access Map', Key],
    ['logs', 'Audit Log', Database],
    ['apikeys', 'API Keys', Globe],
  ];

  return (
    <div className="space-y-6 pb-12">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-blue-950 px-5 py-6 text-white sm:px-7">
        <motion.div aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-dashed border-white/[0.04]" />
        <div className="relative">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300"><ShieldAlert className="h-4 w-4" />System administration</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Admin Panel</h1>
          <p className="mt-1.5 max-w-xl text-xs text-slate-300">Manage user accounts and company access, review the live access map, audit activity, and issue API keys for external clients.</p>
        </div>
      </motion.div>

      <div role="tablist" className="flex w-fit flex-wrap gap-0.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
        {tabs.map(([key, label, Icon]) => (
          <button key={key} type="button" role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors cursor-pointer ${activeTab === key ? 'text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}>
            {activeTab === key && <motion.span layoutId="admin-tab" transition={{ type: 'spring', stiffness: 500, damping: 35 }} className="absolute inset-0 rounded-lg bg-slate-900 dark:bg-white" />}
            <span className="relative inline-flex items-center gap-2"><Icon className="h-3.5 w-3.5" />{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && <AdminUsersPanel key="users" />}
        {activeTab === 'menus' && <AdminMenuAccessPanel key="menus" />}
        {activeTab === 'permissions' && <AdminAccessMapPanel key="permissions" />}
        {activeTab === 'logs' && <AdminAuditLogPanel key="logs" />}
        {activeTab === 'apikeys' && <AdminApiKeysPanel key="apikeys" />}
      </AnimatePresence>
    </div>
  );
}
