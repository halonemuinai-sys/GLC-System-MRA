// Menu-level access directory for the Admin Panel. This mirrors the dashboard
// navigation rules so an administrator can choose roles from a business menu
// rather than from individual API endpoints.

const { ROLES, ROLE_LABELS } = require('./roles');

const ALL_ROLES = [...ROLES];
const only = (...roles) => roles;

const MENU_GROUPS = [
  {
    key: 'dashboards', label: 'Dashboards', department: 'Cross-functional',
    menus: [
      { label: 'Dashboard GA', path: '/dashboard', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Dashboard Compliance', path: '/dashboard/compliance', roles: only('admin', 'compliance', 'legal_compliance', 'auditor'), api_module: 'compliance' },
      { label: 'Dashboard Legal', path: '/dashboard/legal', roles: only('admin', 'legal', 'legal_compliance', 'auditor'), api_module: 'legal' },
    ]
  },
  {
    key: 'ga', label: 'General Affairs', department: 'General Affairs',
    menus: [
      { label: 'Assets', path: '/dashboard/assets', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Stock Opname', path: '/dashboard/stock-opname', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Barcode Generator', path: '/dashboard/barcode', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Vehicles', path: '/dashboard/vehicles', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'IT Rentals', path: '/dashboard/it-rentals', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Maintenance', path: '/dashboard/maintenances', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Monitoring Anggaran', path: '/dashboard/ga/budget-monitoring', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Expenses', path: '/dashboard/expenses', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Marketing POs', path: '/dashboard/ga/marketing-po', roles: only('admin', 'ga', 'finance', 'marketing_manager', 'auditor'), api_module: 'ga' },
      { label: 'Documents', path: '/dashboard/documents', roles: only('admin', 'ga', 'legal', 'legal_compliance', 'auditor'), api_module: 'ga' },
      { label: 'Asset Reports', path: '/dashboard/berita-acara', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
      { label: 'Approver Directory shortcut', path: '/dashboard/marketing-approval-settings?tab=signers', roles: only('ga'), api_module: 'marketing', note: 'GA shortcut. Marketing Managers use Approval Settings.' },
      { label: 'Insurance', path: '/dashboard/insurances', roles: only('admin', 'ga', 'legal', 'legal_compliance', 'auditor'), api_module: 'ga' },
      { label: 'Benchmark Scorecard', path: '/dashboard/ga-benchmark', roles: only('admin', 'ga', 'auditor'), api_module: 'ga' },
    ]
  },
  {
    key: 'marketing_finance', label: 'Marketing & Finance', department: 'Marketing & Finance',
    menus: [
      { label: 'Marketing Plan', path: '/dashboard/marketing', roles: only('admin', 'marketing', 'marketing_manager', 'auditor'), api_module: 'marketing' },
      { label: 'Overview & Analytics', path: '/dashboard/marketing/overview', roles: only('admin', 'marketing_manager', 'finance', 'manager', 'auditor'), api_module: 'marketing' },
      { label: 'Overview Approval', path: '/dashboard/marketing/approval-overview', roles: only('admin', 'marketing_manager', 'finance', 'manager', 'auditor'), api_module: 'marketing' },
      { label: 'Budget Control', path: '/dashboard/marketing/budgeting', roles: only('admin', 'marketing', 'marketing_manager', 'finance', 'auditor'), api_module: 'marketing' },
      { label: 'Quarterly Alignment', path: '/dashboard/marketing/quarterly-alignment', roles: only('admin', 'marketing', 'marketing_manager', 'finance', 'auditor'), api_module: 'marketing' },
      { label: 'Payment Requests', path: '/dashboard/marketing/payments', roles: only('admin', 'marketing', 'marketing_manager', 'finance', 'ga', 'auditor'), api_module: 'marketing' },
      { label: 'Cost Approvals', path: '/dashboard/approvals', roles: only('admin', 'marketing', 'marketing_manager', 'finance', 'manager', 'auditor'), api_module: 'marketing' },
      { label: 'Finance Reconciliation', path: '/dashboard/marketing/reconciliation', roles: only('admin', 'finance', 'marketing_manager', 'manager', 'auditor'), api_module: 'marketing' },
      { label: 'Approval Settings', path: '/dashboard/marketing-approval-settings', roles: only('admin', 'marketing_manager'), api_module: 'marketing' },
      { label: 'Go-live Readiness', path: '/dashboard/marketing/readiness', roles: only('admin', 'marketing_manager', 'finance', 'auditor'), api_module: 'marketing' },
      { label: 'Event Locations', path: '/dashboard/marketing/event-locations', roles: only('admin', 'marketing', 'marketing_manager', 'auditor'), api_module: 'marketing' },
      { label: 'Target Branches', path: '/dashboard/marketing/branches', roles: only('admin', 'marketing', 'marketing_manager', 'auditor'), api_module: 'marketing' },
    ]
  },
  {
    key: 'compliance', label: 'Compliance', department: 'Compliance',
    menus: [
      { label: 'License & Permit', path: '/dashboard/compliance/licenses', roles: only('admin', 'compliance', 'legal_compliance', 'auditor'), api_module: 'compliance' },
      { label: 'Compliance Docs', path: '/dashboard/compliance/docs', roles: only('admin', 'compliance', 'legal_compliance', 'auditor'), api_module: 'compliance' },
      { label: 'SOP & Policy', path: '/dashboard/compliance/sop', roles: only('admin', 'compliance', 'legal_compliance', 'auditor'), api_module: 'compliance' },
      { label: 'HR & Employment', path: '/dashboard/compliance/hr', roles: only('admin', 'compliance', 'legal_compliance', 'auditor'), api_module: 'compliance' },
      { label: 'Tax & Finance', path: '/dashboard/compliance/tax', roles: only('admin', 'compliance', 'legal_compliance', 'auditor'), api_module: 'compliance' },
      { label: 'Product Regulatory', path: '/dashboard/compliance/product', roles: only('admin', 'compliance', 'legal_compliance', 'auditor'), api_module: 'compliance' },
    ]
  },
  {
    key: 'legal', label: 'Legal', department: 'Legal',
    menus: [
      { label: 'Contract & Agreement', path: '/dashboard/legal/contracts', roles: only('admin', 'legal', 'legal_compliance', 'auditor'), api_module: 'legal' },
      { label: 'Corporate Legal Documents', path: '/dashboard/legal/corporate', roles: only('admin', 'legal', 'legal_compliance', 'auditor'), api_module: 'legal' },
      { label: 'Litigation & Dispute', path: '/dashboard/legal/litigation', roles: only('admin', 'legal', 'legal_compliance', 'auditor'), api_module: 'legal' },
    ]
  },
  {
    key: 'master_data', label: 'Master Data', department: 'Shared data',
    menus: [
      { label: 'Companies', path: '/dashboard/master/companies', roles: only('admin', 'ga', 'legal', 'compliance', 'marketing', 'marketing_manager', 'auditor'), api_module: 'master' },
      { label: 'Vendors', path: '/dashboard/vendors', roles: only('admin', 'ga', 'legal', 'compliance', 'legal_compliance', 'marketing', 'marketing_manager', 'finance', 'auditor'), api_module: 'ga' },
      { label: 'Brands', path: '/dashboard/master/brands', roles: ALL_ROLES, api_module: 'master' },
      { label: 'Line of Business', path: '/dashboard/master/lobs', roles: ALL_ROLES, api_module: 'master' },
    ]
  },
  {
    key: 'system', label: 'System', department: 'System administration',
    menus: [
      { label: 'Admin Panel', path: '/dashboard/admin', roles: only('admin'), api_module: 'admin' },
    ]
  },
];

function buildMenuAccessMap(userRows = []) {
  const activeUsersByRole = Object.fromEntries(ROLES.map(role => [role, 0]));
  const activeUsersByDepartment = {};
  for (const user of userRows) {
    const roles = [...new Set([user.role, ...(user.extra_roles || [])].filter(Boolean))];
    for (const role of roles) if (Object.hasOwn(activeUsersByRole, role)) activeUsersByRole[role] += 1;
    const department = String(user.department || 'Unassigned department').trim() || 'Unassigned department';
    activeUsersByDepartment[department] = (activeUsersByDepartment[department] || 0) + 1;
  }

  return {
    roles: ROLES.map(key => ({ key, label: ROLE_LABELS[key], active_users: activeUsersByRole[key] || 0 })),
    groups: MENU_GROUPS.map(group => ({
      ...group,
      menus: group.menus.map(menu => ({ ...menu, roles: [...menu.roles] }))
    })),
    active_users_by_department: activeUsersByDepartment,
    total_menus: MENU_GROUPS.reduce((total, group) => total + group.menus.length, 0),
    generated_at: new Date().toISOString()
  };
}

module.exports = { buildMenuAccessMap, MENU_GROUPS };
