// Builds the real access map from the live Express routers: which roles can call which
// endpoints, based on the verifyToken / checkRole guards actually attached to each route.
// Controllers may apply extra in-code checks (e.g. Finance-only claims, company scope);
// those are not visible here.

const ROLES = ['admin', 'ga', 'legal', 'compliance', 'legal_compliance', 'marketing', 'finance', 'manager', 'auditor'];
const ROLE_LABELS = {
  admin: 'Admin', ga: 'GA', legal: 'Legal', compliance: 'Compliance', legal_compliance: 'Legal & Compliance',
  marketing: 'Marketing', finance: 'Finance', manager: 'Manager', auditor: 'Auditor'
};

// Mount table mirrors api/index.js.
const MODULES = [
  { key: 'ga', label: 'General Affairs', prefix: '/api/ga', router: () => require('../routes/gaRouter') },
  { key: 'legal', label: 'Legal', prefix: '/api/legal', router: () => require('../routes/legalRouter') },
  { key: 'compliance', label: 'Compliance', prefix: '/api/compliance', router: () => require('../routes/complianceRouter') },
  { key: 'master', label: 'Master Data', prefix: '/api/master', router: () => require('../routes/masterRouter') },
  { key: 'marketing', label: 'Marketing', prefix: '/api/marketing', router: () => require('../routes/marketingRouter') },
  { key: 'admin', label: 'Admin', prefix: '/api/admin', router: () => require('../routes/adminRouter'), mountRoles: ['admin'] },
];

function describeRoute(layer, inherited) {
  const handles = layer.route.stack.map(l => l.handle);
  const auth = inherited.auth || handles.some(h => h && h.requiresAuth);
  const guard = handles.find(h => h && Array.isArray(h.allowedRoles));
  let roles = guard ? guard.allowedRoles : null;
  if (inherited.roles) roles = roles ? roles.filter(r => inherited.roles.includes(r)) : inherited.roles;
  return { auth, roles };
}

function buildAccessMap() {
  const modules = MODULES.map(mod => {
    const router = mod.router();
    const endpoints = [];
    const inherited = { auth: !!mod.mountRoles, roles: mod.mountRoles || null };
    for (const layer of router.stack || []) {
      if (!layer.route) {
        // Router-level guards apply to the routes declared after them.
        if (layer.handle?.requiresAuth) inherited.auth = true;
        if (Array.isArray(layer.handle?.allowedRoles)) inherited.roles = layer.handle.allowedRoles;
        continue;
      }
      const { auth, roles } = describeRoute(layer, inherited);
      for (const method of Object.keys(layer.route.methods || {})) {
        const m = method.toUpperCase();
        endpoints.push({
          method: m,
          path: `${mod.prefix}${layer.route.path}`,
          kind: m === 'GET' ? 'read' : 'write',
          access: !auth ? 'public' : roles ? 'roles' : 'authenticated',
          roles: !auth ? ROLES : roles ? roles.filter(r => ROLES.includes(r)) : ROLES,
        });
      }
    }

    const byRole = {};
    for (const role of ROLES) {
      const reach = endpoints.filter(e => e.roles.includes(role));
      byRole[role] = {
        read: reach.filter(e => e.kind === 'read').length,
        write: reach.filter(e => e.kind === 'write').length,
      };
    }
    return {
      key: mod.key,
      label: mod.label,
      prefix: mod.prefix,
      total: { read: endpoints.filter(e => e.kind === 'read').length, write: endpoints.filter(e => e.kind === 'write').length },
      public_count: endpoints.filter(e => e.access === 'public').length,
      byRole,
      endpoints,
    };
  });
  return { roles: ROLES.map(r => ({ key: r, label: ROLE_LABELS[r] })), modules, generated_at: new Date().toISOString() };
}

module.exports = { buildAccessMap, ROLES, ROLE_LABELS };
