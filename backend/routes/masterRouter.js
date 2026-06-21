const express = require('express');
const prisma = require('../api/db');
const { verifyToken, checkRole } = require('../api/authMiddleware');

const router = express.Router();

// Role checking
const allowRead = verifyToken;
const allowWrite = [verifyToken, checkRole(['admin'])];

/**
 * ==========================================
 * MASTER COMPANY GROUP (MASTER) ENDPOINTS
 * ==========================================
 */

// GET /api/master/companies/master — List all company master groupings
router.get('/companies/master', allowRead, async (req, res, next) => {
  try {
    const masters = await prisma.m_company_master.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(masters);
  } catch (err) {
    next(err);
  }
});

// POST /api/master/companies/master — Create new company master
router.post('/companies/master', allowWrite, async (req, res, next) => {
  try {
    const { name, sector } = req.body;

    if (!name || !sector) {
      return res.status(400).json({ error: 'Name and sector are required.' });
    }

    const master = await prisma.m_company_master.create({
      data: {
        name: name.trim(),
        sector: sector.toUpperCase().trim()
      }
    });

    res.status(201).json(master);
  } catch (err) {
    next(err);
  }
});

// PUT /api/master/companies/master/:id — Update company master
router.put('/companies/master/:id', allowWrite, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sector } = req.body;

    if (!name || !sector) {
      return res.status(400).json({ error: 'Name and sector are required.' });
    }

    const master = await prisma.m_company_master.update({
      where: { id: parseInt(id) },
      data: {
        name: name.trim(),
        sector: sector.toUpperCase().trim()
      }
    });

    res.json(master);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/master/companies/master/:id — Delete company master
router.delete('/companies/master/:id', allowWrite, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if there are branches linked to this master
    const linkedBranches = await prisma.m_company_branch.count({
      where: { company_master_id: parseInt(id) }
    });

    if (linkedBranches > 0) {
      return res.status(400).json({
        error: 'Cannot delete master company because it is still linked to branches.'
      });
    }

    await prisma.m_company_master.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Master company deleted.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * MASTER COMPANY BRANCH (BRANCH) ENDPOINTS
 * ==========================================
 */

// GET /api/master/companies/branch — List all company branches
router.get('/companies/branch', allowRead, async (req, res, next) => {
  try {
    const { search = '', sector, is_active } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { sector: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    if (sector && sector !== 'ALL') {
      where.sector = sector.toUpperCase().trim();
    }

    const branches = await prisma.m_company_branch.findMany({
      where,
      include: {
        m_company_master: true
      },
      orderBy: [
        { name: 'asc' },
        { location: 'asc' }
      ]
    });

    res.json(branches);
  } catch (err) {
    next(err);
  }
});

// POST /api/master/companies/branch — Create new company branch
router.post('/companies/branch', allowWrite, async (req, res, next) => {
  try {
    const { name, location, sector, company_master_id } = req.body;

    if (!name || !location || !sector) {
      return res.status(400).json({ error: 'Name, location, and sector are required.' });
    }

    const branch = await prisma.m_company_branch.create({
      data: {
        name: name.trim(),
        location: location.trim(),
        sector: sector.toUpperCase().trim(),
        company_master_id: company_master_id ? parseInt(company_master_id) : null,
        is_active: true
      },
      include: {
        m_company_master: true
      }
    });

    res.status(201).json(branch);
  } catch (err) {
    next(err);
  }
});

// PUT /api/master/companies/branch/:id — Update company branch
router.put('/companies/branch/:id', allowWrite, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location, sector, company_master_id, is_active } = req.body;

    const branch = await prisma.m_company_branch.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(location !== undefined && { location: location.trim() }),
        ...(sector !== undefined && { sector: sector.toUpperCase().trim() }),
        ...(company_master_id !== undefined && { company_master_id: company_master_id ? parseInt(company_master_id) : null }),
        ...(is_active !== undefined && { is_active })
      },
      include: {
        m_company_master: true
      }
    });

    res.json(branch);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/master/companies/branch/:id — Delete company branch
router.delete('/companies/branch/:id', allowWrite, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.m_company_branch.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Branch deleted.' });
  } catch (err) {
    next(err);
  }
});


/**
 * ==========================================
 * MASTER COMPANY (ORIGINAL ENTITAS) ENDPOINTS
 * ==========================================
 */

// GET /api/master/companies — List all companies (Original Master Data)
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
        name: name.trim(),
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
        ...(name !== undefined && { name: name.trim() }),
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

// DELETE /api/master/companies/:id — Soft delete (toggle is_active) or Hard delete
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
 * SEED: Populate companies & branches from Helpdesk MRA
 * ==========================================
 */
router.post('/companies/seed', allowWrite, async (req, res, next) => {
  try {
    // 1. Seed Master Company Groupings (PT Induk)
    const masterData = [
      { name: 'PT Mugi Rekso Abadi', sector: 'GENERAL' },
      { name: 'PT Media Insani Abadi', sector: 'MEDIA' },
      { name: 'PT Emera Boga Makmur', sector: 'FB' },
      { name: 'PT Surya Swara Mediatama', sector: 'RADIO' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL' }
    ];

    const masterMap = {};

    for (const m of masterData) {
      let masterRecord = await prisma.m_company_master.findFirst({
        where: { name: m.name }
      });

      if (!masterRecord) {
        masterRecord = await prisma.m_company_master.create({
          data: {
            name: m.name,
            sector: m.sector
          }
        });
      }
      masterMap[m.sector] = masterRecord.id;
    }

    // 2. Seed Original Companies List (PT-PT Utama / Tab 1)
    const companies = [
      { code: 'MRA', name: 'PT Mugi Rekso Abadi' },
      { code: 'PKA', name: 'PT Paramita Kreasi Abadi' },
      { code: 'EDI', name: 'PT Emera Digital Indonesia' },
      { code: 'AAA', name: 'PT Amanda Arumdhani Aishwarya' },
      { code: 'GEA', name: 'PT Graha Emera Abadi' },
      { code: 'PLA', name: 'PT Permata Landmarq Abadi' },
      { code: 'MC', name: 'Medical Claim' },
      { code: 'MIA', name: 'PT Media Insani Abadi' },
      { code: 'AJSK', name: 'PT Artindo Jakarta Seni Kini' },
      { code: 'RKAB', name: 'PT Rupa Kreasi Anak Bangsa' },
      { code: 'JPI', name: 'PT Jemma Putri International' },
      { code: 'EBM', name: 'PT Emera Boga Makmur' },
      { code: 'RAD', name: 'PT Rahayu Arumdhani Distribusindo' },
      { code: 'RAI', name: 'PT Rahayu Arumdhani International' },
      { code: 'SSM', name: 'PT Surya Swara Mediatama' },
      { code: 'RSK', name: 'PT Radio Suara Kedjajaan' },
      { code: 'RAND', name: 'PT Radio Antar Nusa Djaja' },
      { code: 'HIP', name: 'PT Hourlogy Indah Perkasa' },
      { code: 'HIS', name: 'PT Hourlogy Inti Semesta' },
      { code: 'MPI', name: 'PT Mogems Putri International' }
    ];

    let compCreated = 0;
    let compSkipped = 0;

    for (const c of companies) {
      const existing = await prisma.m_company.findFirst({
        where: { name: c.name }
      });

      if (existing) {
        compSkipped++;
        continue;
      }

      await prisma.m_company.create({
        data: {
          code: c.code,
          name: c.name,
          is_active: true
        }
      });
      compCreated++;
    }

    // 3. Seed Branches (Tab 3)
    const branchesData = [
      { name: 'Medical Claim', sector: 'GENERAL', location: 'HQ' },
      { name: 'PT Amanda Arumdhani Aishwarya', sector: 'GENERAL', location: 'Head Office' },
      { name: 'PT Emera Boga Makmur', sector: 'FB', location: 'HQ' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Butik OMEGA Plaza Indonesia' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Butik OMEGA Plaza Senayan' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Butik OMEGA Mall Kelapa Gading 3' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Butik OMEGA Tunjungan Plaza 4 Surabaya' },
      { name: 'PT Hourlogy Indah Perkasa', sector: 'RETAIL', location: 'Head Office' },
      { name: 'PT Hourlogy Inti Semesta', sector: 'RETAIL', location: 'Service Center' },
      { name: 'PT Hourlogy Inti Semesta', sector: 'RETAIL', location: 'Head Office' },
      { name: 'PT Jemma Putri International', sector: 'MEDIA', location: 'HQ' },
      { name: 'PT Mogems Putri International', sector: 'RETAIL', location: 'Head Office' }
    ];

    let branchCreated = 0;
    let branchSkipped = 0;

    for (const b of branchesData) {
      const existing = await prisma.m_company_branch.findFirst({
        where: { name: b.name, location: b.location }
      });

      if (existing) {
        branchSkipped++;
        continue;
      }

      const masterId = masterMap[b.sector] || null;

      await prisma.m_company_branch.create({
        data: {
          name: b.name,
          location: b.location,
          sector: b.sector,
          company_master_id: masterId,
          is_active: true
        }
      });
      branchCreated++;
    }

    res.json({ 
      message: `Seed completed. Companies: ${compCreated} created, ${compSkipped} skipped. Branches: ${branchCreated} created, ${branchSkipped} skipped.`,
      totalCompanies: companies.length,
      totalBranches: branchesData.length
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
