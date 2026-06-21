const express = require('express');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const router = express.Router();

// Role checking
const allowRead = verifyToken;
const allowWrite = [verifyToken, checkRole(['admin'])];

/**
 * ==========================================
 * MASTER COMPANY ENDPOINTS
 * ==========================================
 */

// GET /api/master/companies — List all companies
router.get('/companies', allowRead, async (req, res, next) => {
  try {
    const { search = '', is_active, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { npwp: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    const [data, total] = await Promise.all([
      prisma.m_company.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.m_company.count({ where })
    ]);

    res.json({
      data,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/master/companies/all — Simple list for dropdowns (no pagination)
router.get('/companies/all', allowRead, async (req, res, next) => {
  try {
    const data = await prisma.m_company.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true }
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/master/companies/:id — Single company detail
router.get('/companies/:id', allowRead, async (req, res, next) => {
  try {
    const { id } = req.params;
    const company = await prisma.m_company.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            assets: true,
            vehicles: true,
            vendors: true,
            device_rentals: true,
            insurances: true,
            maintenances: true,
            documents: true,
            legal_documents: true,
            expense_budget: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    res.json(company);
  } catch (err) {
    next(err);
  }
});

// POST /api/master/companies — Create new company
router.post('/companies', allowWrite, async (req, res, next) => {
  try {
    const { code, name, npwp, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Company name is required.' });
    }

    const company = await prisma.m_company.create({
      data: {
        code: code || null,
        name,
        npwp: npwp || null,
        address: address || null,
        is_active: true
      }
    });

    res.status(201).json(company);
  } catch (err) {
    // Handle unique constraint violation on code
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Company code already exists.' });
    }
    next(err);
  }
});

// PUT /api/master/companies/:id — Update company
router.put('/companies/:id', allowWrite, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, name, npwp, address, is_active } = req.body;

    const company = await prisma.m_company.update({
      where: { id: parseInt(id) },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(npwp !== undefined && { npwp }),
        ...(address !== undefined && { address }),
        ...(is_active !== undefined && { is_active })
      }
    });

    res.json(company);
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Company not found.' });
    }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Company code already exists.' });
    }
    next(err);
  }
});

// DELETE /api/master/companies/:id — Soft delete (toggle is_active)
router.delete('/companies/:id', allowWrite, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if company has related records
    const company = await prisma.m_company.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            assets: true,
            vehicles: true,
            vendors: true,
            device_rentals: true,
            insurances: true,
            maintenances: true
          }
        }
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    const totalRelated = Object.values(company._count).reduce((a, b) => a + b, 0);

    if (totalRelated > 0) {
      // Soft delete: just deactivate
      await prisma.m_company.update({
        where: { id: parseInt(id) },
        data: { is_active: false }
      });
      return res.json({ 
        message: `Company deactivated (has ${totalRelated} related records). Use is_active flag to reactivate.` 
      });
    }

    // Hard delete if no relations
    await prisma.m_company.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Company deleted.' });
  } catch (err) {
    next(err);
  }
});

/**
 * ==========================================
 * SEED: Populate companies from Helpdesk MRA
 * ==========================================
 */
router.post('/companies/seed', allowWrite, async (req, res, next) => {
  try {
    // Company data sourced from Helpdesk MRA system (all MRA Group entities)
    const companies = [
      // ── GENERAL ──
      { code: 'MRA', name: 'PT Mugi Rekso Abadi', sector: 'General' },
      { code: 'PKA', name: 'PT Paramita Kreasi Abadi', sector: 'General' },
      { code: 'EDI', name: 'PT Emera Digital Indonesia', sector: 'General' },
      { code: 'AAA', name: 'PT Amanda Arumdhani Aishwarya', sector: 'General' },
      { code: 'GEA', name: 'PT Graha Emera Abadi', sector: 'General' },
      { code: 'PLA', name: 'PT Permata Landmarq Abadi', sector: 'General' },
      { code: 'MC', name: 'Medical Claim', sector: 'General' },

      // ── MEDIA ──
      { code: 'MIA', name: 'PT Media Insani Abadi', sector: 'Media' },
      { code: 'AJSK', name: 'PT Artindo Jakarta Seni Kini', sector: 'Media' },
      { code: 'RKAB', name: 'PT Rupa Kreasi Anak Bangsa', sector: 'Media' },
      { code: 'JPI', name: 'PT Jemma Putri International', sector: 'Media' },

      // ── F&B ──
      { code: 'EBM', name: 'PT Emera Boga Makmur', sector: 'F&B' },
      { code: 'RAD', name: 'PT Rahayu Arumdhani Distribusindo', sector: 'F&B' },
      { code: 'RAI', name: 'PT Rahayu Arumdhani International', sector: 'F&B' },

      // ── RADIO ──
      { code: 'SSM', name: 'PT Surya Swara Mediatama', sector: 'Radio' },
      { code: 'RSK', name: 'PT Radio Suara Kedjajaan', sector: 'Radio' },
      { code: 'RAND', name: 'PT Radio Antar Nusa Djaja', sector: 'Radio' },

      // ── RETAIL ──
      { code: 'HIP', name: 'PT Hourlogy Indah Perkasa', sector: 'Retail' },
      { code: 'HIS', name: 'PT Hourlogy Inti Semesta', sector: 'Retail' },
      { code: 'MPI', name: 'PT Mogems Putri International', sector: 'Retail' },
    ];

    let created = 0;
    let skipped = 0;

    for (const c of companies) {
      const existing = await prisma.m_company.findFirst({
        where: { name: c.name }
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.m_company.create({
        data: {
          code: c.code,
          name: c.name,
          is_active: true
        }
      });
      created++;
    }

    res.json({ 
      message: `Seed completed. ${created} companies created, ${skipped} skipped (already exist).`,
      total: companies.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
