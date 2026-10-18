import Cookies from 'js-cookie';

// A user has one primary role plus optional additional roles (set in Admin Panel → Users).
// The login stores both: glc_user_role (primary) and glc_user_roles (comma-separated list).
// The backend re-checks every request; these helpers only decide what the UI shows.

export const ROLE_OPTIONS = [
  ['admin', 'Admin'],
  ['ga', 'GA'],
  ['legal', 'Legal'],
  ['compliance', 'Compliance'],
  ['legal_compliance', 'Legal & Compliance'],
  ['marketing', 'Marketing (staff)'],
  ['marketing_manager', 'Marketing Manager'],
  ['finance', 'Finance'],
  ['manager', 'Manager'],
  ['auditor', 'Auditor'],
];
export const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS);

export function getUserRoles() {
  if (typeof window === 'undefined') return [];
  const raw = Cookies.get('glc_user_roles') || Cookies.get('glc_user_role') || '';
  return [...new Set(raw.toLowerCase().split(',').map(r => r.trim()).filter(Boolean))];
}

export function saveUserRoles(user) {
  if (!user) return;
  Cookies.set('glc_user_role', user.role || '', { expires: 1 });
  Cookies.set('glc_user_roles', (user.roles?.length ? user.roles : [user.role]).filter(Boolean).join(','), { expires: 1 });
}

// Exact match: the user holds one of these roles (admin is NOT implied).
export const hasRole = (roles, ...wanted) => wanted.flat().some(r => roles.includes(r));

// Menu/page access: admin always passes.
export const canAccess = (roles, allowed) => roles.includes('admin') || allowed.some(r => roles.includes(r));
