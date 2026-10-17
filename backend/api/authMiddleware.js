const jwt = require('jsonwebtoken');
const prisma = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'glc-mra-secret-key-2026-auth-token';
const COMPANY_SCOPE_BYPASS_ROLES = ['admin', 'auditor'];

// Account state is re-read from the DB (cached briefly) so that deactivating a user or
// changing their role takes effect without waiting for the 24h token to expire.
const USER_STATE_CACHE = new Map(); // id -> { active, role, at }
const USER_STATE_TTL_MS = 30_000;

async function loadUserState(id) {
  const now = Date.now();
  const cached = USER_STATE_CACHE.get(id);
  if (cached && now - cached.at < USER_STATE_TTL_MS) return cached;
  const user = await prisma.m_user.findUnique({ where: { id }, select: { is_active: true, role: true } });
  const state = { active: !!user?.is_active, role: user?.role || null, at: now };
  USER_STATE_CACHE.set(id, state);
  return state;
}

// Called after an admin changes a user so the next request sees the new state.
function forgetUserState(id) {
  USER_STATE_CACHE.delete(Number(id));
}

/**
 * Middleware untuk memverifikasi JWT token dari header Authorization
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Format header: Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(400).json({ error: 'Invalid token format. Must be Bearer <token>' });
  }

  let decoded;
  try {
    decoded = jwt.verify(parts[1], JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }

  try {
    const state = await loadUserState(Number(decoded.id));
    if (!state.active) {
      return res.status(401).json({ error: 'Akun tidak aktif atau sudah dihapus. Silakan hubungi administrator.' });
    }
    req.user = { ...decoded, role: state.role || decoded.role }; // id, email, role (terkini), full_name
    next();
  } catch (err) {
    next(err);
  }
};
verifyToken.requiresAuth = true;

/**
 * Middleware untuk menyaring akses berdasarkan role/peran pengguna
 * @param {string[]} allowedRoles - List role yang diizinkan (misal: ['ADMIN', 'GA'])
 */
const checkRole = (allowedRoles) => {
  const guard = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Session not found.' });
    }
    
    // Ubah role ke uppercase untuk menghindari ketidakcocokan casing
    const userRole = req.user.role ? req.user.role.toUpperCase() : '';
    const rolesUpper = allowedRoles.map(r => r.toUpperCase());

    if (!rolesUpper.includes(userRole)) {
      return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
    }
    next();
  };
  // Exposed for the admin access map (introspection of the live routers).
  guard.allowedRoles = allowedRoles.map(r => r.toLowerCase());
  return guard;
};

/**
 * Middleware untuk melekatkan scope PT/unit bisnis yang boleh diakses user (req.companyScope).
 * admin/auditor bypass (all: true). Role lain dibatasi ke company_id yang di-assign lewat
 * m_user_company_access - default fail-closed (companyIds kosong) kalau belum di-assign.
 */
const attachCompanyScope = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Session not found.' });
  }

  const userRole = req.user.role ? req.user.role.toLowerCase() : '';
  if (COMPANY_SCOPE_BYPASS_ROLES.includes(userRole)) {
    req.companyScope = { all: true };
    return next();
  }

  try {
    const rows = await prisma.m_user_company_access.findMany({
      where: { user_id: req.user.id },
      select: { company_id: true }
    });
    req.companyScope = { all: false, companyIds: rows.map(r => r.company_id) };
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resolve company access scope.' });
  }
};

module.exports = {
  forgetUserState,
  verifyToken,
  checkRole,
  attachCompanyScope,
  JWT_SECRET
};
