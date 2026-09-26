// Default landing page per role after login — avoids dumping every role onto the
// GA-centric /dashboard overview when a dedicated dashboard exists for their role.
export const ROLE_LANDING_PATHS = {
  marketing: '/dashboard/marketing/overview',
  legal: '/dashboard/legal',
  legal_compliance: '/dashboard/legal',
  compliance: '/dashboard/compliance'
};

export function getLandingPath(role) {
  return ROLE_LANDING_PATHS[role] || '/dashboard';
}
