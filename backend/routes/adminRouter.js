const express = require('express');
const router = express.Router();
const prisma = require('../api/db');
const bcrypt = require('bcryptjs');

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const { ROLES, buildAccessMap } = require('../api/accessMap');
const { forgetUserState } = require('../api/authMiddleware');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const USER_SELECT = { id: true, full_name: true, email: true, phone: true, department: true, position: true, role: true, is_active: true, created_at: true };
const cleanText = (v, max) => (v === undefined ? undefined : (v === null ? null : String(v).trim().slice(0, max) || null));

// Admin actions are written to audit_log so the audit tab shows who changed what.
// action is VARCHAR(10). Failures never block the request.
async function logAudit(req, { table, action, recordId = null, oldData = null, newData = null }) {
  try {
    const actorId = Number(req.user?.id);
    const actor = actorId ? await prisma.m_user.findUnique({ where: { id: actorId }, select: { id: true } }) : null;
    await prisma.audit_log.create({
      data: { table_name: table, action, record_id: recordId, user_id: actor?.id || null, old_data: oldData, new_data: newData ? { ...newData, actor_email: req.user?.email || null } : { actor_email: req.user?.email || null } }
    });
  } catch (err) {
    console.error('[audit] gagal mencatat', action, table, err.message);
  }
}

const activeAdminCount = (excludeId) => prisma.m_user.count({ where: { role: 'admin', is_active: true, ...(excludeId ? { id: { not: excludeId } } : {}) } });

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users — List all users with filters (+ PT access count)
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, status } = req.query;
    const whereClause = {};
    if (search) {
      whereClause.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
        { position: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) whereClause.role = role;
    if (status !== undefined && status !== '') whereClause.is_active = status === 'true';

    const users = await prisma.m_user.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      select: { ...USER_SELECT, _count: { select: { company_access: true } } }
    });
    res.json(users.map(({ _count, ...u }) => ({ ...u, company_access_count: _count?.company_access ?? 0, is_self: u.id === Number(req.user?.id) })));
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users — Create new user
router.post('/users', async (req, res, next) => {
  try {
    const full_name = cleanText(req.body.full_name, 150);
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = String(req.body.role || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!full_name || !email || !password) return res.status(400).json({ error: 'Full name, email, and password are required.' });
    if (!EMAIL_REGEX.test(email) || email.length > 150) return res.status(400).json({ error: 'Invalid email format.' });
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Select a valid role.' });
    if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters.` });

    const existing = await prisma.m_user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (existing) return res.status(400).json({ error: 'This email is already registered.' });

    const newUser = await prisma.m_user.create({
      data: {
        full_name, email, role,
        phone: cleanText(req.body.phone, 30),
        department: cleanText(req.body.department, 100),
        position: cleanText(req.body.position, 100),
        password: await bcrypt.hash(password, 10),
        is_active: true
      },
      select: USER_SELECT
    });
    await logAudit(req, { table: 'm_user', action: 'CREATE', recordId: newUser.id, newData: { email, role, full_name } });
    res.status(201).json(newUser);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'This email is already registered.' });
    next(err);
  }
});

// PUT /api/admin/users/:id — Edit user details
router.put('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const current = Number.isInteger(userId) ? await prisma.m_user.findUnique({ where: { id: userId }, select: USER_SELECT }) : null;
    if (!current) return res.status(404).json({ error: 'User not found.' });

    const data = {
      full_name: cleanText(req.body.full_name, 150),
      phone: cleanText(req.body.phone, 30),
      department: cleanText(req.body.department, 100),
      position: cleanText(req.body.position, 100),
    };
    if (req.body.full_name !== undefined && !data.full_name) return res.status(400).json({ error: 'Full name is required.' });

    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!EMAIL_REGEX.test(email) || email.length > 150) return res.status(400).json({ error: 'Invalid email format.' });
      const taken = await prisma.m_user.findFirst({ where: { email: { equals: email, mode: 'insensitive' }, id: { not: userId } } });
      if (taken) return res.status(400).json({ error: 'This email is already used by another user.' });
      data.email = email;
    }
    if (req.body.role !== undefined) {
      const role = String(req.body.role).trim().toLowerCase();
      if (!ROLES.includes(role)) return res.status(400).json({ error: 'Select a valid role.' });
      data.role = role;
    }
    if (req.body.is_active !== undefined) {
      if (typeof req.body.is_active !== 'boolean') return res.status(400).json({ error: 'Invalid active status.' });
      data.is_active = req.body.is_active;
    }

    // Guard rails: an admin cannot lock themselves out, and the last active admin stays.
    const isSelf = userId === Number(req.user?.id);
    const losesAdmin = current.role === 'admin' && current.is_active && ((data.role && data.role !== 'admin') || data.is_active === false);
    if (isSelf && (data.is_active === false || (data.role && data.role !== current.role))) {
      return res.status(400).json({ error: 'You cannot deactivate your own account or change your own role.' });
    }
    if (losesAdmin && (await activeAdminCount(userId)) === 0) {
      return res.status(400).json({ error: 'At least one active admin is required.' });
    }

    const updatedUser = await prisma.m_user.update({ where: { id: userId }, data, select: USER_SELECT });
    forgetUserState(userId);

    const changed = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== current[k]);
    if (changed.length) {
      await logAudit(req, {
        table: 'm_user', action: 'UPDATE', recordId: userId,
        oldData: Object.fromEntries(changed.map(k => [k, current[k]])),
        newData: Object.fromEntries(changed.map(k => [k, updatedUser[k]]))
      });
    }
    res.json(updatedUser);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'This email is already used by another user.' });
    next(err);
  }
});

// PUT /api/admin/users/:id/reset-password — Reset user password
router.put('/users/:id/reset-password', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = Number.isInteger(userId) ? await prisma.m_user.findUnique({ where: { id: userId }, select: { id: true, email: true } }) : null;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newPassword = String(req.body.new_password || '');
    if (newPassword.length < MIN_PASSWORD) return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD} characters.` });

    await prisma.m_user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10) } });
    await logAudit(req, { table: 'm_user', action: 'RESET_PW', recordId: userId, newData: { email: user.email } });
    res.json({ message: 'Password updated.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users/:id/company-access — List PT/company assigned to a user
router.get('/users/:id/company-access', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const access = await prisma.m_user_company_access.findMany({
      where: { user_id: userId },
      include: { company: { select: { id: true, name: true, company_master_id: true } } },
      orderBy: { company: { name: 'asc' } }
    });
    res.json(access.map(a => a.company));
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/company-access — Replace a user's PT/company access
router.put('/users/:id/company-access', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { company_ids } = req.body;
    if (!Array.isArray(company_ids)) {
      return res.status(400).json({ error: 'Invalid payload: company_ids must be an array.' });
    }
    const user = Number.isInteger(userId) ? await prisma.m_user.findUnique({ where: { id: userId }, select: { id: true, email: true } }) : null;
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const ids = [...new Set(company_ids.map(id => parseInt(id, 10)))];
    if (ids.some(id => !Number.isInteger(id))) return res.status(400).json({ error: 'Invalid company ID.' });
    const found = ids.length ? await prisma.m_company.count({ where: { id: { in: ids } } }) : 0;
    if (found !== ids.length) return res.status(400).json({ error: 'Some companies were not found.' });

    const before = await prisma.m_user_company_access.findMany({ where: { user_id: userId }, select: { company_id: true } });
    await prisma.$transaction([
      prisma.m_user_company_access.deleteMany({ where: { user_id: userId } }),
      prisma.m_user_company_access.createMany({ data: ids.map(id => ({ user_id: userId, company_id: id })) })
    ]);
    const prev = before.map(b => b.company_id).sort((a, b) => a - b);
    const next_ = [...ids].sort((a, b) => a - b);
    if (prev.join(',') !== next_.join(',')) {
      await logAudit(req, { table: 'm_user_company_access', action: 'ACCESS', recordId: userId, oldData: { email: user.email, company_ids: prev }, newData: { email: user.email, company_ids: next_ } });
    }
    res.json({ message: 'Company access updated.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS MAP (read-only, built from the live route guards)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/access-map — who can reach which endpoints, per module and role
router.get('/access-map', async (req, res, next) => {
  try {
    const [map, roleCounts] = await Promise.all([
      Promise.resolve(buildAccessMap()),
      prisma.m_user.groupBy({ by: ['role'], where: { is_active: true }, _count: { _all: true } })
    ]);
    const users = Object.fromEntries(roleCounts.map(r => [r.role, r._count._all]));
    res.json({ ...map, roles: map.roles.map(r => ({ ...r, active_users: users[r.key] || 0 })) });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM AUDIT LOGS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/audit-logs — Paginated audit logs with filters + facets
router.get('/audit-logs', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const { search, action, table, from, to } = req.query;

    const where = {};
    if (action) where.action = action;
    if (table) where.table_name = table;
    if (from || to) {
      where.created_at = {};
      if (from && !Number.isNaN(Date.parse(from))) where.created_at.gte = new Date(`${from}T00:00:00`);
      if (to && !Number.isNaN(Date.parse(to))) where.created_at.lt = new Date(new Date(`${to}T00:00:00`).getTime() + 86400000);
    }
    const q = typeof search === 'string' ? search.trim() : '';
    if (q) {
      where.OR = [
        { m_user: { full_name: { contains: q, mode: 'insensitive' } } },
        { m_user: { email: { contains: q, mode: 'insensitive' } } },
        { table_name: { contains: q, mode: 'insensitive' } },
        ...(/^\d+$/.test(q) ? [{ record_id: parseInt(q, 10) }] : [])
      ];
    }

    const [logs, total, actions, tables] = await Promise.all([
      prisma.audit_log.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { m_user: { select: { full_name: true, email: true } } }
      }),
      prisma.audit_log.count({ where }),
      prisma.audit_log.groupBy({ by: ['action'], _count: { _all: true } }),
      prisma.audit_log.groupBy({ by: ['table_name'], _count: { _all: true } })
    ]);

    res.json({
      data: logs.map(log => ({ ...log, id: log.id.toString() })),
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
      facets: {
        actions: actions.filter(a => a.action).map(a => ({ value: a.action, count: a._count._all })),
        tables: tables.filter(t => t.table_name).map(t => ({ value: t.table_name, count: t._count._all }))
      }
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BI API KEY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const { hashKey, forgetApiKey, getUsage, normalizeScopes, BI_SCOPES } = require('./bi/biAuthMiddleware');

// GET /api/admin/bi-keys/scopes — scopes that have endpoints, for the generate form
router.get('/bi-keys/scopes', (req, res) => {
  res.json(Object.entries(BI_SCOPES).map(([key, cfg]) => ({ key, label: cfg.label, endpoints: cfg.endpoints })));
});

// GET /api/admin/bi-keys — list semua API keys (tanpa menampilkan key plaintext)
router.get('/bi-keys', async (req, res, next) => {
  try {
    const keys = await prisma.m_api_keys.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true, label: true, scopes: true, rate_limit_hour: true,
        created_by: true, created_at: true, last_used_at: true, revoked_at: true
      }
    });
    // usage_this_hour is the in-memory counter of the running API process.
    res.json(keys.map(k => ({ ...k, usage_this_hour: k.revoked_at ? 0 : getUsage(k.id), effective_scopes: normalizeScopes(k.scopes).filter(s => BI_SCOPES[s]), unknown_scopes: normalizeScopes(k.scopes).filter(s => !BI_SCOPES[s]) })));
  } catch (err) { next(err); }
});

// POST /api/admin/bi-keys — generate API key baru
router.post('/bi-keys', async (req, res, next) => {
  try {
    const label = typeof req.body?.label === 'string' ? req.body.label.trim() : '';
    const scopes = [...new Set((Array.isArray(req.body?.scopes) ? req.body.scopes : [req.body?.scopes]).filter(Boolean).map(String))];
    const rateLimit = Number(req.body?.rate_limit_hour ?? 1000);
    if (!label) return res.status(400).json({ error: 'Label is required.' });
    if (label.length > 100) return res.status(400).json({ error: 'Label must be at most 100 characters.' });
    if (!scopes.length) return res.status(400).json({ error: 'Select at least one scope.' });
    const invalid = scopes.filter(s => !BI_SCOPES[s]);
    if (invalid.length) return res.status(400).json({ error: `These scopes have no endpoints yet: ${invalid.join(', ')}.` });
    if (!Number.isInteger(rateLimit) || rateLimit < 1 || rateLimit > 100000) {
      return res.status(400).json({ error: 'Rate limit must be a whole number between 1 and 100,000 per hour.' });
    }

    // Generate key: glc_bi_ + 32 hex chars
    const rawKey  = 'glc_bi_' + crypto.randomBytes(16).toString('hex');
    const record = await prisma.m_api_keys.create({
      data: {
        label,
        key_hash: hashKey(rawKey),
        scopes,
        rate_limit_hour: rateLimit,
        created_by: req.user?.full_name || req.user?.email || 'admin',
      }
    });

    await logAudit(req, { table: 'm_api_keys', action: 'CREATE', recordId: record.id, newData: { label, scopes, rate_limit_hour: rateLimit } });
    // Plaintext key hanya ditampilkan SEKALI di sini — tidak disimpan di DB
    res.status(201).json({
      message: 'API key created. Store it now — it will not be shown again.',
      api_key: rawKey,
      id: record.id,
      label: record.label,
      scopes: record.scopes,
      rate_limit_hour: record.rate_limit_hour,
      created_at: record.created_at,
    });
  } catch (err) { next(err); }
});

// DELETE /api/admin/bi-keys/:id — revoke API key (effective immediately)
router.delete('/bi-keys/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const key = Number.isInteger(id) ? await prisma.m_api_keys.findUnique({ where: { id } }) : null;
    if (!key) return res.status(404).json({ error: 'API key not found.' });
    if (key.revoked_at) return res.status(400).json({ error: 'API key is already revoked.' });

    await prisma.m_api_keys.update({ where: { id }, data: { revoked_at: new Date() } });
    forgetApiKey(id);
    await logAudit(req, { table: 'm_api_keys', action: 'REVOKE', recordId: id, oldData: { label: key.label, scopes: key.scopes } });
    res.json({ message: `API key "${key.label}" revoked.` });
  } catch (err) { next(err); }
});

module.exports = router;
