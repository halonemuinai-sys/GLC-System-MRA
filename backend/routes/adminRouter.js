const express = require('express');
const router = express.Router();
const prisma = require('../api/db');
const bcrypt = require('bcryptjs');

// Helper to seed default permissions if the table is empty
async function seedDefaultPermissions() {
  const count = await prisma.m_role_permission.count();
  if (count > 0) return;

  console.log('Seeding default role permissions...');
  const defaultPermissions = [
    // Admin
    { role: 'admin', module: 'ga', can_read: true, can_write: true },
    { role: 'admin', module: 'legal', can_read: true, can_write: true },
    { role: 'admin', module: 'compliance', can_read: true, can_write: true },
    { role: 'admin', module: 'admin', can_read: true, can_write: true },

    // GA
    { role: 'ga', module: 'ga', can_read: true, can_write: true },
    { role: 'ga', module: 'legal', can_read: false, can_write: false },
    { role: 'ga', module: 'compliance', can_read: false, can_write: false },
    { role: 'ga', module: 'admin', can_read: false, can_write: false },

    // Legal
    { role: 'legal', module: 'ga', can_read: false, can_write: false },
    { role: 'legal', module: 'legal', can_read: true, can_write: true },
    { role: 'legal', module: 'compliance', can_read: false, can_write: false },
    { role: 'legal', module: 'admin', can_read: false, can_write: false },

    // Compliance
    { role: 'compliance', module: 'ga', can_read: false, can_write: false },
    { role: 'compliance', module: 'legal', can_read: false, can_write: false },
    { role: 'compliance', module: 'compliance', can_read: true, can_write: true },
    { role: 'compliance', module: 'admin', can_read: false, can_write: false },

    // Legal & Compliance
    { role: 'legal_compliance', module: 'ga', can_read: false, can_write: false },
    { role: 'legal_compliance', module: 'legal', can_read: true, can_write: true },
    { role: 'legal_compliance', module: 'compliance', can_read: true, can_write: true },
    { role: 'legal_compliance', module: 'admin', can_read: false, can_write: false },

    // Auditor
    { role: 'auditor', module: 'ga', can_read: true, can_write: false },
    { role: 'auditor', module: 'legal', can_read: true, can_write: false },
    { role: 'auditor', module: 'compliance', can_read: true, can_write: false },
    { role: 'auditor', module: 'admin', can_read: false, can_write: false }
  ];

  await prisma.m_role_permission.createMany({
    data: defaultPermissions
  });
  console.log('Default permissions seeded successfully.');
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users — List all users with filters
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, status } = req.query;

    const whereClause = {};

    if (search) {
      whereClause.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      whereClause.role = role;
    }

    if (status !== undefined && status !== '') {
      whereClause.is_active = status === 'true';
    }

    const users = await prisma.m_user.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        full_name: true,
        email: true,
        phone: true,
        department: true,
        position: true,
        role: true,
        is_active: true,
        created_at: true
      }
    });

    res.json(users);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users — Create new user
router.post('/users', async (req, res, next) => {
  try {
    const { full_name, email, phone, department, position, role, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Nama Lengkap, Email, dan Password wajib diisi.' });
    }

    // Check email uniqueness
    const existing = await prisma.m_user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.m_user.create({
      data: {
        full_name,
        email,
        phone: phone || null,
        department: department || null,
        position: position || null,
        role: role || 'staff',
        password: hashedPassword,
        is_active: true
      }
    });

    // Remove password hash from response
    delete newUser.password;
    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id — Edit user details
router.put('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { full_name, email, phone, department, position, role, is_active } = req.body;

    // Check if email belongs to another user
    if (email) {
      const existing = await prisma.m_user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Email sudah digunakan oleh pengguna lain.' });
      }
    }

    const updatedUser = await prisma.m_user.update({
      where: { id: userId },
      data: {
        full_name: full_name !== undefined ? full_name : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        department: department !== undefined ? department : undefined,
        position: position !== undefined ? position : undefined,
        role: role !== undefined ? role : undefined,
        is_active: is_active !== undefined ? is_active : undefined
      }
    });

    delete updatedUser.password;
    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/reset-password — Reset user password
router.put('/users/:id/reset-password', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ error: 'Password baru wajib diisi.' });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await prisma.m_user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Password berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROLE PERMISSIONS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/permissions — List all role permissions (with auto-seed fallback)
router.get('/permissions', async (req, res, next) => {
  try {
    await seedDefaultPermissions();
    const permissions = await prisma.m_role_permission.findMany({
      orderBy: [
        { role: 'asc' },
        { module: 'asc' }
      ]
    });
    res.json(permissions);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/permissions — Bulk update role permissions
router.put('/permissions', async (req, res, next) => {
  try {
    const { permissions } = req.body; // Expects array of { id, can_read, can_write }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Format data tidak valid. Wajib berupa Array.' });
    }

    const updates = permissions.map(p => {
      return prisma.m_role_permission.update({
        where: { id: p.id },
        data: {
          can_read: p.can_read,
          can_write: p.can_write
        }
      });
    });

    await prisma.$transaction(updates);
    res.json({ message: 'Hak akses berhasil diperbarui.' });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM AUDIT LOGS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/audit-logs — Paginated audit logs
router.get('/audit-logs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const { search, action, table } = req.query;

    const whereClause = {};

    if (action) {
      whereClause.action = action;
    }

    if (table) {
      whereClause.table_name = table;
    }

    if (search) {
      whereClause.m_user = {
        full_name: { contains: search, mode: 'insensitive' }
      };
    }

    const [logs, total] = await Promise.all([
      prisma.audit_log.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          m_user: {
            select: {
              full_name: true,
              email: true
            }
          }
        }
      }),
      prisma.audit_log.count({ where: whereClause })
    ]);

    // Handle BigInt serialization
    const serializedLogs = logs.map(log => ({
      ...log,
      id: log.id.toString()
    }));

    res.json({
      data: serializedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
