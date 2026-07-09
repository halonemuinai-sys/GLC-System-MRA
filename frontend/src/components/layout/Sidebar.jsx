'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Briefcase,
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
  LineChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';

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
  badge = 0
}) {
  const activeText = accent === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400';
  const activeIcon = accent === 'rose' ? 'bg-rose-100 dark:bg-rose-500/20' : 'bg-indigo-100 dark:bg-indigo-500/20';
  const activeColor = accent === 'rose' ? 'text-rose-500 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400';
  const activeBar = accent === 'rose' ? 'bg-rose-500' : 'bg-indigo-600 dark:bg-indigo-500';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ delay, duration: 0.2, ease: 'easeOut' }}
      className="relative"
    >
      <Link href={href} onClick={onClick}>
        <motion.div
          whileHover={{ x: collapsed ? 0 : 2 }}
          transition={{ duration: 0.12 }}
          className={cn(
            "group relative flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer select-none",
            isChild && !collapsed ? "pl-6 pr-3 py-2" : "px-3 py-2.5",
            isActive
              ? activeText
              : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/85 dark:hover:bg-neutral-800/60"
          )}
        >
          {/* Active background slider */}
          {isActive && (
            <motion.div
              layoutId="active-nav-bg"
              className={cn(
                "absolute inset-0 rounded-xl -z-10",
                accent === 'rose' ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-indigo-50 dark:bg-indigo-500/10'
              )}
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
                : cn(isChild ? "" : "group-hover:bg-neutral-200/70 dark:group-hover:bg-neutral-700/60")
            )}
          >
            <Icon className={cn(
              "transition-colors",
              isChild ? "w-3.5 h-3.5" : "w-4 h-4",
              isActive ? activeColor : "text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300"
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
              "flex-1 leading-none whitespace-nowrap overflow-hidden",
              isChild ? "text-[13px]" : "text-sm"
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

          {/* Tooltip for collapsed state */}
          {collapsed && (
            <div className="absolute left-16 top-1/2 -translate-y-1/2 ml-2 px-2 py-1.5 bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg border border-neutral-800 dark:border-neutral-700">
              {name}
              {badge > 0 && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{badge}</span>}
            </div>
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
                >
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      </Link>
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
  pathname
}) {
  // In collapsed mode, show a flyout popover on hover
  const [hovered, setHovered] = useState(false);

  // Filter visible children
  const visibleChildren = children.filter(c => c.allowed !== false);
  if (visibleChildren.length === 0) return null;

  // Count badge
  const childCount = visibleChildren.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25, ease: 'easeOut' }}
      className="relative"
      onMouseEnter={() => collapsed && setHovered(true)}
      onMouseLeave={() => collapsed && setHovered(false)}
    >
      {/* Submenu parent button */}
      <motion.button
        type="button"
        onClick={() => !collapsed && onToggle()}
        whileHover={{ x: collapsed ? 0 : 2 }}
        transition={{ duration: 0.12 }}
        className={cn(
          "w-full group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none",
          hasActiveChild
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/85 dark:hover:bg-neutral-800/60"
        )}
      >
        {/* Subtle active background when child is active */}
        {hasActiveChild && (
          <motion.div
            className="absolute inset-0 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/[0.06] -z-10"
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
            hasActiveChild
              ? "bg-indigo-100 dark:bg-indigo-500/20"
              : "group-hover:bg-neutral-200/70 dark:group-hover:bg-neutral-700/60"
          )}
        >
          <Icon className={cn(
            "w-4 h-4 transition-colors",
            hasActiveChild
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-300"
          )} />
        </motion.div>

        {/* Label + chevron */}
        <motion.div
          animate={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto'
          }}
          transition={{ duration: 0.15 }}
          className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap"
        >
          <span className="flex-1 text-left leading-none">
            {name}
          </span>

          {/* Item count badge */}
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors mr-2.5 flex-shrink-0",
            hasActiveChild
              ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
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
              hasActiveChild
                ? "text-indigo-400 dark:text-indigo-500"
                : "text-neutral-300 dark:text-neutral-600"
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
              <div className="relative ml-3 pl-3 border-l-2 border-neutral-100 dark:border-neutral-800/80 space-y-0.5 py-1">
                {visibleChildren.map((child, idx) => (
                  <NavItem
                    key={child.path}
                    href={child.path}
                    icon={child.icon}
                    name={child.name}
                    isActive={pathname === child.path}
                    delay={idx * 0.03}
                    onClick={onChildClick}
                    collapsed={false}
                    isChild={true}
                    badge={child.badge || 0}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Flyout popover (collapsed sidebar) ── */}
      {collapsed && (
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, x: -8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute left-[calc(100%+8px)] top-0 z-50 min-w-[200px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40 py-2 px-1.5"
            >
              {/* Header */}
              <div className="px-2.5 pb-2 mb-1 border-b border-neutral-100 dark:border-neutral-800">
                <p className="text-xs font-bold text-neutral-900 dark:text-white">{name}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">{childCount} items</p>
              </div>

              {/* Children */}
              <div className="space-y-0.5">
                {visibleChildren.map((child) => {
                  const isActive = pathname === child.path;
                  return (
                    <Link
                      key={child.path}
                      href={child.path}
                      onClick={onChildClick}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all",
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10"
                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/85 dark:hover:bg-neutral-800/60"
                      )}
                    >
                      <child.icon className={cn(
                        "w-3.5 h-3.5 flex-shrink-0",
                        isActive ? "text-indigo-500 dark:text-indigo-400" : "text-neutral-400 dark:text-neutral-500"
                      )} />
                      <span className="whitespace-nowrap flex-1">{child.name}</span>
                      {child.badge > 0 && (
                        <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{child.badge}</span>
                      )}
                      {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
                    </Link>
                  );
                })}
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
  fullName,
  handleLogout
}) {
  const pathname = usePathname();

  // Helper to check if role matches allowed list
  const hasAccess = useCallback((allowedRoles) => {
    if (!role) return false;
    if (role === 'admin') return true;
    return allowedRoles.includes(role);
  }, [role]);

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
      submenus: [
        {
          name: 'Performance',
          icon: Award,
          children: [
            { name: 'Benchmark Scorecard', path: '/dashboard/ga-benchmark', icon: Award, allowed: hasAccess(['ga', 'auditor']) },
          ]
        },
        {
          name: 'Aset & Kendaraan',
          icon: Package,
          children: [
            { name: 'Assets', path: '/dashboard/assets', icon: Box, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Vehicles', path: '/dashboard/vehicles', icon: Truck, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Device Rental', path: '/dashboard/device-rentals', icon: Laptop, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'IT Rentals', path: '/dashboard/it-rentals', icon: Monitor, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Maintenance', path: '/dashboard/maintenances', icon: Wrench, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Stock Opname', path: '/dashboard/stock-opname', icon: ClipboardCheck, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Barcode Generator', path: '/dashboard/barcode', icon: Barcode, allowed: hasAccess(['ga', 'auditor']) },
          ]
        },
        {
          name: 'Vendor & Dokumen',
          icon: Briefcase,
          children: [
            { name: 'Vendors', path: '/dashboard/vendors', icon: Users, allowed: hasAccess(['ga', 'auditor']) },
            { name: 'Insurance', path: '/dashboard/insurances', icon: ShieldCheck, allowed: hasAccess(['ga', 'legal', 'legal_compliance', 'auditor']) },
            { name: 'Documents', path: '/dashboard/documents', icon: FileText, allowed: hasAccess(['ga', 'legal', 'legal_compliance', 'auditor']) },
          ]
        },
        {
          name: 'Keuangan',
          icon: Wallet,
          children: [
            { name: 'Expenses', path: '/dashboard/expenses', icon: BarChart3, allowed: hasAccess(['ga', 'auditor']) },
          ]
        }
      ]
    },
    {
      label: 'MARKETING BUDGET',
      submenus: [
        {
          name: 'Marketing Budget',
          icon: BarChart3,
          children: [
            { name: 'Marketing Plan', path: '/dashboard/marketing', icon: ClipboardList, allowed: hasAccess(['marketing', 'auditor']) },
            { name: 'Overview & Analytics', path: '/dashboard/marketing/overview', icon: LineChart, allowed: hasAccess(['marketing', 'admin', 'auditor']) },
            { name: 'Cost Approvals', path: '/dashboard/approvals', icon: BadgeCheck, allowed: hasAccess(['marketing', 'auditor']) },
            { name: 'Overview Approval', path: '/dashboard/marketing/approval-overview', icon: ClipboardCheck, allowed: hasAccess(['marketing', 'admin', 'auditor']) },
            { name: 'Budget Control', path: '/dashboard/marketing/budgeting', icon: Wallet, allowed: hasAccess(['marketing', 'admin', 'auditor']) },
            { name: 'Lokasi Event', path: '/dashboard/marketing/event-locations', icon: MapPin, allowed: hasAccess(['marketing', 'admin', 'auditor']) },
            { name: 'Cabang Sasaran', path: '/dashboard/marketing/branches', icon: Building, allowed: hasAccess(['marketing', 'admin', 'auditor']) },
            { name: 'Konfigurasi Approval', path: '/dashboard/marketing-approval-settings', icon: Settings, allowed: hasAccess(['admin']) }
          ]
        }
      ]
    },
    {
      label: 'COMPLIANCE',
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
      submenus: [
        {
          name: 'Data Master',
          icon: Database,
          children: [
            { name: 'Perusahaan', path: '/dashboard/master/companies', icon: Building2, allowed: hasAccess(['ga', 'legal', 'compliance', 'auditor']) },
            { name: 'Brand / Merek', path: '/dashboard/master/brands', icon: Tag, allowed: true },
            { name: 'Line of Business', path: '/dashboard/master/lobs', icon: ClipboardList, allowed: true }
          ]
        }
      ]
    },
    {
      label: 'LEGAL',
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
    const initial = {};
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
  }, [pathname]);

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

  const isAdmin = role === 'admin';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-white/[0.06] transition-colors overflow-hidden">
      
      {/* ── Brand ── */}
      <div className={cn(
        "h-16 flex items-center justify-between border-b border-neutral-100 dark:border-white/[0.05] flex-shrink-0 transition-all duration-200",
        collapsed ? "px-3 justify-center" : "px-4.5"
      )}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <Link href="/dashboard" className="flex items-center gap-2.5 select-none justify-center" onClick={onClose}>
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
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
                <p className="font-bold text-sm text-neutral-900 dark:text-white leading-tight">MRA OpsSuite</p>
                <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">MRA Group Portal</p>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Desktop Collapse Toggle */}
        {!onClose && toggleCollapse && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors hidden md:block cursor-pointer"
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
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors md:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Dashboard links ── */}
      <div className="px-3 pt-4 pb-1 space-y-0.5">
        <NavItem
          href="/dashboard"
          icon={LayoutDashboard}
          name="Dashboard GA"
          isActive={pathname === '/dashboard'}
          delay={0}
          onClick={onClose}
          collapsed={collapsed}
        />
        {hasAccess(['compliance', 'legal_compliance', 'auditor']) && (
          <NavItem
            href="/dashboard/compliance"
            icon={ShieldCheck}
            name="Dashboard Compliance"
            isActive={pathname === '/dashboard/compliance'}
            delay={0.03}
            onClick={onClose}
            collapsed={collapsed}
          />
        )}
        {hasAccess(['legal', 'legal_compliance', 'auditor']) && (
          <NavItem
            href="/dashboard/legal"
            icon={Scale}
            name="Dashboard Legal"
            isActive={pathname === '/dashboard/legal'}
            delay={0.04}
            onClick={onClose}
            collapsed={collapsed}
          />
        )}
      </div>

      {/* ── Main nav with submenus ── */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5 scrollbar-thin">
        {MENU_SECTIONS.map((section, sectionIdx) => {
          // Check if any submenu in section has visible children
          const hasVisible = section.submenus.some(sub =>
            sub.children.some(c => c.allowed !== false)
          );
          if (!hasVisible) return null;

          return (
            <div key={section.label} className="space-y-1">
              {/* Section label */}
              <motion.div
                animate={{
                  opacity: collapsed ? 0 : 1,
                  height: collapsed ? 0 : 'auto',
                  marginBottom: collapsed ? 0 : 8
                }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="px-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest whitespace-nowrap">
                  {section.label}
                </p>
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
                {sectionIdx > 0 && <div className="h-px bg-neutral-100 dark:bg-white/[0.05] mx-2" />}
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
                  />
                );
              })}
            </div>
          );
        })}

        {/* ── Documentation section ── */}
        <div className="space-y-1">
          <motion.div
            animate={{
              opacity: collapsed ? 0 : 1,
              height: collapsed ? 0 : 'auto',
              marginBottom: collapsed ? 0 : 8
            }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="px-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest whitespace-nowrap">
              DOKUMENTASI
            </p>
          </motion.div>
          <NavItem
            href="/docs"
            icon={BookOpen}
            name="Panduan & SOP"
            isActive={pathname.startsWith("/docs")}
            delay={0.38}
            onClick={onClose}
            collapsed={collapsed}
          />
        </div>

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
                  className="flex-1 h-px bg-neutral-100 dark:bg-white/[0.05]" 
                />
                <motion.p
                  animate={{
                    opacity: collapsed ? 0 : 1,
                    width: collapsed ? 0 : 'auto',
                    margin: collapsed ? 0 : '0 8px'
                  }}
                  transition={{ duration: 0.15 }}
                  className="text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest whitespace-nowrap"
                >
                  System
                </motion.p>
                <motion.div 
                  animate={{ opacity: 1 }} 
                  transition={{ duration: 0.15 }}
                  className="flex-1 h-px bg-neutral-100 dark:bg-white/[0.05]" 
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
        className="border-t border-neutral-100 dark:border-white/[0.05] p-3 flex-shrink-0"
      >
        <div className={cn(
          "flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group relative",
          collapsed ? "justify-center" : ""
        )}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          
          <motion.div
            animate={{ 
              opacity: collapsed ? 0 : 1, 
              width: collapsed ? 0 : 'auto' 
            }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex items-center justify-between overflow-hidden whitespace-nowrap"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate leading-tight">{fullName}</p>
              <p className="text-[10px] text-neutral-400 truncate leading-tight mt-0.5 uppercase">Role: {role}</p>
            </div>
            <motion.button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              whileHover={{ scale: 1.1, rotate: 10 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="p-1.5 rounded-lg text-neutral-300 dark:text-neutral-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0 cursor-pointer ml-2"
            >
              <LogOut className="w-3.5 h-3.5" />
            </motion.button>
          </motion.div>

          {/* Popout tooltip on hover for collapsed state user menu */}
          {collapsed && (
            <div className="absolute left-16 bottom-2 ml-2 p-3 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto whitespace-nowrap z-50 shadow-xl border border-neutral-200 dark:border-neutral-800 flex flex-col gap-2 min-w-[140px]">
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white leading-tight">{fullName}</p>
                <p className="text-[10px] text-neutral-400 leading-tight uppercase mt-0.5">Role: {role}</p>
              </div>
              <div className="h-px bg-neutral-100 dark:bg-neutral-800" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 font-semibold text-left pointer-events-auto cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
}

// ─── Main Exported Sidebar Component ─────────────────────────────────────────────
export function Sidebar({ open, onClose, role, fullName, handleLogout }) {
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
        animate={{ width: collapsed ? 76 : 272 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <SidebarContent 
          collapsed={collapsed} 
          toggleCollapse={toggleCollapse} 
          role={role}
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
              className="fixed inset-y-0 left-0 z-50 flex md:hidden"
            >
              <SidebarContent 
                collapsed={false} 
                onClose={onClose} 
                role={role}
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
