// Single source of truth for application roles.
// A user has one primary role (m_user.role) plus optional extra roles (m_user.extra_roles);
// access is granted when ANY of the user's roles is allowed.

const ROLES = ['admin', 'ga', 'legal', 'compliance', 'legal_compliance', 'marketing', 'marketing_manager', 'finance', 'manager', 'auditor'];

const ROLE_LABELS = {
  admin: 'Admin',
  ga: 'GA',
  legal: 'Legal',
  compliance: 'Compliance',
  legal_compliance: 'Legal & Compliance',
  marketing: 'Marketing (staff)',
  marketing_manager: 'Marketing Manager',
  finance: 'Finance',
  manager: 'Manager',
  auditor: 'Auditor',
};

// Admin is a primary role only; it is never granted as an extra role.
const EXTRA_ROLE_CHOICES = ROLES.filter(role => role !== 'admin');

const normalize = value => String(value || '').trim().toLowerCase();

function combineRoles(primary, extra = []) {
  const list = [normalize(primary), ...(Array.isArray(extra) ? extra : []).map(normalize)].filter(Boolean);
  return [...new Set(list)];
}

// Validates extra roles from the admin form: known roles, no admin, not the primary role.
function cleanExtraRoles(extra, primary) {
  if (extra == null) return [];
  if (!Array.isArray(extra)) throw Object.assign(new Error('Additional roles must be a list.'), { status: 400 });
  const unknown = extra.map(normalize).filter(role => role && !EXTRA_ROLE_CHOICES.includes(role));
  if (unknown.length) throw Object.assign(new Error(`Unknown or not allowed additional role: ${unknown.join(', ')}.`), { status: 400 });
  return [...new Set(extra.map(normalize).filter(role => role && role !== normalize(primary)))];
}

const rolesOf = req => (req?.user?.roles?.length ? req.user.roles : combineRoles(req?.user?.role));
const hasRole = (req, ...roles) => {
  const mine = rolesOf(req);
  return roles.flat().some(role => mine.includes(normalize(role)));
};

module.exports = { ROLES, ROLE_LABELS, EXTRA_ROLE_CHOICES, combineRoles, cleanExtraRoles, rolesOf, hasRole };
