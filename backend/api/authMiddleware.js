const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'glc-mra-secret-key-2026-auth-token';

/**
 * Middleware untuk memverifikasi JWT token dari header Authorization
 */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // Format header: Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(400).json({ error: 'Invalid token format. Must be Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Menyimpan info user: id, email, role, full_name
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

/**
 * Middleware untuk menyaring akses berdasarkan role/peran pengguna
 * @param {string[]} allowedRoles - List role yang diizinkan (misal: ['ADMIN', 'GA'])
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
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
};

module.exports = {
  verifyToken,
  checkRole,
  JWT_SECRET
};
