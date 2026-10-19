'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Rocket,
  LayoutDashboard,
  Box,
  Truck,
  Laptop,
  Monitor,
  Wrench,
  Users,
  ShieldCheck,
  FileText,
  BarChart3,
  X,
  ShieldCheck as AdminShield,
  LogOut,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Package,
  Wallet,
  Scale,
  Gavel,
  Building2,
  Database,
  BadgeCheck,
  ClipboardList,
  BookOpen,
  UserCheck,
  Landmark,
  FlaskConical,
  FileSignature,
  Building,
  Barcode,
  ClipboardCheck,
  Award,
  Settings,
  Tag,
  MapPin,
  LineChart,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { SidebarLabel, SidebarPopover } from './SidebarOverlays';
import { canAccess, ROLE_LABELS } from '@/lib/userRoles';

// ─── Per-section accent color map ───────────────────────────────────────────────
// Sidebar itself is a fixed dark-navy surface (independent of the app's light/dark
// mode), so every accent is tuned to sit on navy rather than switching with `dark:`.
const ACCENT = {
  amber: {
    text:     'text-amber-400',
    iconBg:   'bg-amber-500/20',
    navBg:    'bg-amber-500/15',
    bar:      'bg-amber-500',
    subBg:    'bg-amber-500/10',
    badge:    'bg-amber-500/20 text-amber-400',
    chevron:  'text-amber-400',
    flyout:   'text-amber-400 bg-amber-500/15',
    label:    'from-amber-500 to-orange-500',
    dot:      'bg-gradient-to-br from-amber-400 to-orange-500',
    border:   'border-amber-500/20'
  },
  emerald: {
    text:     'text-emerald-400',
    iconBg:   'bg-emerald-500/20',
    navBg:    'bg-emerald-500/15',
    bar:      'bg-emerald-500',
    subBg:    'bg-emerald-500/10',
    badge:    'bg-emerald-500/20 text-emerald-400',
    chevron:  'text-emerald-400',
    flyout:   'text-emerald-400 bg-emerald-500/15',
    label:    'from-emerald-500 to-teal-500',
    dot:      'bg-gradient-to-br from-emerald-400 to-teal-500',
    border:   'border-emerald-500/20'
  },
  blue: {
    text:     'text-blue-400',
    iconBg:   'bg-blue-500/20',
    navBg:    'bg-blue-500/15',
    bar:      'bg-blue-500',
    subBg:    'bg-blue-500/10',
    badge:    'bg-blue-500/20 text-blue-400',
    chevron:  'text-blue-400',
    flyout:   'text-blue-400 bg-blue-500/15',
    label:    'from-blue-500 to-cyan-500',
    dot:      'bg-gradient-to-br from-blue-400 to-cyan-500',
    border:   'border-blue-500/20'
  },
  violet: {
    text:     'text-blue-400',
    iconBg:   'bg-blue-500/20',
    navBg:    'bg-blue-500/15',
    bar:      'bg-blue-500',
    subBg:    'bg-blue-500/10',
    badge:    'bg-blue-500/20 text-blue-400',
    chevron:  'text-blue-400',
    flyout:   'text-blue-400 bg-blue-500/15',
    label:    'from-blue-500 to-cyan-500',
    dot:      'bg-gradient-to-br from-blue-400 to-cyan-500',
    border:   'border-blue-500/20'
  },
  rose: {
    text:     'text-rose-400',
    iconBg:   'bg-rose-500/20',
    navBg:    'bg-rose-500/15',
    bar:      'bg-rose-500',
    subBg:    'bg-rose-500/10',
    badge:    'bg-rose-500/20 text-rose-400',
    chevron:  'text-rose-400',
    flyout:   'text-rose-400 bg-rose-500/15',
    label:    'from-rose-500 to-pink-500',
    dot:      'bg-gradient-to-br from-rose-400 to-pink-500',
    border:   'border-rose-500/20'
  },
  indigo: {
    text:     'text-indigo-400',
    iconBg:   'bg-indigo-500/20',
    navBg:    'bg-indigo-500/15',
    bar:      'bg-indigo-500',
    subBg:    'bg-indigo-500/10',
    badge:    'bg-indigo-500/20 text-indigo-400',
    chevron:  'text-indigo-400',
    flyout:   'text-indigo-400 bg-indigo-500/15',
    label:    'from-indigo-500 to-blue-500',
    dot:      'bg-gradient-to-br from-indigo-400 to-blue-500',
    border:   'border-indigo-500/20'
  }
};

// ─── Leaf Nav Item ──────────────────────────────────────────────────────────────
function NavItem({
  href,
  icon: Icon,
  name,
  isActive,
  accent = 'indigo',
  delay = 0,
  onClick,
  collapsed,
  isChild = false,
  isNested = false,
  badge = 0
}) {
  const c = ACCENT[accent] || ACCENT.indigo;
  const activeText  = c.text;
  const activeIcon  = c.iconBg;
  const activeColor = c.text;
  const activeBar   = c.bar;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ delay, duration: 0.2, ease: 'easeOut' }}
      className="relative"
    >
      <SidebarLabel enabled={collapsed} label={name} badge={badge}>
      <Link href={href} onClick={onClick} title={collapsed ? undefined : name} aria-label={name} aria-current={isActive ? 'page' : undefined} className="block min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        <motion.div
          whileHover={{ x: collapsed ? 0 : 2 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "group relative flex min-w-0 items-center rounded-xl text-sm font-medium transition-all cursor-pointer select-none",
            collapsed ? "justify-center gap-0 px-2 py-2.5" : isChild ? (isNested ? "gap-2.5 pl-7 pr-2.5 py-2" : "gap-2.5 pl-3 pr-2.5 py-2") : "gap-2.5 px-3 py-2.5",
            isActive
              ? activeText
              : "text-slate-400 hover:text-white hover:bg-white/[0.06]"
          )}
        >
          {/* Active background slider */}
          {isActive && (
            <motion.div
              layoutId="active-nav-bg"
              className={cn("absolute inset-0 rounded-xl -z-10", c.navBg)}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}

          {/* Active left bar */}
          {isActive && (
            <motion.div
              layoutId={`nav-bar-${accent}`}
              className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-full", activeBar)}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            />
          )}

          {/* Icon */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: isActive ? 0 : 6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={cn(
              "flex items-center justify-center flex-shrink-0 transition-colors",
              isChild ? "w-5 h-5" : "w-8 h-8 rounded-lg",
              isActive
                ? cn(isChild ? "" : activeIcon)
                : cn(isChild ? "" : "group-hover:bg-white/[0.08]")
            )}
          >
            <Icon className={cn(
              "transition-colors",
              isChild ? "w-3.5 h-3.5" : "w-4 h-4",
              isActive ? activeColor : "text-slate-500 group-hover:text-slate-300"
            )} />
          </motion.div>

          {/* Label */}
          <motion.span
            animate={{ 
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : 'auto'
            }}
            transition={{ duration: 0.15 }}
            className={cn(
              collapsed ? "w-0 flex-none overflow-hidden whitespace-nowrap" : "min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] leading-5",
              isNested ? "text-[12px]" : isChild ? "text-[13px]" : "text-sm"
            )}
          >
            {name}
          </motion.span>

          {/* Expiry/notification badge */}
          {!collapsed && badge > 0 && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">
              {badge}
            </span>
          )}

          {/* Active indicator */}
          {!collapsed && (
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  className="shrink-0"
                >
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      </Link>
      </SidebarLabel>
    </motion.div>
  );
}

// ─── Collapsible Submenu Component ──────────────────────────────────────────────
function SubMenu({
  name,
  icon: Icon,
  children,
  isExpanded,
  onToggle,
  hasActiveChild,
  collapsed,
  onChildClick,
  delay = 0,
  pathname,
  accent = 'indigo'
}) {
  const c = ACCENT[accent] || ACCENT.indigo;
  // Filter visible children
  const visibleChildren = children.filter(c => c.allowed !== false);
  if (visibleChildren.length === 0) return null;

  // Count badge
  const childCount = visibleChildren.length;

  if (collapsed) return (
    <SidebarPopover key={pathname} label={name} trigger={
      <button type="button" aria-label={name} className={cn("group flex w-full items-center justify-center rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400", hasActiveChild ? c.text : 'text-slate-400')}>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", hasActiveChild ? c.iconBg : 'group-hover:bg-white/[0.08]')}><Icon className="h-4 w-4" /></span>
      </button>
    }>
      {close => <nav aria-label={name} className="space-y-0.5">
        {visibleChildren.map(child => {
          const isActive = pathname === child.path;
          return <Link key={child.path} href={child.path} onClick={() => { close(); onChildClick?.(); }} aria-current={isActive ? 'page' : undefined} className={cn("flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400", isActive ? c.flyout : 'text-slate-400 hover:bg-white/[0.06] hover:text-white')}>
            <child.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] leading-5">{child.name}</span>
            {child.badge > 0 && <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">{child.badge}</span>}
            {isActive && <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />}
          </Link>;
        })}
      </nav>}
    </SidebarPopover>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25, ease: 'easeOut' }}
      className="relative"
    >
      {/* Submenu parent button */}
      <motion.button
        type="button"
        title={name}
        aria-label={name}
        aria-expanded={isExpanded}
        onClick={onToggle}
        whileHover={{ x: collapsed ? 0 : 2 }}
        transition={{ duration: 0.12 }}
        className={cn(
          "w-full min-w-0 group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
          hasActiveChild
            ? c.text
            : "text-slate-300 hover:text-white hover:bg-white/[0.06]"
        )}
      >
        {/* Subtle active background when child is active */}
        {hasActiveChild && (
          <motion.div
            className={cn("absolute inset-0 rounded-xl -z-10", c.subBg)}
            layoutId={`submenu-bg-${name}`}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}

        {/* Icon */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 6 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
            hasActiveChild ? c.iconBg : "group-hover:bg-white/[0.08]"
          )}
        >
          <Icon className={cn(
            "w-4 h-4 transition-colors",
            hasActiveChild
              ? c.text
              : "text-slate-500 group-hover:text-slate-300"
          )} />
        </motion.div>

        {/* Label + chevron */}
        <motion.div
          animate={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto'
          }}
          transition={{ duration: 0.15 }}
          className={cn("flex items-center gap-2", collapsed ? "w-0 flex-none overflow-hidden whitespace-nowrap" : "min-w-0 flex-1")}
        >
          <span className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] text-left leading-5">
            {name}
          </span>

          {/* Item count badge */}
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors flex-shrink-0",
            hasActiveChild ? c.badge : "bg-white/[0.06] text-slate-500"
          )}>
            {childCount}
          </span>

          {/* Chevron rotation */}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-shrink-0"
          >
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-colors",
              hasActiveChild ? c.chevron : "text-slate-600"
            )} />
          </motion.div>
        </motion.div>
      </motion.button>

      {/* ── Expanded children (normal sidebar) ── */}
      {!collapsed && (
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {/* Vertical connector line */}
              <div className={cn("relative ml-3 pl-2.5 border-l-2 space-y-0.5 py-1", c.border)}>
                {visibleChildren.map((child, idx) => (
                  <NavItem
                    key={child.path}
                    href={child.path}
                    icon={child.icon}
                    name={child.name}
                    isActive={pathname === child.path}
                    accent={accent}
                    delay={idx * 0.03}
                    onClick={onChildClick}
                    collapsed={false}
                    isChild={true}
                    isNested={!!child.nested}
                    badge={child.badge || 0}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

    </motion.div>
  );
}

// ─── Sidebar Content Component ──────────────────────────────────────────────────
function SidebarContent({
  collapsed,
  toggleCollapse,
  onClose,
  role,
  roles = [],
  fullName,
  handleLogout
}) {
  const pathname = usePathname();

  // Helper to check if role matches allowed list
  // Any of the user's roles (primary + additional) opens a menu; admin opens everything.
  const hasAccess = useCallback((allowedRoles) => roles.length > 0 && canAccess(roles, allowedRoles), [roles]);

  const dashboardItems = useMemo(() => [
    { name: 'Dashboard GA', path: '/dashboard', icon: LayoutDashboard, allowed: hasAccess(['ga', 'auditor']) },
    { name: 'Dashboard Compliance', path: '/dashboard/compliance', icon: ShieldCheck, allowed: hasAccess(['compliance', 'legal_compliance', 'auditor']) },
    { name: 'Dashboard Legal', path: '/dashboard/legal', icon: Scale, allowed: hasAccess(['legal', 'legal_compliance', 'auditor']) },
  ].filter(item => item.allowed), [hasAccess]);
  const hasActiveDashboard = dashboardItems.some(item => pathname === item.path);

  // Jumlah dokumen per modul Compliance yang mendekati/lewat kadaluarsa (untuk badge counter)
  const [complianceBadges, setComplianceBadges] = useState({});
  useEffect(() => {
    apiClient.get('/api/compliance/notifications')
      .then(res => setComplianceBadges(res.perModule || {}))
      .catch(() => {});
  }, []);

  // Jumlah dokumen/kasus per modul Legal yang mendekati/lewat deadline (untuk badge counter)
  const [legalBadges, setLegalBadges] = useState({});
  useEffect(() => {
    apiClient.get('/api/legal/notifications')
      .then(res => setLegalBadges(res.perModule || {}))
      .catch(() => {});
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // MENU CONFIGURATION — Scalable 3-Level Hierarchy
  // Section (label) → Submenu (collapsible) → Items (leaf links)
  //
  // To add a new module in the future, simply add a new section object:
  //
  //   { label: 'HR', submenus: [ { name: '...', icon: ..., children: [...] } ] }
  //
  // ═══════════════════════════════════════════════════════════════════════════
  const MENU_SECTIONS = useMemo(() => [
    {
      label: 'GENERAL AFFAIRS',
      accent: 'amber',
      submenus: [
        {
          name: 'Aset & Inventaris',
          icon: Package,
          children: [
            { name: 'Assets', path: '/dashboard/assets', icon: Box, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Stock Opname', path: '/dashboard/stock-opname', icon: ClipboardCheck, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Barcode Generator', path: '/dashboard/barcode', icon: Barcode, allowed: hasAccess(['ga', 'auditor']) },
          ]
        },
        {
          name: 'Operasional GA',
          icon: Wrench,
          children: [
            { name: 'Vehicles', path: '/dashboard/vehicles', icon: Truck, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'IT Rentals', path: '/dashboard/it-rentals', icon: Monitor, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Maintenance', path: '/dashboard/maintenances', icon: Wrench, allowed: hasAccess(['ga', 'auditor']) },
          ]
        },
        {
          name: 'Keuangan GA',
          icon: Wallet,
          accent: 'blue',
          children: [
            { name: 'Monitoring Anggaran', path: '/dashboard/ga/budget-monitoring', icon: CreditCard, allowed: hasAccess(['ga', 'admin', 'auditor']) },
            { name: 'Expenses', path: '/dashboard/expenses', icon: BarChart3, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Marketing POs', path: '/dashboard/ga/marketing-po', icon: ShoppingCart, allowed: hasAccess(['ga', 'finance', 'marketing_manager', 'auditor']) },
          ]
        },
        {
          name: 'Dokumen & Asuransi',
          icon: FileText,
          children: [
            { name: 'Documents', path: '/dashboard/documents', icon: FileText, allowed: hasAccess(['ga', 'legal', 'legal_compliance', 'auditor']) },
            { name: 'Asset Reports', path: '/dashboard/berita-acara', icon: FileSignature, allowed: hasAccess(['ga', 'admin', 'auditor']) },
            // Shared approver directory (signers for BAP/BAST). Marketing Managers and admin reach it via Approval Settings.
            { name: 'Approver Directory', path: '/dashboard/marketing-approval-settings?tab=signers', icon: UserCheck, allowed: roles.includes('ga') && !roles.includes('admin') && !roles.includes('marketing_manager') },
            { name: 'Insurance', path: '/dashboard/insurances', icon: ShieldCheck, allowed: hasAccess(['ga', 'legal', 'legal_compliance', 'auditor']) },
          ]
        },
        {
          name: 'Evaluasi Kinerja',
          icon: Award,
          children: [
            { name: 'Benchmark Scorecard', path: '/dashboard/ga-benchmark', icon: Award, allowed: hasAccess(['ga', 'auditor']) },
          ]
        }
      ]
    },
    {
      label: 'MARKETING & FINANCE',
      accent: 'emerald',
      submenus: [
        {
          name: 'Campaign',
          icon: BarChart3,
          children: [
            { name: 'Marketing Plan', path: '/dashboard/marketing', icon: ClipboardList, allowed: hasAccess(['marketing', 'marketing_manager', 'auditor']) },
            { name: 'Overview & Analytics', path: '/dashboard/marketing/overview', icon: LineChart, allowed: hasAccess(['marketing_manager', 'finance', 'manager', 'auditor']) },
            { name: 'Approval Control', path: '/dashboard/marketing/approval-overview', icon: ClipboardCheck, allowed: hasAccess(['marketing_manager', 'finance', 'manager', 'auditor']) },
          ]
        },
        {
          name: 'Finance',
          icon: Wallet,
          accent: 'blue',
          children: [
            { name: 'Budget Control', path: '/dashboard/marketing/budgeting', icon: Wallet, allowed: hasAccess(['marketing', 'marketing_manager', 'finance', 'auditor']) },
            { name: 'Quarterly Alignment', path: '/dashboard/marketing/quarterly-alignment', icon: LineChart, allowed: hasAccess(['marketing', 'marketing_manager', 'finance', 'auditor']) },
            { name: 'Payment Requests', path: '/dashboard/marketing/payments', icon: CreditCard, allowed: hasAccess(['marketing', 'marketing_manager', 'finance', 'ga', 'auditor']) },
            { name: 'Cost Approvals', path: '/dashboard/approvals', icon: BadgeCheck, allowed: hasAccess(['marketing', 'marketing_manager', 'finance', 'manager', 'auditor']) },
            { name: 'Finance Reconciliation', path: '/dashboard/marketing/reconciliation', icon: Scale, allowed: hasAccess(['finance', 'marketing_manager', 'manager', 'auditor']) },
          ]
        },
        {
          name: 'Marketing Settings',
          icon: Settings,
          children: [
            { name: 'Approval Settings', path: '/dashboard/marketing-approval-settings', icon: UserCheck, allowed: hasAccess(['marketing_manager']) },
            { name: 'Go-live Readiness', path: '/dashboard/marketing/readiness', icon: Rocket, allowed: hasAccess(['marketing_manager', 'finance', 'auditor']) },
            { name: 'Event Locations', path: '/dashboard/marketing/event-locations', icon: MapPin, allowed: hasAccess(['marketing', 'marketing_manager', 'auditor']) },
            { name: 'Target Branches', path: '/dashboard/marketing/branches', icon: Building, allowed: hasAccess(['marketing', 'marketing_manager', 'auditor']) }
          ]
        }
      ]
    },
    {
      label: 'COMPLIANCE',
      accent: 'blue',
      submenus: [
        {
          name: 'Regulasi & Audit',
          icon: ShieldCheck,
          children: [
            { name: 'License & Permit', path: '/dashboard/compliance/licenses', icon: BadgeCheck, allowed: hasAccess(['compliance', 'legal_compliance', 'auditor']), badge: complianceBadges.license },
            { name: 'Compliance Docs', path: '/dashboard/compliance/docs', icon: ClipboardList, allowed: hasAccess(['compliance', 'legal_compliance', 'auditor']), badge: complianceBadges.monitoring },
            { name: 'SOP & Policy', path: '/dashboard/compliance/sop', icon: BookOpen, allowed: hasAccess(['compliance', 'legal_compliance', 'auditor']), badge: complianceBadges.sop },
            { name: 'HR & Employment', path: '/dashboard/compliance/hr', icon: UserCheck, allowed: hasAccess(['compliance', 'legal_compliance', 'auditor']), badge: complianceBadges.hr_compliance },
            { name: 'Tax & Finance', path: '/dashboard/compliance/tax', icon: Landmark, allowed: hasAccess(['compliance', 'legal_compliance', 'auditor']), badge: complianceBadges.tax_finance },
            { name: 'Product Regulatory', path: '/dashboard/compliance/product', icon: FlaskConical, allowed: hasAccess(['compliance', 'legal_compliance', 'auditor']), badge: complianceBadges.product_regulatory },
          ]
        }
      ]
    },
    {
      label: 'MASTER DATA',
      accent: 'blue',
      submenus: [
        {
          name: 'Master Data',
          icon: Database,
          children: [
            { name: 'Companies', path: '/dashboard/master/companies', icon: Building2, allowed: hasAccess(['ga', 'legal', 'compliance', 'marketing', 'marketing_manager', 'auditor']) },
            { name: 'Vendors', path: '/dashboard/vendors', icon: Users, allowed: hasAccess(['ga', 'legal', 'compliance', 'legal_compliance', 'marketing', 'marketing_manager', 'finance', 'auditor']) },
            { name: 'Brands', path: '/dashboard/master/brands', icon: Tag, allowed: true },
            { name: 'Line of Business', path: '/dashboard/master/lobs', icon: ClipboardList, allowed: true },
          ]
        }
      ]
    },
    {
      label: 'LEGAL',
      accent: 'rose',
      submenus: [
        {
          name: 'Legal & Litigasi',
          icon: Scale,
          children: [
            { name: 'Contract & Agreement', path: '/dashboard/legal/contracts', icon: FileSignature, allowed: hasAccess(['legal', 'legal_compliance', 'auditor']), badge: legalBadges.contract },
            { name: 'Corporate Legal Documents', path: '/dashboard/legal/corporate', icon: Building, allowed: hasAccess(['legal', 'legal_compliance', 'auditor']), badge: legalBadges.corporate },
            { name: 'Litigation & Dispute', path: '/dashboard/legal/litigation', icon: Gavel, allowed: hasAccess(['legal', 'legal_compliance', 'auditor']), badge: legalBadges.litigation },
          ]
        }
      ]
    },
  ], [hasAccess, complianceBadges, legalBadges]);

  // ── Expand/Collapse State ──
  // Key = submenu name, value = boolean
  const [expandedMenus, setExpandedMenus] = useState(() => {
    // Default: auto-expand submenu containing active route
    const initial = { Dashboard: hasActiveDashboard };
    MENU_SECTIONS.forEach(section => {
      section.submenus.forEach(sub => {
        const hasActive = sub.children.some(c => pathname === c.path);
        initial[sub.name] = hasActive;
      });
    });
    return initial;
  });

  // Persist expand state to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-expanded-menus');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with auto-expand for active route
        const merged = { ...parsed };
        if (hasActiveDashboard) merged.Dashboard = true;
        MENU_SECTIONS.forEach(section => {
          section.submenus.forEach(sub => {
            if (sub.children.some(c => pathname === c.path)) {
              merged[sub.name] = true;
            }
          });
        });
        setExpandedMenus(merged);
      }
    } catch {}
  }, []);

  // Auto-expand when navigating to a child route
  useEffect(() => {
    setExpandedMenus(prev => {
      const next = { ...prev };
      let changed = false;
      if (hasActiveDashboard && !next.Dashboard) {
        next.Dashboard = true;
        changed = true;
      }
      MENU_SECTIONS.forEach(section => {
        section.submenus.forEach(sub => {
          if (sub.children.some(c => pathname === c.path) && !next[sub.name]) {
            next[sub.name] = true;
            changed = true;
          }
        });
      });
      return changed ? next : prev;
    });
  }, [pathname, hasActiveDashboard]);

  const toggleSubmenu = useCallback((name) => {
    setExpandedMenus(prev => {
      const next = { ...prev, [name]: !prev[name] };
      try { localStorage.setItem('sidebar-expanded-menus', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const isAdmin = roles.includes('admin');

  return (
    <div className="flex min-w-0 w-full flex-col h-full bg-[#0f172a] border-r border-white/[0.06] transition-colors overflow-hidden">

      {/* ── Brand ── */}
      <div className={cn(
        "h-16 flex items-center justify-between border-b border-white/[0.06] flex-shrink-0 transition-all duration-200",
        collapsed ? "px-3 justify-center" : "px-4.5"
      )}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Link href="/dashboard" className="flex items-center gap-2.5 select-none justify-center" onClick={onClose}>
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-lg bg-white/5">
              <img src="/mra_logo.png" alt="MRA Group Logo" className="max-w-full max-h-full object-contain" />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col overflow-hidden whitespace-nowrap"
              >
                <p className="font-bold text-sm text-white leading-tight">MRA OpsSuite</p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">MRA Group Portal</p>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Desktop Collapse Toggle */}
        {!onClose && toggleCollapse && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-500 hover:text-slate-200 transition-colors hidden md:block cursor-pointer"
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        {/* Mobile Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-500 transition-colors md:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Group cross-module dashboards; keep a single permitted dashboard direct. */}
      {dashboardItems.length > 0 && <div className="shrink-0 border-b border-white/[0.06] px-3 py-3">
        {dashboardItems.length > 1 ? (
          <SubMenu
            name="Dashboard"
            icon={LayoutDashboard}
            children={dashboardItems}
            isExpanded={!!expandedMenus.Dashboard}
            onToggle={() => toggleSubmenu('Dashboard')}
            hasActiveChild={hasActiveDashboard}
            collapsed={collapsed}
            onChildClick={onClose}
            pathname={pathname}
            accent="blue"
          />
        ) : (
          <NavItem
            href={dashboardItems[0].path}
            icon={dashboardItems[0].icon}
            name={dashboardItems[0].name}
            isActive={hasActiveDashboard}
            accent="blue"
            onClick={onClose}
            collapsed={collapsed}
          />
        )}
      </div>}

      {/* ── Main nav with submenus ── */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5 scrollbar-thin">
        {MENU_SECTIONS.map((section, sectionIdx) => {
          // Check if any submenu in section has visible children
          const hasVisible = section.submenus.some(sub =>
            sub.children.some(c => c.allowed !== false)
          );
          if (!hasVisible) return null;

          const sectionAccent = section.accent || 'indigo';
          const sc = ACCENT[sectionAccent] || ACCENT.indigo;

          return (
            <div key={section.label} className="space-y-1">
              {/* Section label — gradient text */}
              <motion.div
                animate={{
                  opacity: collapsed ? 0 : 1,
                  height: collapsed ? 0 : 'auto',
                  marginBottom: collapsed ? 0 : 8
                }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 px-3">
                  <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", sc.dot)} />
                  <p className="min-w-0 whitespace-normal break-words text-[9px] font-extrabold uppercase leading-4 tracking-widest text-slate-500">
                    {section.label}
                  </p>
                </div>
              </motion.div>

              {/* Section Divider when collapsed */}
              <motion.div
                animate={{
                  opacity: collapsed ? 1 : 0,
                  height: collapsed ? 'auto' : 0,
                  marginTop: collapsed ? 8 : 0,
                  marginBottom: collapsed ? 8 : 0
                }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                {sectionIdx > 0 && <div className={cn("h-px mx-2 bg-gradient-to-r opacity-40", sc.label)} />}
              </motion.div>

              {/* Submenus */}
              {section.submenus.map((sub, subIdx) => {
                const hasActiveChild = sub.children.some(c => pathname === c.path);
                return (
                  <SubMenu
                    key={sub.name}
                    name={sub.name}
                    icon={sub.icon}
                    children={sub.children}
                    isExpanded={!!expandedMenus[sub.name]}
                    onToggle={() => toggleSubmenu(sub.name)}
                    hasActiveChild={hasActiveChild}
                    collapsed={collapsed}
                    onChildClick={onClose}
                    delay={(sectionIdx * 3 + subIdx) * 0.04}
                    pathname={pathname}
                    accent={sub.accent || sectionAccent}
                  />
                );
              })}
            </div>
          );
        })}

        {/* ── Admin section ── */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-1"
          >
            <div className="pt-2">
              <div className="flex items-center gap-2 px-3 overflow-hidden">
                <motion.div 
                  animate={{ opacity: collapsed ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 h-px bg-white/[0.06]"
                />
                <motion.p
                  animate={{
                    opacity: collapsed ? 0 : 1,
                    width: collapsed ? 0 : 'auto',
                    margin: collapsed ? 0 : '0 8px'
                  }}
                  transition={{ duration: 0.15 }}
                  className="text-[9px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
                >
                  System
                </motion.p>
                <motion.div
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 h-px bg-white/[0.06]"
                />
              </div>
            </div>
            <NavItem
              href="/dashboard/admin"
              icon={AdminShield}
              name="Admin Panel"
              isActive={pathname.startsWith("/dashboard/admin")}
              accent="rose"
              delay={0.45}
              onClick={onClose}
              collapsed={collapsed}
            />
          </motion.div>
        )}
      </div>

      {/* ── User profile ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="border-t border-white/[0.06] p-3 flex-shrink-0"
      >
        {collapsed ? (
          <SidebarPopover
            key={pathname}
            label="Akun"
            align="end"
            trigger={
              <button type="button" aria-label="Buka menu akun" className="flex w-full items-center justify-center rounded-xl px-2 py-2 hover:bg-white/[0.06] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</span>
              </button>
            }
          >
            {(close) => (
              <div className="space-y-2">
                <div className="px-2.5 py-1 whitespace-normal break-words [overflow-wrap:anywhere]">
                  <p className="text-xs font-semibold text-white leading-5">{fullName}</p>
                  <p className="text-[10px] text-slate-400 leading-4 uppercase mt-0.5">Role: {(roles.length ? roles : [role]).map(r => ROLE_LABELS[r] || r).join(' + ')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { close(); handleLogout(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-red-400 hover:bg-red-500/10 font-semibold text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </SidebarPopover>
        ) : (
        <div className="flex min-w-0 items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.06] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white whitespace-normal break-words [overflow-wrap:anywhere] leading-5">{fullName}</p>
              <p className="text-[10px] text-slate-400 whitespace-normal break-words [overflow-wrap:anywhere] leading-4 mt-0.5 uppercase">Role: {(roles.length ? roles : [role]).map(r => ROLE_LABELS[r] || r).join(' + ')}</p>
            </div>
            <motion.button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0 cursor-pointer ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
        )}
      </motion.div>

    </div>
  );
}

// ─── Main Exported Sidebar Component ─────────────────────────────────────────────
export function Sidebar({ open, onClose, role, roles = [], fullName, handleLogout, hidden = false }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored) {
      setCollapsed(stored === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const newVal = !collapsed;
    setCollapsed(newVal);
    localStorage.setItem('sidebar-collapsed', String(newVal));
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div 
        className="hidden md:flex flex-col h-full overflow-hidden flex-shrink-0"
        animate={{ width: hidden ? 0 : collapsed ? 76 : 272 }}
        aria-hidden={hidden || undefined}
        inert={hidden || undefined}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <SidebarContent 
          collapsed={collapsed} 
          toggleCollapse={toggleCollapse} 
          role={role}
          roles={roles}
          fullName={fullName}
          handleLogout={handleLogout}
        />
      </motion.div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div 
              key="overlay"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
              onClick={onClose}
            />
            <motion.div 
              key="drawer"
              initial={{ x: '-100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[272px] max-w-[calc(100vw-24px)] md:hidden"
            >
              <SidebarContent 
                collapsed={false} 
                onClose={onClose} 
                role={role}
                roles={roles}
                fullName={fullName}
                handleLogout={handleLogout}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
